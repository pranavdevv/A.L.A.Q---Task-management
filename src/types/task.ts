/**
 * A.L.A.Q. (A List, A Queue) Task Data Models
 * Satisfies both the Academic Student Task Management specification and ALAQ Design Principles.
 */

export type Priority = 'High' | 'Medium' | 'Low';

export type TaskStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';

export interface SubTask {
  id: string;
  parentId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  status: TaskStatus;
  subtasks: SubTask[];
  createdAt: string;
  completedAt?: string;
  notes?: string;
  category?: string;
}

export interface QueueState {
  activeTaskId: string | null;
  activeSubtaskId: string | null;
}
