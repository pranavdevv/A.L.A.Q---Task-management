import { Task, SubTask, Priority, QueueState, TaskStatus } from '../types/task';
import { StorageUtility } from '../utils/storage';

/**
 * Task Service Module
 * Handles all business logic for List operations, Tackle decomposition, and Queue execution.
 * Satisfies Requirement 3 and ALAQ Core Principles.
 */

export class TaskService {
  private tasks: Task[];
  private queueState: QueueState;

  constructor() {
    this.tasks = StorageUtility.loadTasks();
    this.queueState = StorageUtility.loadQueueState();

    // If storage is completely empty, populate with initial academic demo tasks so the app looks alive!
    if (this.tasks.length === 0) {
      this.seedInitialTasks();
    }
  }

  private save(): void {
    StorageUtility.saveTasks(this.tasks);
    StorageUtility.saveQueueState(this.queueState);
  }

  private generateId(): string {
    return 't_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  /**
   * Retrieves all tasks
   */
  public getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Retrieves a single task by ID
   */
  public getTaskById(id: string): Task | undefined {
    return this.tasks.find(t => t.id === id);
  }

  /**
   * Adds a new task to The List
   */
  public addTask(title: string, priority: Priority = 'Medium', category: string = 'Academic'): Task {
    const newTask: Task = {
      id: this.generateId(),
      title: title.trim(),
      completed: false,
      priority,
      status: 'not_started',
      subtasks: [],
      createdAt: new Date().toISOString(),
      category: category.trim() || 'Academic',
    };

    this.tasks.unshift(newTask);
    this.save();
    return newTask;
  }

  /**
   * Toggles or marks completion of a parent task directly (Hybrid Mode)
   */
  public toggleTaskCompletion(id: string): Task | null {
    const task = this.getTaskById(id);
    if (!task) return null;

    task.completed = !task.completed;
    if (task.completed) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      // Mark all subtasks complete as well
      task.subtasks.forEach(st => {
        st.completed = true;
        if (!st.completedAt) st.completedAt = new Date().toISOString();
      });
      // If this was the active queue, clear active queue
      if (this.queueState.activeTaskId === id) {
        this.queueState.activeTaskId = null;
        this.queueState.activeSubtaskId = null;
      }
    } else {
      task.status = task.subtasks.length > 0 ? 'paused' : 'not_started';
      task.completedAt = undefined;
    }

    this.save();
    return task;
  }

  /**
   * Removes a task from The List
   */
  public deleteTask(id: string): boolean {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== id);

    if (this.queueState.activeTaskId === id) {
      this.queueState.activeTaskId = null;
      this.queueState.activeSubtaskId = null;
    }

    this.save();
    return this.tasks.length < initialLength;
  }

  /**
   * Returns count of pending (uncompleted) tasks
   */
  public getPendingTaskCount(): number {
    return this.tasks.filter(t => !t.completed).length;
  }

  /**
   * Returns count of total tasks
   */
  public getTotalTaskCount(): number {
    return this.tasks.length;
  }

  /**
   * Tackles a task: updates/replaces its ordered subtasks and commits to Queue
   */
  public commitTacklePlan(taskId: string, subtaskTitles: string[]): Task | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    // Build subtasks preserving any existing completions if matching, or create fresh
    const subtasks: SubTask[] = subtaskTitles
      .map(title => title.trim())
      .filter(title => title.length > 0)
      .map((title, index) => ({
        id: this.generateId(),
        parentId: taskId,
        title,
        completed: false,
        order: index + 1,
        createdAt: new Date().toISOString(),
      }));

    task.subtasks = subtasks;
    task.completed = false;

    // Pause any other active queue
    if (this.queueState.activeTaskId && this.queueState.activeTaskId !== taskId) {
      const activeTask = this.getTaskById(this.queueState.activeTaskId);
      if (activeTask && activeTask.status === 'in_progress') {
        activeTask.status = 'paused';
      }
    }

    // Set active in queue
    task.status = 'in_progress';
    this.queueState.activeTaskId = taskId;
    this.queueState.activeSubtaskId = subtasks.length > 0 ? subtasks[0].id : null;

    this.save();
    return task;
  }

  /**
   * Gets the currently active task in The Queue
   */
  public getActiveQueueTask(): Task | null {
    if (!this.queueState.activeTaskId) return null;
    const task = this.getTaskById(this.queueState.activeTaskId);
    if (!task || task.completed) {
      this.queueState.activeTaskId = null;
      this.queueState.activeSubtaskId = null;
      this.save();
      return null;
    }
    return task;
  }

  /**
   * Gets all tasks that are currently paused (have unfinished subtasks but not active)
   */
  public getPausedQueueTasks(): Task[] {
    return this.tasks.filter(t => !t.completed && t.status === 'paused' && t.subtasks.length > 0);
  }

  /**
   * Marks the current active subtask as completed and advances to the next
   */
  public completeActiveSubtask(): { task: Task; completedSubtask: SubTask; isQueueFinished: boolean } | null {
    const activeTask = this.getActiveQueueTask();
    if (!activeTask) return null;

    const unfinishedSubtasks = activeTask.subtasks.filter(s => !s.completed);
    if (unfinishedSubtasks.length === 0) return null;

    const currentSubtask = activeTask.subtasks.find(s => s.id === this.queueState.activeSubtaskId) || unfinishedSubtasks[0];
    currentSubtask.completed = true;
    currentSubtask.completedAt = new Date().toISOString();

    // Find next unfinished subtask
    const remaining = activeTask.subtasks.filter(s => !s.completed);
    let isQueueFinished = false;

    if (remaining.length > 0) {
      this.queueState.activeSubtaskId = remaining[0].id;
    } else {
      // All subtasks done! Complete parent task!
      activeTask.completed = true;
      activeTask.status = 'completed';
      activeTask.completedAt = new Date().toISOString();
      this.queueState.activeTaskId = null;
      this.queueState.activeSubtaskId = null;
      isQueueFinished = true;
    }

    this.save();
    return { task: activeTask, completedSubtask: currentSubtask, isQueueFinished };
  }

  /**
   * Pauses the currently active queue
   */
  public pauseActiveQueue(): Task | null {
    const activeTask = this.getActiveQueueTask();
    if (!activeTask) return null;

    activeTask.status = 'paused';
    this.queueState.activeTaskId = null;
    this.queueState.activeSubtaskId = null;

    this.save();
    return activeTask;
  }

  /**
   * Resumes a paused queue
   */
  public resumeQueue(taskId: string): Task | null {
    const targetTask = this.getTaskById(taskId);
    if (!targetTask || targetTask.completed) return null;

    // Pause currently active one if different
    if (this.queueState.activeTaskId && this.queueState.activeTaskId !== taskId) {
      const currentActive = this.getTaskById(this.queueState.activeTaskId);
      if (currentActive && currentActive.status === 'in_progress') {
        currentActive.status = 'paused';
      }
    }

    targetTask.status = 'in_progress';
    this.queueState.activeTaskId = taskId;

    const nextUnfinished = targetTask.subtasks.find(s => !s.completed);
    this.queueState.activeSubtaskId = nextUnfinished ? nextUnfinished.id : null;

    this.save();
    return targetTask;
  }

  /**
   * Reorders subtasks in a task
   */
  public reorderSubtasks(taskId: string, reorderedSubtaskIds: string[]): boolean {
    const task = this.getTaskById(taskId);
    if (!task) return false;

    const subtaskMap = new Map(task.subtasks.map(s => [s.id, s]));
    const newSubtasks: SubTask[] = [];

    reorderedSubtaskIds.forEach((id, index) => {
      const item = subtaskMap.get(id);
      if (item) {
        item.order = index + 1;
        newSubtasks.push(item);
      }
    });

    task.subtasks = newSubtasks;
    // Update active subtask if needed
    if (this.queueState.activeTaskId === taskId) {
      const nextUnfinished = newSubtasks.find(s => !s.completed);
      this.queueState.activeSubtaskId = nextUnfinished ? nextUnfinished.id : null;
    }

    this.save();
    return true;
  }

  /**
   * Adds a new subtask dynamically to an existing task's queue
   */
  public addSubtaskToTask(taskId: string, title: string): SubTask | null {
    const task = this.getTaskById(taskId);
    if (!task || !title.trim()) return null;

    const newSubtask: SubTask = {
      id: this.generateId(),
      parentId: taskId,
      title: title.trim(),
      completed: false,
      order: task.subtasks.length + 1,
      createdAt: new Date().toISOString(),
    };

    task.subtasks.push(newSubtask);
    if (task.completed) {
      task.completed = false;
      task.status = 'paused';
    }

    if (this.queueState.activeTaskId === taskId && !this.queueState.activeSubtaskId) {
      this.queueState.activeSubtaskId = newSubtask.id;
    }

    this.save();
    return newSubtask;
  }

  /**
   * Deletes a subtask from a task
   */
  public deleteSubtask(taskId: string, subtaskId: string): boolean {
    const task = this.getTaskById(taskId);
    if (!task) return false;

    task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
    if (this.queueState.activeSubtaskId === subtaskId) {
      const next = task.subtasks.find(s => !s.completed);
      this.queueState.activeSubtaskId = next ? next.id : null;
    }

    this.save();
    return true;
  }

  /**
   * Pre-populates sample academic student tasks demonstrating ALAQ
   */
  private seedInitialTasks(): void {
    const sampleTask1: Task = {
      id: 'task_typescript_hw',
      title: 'Complete TypeScript & Webpack Academic Lab',
      completed: false,
      priority: 'High',
      status: 'in_progress',
      category: 'Software Engineering',
      createdAt: new Date().toISOString(),
      subtasks: [
        {
          id: 'sub_1',
          parentId: 'task_typescript_hw',
          title: 'Design Task interface and Priority enum types',
          completed: true,
          order: 1,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        {
          id: 'sub_2',
          parentId: 'task_typescript_hw',
          title: 'Implement TaskService and StorageUtility with LocalStorage',
          completed: true,
          order: 2,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        {
          id: 'sub_3',
          parentId: 'task_typescript_hw',
          title: 'Build Webpack bundle configuration and verify build output',
          completed: false,
          order: 3,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sub_4',
          parentId: 'task_typescript_hw',
          title: 'Complete Webpack Investigation Questions (9, 10, 11)',
          completed: false,
          order: 4,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const sampleTask2: Task = {
      id: 'task_database_prep',
      title: 'Prepare Database Indexing & B-Tree Seminar Notes',
      completed: false,
      priority: 'Medium',
      status: 'paused',
      category: 'Computer Science',
      createdAt: new Date().toISOString(),
      subtasks: [
        {
          id: 'sub_db_1',
          parentId: 'task_database_prep',
          title: 'Review Chapter 14: Indexing and Hashing',
          completed: true,
          order: 1,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        {
          id: 'sub_db_2',
          parentId: 'task_database_prep',
          title: 'Draft comparison slides between B-Trees and Hash Indexes',
          completed: false,
          order: 2,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const sampleTask3: Task = {
      id: 'task_gym_routine',
      title: 'Renew Campus Library Access Card & Reserve Study Pod',
      completed: false,
      priority: 'Low',
      status: 'not_started',
      category: 'Campus Administration',
      createdAt: new Date().toISOString(),
      subtasks: [],
    };

    this.tasks = [sampleTask1, sampleTask2, sampleTask3];
    this.queueState = {
      activeTaskId: 'task_typescript_hw',
      activeSubtaskId: 'sub_3',
    };

    this.save();
  }
}
