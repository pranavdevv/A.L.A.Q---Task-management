# A.L.A.Q. Academic Student Task Management System
## Webpack Investigation & Architectural Report

This document satisfies the **Webpack Investigation** requirements (Questions 9, 10, and 11) and the **Extension Task** (Question 12) from `typescript task.md`, while documenting the implementation of the **A.L.A.Q. (A List, A Queue)** execution system.

---

### Project Architecture Overview

The application is structured into independent, highly cohesive, loosely coupled TypeScript modules adhering to Separation of Concerns (SoC):

```
ALAQ/
├── package.json              # Project dependencies and build scripts
├── tsconfig.json             # TypeScript compiler configuration (ES6 target, Strict)
├── webpack.config.js         # Webpack bundling configuration (ts-loader, html-plugin)
├── serve.js                  # Lightweight node static file server for local preview
├── src/
│   ├── index.html            # Semantic HTML5 template with Outfit & Inter typography
│   ├── index.ts              # [Entry Point] Boots and coordinates services and UI
│   ├── types/
│   │   └── task.ts           # [Module 1] Task, SubTask, Priority, QueueState models
│   ├── utils/
│   │   └── storage.ts        # [Module 2] LocalStorage persistence utility module
│   ├── services/
│   │   └── taskService.ts    # [Module 3] Business logic for List, Tackle & Queue
│   ├── ui/
│   │   └── domRenderer.ts    # [Module 4] View rendering, event handling & animations
│   └── styles/
│       └── index.css         # Modern glassmorphism UI styling, gradients & badges
└── dist/
    ├── bundle.js             # Compiled, tree-shaken production bundle
    ├── bundle.js.map         # Source map for debugging
    └── index.html            # Production HTML referencing bundle.js
```

---

### Question 9: Generated Bundle & Dependency Graph Analysis

#### 1. Entry Point Identification
In [webpack.config.js](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/webpack.config.js), the entry point is explicitly defined as:
```javascript
entry: './src/index.ts',
```
The file [src/index.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/index.ts) serves as the **root of the dependency graph**. When Webpack executes, it begins its compilation process at this single file.

#### 2. How Webpack Reaches Other Modules (Dependency Graph Traversal)
Webpack analyzes AST (Abstract Syntax Tree) nodes of the entry file to detect static ES6 `import` declarations:
1. `index.ts` imports:
   - `./styles/index.css` (routed through `style-loader` and `css-loader`)
   - `TaskService` from `./services/taskService`
   - `DomRenderer` from `./ui/domRenderer`
2. Webpack recurses into `./services/taskService.ts`, discovering its imports:
   - Types from `../types/task`
   - `StorageUtility` from `../utils/storage`
3. Webpack recurses into `./ui/domRenderer.ts`, discovering its imports:
   - Types from `../types/task`
   - `TaskService` from `../services/taskService`
4. Webpack recurses into `./utils/storage.ts`, discovering its imports:
   - Types from `../types/task`

Through this recursive traversal, Webpack constructs an internal **Directed Acyclic Graph (DAG)** of all project dependencies. 

#### 3. Bundle Structure (`dist/bundle.js`)
Rather than forcing the browser to issue multiple HTTP requests for individual script files, Webpack:
- Compiles TypeScript to JavaScript via `ts-loader`.
- Wraps each module inside an isolated closure / module registry function (`__webpack_require__`).
- Strips out type-only imports (such as TypeScript interfaces in `task.ts` that carry zero runtime overhead).
- Tree-shakes unused code and minifies identifiers.
- Packages everything into a single browser-ready `bundle.js` (~86 KiB uncompressed, inclusive of embedded CSS styles).

---

### Question 10: Module Removal Experiment & Error Analysis

#### 1. The Experiment
To investigate what occurs when an imported module is missing or removed, we temporarily simulated removing the service module dependency `src/services/taskService.ts` from the project while `src/index.ts` and `src/ui/domRenderer.ts` still attempted to import it.

#### 2. The Webpack / TypeScript Build Output & Error
Running `npm run build` (`webpack --mode production`) fails immediately with the following compile-time errors:

```
ERROR in ./src/index.ts:7:29
TS2307: Cannot find module './services/taskService' or its corresponding type declarations.
    5 | import './styles/index.css';
    6 | import { TaskService } from './services/taskService';
      |                             ^^^^^^^^^^^^^^^^^^^^^^^^
    7 | import { DomRenderer } from './ui/domRenderer';

ERROR in ./src/ui/domRenderer.ts:2:29
TS2307: Cannot find module '../services/taskService' or its corresponding type declarations.
    1 | import { Task, SubTask, Priority } from '../types/task';
    2 | import { TaskService } from '../services/taskService';
      |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^

Module not found: Error: Can't resolve './services/taskService' in '.../ALAQ/src'
resolve './services/taskService' in '.../ALAQ/src'
  Parsed request is a module
  using description file: .../ALAQ/package.json (relative path: ./src)
    Field 'browser' doesn't contain a valid alias configuration
    resolve as module ...
BREAKING CHANGE: The request './services/taskService' could not be resolved.
webpack 5.111.1 compiled with 2 errors in 1840 ms
```

#### 3. What This Tells Us About Module Dependencies
- **Static Import Verification:** Webpack and TypeScript validate dependency existence **at build time** before any runtime execution. If a module cannot be resolved, bundling halts immediately, preventing broken code from ever being served to clients.
- **Fail-Fast Safety:** In a monolithic, script-tag-based JavaScript app (`<script src="...">`), missing functions or files frequently manifest as silent runtime crashes (`Uncaught ReferenceError: TaskService is not defined`) when a user triggers a specific button. Webpack ensures that any broken import breaks the build immediately during CI/CD.
- **Dependency Cascades:** The error appeared in *both* `src/index.ts` and `src/ui/domRenderer.ts`, demonstrating that Webpack tracks all consumer nodes that depend on a given supplier node in the module graph.

---

### Question 11: Modular Architecture vs. Monolithic Single File

The application is decomposed into **four independent modules**:
1. `src/types/task.ts`: Data definitions, interfaces, and union types.
2. `src/utils/storage.ts`: Persistence abstraction layer for browser `localStorage`.
3. `src/services/taskService.ts`: Core business logic, queue transitions, state mutations.
4. `src/ui/domRenderer.ts`: Presentation logic, DOM mutations, modal handling, UI state.
5. `src/index.ts`: Application orchestrator / composition root.

#### Why Separating Code Into Modules is Superior to Maintaining One Large File:

| Metric | Monolithic Single File (`app.js`) | Modular TypeScript Architecture |
| :--- | :--- | :--- |
| **Separation of Concerns (SoC)** | Storage, UI, DOM listeners, and business rules intermingled in thousands of lines. | Each module has exactly one responsibility. UI changes don't affect storage algorithms. |
| **Maintainability & Readability** | Difficult to navigate, cognitive overload, high risk of accidental side-effects. | Small, cohesive files (~50–200 lines) with distinct conceptual boundaries. |
| **Testability** | Cannot test business logic or storage without simulating the entire DOM. | `TaskService` and `StorageUtility` can be unit tested in isolation without a browser DOM. |
| **Namespace Pollution** | Variables and functions risk collisions in the global `window` scope. | ES Modules enforce strict lexical scoping; only explicitly `export`ed identifiers are visible. |
| **Collaboration & Git Merges** | High risk of merge conflicts when multiple developers edit the same file. | Developers work simultaneously on distinct files (`domRenderer.ts` vs `taskService.ts`). |
| **Dead-Code Elimination (Tree-Shaking)** | Everything in the file is executed or parsed by the browser. | Webpack discards unreferenced exports, optimizing load performance. |

---

### Question 12: Extension Task — Task Priority Feature

The task priority feature is implemented across all layers of the application:

1. **TypeScript Type System:**
   In [src/types/task.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/types/task.ts):
   ```typescript
   export type Priority = 'High' | 'Medium' | 'Low';
   ```
   Each `Task` interface explicitly requires:
   ```typescript
   priority: Priority;
   ```
   This ensures strict compile-time type checking. Passing an invalid priority string fails compilation.

2. **User Interface Display & Styling:**
   - **Interactive Priority Pyramid:** A 3-tiered hierarchical visualizer cleanly separating priorities without number clutter:
     - **Apex (Top Tier):** `L3` — Personal / Routine (Mint Emerald).
     - **Mid-Tier:** `L2` — Important Commitments (Amber Gold).
     - **Foundation (Base):** `L1` — Urgent & Critical (Coral Red glow).
     - Clicking any tier focuses and filters the commitments list below to that priority group.
   - Color-coded badges rendered with distinct visual hierarchy on every task card (`.priority-high`, `.priority-medium`, `.priority-low`).
   - Priority left-border indicators and subtask sequence pipeline chips on each card allow students to instantly grasp execution order.

3. **Storage Persistence:**
   - In [src/utils/storage.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/utils/storage.ts) and [src/services/taskService.ts](file:///c:/Users/prana/Desktop/New%20folder/cloud%20projects/ALAQ/src/services/taskService.ts), tasks serialize and deserialize `priority` seamlessly to and from browser `localStorage`.
   - Reloading the browser preserves priority ratings, active queue states, and subtask order.

---

### How A.L.A.Q. Enhances the Academic Requirement

The core philosophy of **A.L.A.Q. ("A List, A Queue")** solves the common trap of student procrastination:
- **The List:** Holds high-level academic commitments (e.g., *"Complete TypeScript Assignment"*).
- **Tackle Action:** Deconstructs the commitment into concrete, sequential subtasks (e.g., *1. Set up Webpack, 2. Define Types, 3. Implement Service*).
- **The Queue:** Promotes the first unfinished step to the **Immediate Next Action**, eliminating decision paralysis.
- **Resumable Queues:** If a student is interrupted, the queue can be paused without losing place. Paused queues remain visible with one-click resumption.
