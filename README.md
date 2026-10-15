# A.L.A.Q. — A List, A Queue
### Student Academic Task & Execution Management System
> *“The List manages commitments. The Queue manages execution. Switching is allowed; losing track of unfinished work isn't.”*

Built with **TypeScript** and **Webpack** in full fulfillment of the Department Student Task Management requirements and the A.L.A.Q. execution paradigm.

---

## Quick Start Instructions

### 1. Installation
All dependencies are already installed in `node_modules/`. To reinstall if needed:
```bash
npm install
```

### 2. Production Build (Webpack)
To bundle the TypeScript application and generate the production assets in `dist/`:
```bash
npm run build
```
This generates:
- `dist/bundle.js` — Minified, browser-ready bundle
- `dist/bundle.js.map` — Source map for debugging
- `dist/index.html` — Production HTML referencing the bundle

### 3. Running Locally
Run the static server:
```bash
node serve.js
```
Then open your browser at:
```
http://localhost:8080/
```

Or run Webpack Dev Server:
```bash
npm run dev
```

---

## Architectural Highlights

- **[types/task.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/types/task.ts)**: Task data models, Priority union types (`'High' | 'Medium' | 'Low'`), SubTask representation, and QueueState.
- **[services/taskService.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/services/taskService.ts)**: Pure business logic for adding, retrieving, toggling completion, deleting tasks, handling Tackle breakdowns, advancing active subtasks, and pausing/resuming queues.
- **[utils/storage.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/utils/storage.ts)**: LocalStorage persistence module for tasks and queue pointers.
- **[ui/domRenderer.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/ui/domRenderer.ts)**: Modular DOM rendering, tab switching between The List and The Queue, Tackle modal manager, and reactive counter updates.
- **[index.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/index.ts)**: Entry point orchestrating modules and binding styles.
- **[styles/index.css](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/styles/index.css)**: Modern glassmorphic aesthetic with dark theme, smooth micro-animations, and Outfit/Inter typography.
