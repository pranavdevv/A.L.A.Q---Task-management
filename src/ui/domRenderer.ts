import { Task, SubTask, Priority } from '../types/task';
import { TaskService } from '../services/taskService';

/**
 * DOM Renderer Module
 * Encapsulates all HTML rendering, event listeners binding, and view transitions.
 * Follows strict modular UI architecture.
 */

export class DomRenderer {
  private taskService: TaskService;
  private currentTab: 'list' | 'queue' = 'list';
  private listFilter: 'all' | 'pending' | 'completed' = 'all';

  private selectedPriorityFilter: Priority | null = null;

  // Elements cache
  private elTabListBtn!: HTMLButtonElement;
  private elTabQueueBtn!: HTMLButtonElement;
  private elTabListContent!: HTMLElement;
  private elTabQueueContent!: HTMLElement;
  private elPendingBadge!: HTMLElement;
  private elActiveQueuePulse!: HTMLElement;

  // Pyramid elements
  private elPyramidWrapper!: HTMLElement;
  private elPyramidFilterStatus!: HTMLElement;
  private elBtnResetNodeFilter!: HTMLButtonElement;
  private elListSectionHeading!: HTMLElement;
  private elListSectionSubhint!: HTMLElement;

  // Modal elements
  private elTackleModal!: HTMLElement;
  private elTackleTaskTitle!: HTMLElement;
  private elTackleSubtaskList!: HTMLElement;
  private currentTackleTaskId: string | null = null;

  constructor(taskService: TaskService) {
    this.taskService = taskService;
  }

  public init(): void {
    this.cacheElements();
    this.bindGlobalEvents();
    this.render();
  }

  private cacheElements(): void {
    this.elTabListBtn = document.getElementById('tab-btn-list') as HTMLButtonElement;
    this.elTabQueueBtn = document.getElementById('tab-btn-queue') as HTMLButtonElement;
    this.elTabListContent = document.getElementById('tab-content-list') as HTMLElement;
    this.elTabQueueContent = document.getElementById('tab-content-queue') as HTMLElement;
    this.elPendingBadge = document.getElementById('pending-count-badge') as HTMLElement;
    this.elActiveQueuePulse = document.getElementById('active-queue-pulse') as HTMLElement;

    // Pyramid visualizer elements
    this.elPyramidWrapper = document.getElementById('pyramid-wrapper') as HTMLElement;
    this.elPyramidFilterStatus = document.getElementById('pyramid-filter-status') as HTMLElement;
    this.elBtnResetNodeFilter = document.getElementById('btn-reset-node-filter') as HTMLButtonElement;
    this.elListSectionHeading = document.getElementById('list-section-heading') as HTMLElement;
    this.elListSectionSubhint = document.getElementById('list-section-subhint') as HTMLElement;

    this.elTackleModal = document.getElementById('tackle-modal') as HTMLElement;
    this.elTackleTaskTitle = document.getElementById('tackle-modal-task-title') as HTMLElement;
    this.elTackleSubtaskList = document.getElementById('tackle-subtask-list') as HTMLElement;
  }

  private bindGlobalEvents(): void {
    // Tab switching
    this.elTabListBtn.addEventListener('click', () => this.switchTab('list'));
    this.elTabQueueBtn.addEventListener('click', () => this.switchTab('queue'));

    // Reset priority filter button
    if (this.elBtnResetNodeFilter) {
      this.elBtnResetNodeFilter.addEventListener('click', () => {
        this.selectedPriorityFilter = null;
        this.renderList();
      });
    }

    // New task form submission
    const form = document.getElementById('new-task-form') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('task-title-input') as HTMLInputElement;
        const prioritySelect = document.getElementById('task-priority-select') as HTMLSelectElement;
        const categoryInput = document.getElementById('task-category-input') as HTMLInputElement;

        const title = input.value.trim();
        if (!title) return;

        const priority = prioritySelect.value as Priority;
        const category = categoryInput.value.trim() || 'Academic';

        this.taskService.addTask(title, priority, category);
        input.value = '';
        this.render();
      });
    }

    // Filter pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        filterPills.forEach(p => p.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.listFilter = (target.dataset.filter || 'all') as any;
        this.renderList();
      });
    });

    // Tackle Modal close events
    const closeBtn = document.getElementById('close-tackle-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeTackleModal());

    const cancelBtn = document.getElementById('cancel-tackle-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeTackleModal());

    const addSubtaskInputBtn = document.getElementById('add-subtask-row-btn');
    if (addSubtaskInputBtn) {
      addSubtaskInputBtn.addEventListener('click', () => this.appendSubtaskRow());
    }

    const commitTackleBtn = document.getElementById('commit-tackle-btn');
    if (commitTackleBtn) {
      commitTackleBtn.addEventListener('click', () => this.handleCommitTackle());
    }
  }

  public switchTab(tab: 'list' | 'queue'): void {
    this.currentTab = tab;
    if (tab === 'list') {
      this.elTabListBtn.classList.add('active');
      this.elTabQueueBtn.classList.remove('active');
      this.elTabListContent.classList.remove('hidden');
      this.elTabQueueContent.classList.add('hidden');
      this.renderList();
    } else {
      this.elTabQueueBtn.classList.add('active');
      this.elTabListBtn.classList.remove('active');
      this.elTabQueueContent.classList.remove('hidden');
      this.elTabListContent.classList.add('hidden');
      this.renderQueue();
    }
  }

  public render(): void {
    this.updateCounters();
    if (this.currentTab === 'list') {
      this.renderList();
    } else {
      this.renderQueue();
    }
  }

  private updateCounters(): void {
    const pendingCount = this.taskService.getPendingTaskCount();
    this.elPendingBadge.textContent = pendingCount.toString();

    const activeTask = this.taskService.getActiveQueueTask();
    if (activeTask) {
      this.elActiveQueuePulse.classList.remove('hidden');
    } else {
      this.elActiveQueuePulse.classList.add('hidden');
    }

    const totalCountEl = document.getElementById('stat-total-tasks');
    if (totalCountEl) totalCountEl.textContent = this.taskService.getTotalTaskCount().toString();

    const pendingCountEl = document.getElementById('stat-pending-tasks');
    if (pendingCountEl) pendingCountEl.textContent = pendingCount.toString();

    const completedCountEl = document.getElementById('stat-completed-tasks');
    if (completedCountEl) {
      const completedCount = this.taskService.getTasks().filter(t => t.completed).length;
      completedCountEl.textContent = completedCount.toString();
    }
  }

  // -------------------------------------------------------------
  // VISUALIZER HUB: PRIORITY PYRAMID (NO NUMBERS)
  // -------------------------------------------------------------
  private renderVisualizer(): void {
    // Update Filter Status text
    if (this.selectedPriorityFilter) {
      const label = this.selectedPriorityFilter === 'High' ? 'L1 — High Priority' :
                    this.selectedPriorityFilter === 'Medium' ? 'L2 — Medium Priority' : 'L3 — Low / Personal';
      this.elPyramidFilterStatus.innerHTML = `Focused Tier: <strong>${label}</strong>`;
      if (this.elBtnResetNodeFilter) {
        this.elBtnResetNodeFilter.classList.remove('hidden');
      }
      if (this.elListSectionHeading) {
        this.elListSectionHeading.textContent = `${label} Commitments`;
      }
      if (this.elListSectionSubhint) {
        this.elListSectionSubhint.textContent = `Showing only ${label} tasks. Click the tier again or 'Show All Tasks' to view everything.`;
      }
    } else {
      this.elPyramidFilterStatus.innerHTML = `Showing: <strong>All Commitments</strong>`;
      if (this.elBtnResetNodeFilter) {
        this.elBtnResetNodeFilter.classList.add('hidden');
      }
      if (this.elListSectionHeading) {
        this.elListSectionHeading.textContent = `All Commitments`;
      }
      if (this.elListSectionSubhint) {
        this.elListSectionSubhint.textContent = `Click any pyramid tier to focus on that priority group.`;
      }
    }

    // Render Pyramid Tiers (Apex L3 at Top, Mid L2 in Middle, Base L1 at Bottom) - NO NUMBERS
    if (this.elPyramidWrapper) {
      this.elPyramidWrapper.innerHTML = '';

      const pyramidDefs: Array<{
        priority: Priority;
        code: string;
        title: string;
        desc: string;
        tierClass: string;
        tagClass: string;
      }> = [
        { priority: 'Low', code: 'L3', title: 'Personal / Routine (Apex)', desc: 'Flexible goals, chores & lower priority activities', tierClass: 'tier-l3', tagClass: 'priority-low' },
        { priority: 'Medium', code: 'L2', title: 'Important Commitments (Mid-tier)', desc: 'Core academic coursework & scheduled milestones', tierClass: 'tier-l2', tagClass: 'priority-medium' },
        { priority: 'High', code: 'L1', title: 'Urgent & Critical (Foundation Base)', desc: 'Must-do commitments with impending deadlines', tierClass: 'tier-l1', tagClass: 'priority-high' },
      ];

      pyramidDefs.forEach(tier => {
        const elTier = document.createElement('div');
        const isFocused = this.selectedPriorityFilter === tier.priority;
        elTier.className = `pyramid-tier ${tier.tierClass} ${isFocused ? 'is-focused' : ''}`;
        elTier.setAttribute('title', `Click to focus on ${tier.code} (${tier.title}) commitments`);

        elTier.innerHTML = `
          <div class="tier-left-info">
            <span class="tier-code-tag ${tier.tagClass}">${tier.code}</span>
            <div class="tier-title-group">
              <h4>${tier.title}</h4>
              <p>${tier.desc}</p>
            </div>
          </div>
          <span class="tier-action-pill ${isFocused ? 'is-active' : ''}">
            ${isFocused ? 'Focused ✓' : 'Focus Tier →'}
          </span>
        `;

        elTier.addEventListener('click', () => {
          if (this.selectedPriorityFilter === tier.priority) {
            this.selectedPriorityFilter = null;
          } else {
            this.selectedPriorityFilter = tier.priority;
          }
          this.renderList();
        });

        this.elPyramidWrapper.appendChild(elTier);
      });
    }
  }

  // -------------------------------------------------------------
  // THE LIST RENDERING
  // -------------------------------------------------------------
  private renderList(): void {
    // Render the interactive visualizer hub first
    this.renderVisualizer();

    const listContainer = document.getElementById('task-items-container');
    if (!listContainer) return;

    let tasks = this.taskService.getTasks();

    // Priority filter (from Pyramid tier click)
    if (this.selectedPriorityFilter) {
      tasks = tasks.filter(t => t.priority === this.selectedPriorityFilter);
    }

    // Status filter (from pills)
    if (this.listFilter === 'pending') {
      tasks = tasks.filter(t => !t.completed);
    } else if (this.listFilter === 'completed') {
      tasks = tasks.filter(t => t.completed);
    }

    if (tasks.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-icon">📝</div>
          <h3>No tasks found in this view</h3>
          <p>${this.selectedPriorityFilter ? `No ${this.selectedPriorityFilter} priority tasks. Click 'Show All Tasks' to view all.` : 'Add an academic outcome above to get started with your commitments!'}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = `task-card ${task.completed ? 'is-completed' : ''} priority-${task.priority.toLowerCase()} status-${task.status}`;

      const totalSub = task.subtasks.length;
      const completedSub = task.subtasks.filter(s => s.completed).length;
      const percent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

      let statusBadgeLabel = 'Not Started';
      let statusBadgeClass = 'badge-not-started';
      if (task.completed) {
        statusBadgeLabel = 'Completed';
        statusBadgeClass = 'badge-completed';
      } else if (task.status === 'in_progress') {
        statusBadgeLabel = 'In Queue (Active)';
        statusBadgeClass = 'badge-in-progress';
      } else if (task.status === 'paused') {
        statusBadgeLabel = 'Queue Paused';
        statusBadgeClass = 'badge-paused';
      }

      // Build Subtasks sequence preview chips (Uncollapsed view!)
      let subtasksPreviewHtml = '';
      if (totalSub > 0) {
        const chipsHtml = task.subtasks.map((st, idx) => `
          <span class="subtask-chip ${st.completed ? 'is-done' : ''}">
            <span class="chip-step-num">#${idx + 1}</span>
            <span>${st.completed ? '✓ ' : ''}${this.escapeHtml(st.title)}</span>
          </span>
        `).join('');

        subtasksPreviewHtml = `
          <div class="task-card-subtasks-preview">
            <div class="subtasks-preview-header">
              <span>Execution Steps (${completedSub} of ${totalSub} complete &bull; ${percent}%)</span>
              <span>${task.status === 'in_progress' ? '⚡ Executing in Queue' : 'Planned Breakdown'}</span>
            </div>
            <div class="progress-bar-container" style="height: 4px; margin-bottom: 0.5rem;">
              <div class="progress-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <div class="subtasks-chips-flow">
              ${chipsHtml}
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="task-card-main-row">
          <div class="task-card-left">
            <label class="custom-checkbox" title="Toggle completion (Hybrid mode)">
              <input type="checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}" class="task-checkbox">
              <span class="checkmark"></span>
            </label>
            <div class="task-info">
              <div class="task-title-row">
                <span class="task-title ${task.completed ? 'strikethrough' : ''}">${this.escapeHtml(task.title)}</span>
              </div>
              <div class="task-meta-row">
                <span class="badge priority-badge priority-${task.priority.toLowerCase()}">
                  ${task.priority === 'High' ? 'L1 High' : task.priority === 'Medium' ? 'L2 Medium' : 'L3 Low'}
                </span>
                <span class="badge ${statusBadgeClass}">${statusBadgeLabel}</span>
                <span class="badge category-badge">${this.escapeHtml(task.category || 'Academic')}</span>
                ${totalSub > 0 ? `<span class="badge subtasks-progress-badge">🎯 ${completedSub}/${totalSub} steps</span>` : ''}
              </div>
            </div>
          </div>
          <div class="task-card-actions">
            <button class="action-btn tackle-btn" data-task-id="${task.id}" title="Break down task into execution queue">
              <span class="icon">⚡</span> ${totalSub > 0 ? 'Edit Plan' : 'Tackle'}
            </button>
            <button class="action-btn delete-btn" data-task-id="${task.id}" title="Remove task">
              <span class="icon">🗑️</span>
            </button>
          </div>
        </div>

        ${subtasksPreviewHtml}
      `;

      // Event bindings
      const checkbox = card.querySelector('.task-checkbox') as HTMLInputElement;
      checkbox.addEventListener('change', () => {
        this.taskService.toggleTaskCompletion(task.id);
        this.render();
      });

      const tackleBtn = card.querySelector('.tackle-btn') as HTMLButtonElement;
      tackleBtn.addEventListener('click', () => {
        this.openTackleModal(task.id);
      });

      const deleteBtn = card.querySelector('.delete-btn') as HTMLButtonElement;
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Remove task "${task.title}"?`)) {
          this.taskService.deleteTask(task.id);
          this.render();
        }
      });

      listContainer.appendChild(card);
    });
  }

  // -------------------------------------------------------------
  // THE QUEUE RENDERING
  // -------------------------------------------------------------
  private renderQueue(): void {
    const queueViewContainer = document.getElementById('queue-view-container');
    if (!queueViewContainer) return;

    const activeTask = this.taskService.getActiveQueueTask();
    const pausedTasks = this.taskService.getPausedQueueTasks();

    queueViewContainer.innerHTML = '';

    if (!activeTask) {
      // Empty Active Queue state
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'queue-hero-empty';
      emptyDiv.innerHTML = `
        <div class="empty-state-card queue-focus-card">
          <div class="empty-icon-large">🎯</div>
          <h2>No Active Queue in Focus</h2>
          <p>The Queue manages concrete execution. Choose a commitment from <strong>The List</strong> and click <strong>Tackle</strong> to load actionable steps.</p>
          <button class="btn-primary" id="btn-go-to-list">
            ← Browse The List
          </button>
        </div>
      `;
      queueViewContainer.appendChild(emptyDiv);

      const goBtn = emptyDiv.querySelector('#btn-go-to-list');
      if (goBtn) goBtn.addEventListener('click', () => this.switchTab('list'));
    } else {
      // Active Queue exists!
      const totalSteps = activeTask.subtasks.length;
      const completedSteps = activeTask.subtasks.filter(s => s.completed).length;
      const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      const activeSubtask = activeTask.subtasks.find(s => !s.completed);

      const activeQueueHero = document.createElement('div');
      activeQueueHero.className = 'active-queue-hero';
      activeQueueHero.innerHTML = `
        <div class="queue-header-bar">
          <div class="queue-header-titles">
            <div class="queue-status-tag">
              <span class="pulse-dot"></span> CURRENTLY EXECUTING QUEUE
            </div>
            <h2 class="active-parent-title">${this.escapeHtml(activeTask.title)}</h2>
            <div class="active-parent-meta">
              <span class="badge priority-${activeTask.priority.toLowerCase()}">
                ${activeTask.priority === 'High' ? 'L1 High Priority' : activeTask.priority === 'Medium' ? 'L2 Medium' : 'L3 Low'}
              </span>
              <span class="badge category-badge">${this.escapeHtml(activeTask.category || 'Academic')}</span>
              <span class="badge subtasks-progress-badge">Progress: ${completedSteps} of ${totalSteps} completed (${progressPercent}%)</span>
            </div>
          </div>
          <div class="queue-header-controls">
            <button class="btn-secondary" id="btn-pause-queue" title="Pause queue to attend to other work">
              ⏸️ Pause Queue
            </button>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>

        <!-- HERO ACTIVE SUBTASK BOX -->
        ${activeSubtask ? `
          <div class="active-subtask-focus-card">
            <div class="focus-label">🎯 IMMEDIATE NEXT ACTION (DO THIS NOW)</div>
            <h3 class="active-subtask-title">${this.escapeHtml(activeSubtask.title)}</h3>
            <p class="focus-subtext">Focus on completing this single action item. Once done, the queue automatically advances.</p>
            <div class="focus-actions">
              <button class="btn-accent-large" id="btn-complete-subtask">
                ✅ Complete Action & Next Step
              </button>
            </div>
          </div>
        ` : `
          <div class="all-subtasks-done-card">
            <h3>🎉 All Queue Subtasks Completed!</h3>
            <p>Parent commitment "${this.escapeHtml(activeTask.title)}" is ready to complete.</p>
          </div>
        `}

        <!-- REMAINING SUBTASKS ORDER -->
        <div class="queue-subsections-grid">
          <div class="queue-column">
            <div class="column-header">
              <h4>⏳ Remaining Planned Actions (${activeTask.subtasks.filter(s => !s.completed).length})</h4>
              <button class="btn-sm" id="btn-add-inline-subtask">+ Add Step</button>
            </div>
            <div class="remaining-subtasks-list" id="remaining-subtasks-container"></div>
          </div>

          <div class="queue-column">
            <div class="column-header">
              <h4>📜 Execution History (${completedSteps})</h4>
            </div>
            <div class="completed-history-list" id="completed-history-container"></div>
          </div>
        </div>
      `;

      queueViewContainer.appendChild(activeQueueHero);

      // Event listener: Pause Queue
      const pauseBtn = activeQueueHero.querySelector('#btn-pause-queue');
      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
          this.taskService.pauseActiveQueue();
          this.render();
        });
      }

      // Event listener: Complete Active Subtask
      const completeSubtaskBtn = activeQueueHero.querySelector('#btn-complete-subtask');
      if (completeSubtaskBtn) {
        completeSubtaskBtn.addEventListener('click', () => {
          const res = this.taskService.completeActiveSubtask();
          if (res && res.isQueueFinished) {
            alert(`🎉 Fantastic! All subtasks completed. "${res.task.title}" has been marked complete on The List!`);
          }
          this.render();
        });
      }

      // Event listener: Add inline subtask
      const addInlineBtn = activeQueueHero.querySelector('#btn-add-inline-subtask');
      if (addInlineBtn) {
        addInlineBtn.addEventListener('click', () => {
          const title = prompt('Enter next actionable step to add to this Queue:');
          if (title && title.trim()) {
            this.taskService.addSubtaskToTask(activeTask.id, title);
            this.render();
          }
        });
      }

      // Render remaining subtasks list
      const remainingContainer = activeQueueHero.querySelector('#remaining-subtasks-container') as HTMLElement;
      const remaining = activeTask.subtasks.filter(s => !s.completed);
      if (remaining.length === 0) {
        remainingContainer.innerHTML = `<div class="empty-history">No remaining actions in this queue.</div>`;
      } else {
        remaining.forEach((sub, idx) => {
          const item = document.createElement('div');
          const isCurrent = sub.id === activeSubtask?.id;
          item.className = `queue-subtask-row ${isCurrent ? 'is-current' : ''}`;
          item.innerHTML = `
            <span class="subtask-index">#${idx + 1}</span>
            <span class="subtask-row-title">${this.escapeHtml(sub.title)}</span>
            <div class="subtask-row-actions">
              <button class="btn-icon delete-subtask-btn" title="Remove subtask" data-id="${sub.id}">✕</button>
            </div>
          `;
          const delBtn = item.querySelector('.delete-subtask-btn');
          if (delBtn) {
            delBtn.addEventListener('click', () => {
              this.taskService.deleteSubtask(activeTask.id, sub.id);
              this.render();
            });
          }
          remainingContainer.appendChild(item);
        });
      }

      // Render completed subtasks history
      const historyContainer = activeQueueHero.querySelector('#completed-history-container') as HTMLElement;
      const completed = activeTask.subtasks.filter(s => s.completed);
      if (completed.length === 0) {
        historyContainer.innerHTML = `<div class="empty-history">No actions completed in this queue yet.</div>`;
      } else {
        completed.forEach(sub => {
          const item = document.createElement('div');
          item.className = 'history-subtask-row';
          const time = sub.completedAt ? new Date(sub.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          item.innerHTML = `
            <span class="check-icon">✓</span>
            <span class="history-title">${this.escapeHtml(sub.title)}</span>
            ${time ? `<span class="history-time">${time}</span>` : ''}
          `;
          historyContainer.appendChild(item);
        });
      }
    }

    // Render Paused Queues Section
    if (pausedTasks.length > 0) {
      const pausedSection = document.createElement('div');
      pausedSection.className = 'paused-queues-section';
      pausedSection.innerHTML = `
        <div class="section-title-row">
          <h3>⏸️ Paused Queues (${pausedTasks.length})</h3>
          <span class="section-subtitle">"Switching is allowed; losing track of unfinished work isn't."</span>
        </div>
        <div class="paused-cards-grid"></div>
      `;

      const grid = pausedSection.querySelector('.paused-cards-grid') as HTMLElement;
      pausedTasks.forEach(task => {
        const remainingSub = task.subtasks.filter(s => !s.completed).length;
        const totalSub = task.subtasks.length;
        const card = document.createElement('div');
        card.className = 'paused-queue-card';
        card.innerHTML = `
          <div class="paused-card-top">
            <span class="badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
            <span class="badge category-badge">${this.escapeHtml(task.category || 'Academic')}</span>
          </div>
          <h4 class="paused-task-title">${this.escapeHtml(task.title)}</h4>
          <p class="paused-subtext">${remainingSub} of ${totalSub} subtasks remaining</p>
          <button class="btn-primary-sm btn-resume-queue" data-id="${task.id}">
            ▶️ Resume This Queue
          </button>
        `;

        const resumeBtn = card.querySelector('.btn-resume-queue') as HTMLButtonElement;
        resumeBtn.addEventListener('click', () => {
          this.taskService.resumeQueue(task.id);
          this.render();
        });

        grid.appendChild(card);
      });

      queueViewContainer.appendChild(pausedSection);
    }
  }

  // -------------------------------------------------------------
  // TACKLE MODAL WORKFLOW
  // -------------------------------------------------------------
  public openTackleModal(taskId: string): void {
    const task = this.taskService.getTaskById(taskId);
    if (!task) return;

    this.currentTackleTaskId = taskId;
    this.elTackleTaskTitle.textContent = task.title;
    this.elTackleSubtaskList.innerHTML = '';

    if (task.subtasks.length > 0) {
      task.subtasks.forEach(s => this.appendSubtaskRow(s.title));
    } else {
      // Suggest default scaffolding
      this.appendSubtaskRow('Analyze requirements and gather lecture materials');
      this.appendSubtaskRow('Draft initial implementation or solution');
      this.appendSubtaskRow('Review, test edge cases, and finalize submission');
    }

    this.elTackleModal.classList.remove('hidden');
  }

  public closeTackleModal(): void {
    this.elTackleModal.classList.add('hidden');
    this.currentTackleTaskId = null;
  }

  private appendSubtaskRow(initialValue: string = ''): void {
    const row = document.createElement('div');
    row.className = 'tackle-subtask-row';
    row.innerHTML = `
      <span class="drag-handle">≡</span>
      <input type="text" class="tackle-subtask-input" placeholder="e.g. Write unit tests for service module..." value="${this.escapeHtml(initialValue)}">
      <button type="button" class="btn-icon remove-row-btn" title="Remove step">✕</button>
    `;

    const removeBtn = row.querySelector('.remove-row-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => row.remove());
    }

    this.elTackleSubtaskList.appendChild(row);
    const input = row.querySelector('input');
    if (!initialValue && input) input.focus();
  }

  private handleCommitTackle(): void {
    if (!this.currentTackleTaskId) return;

    const inputs = this.elTackleSubtaskList.querySelectorAll('.tackle-subtask-input') as NodeListOf<HTMLInputElement>;
    const titles: string[] = [];
    inputs.forEach(input => {
      const val = input.value.trim();
      if (val) titles.push(val);
    });

    if (titles.length === 0) {
      alert('Please provide at least one actionable step for this queue!');
      return;
    }

    this.taskService.commitTacklePlan(this.currentTackleTaskId, titles);
    this.closeTackleModal();
    // Switch directly to The Queue tab to start working!
    this.switchTab('queue');
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
