# Decisions

Why this project is built the way it is, oldest first. One entry per decision that changes a
contract, a dependency, a data format or the architecture; IDs are consecutive and never reused.

### ADR-001: AIKit Integration with Zero-Dependency Node.js Test Harness
- **Date**: 2026-11-14
- **Status**: Accepted
- **Context**: CardMon was a standalone vanilla JavaScript/HTML/CSS web app without automated testing, disruption recovery, or standardized AI governance.
- **Decision**: Integrate CardMon into AIKit using pure standard-library Node.js test runner (`node --test`) via vm sandbox harness, adopt Aegean License 1.1 (AL-1.1), configure hygiene exceptions for web fonts and exchange rates API, and establish full AIKit memory (.aikit/project.json, task ledger, guidelines, decisions).
- **Consequences**: CardMon gains automated regression testing, disruption recovery checkpointing, and pre-commit verification gates without introducing heavy external npm build tooling or runtime dependencies.
