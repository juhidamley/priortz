import { Queue, Task, AppState } from './types';
import { supabase } from '../../utils/supabase/client';
import type { User } from '@supabase/supabase-js';

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
    queues: [], // We'll fetch these from the DB later
    currentQueueId: null,
    user: null,
    isLoading: true,
  };

  private listeners: Set<() => void> = new Set();

  async signOut() {
    await supabase.auth.signOut();
    this.state.queues = []; // Clear local data on logout
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
      queues: [...this.state.queues] 
    };
    
    // Save to local storage if acting as a guest
    if (!this.state.user) {
      localStorage.setItem('prioritize_local_data', JSON.stringify(this.state.queues));
    }
    
    this.listeners.forEach(listener => listener());
  }

  async initializeAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    this.state.user = session?.user ?? null;
    
    if (this.state.user) {
      this.fetchQueues(); // Fetch from cloud
    } else {
      // Fetch from local browser storage
      const saved = localStorage.getItem('prioritize_local_data');
      if (saved) {
        try { this.state.queues = JSON.parse(saved); } catch (e) {}
      }
      this.state.isLoading = false;
      this.notify();
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      if (this.state.user?.id !== newUser?.id) {
         this.state.user = newUser;
         if (newUser) this.fetchQueues();
         else {
           const saved = localStorage.getItem('prioritize_local_data');
           this.state.queues = saved ? JSON.parse(saved) : [];
           this.notify();
         }
      }
    });
  }

  async addQueue(name: string, color: string, palette: string[], parentTaskId?: string) {
    // 1. LOCAL MODE
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

    // 2. CLOUD MODE
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

    // 1. LOCAL MODE
    if (!this.state.user) {
      const newTask: Task = {
        id: `local-task-${Date.now()}`,
        title, description, color: taskColor, sort_order: newSortOrder, createdAt: new Date().toISOString(),
      };
      queue.tasks.push(newTask);
      this.notify();
      return newTask;
    }

    // 2. CLOUD MODE
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
    // Because we set ON DELETE CASCADE in the database, deleting a queue 
    // will automatically delete all its tasks and share records!
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

    // STOP HERE IF GUEST (Skip DB sync)
    if (!this.state.user) return; 

    supabase.from('tasks').update({ sort_order: newSortOrder }).eq('id', removed.id).then(({ error }) => {
      if (error) console.error('Error syncing order:', error);
    });
  }

  async createSubQueue(taskId: string, queueId: string) {
    const queue = this.getQueue(queueId);
    const task = queue?.tasks.find(t => t.id === taskId);
    
    if (task && !task.subQueueId) {
      // Create the new queue, linking it to the parent task
      const subQueue = await this.addQueue(
        `${task.title} - Subtasks`, 
        '#8b5cf6', 
        queue?.palette || [], 
        taskId
      );
      
      if (subQueue) {
        // 1. LOCAL MODE (Guest)
        if (!this.state.user) {
          task.subQueueId = subQueue.id;
          this.notify();
          return subQueue;
        }

        // 2. CLOUD MODE (Logged In)
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
    this.notify();
  }

  // 1. Fetch all data from the cloud
  async fetchQueues() {
    if (!this.state.user) return;

    this.state.isLoading = true;
    this.notify();

    try {
      // Fetch queues
      const { data: queuesData, error: queuesError } = await supabase
        .from('queues')
        .select('*');
        
      if (queuesError) throw queuesError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true }); // Keep them in the right order

      if (tasksError) throw tasksError;

      // Assemble the data: attach tasks to their respective queues
      const assembledQueues: Queue[] = queuesData.map(queue => ({
        id: queue.id,
        name: queue.name,
        color: queue.color,
        palette: queue.palette,
        parentTaskId: queue.parent_task_id,
        createdAt: queue.created_at,
        tasks: tasksData
          .filter(task => task.queue_id === queue.id)
          .map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            color: task.color,
            subQueueId: task.sub_queue_id,
            createdAt: task.created_at,
            sort_order: task.sort_order, // <-- ADD THIS LINE
          }))
      }));

      this.state.queues = assembledQueues;
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      this.state.isLoading = false;
      this.notify();
    }
  }

  // 2. The Real-time Listener
  subscribeToRealtime() {
    if (!this.state.user) return;

    // Create a real-time websocket connection to Supabase
    const subscription = supabase
      .channel('public-tasks-and-queues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('Task changed by another user!', payload);
          // When a change is detected anywhere in the tasks table, 
          // re-fetch the latest state to keep the UI perfectly in sync
          this.fetchQueues();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queues' },
        (payload) => {
          console.log('Queue changed by another user!', payload);
          this.fetchQueues();
        }
      )
      .subscribe();

    // Return a cleanup function
    return () => {
      supabase.removeChannel(subscription);
    };
  }
}

export const appStore = new AppStore();