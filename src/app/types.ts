import type { User } from '@supabase/supabase-js';

export interface Task {
  id: string;
  title: string;
  description?: string;
  subQueueId?: string; 
  createdAt: string;
  color?: string; 
  sort_order: number; // Add this line!
}

export interface Queue {
  id: string;
  name: string;
  color: string;
  palette: string[]; // Added palette array (6 colors)
  tasks: Task[];
  parentTaskId?: string; 
  createdAt: string;
}

// Update AppState to include the new auth properties
export interface AppState {
  queues: Queue[];
  currentQueueId: string | null;
  user: User | null;
  isLoading: boolean;
}