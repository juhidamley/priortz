import { Queue, Task, AppState, MemberRole, MemberStatus } from './types';
import { supabase } from '../../utils/supabase/client';

const defaultPalette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

const initialQueues: Queue[] = [
  {
    id: 'queue-1',
    name: 'Work Tasks',
    color: '#3b82f6',
    palette: defaultPalette,
    tasks: [
      { id: 'task-1', title: 'Finish project proposal', description: 'Complete the Q2 project proposal document', color: '#ef4444', createdAt: new Date().toISOString(), sort_order: 100 },
      { id: 'task-2', title: 'Review code', description: 'Review pull requests from team', color: '#f97316', createdAt: new Date().toISOString(), sort_order: 200 },
      { id: 'task-3', title: 'Team meeting preparation', color: '#eab308', createdAt: new Date().toISOString(), sort_order: 300 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'queue-2',
    name: 'Personal',
    color: '#10b981',
    palette: defaultPalette,
    tasks: [
      { id: 'task-4', title: 'Grocery shopping', color: '#22c55e', createdAt: new Date().toISOString(), sort_order: 100 },
      { id: 'task-5', title: 'Call dentist', color: '#3b82f6', createdAt: new Date().toISOString(), sort_order: 200 },
    ],
    createdAt: new Date().toISOString(),
  },
];

class AppStore {
  private state: AppState = {
    queues: [],
    currentQueueId: null,
    user: null,
    isLoading: true,
    queueMembers: [],
    queueMemberCounts: {},
  };

  private listeners: Set<() => void> = new Set();
  private realtimeCleanup: (() => void) | undefined;

  private getAuthenticatedEmail() {
    return (
      this.state.user?.email ||
      (this.state.user?.user_metadata?.email as string | undefined) ||
      (this.state.user?.identities?.[0]?.identity_data?.email as string | undefined) ||
      null
    );
  }

  async signOut() {
    this.realtimeCleanup?.();
    this.realtimeCleanup = undefined;
    await supabase.auth.signOut();
    this.state.queues = [];
    this.state.queueMembers = [];
    this.state.queueMemberCounts = {};
    this.notify();
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.state = {
      ...this.state,
      queues: [...this.state.queues],
    };

    if (!this.state.user) {
      localStorage.setItem('prioritize_local_data', JSON.stringify(this.state.queues));
    }

    this.listeners.forEach(listener => listener());
  }

  async initializeAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    this.state.user = session?.user ?? null;

    if (this.state.user) {
      await this.resolvePendingInvites();
      await this.fetchQueues();
      this.realtimeCleanup = this.subscribeToRealtime();
    } else {
      const saved = localStorage.getItem('prioritize_local_data');
      if (saved) {
        try { this.state.queues = JSON.parse(saved); } catch (e) {}
      }
      this.state.isLoading = false;
      this.notify();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      if (this.state.user?.id !== newUser?.id) {
        this.state.user = newUser;
        if (newUser) {
          await this.resolvePendingInvites();
          await this.fetchQueues();
          this.realtimeCleanup = this.subscribeToRealtime();
        } else {
          this.realtimeCleanup?.();
          this.realtimeCleanup = undefined;
          const saved = localStorage.getItem('prioritize_local_data');
          this.state.queues = saved ? JSON.parse(saved) : [];
          this.state.queueMembers = [];
          this.state.queueMemberCounts = {};
          this.notify();
        }
      }
    });
  }

  private async resolvePendingInvites() {
    const user = this.state.user;
    if (!user) return;

    const email = this.getAuthenticatedEmail();
    if (!email) return;
    const { error } = await supabase.rpc('resolve_pending_invites', {
      p_user_id: user.id,
      p_email: email.toLowerCase(),
    });
    if (error) console.error('Error resolving invites:', error);
  }

  async shareQueue(queueId: string, email: string): Promise<{ error: string | null }> {
    if (!this.state.user) return { error: 'Not logged in' };

    const { error } = await supabase.from('queue_members').insert({
      queue_id: queueId,
      invited_by: this.state.user.id,
      invited_by_email: this.getAuthenticatedEmail() ?? '',
      email: email.toLowerCase().trim(),
      role: 'editor',
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') return { error: 'This email has already been invited.' };
      return { error: error.message };
    }

    await this.fetchQueueMembers(queueId);
    return { error: null };
  }

  async fetchQueueMembers(queueId: string) {
    if (!this.state.user) return;

    const { data, error } = await supabase
      .from('queue_members')
      .select('*')
      .eq('queue_id', queueId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    this.state.queueMembers = (data ?? []).map(m => ({
      id: m.id,
      queueId: m.queue_id,
      invitedBy: m.invited_by,
      userId: m.user_id,
      email: m.email,
      role: m.role as MemberRole,
      status: m.status as MemberStatus,
      createdAt: m.created_at,
    }));
    this.notify();
  }

  async removeQueueMember(memberId: string) {
    if (!this.state.user) return;

    const { error } = await supabase
      .from('queue_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return;
    }

    this.state.queueMembers = this.state.queueMembers.filter(m => m.id !== memberId);
    this.notify();
  }

  async addQueue(name: string, color: string, palette: string[], parentTaskId?: string) {
    if (!this.state.user) {
      const newQueue: Queue = {
        id: `local-queue-${Date.now()}`,
        name, color, palette, tasks: [],
        parentTaskId: parentTaskId || undefined,
        createdAt: new Date().toISOString(),
      };
      this.state.queues.push(newQueue);
      this.notify();
      return newQueue;
    }

    const { data, error } = await supabase.from('queues').insert({
      name, color, palette, owner_id: this.state.user.id, parent_task_id: parentTaskId || null,
    }).select().single();

    if (error) {
      console.error('Error creating queue:', error);
      return;
    }
    await this.fetchQueues();
    return data;
  }

  async addTask(queueId: string, title: string, description?: string, explicitColor?: string) {
    const queue = this.getQueue(queueId);
    if (!queue) return;

    let taskColor = explicitColor;
    if (!taskColor && queue.palette && queue.palette.length > 0) {
      const lastTask = queue.tasks[queue.tasks.length - 1];
      const safeColors = queue.palette.filter(c => c !== lastTask?.color);
      taskColor = (safeColors.length > 0 ? safeColors : queue.palette)[Math.floor(Math.random() * (safeColors.length || queue.palette.length))];
    }

    const newSortOrder = queue.tasks.length > 0 ? queue.tasks[queue.tasks.length - 1].sort_order + 100 : 0;

    if (!this.state.user) {
      const newTask: Task = {
        id: `local-task-${Date.now()}`,
        title, description, color: taskColor, sort_order: newSortOrder, createdAt: new Date().toISOString(),
      };
      queue.tasks.push(newTask);
      this.notify();
      return newTask;
    }

    const { error } = await supabase.from('tasks').insert({
      queue_id: queueId, title, description, color: taskColor, sort_order: newSortOrder,
    });
    if (error) console.error('Error adding task:', error);
    this.fetchQueues();
  }

  async updateQueue(queueId: string, updates: Partial<Queue>) {
    const { error } = await supabase
      .from('queues')
      .update({ name: updates.name, color: updates.color, palette: updates.palette })
      .eq('id', queueId);

    if (error) console.error('Error updating queue:', error);
    else this.fetchQueues();
  }

  async deleteQueue(queueId: string) {
    // ON DELETE CASCADE automatically deletes tasks and queue_members rows
    const { error } = await supabase
      .from('queues')
      .delete()
      .eq('id', queueId);

    if (error) console.error('Error deleting queue:', error);
    else {
      this.state.queues = this.state.queues.filter(q => q.id !== queueId);
      this.notify();
    }
  }

  getQueue(queueId: string): Queue | undefined {
    return this.state.queues.find(q => q.id === queueId);
  }

  getMainQueues(): Queue[] {
    return this.state.queues.filter(q => !q.parentTaskId);
  }

  getSubQueue(taskId: string): Queue | undefined {
    return this.state.queues.find(q => q.parentTaskId === taskId);
  }

  async updateTask(queueId: string, taskId: string, updates: Partial<Task>) {
    const { error } = await supabase
      .from('tasks')
      .update({
        title: updates.title,
        description: updates.description,
        color: updates.color,
      })
      .eq('id', taskId);

    if (error) console.error('Error updating task:', error);
    else this.fetchQueues();
  }

  async deleteTask(queueId: string, taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) console.error('Error deleting task:', error);
    else this.fetchQueues();
  }

  reorderTasks(queueId: string, dragIndex: number, hoverIndex: number) {
    const queue = this.getQueue(queueId);
    if (!queue) return;

    const newTasks = [...queue.tasks];
    const [removed] = newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, removed);
    queue.tasks = newTasks;

    let newSortOrder = 0;
    if (hoverIndex === 0) newSortOrder = newTasks[1] ? newTasks[1].sort_order - 100 : 0;
    else if (hoverIndex === newTasks.length - 1) newSortOrder = newTasks[hoverIndex - 1].sort_order + 100;
    else newSortOrder = (newTasks[hoverIndex - 1].sort_order + newTasks[hoverIndex + 1].sort_order) / 2;

    newTasks[hoverIndex].sort_order = newSortOrder;
    this.notify();

    if (!this.state.user) return;

    supabase.from('tasks').update({ sort_order: newSortOrder }).eq('id', removed.id).then(({ error }) => {
      if (error) console.error('Error syncing order:', error);
    });
  }

  async createSubQueue(taskId: string, queueId: string) {
    const queue = this.getQueue(queueId);
    const task = queue?.tasks.find(t => t.id === taskId);

    if (task && !task.subQueueId) {
      const subQueue = await this.addQueue(
        `${task.title} - Subtasks`,
        '#8b5cf6',
        queue?.palette || [],
        taskId
      );

      if (subQueue) {
        if (!this.state.user) {
          task.subQueueId = subQueue.id;
          this.notify();
          return subQueue;
        }

        await supabase
          .from('tasks')
          .update({ sub_queue_id: subQueue.id })
          .eq('id', taskId);

        this.fetchQueues();
        return subQueue;
      }
    }
    return this.getSubQueue(taskId);
  }

  setCurrentQueue(queueId: string | null) {
    this.state.currentQueueId = queueId;
    this.state.queueMembers = [];
    this.notify();
    if (queueId && this.state.user) {
      this.fetchQueueMembers(queueId);
    }
  }

  async fetchQueues() {
    if (!this.state.user) return;

    this.state.isLoading = true;
    this.notify();

    try {
      const { data: ownedQueuesData, error: ownedQueuesError } = await supabase
        .from('queues')
        .select('*')
        .eq('owner_id', this.state.user.id);

      if (ownedQueuesError) throw ownedQueuesError;

      const { data: membershipData, error: membershipError } = await supabase
        .from('queue_members')
        .select('queue_id, invited_by_email')
        .eq('user_id', this.state.user.id)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      const email = this.getAuthenticatedEmail();
      const { data: emailMembershipData, error: emailMembershipError } = email
        ? await supabase
            .from('queue_members')
            .select('queue_id, invited_by_email')
            .eq('email', email.toLowerCase().trim())
        : { data: [], error: null };

      if (emailMembershipError) throw emailMembershipError;

      const sharedQueueIds = Array.from(new Set([
        ...(membershipData ?? []).map(row => row.queue_id),
        ...(emailMembershipData ?? []).map(row => row.queue_id),
      ]));

      const { data: sharedQueuesData, error: sharedQueuesError } = sharedQueueIds.length > 0
        ? await supabase
            .from('queues')
            .select('*')
            .in('id', sharedQueueIds)
        : { data: [], error: null };

      if (sharedQueuesError) throw sharedQueuesError;

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true });

      if (tasksError) throw tasksError;

      const { data: memberCountsData } = await supabase
        .from('queue_members')
        .select('queue_id')
        .eq('status', 'active');

      const memberCounts: Record<string, number> = {};
      (memberCountsData ?? []).forEach(row => {
        memberCounts[row.queue_id] = (memberCounts[row.queue_id] ?? 0) + 1;
      });

      const queueRows = [
        ...(ownedQueuesData ?? []),
        ...(sharedQueuesData ?? []),
      ];

      const uniqueQueues = Array.from(new Map(queueRows.map(queue => [queue.id, queue])).values());

      const sharedByEmailMap: Record<string, string> = {};
      [...(membershipData ?? []), ...(emailMembershipData ?? [])].forEach(row => {
        if (row.invited_by_email) sharedByEmailMap[row.queue_id] = row.invited_by_email;
      });

      const assembledQueues: Queue[] = uniqueQueues.map(queue => ({
        id: queue.id,
        name: queue.name,
        color: queue.color,
        palette: queue.palette,
        parentTaskId: queue.parent_task_id,
        createdAt: queue.created_at,
        ownerId: queue.owner_id,
        isShared: queue.owner_id !== this.state.user!.id,
        sharedByEmail: sharedByEmailMap[queue.id],
        tasks: tasksData
          .filter(task => task.queue_id === queue.id)
          .map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            color: task.color,
            subQueueId: task.sub_queue_id,
            createdAt: task.created_at,
            sort_order: task.sort_order,
          })),
      }));

      this.state.queues = assembledQueues;
      this.state.queueMemberCounts = memberCounts;
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      this.state.isLoading = false;
      this.notify();
    }
  }

  subscribeToRealtime() {
    if (!this.state.user) return;

    const subscription = supabase
      .channel('public-tasks-and-queues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        this.fetchQueues();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, () => {
        this.fetchQueues();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_members' }, () => {
        this.fetchQueues();
        if (this.state.currentQueueId) {
          this.fetchQueueMembers(this.state.currentQueueId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
}

export const appStore = new AppStore();
