import { Task, QueueState } from '../types/task';

/**
 * Storage Utility Module
 * Responsible for encapsulating browser localStorage read/write operations.
 * Satisfies Requirement 4 & ALAQ Persistence specs.
 */

const TASKS_STORAGE_KEY = 'ALAQ_STUDENT_TASKS_v1';
const QUEUE_STORAGE_KEY = 'ALAQ_ACTIVE_QUEUE_STATE_v1';

export class StorageUtility {
  /**
   * Loads all tasks from localStorage
   */
  public static loadTasks(): Task[] {
    try {
      const data = localStorage.getItem(TASKS_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load tasks from localStorage:', error);
      return [];
    }
  }

  /**
   * Persists all tasks to localStorage
   */
  public static saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save tasks to localStorage:', error);
    }
  }

  /**
   * Loads the current active queue pointer
   */
  public static loadQueueState(): QueueState {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!data) return { activeTaskId: null, activeSubtaskId: null };
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load queue state:', error);
      return { activeTaskId: null, activeSubtaskId: null };
    }
  }

  /**
   * Persists the active queue pointer
   */
  public static saveQueueState(state: QueueState): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save queue state:', error);
    }
  }

  /**
   * Clears all stored data (useful for reset/testing)
   */
  public static clear(): void {
    localStorage.removeItem(TASKS_STORAGE_KEY);
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  }
}
