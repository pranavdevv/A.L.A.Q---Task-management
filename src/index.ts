/**
 * A.L.A.Q. Student Task Management System
 * Entry Point Module connecting all independent TypeScript modules.
 */

import './styles/index.css';
import { TaskService } from './services/taskService';
import { DomRenderer } from './ui/domRenderer';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing A.L.A.Q. Academic Task Manager...');

  // Initialize service module
  const taskService = new TaskService();

  // Initialize DOM renderer module
  const domRenderer = new DomRenderer(taskService);
  domRenderer.init();

  console.log('A.L.A.Q. initialized successfully with modular TypeScript architecture.');
});
