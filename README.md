# CardMon

[![Built with AIKit](https://img.shields.io/badge/built%20with-AIKit-6f42c1)](https://github.com/AegeanWorks/AIKit)

Smart bank and credit card portfolio manager for tracking limits, debt balances, installments, and payment schedules.

## ⚡ 30-Second Cold-Start Quick Reference

- **Runtime Prerequisites**: Modern web browser (Chrome, Edge, Firefox, Safari) or Node.js >=20.0.0
- **Canonical Regression Shield Gate**:
  ```bash
  npm test
  ```

### 🛠️ AIKit Commands (run from the AIKit folder)
| Role | Command |
|---|---|
| Status, task and gates | `python aikit.py status CardMon` |
| Phase 4: every gate | `python aikit.py check CardMon` |
| Repair memory and map, then check | `python aikit.py fix CardMon` |
| Resume an interrupted task | `python aikit.py resume CardMon` |

## 📦 What's Inside

```text
CardMon/
├── .aikit/                   <- this project's memory: record, ledger, decisions
├── .gitignore                <- transient AIKit state excluded
├── COMMERCIAL.md             <- commercial license terms
├── LICENSE                   <- project license (AL-1.1)
├── LICENSES/                 <- reuse license specifications
├── README.md                 <- cold-start reference and documentation
├── REUSE.toml                <- license metadata
├── assets/                   <- branding and visual assets
├── css/                      <- modular stylesheet design system
├── i18n.js                   <- internationalization and currency formatting
├── index.html                <- application interface and layout
├── js/                       <- modular application logic and domain handlers
├── package.json              <- npm package manifest and test scripts
├── styles.css                <- stylesheet aggregator entrypoint
└── tests/                    <- unit and integration test suite
```

## 📜 License

<!-- aegean:license:start -->
Free for personal use under the Aegean License 1.1 (AL-1.1); see [LICENSE](LICENSE). Any commercial use needs the Aegean Commercial License 1.0 (ACL-1.0); see [COMMERCIAL.md](COMMERCIAL.md).
<!-- aegean:license:end -->
