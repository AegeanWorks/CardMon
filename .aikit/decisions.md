# Decisions

Why this project is built the way it is, oldest first. One entry per decision that changes a
contract, a dependency, a data format or the architecture; IDs are consecutive and never reused.

### ADR-001: AIKit Integration with Zero-Dependency Node.js Test Harness
- **Date**: 2026-11-14
- **Status**: Accepted
- **Context**: CardMon was a standalone vanilla JavaScript/HTML/CSS web app without automated testing, disruption recovery, or standardized AI governance.
- **Decision**: Integrate CardMon into AIKit using pure standard-library Node.js test runner (`node --test`) via vm sandbox harness, adopt Aegean License 1.1 (AL-1.1), configure hygiene exceptions for web fonts and exchange rates API, and establish full AIKit memory (.aikit/project.json, task ledger, guidelines, decisions).
- **Consequences**: CardMon gains automated regression testing, disruption recovery checkpointing, and pre-commit verification gates without introducing heavy external npm build tooling or runtime dependencies.

### ADR-002: Codebase Decomposition into Domain-Scoped Modules
- **Date**: 2026-11-14
- **Status**: Accepted
- **Context**: The monolithic `app.js` (6,459 lines) and `styles.css` (4,252 lines) concentrated disparate responsibilities (state, views, calculations, modals, and reporting) into two unwieldy files.
- **Decision**: Decompose `styles.css` into modular CSS layers (`css/base.css`, `css/layout.css`, `css/components.css`, `css/views.css`, `css/modals.css`) aggregated by `styles.css` via `@import`. Decompose `app.js` into 9 focused JavaScript modules under `js/` (`constants.js`, `utils.js`, `state.js`, `smart-advisor.js`, `backup-vault.js`, `views.js`, `modals.js`, `reports.js`, `main.js`), preserve global window interface bindings in `js/main.js` for HTML event handlers, and update the test runner harness to load modules deterministically.
- **Consequences**: Improves domain boundaries, readability, and long-term maintainability while keeping zero runtime dependencies and 100% backward compatibility with browsers.

### ADR-003: Native File System Persistence with Universal Fallback
- **Date**: 2026-11-14
- **Status**: Accepted
- **Context**: CardMon previously relied exclusively on browser localStorage and manual JSON/CSV/PDF downloads. Users needed desktop-grade file persistence, direct file synchronization to local disk, Ctrl+S shortcuts, and dirty change tracking without requiring a backend server.
- **Decision**: Implement native file system persistence in `js/file-system.js` using the modern File System Access API (`showSaveFilePicker`, `showOpenFilePicker`, `createWritable`), with a versioned envelope format (`.cardmon` / `.json`, schema version 3.0), backward compatibility for legacy v1/v2 backups, automatic fallback to Blob download and file input on unsupported browsers, keyboard shortcut integration (Ctrl+S / Cmd+S), and dirty state indicator in the top navigation bar.
- **Consequences**: Enables true local-first desktop persistence directly on user disk files, provides instant saving with dirty status feedback, retains 100% offline and client-side privacy, and maintains universal cross-browser compatibility.
