import type { User } from '@supabase/supabase-js';

export interface Task {
  id: string;
  title: string;
  description?: string;
  subQueueId?: string;
  createdAt: string;
  color?: string;
  sort_order: number;
}

export interface Queue {
  id: string;
  name: string;
  color: string;
  palette: string[];
  tasks: Task[];
  parentTaskId?: string;
  createdAt: string;
  ownerId?: string;
  isShared?: boolean;
}

export type MemberStatus = 'pending' | 'active';
export type MemberRole = 'editor';

export interface QueueMember {
  id: string;
  queueId: string;
  invitedBy: string;
  userId: string | null;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
}

export interface AppState {
  queues: Queue[];
  currentQueueId: string | null;
  user: User | null;
  isLoading: boolean;
  queueMembers: QueueMember[];
  queueMemberCounts: Record<string, number>;
}
