# Project Status

**Current Version:** 3.1.0 (Stable)
**Last Updated:** 2026-07-06

## Recent Releases
### 🚀 v3.1.0 (Stable Release)
- **Security Hardening**: Removed passive `<all_urls>` content script injection and `web_accessible_resources` for zero-trust exposure. Content scripts are now injected dynamically on-demand.
- **Data Encryption**: Implemented local credential encryption using Web Crypto API (`AES-GCM` with `PBKDF2` key derivation from extension ID) for Gemini API keys stored at rest.
- **Repository Cleanup**: Added MIT license and cleaned up legacy backup files.
- **Automated Testing**: Created browser-based test runner with unit tests for data manager and AI engine.

### 🚀 v3.0.9 (Stable Release)
- **UI Redesign**: Complete overhaul with AI-Native aesthetics.
- **Dark Mode**: Full support with system detection and manual toggle.
- **Config Tab**: Standardized inputs, buttons, and improved layout.
- **AI Tab**: Improved visibility for status text and links in dark mode.
- **Under-the-hood**: Fixed CSP issues by removing inline scripts.

### Critical Fixes
- ✅ **v2.8.7-v2.9.2**: ES6 module conversion for Manifest V3 compatibility
- ✅ **v2.9.3-v2.9.6**: Variable system fully functional (extract + fill)
- ✅ **v2.9.6**: Background service worker `window.APP_CONFIG` → `self.APP_CONFIG`

## Variable System Status
**Status:** ✅ **WORKING**

Extract and fill variables now work correctly:
```
Column A: extract(//*[@id="source"], {var:myVar})
Column B: fill(//*[@id="target"], ${myVar})
```

## Implementation Status

### ✅ Completed Features
| Feature | Status | Version |
|---------|--------|---------|
| **Local Data Encryption** | ✅ Done | v3.1.0 |
| **Security Hardening (On-Demand Injection)** | ✅ Done | v3.1.0 |
| **UI Redesign (Dark Mode)** | ✅ Done | v3.0.9 |
| Conditional Logic (if/else) | ✅ Done | v1.9 |
| Data Extraction (`extract`) | ✅ Done | v1.9 |
| Variable System (`${var}`) | ✅ Done | v2.9.6 |
| Macro/Template System | ✅ Done | v2.0 |
| Security Module | ✅ Done | v2.5 |
| Tab Merging | ✅ Done | v2.6 |
| AI XPath Generator | ✅ Done | v2.6 |
| Rate Limiting | ✅ Done | v2.8 |
| Structured Logging | ✅ Done | v2.8 |

### 🔴 High Priority Roadmap
- [ ] **Schedule & Triggers**: Auto-run profiles by schedule or URL pattern

### 🟡 Medium Priority
- [ ] **Performance Mode**: Parallel processing (max 3 tabs)
- [ ] **Capture & Assert**: Validate results with `capture(xpath, expected)`
- [ ] **Multi-Sheet Support**: Join data from multiple sheets
- [ ] **Analytics Dashboard**: Success rate, timing stats

### 🟢 Low Priority
- [ ] **Cloud Sync**: Backup/restore via Google Drive
- [ ] **Webhook Integration**: POST results to external APIs
- [ ] **Mobile Companion**: Remote monitoring

## Known Issues
- ~~Navigation hang with `checklogin`/`url` commands~~ (Fixed in v2.8.9)
- ~~Variables not substituting~~ (Fixed in v2.9.6)

## Documentation
- [VARIABLES.md](VARIABLES.md) - Variable system usage guide
- [Walkthrough](../brain/walkthrough.md) - Complete changelog
