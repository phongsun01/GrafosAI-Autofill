# Changelog

All notable changes to this project will be documented in this file.

## [3.1.0] - 2026-07-17

### Added
- **Credential Encryption**: Implemented local storage encryption for sensitive credentials (e.g., Gemini API Key) using Web Crypto API (`AES-GCM` 256-bit with `PBKDF2` key derivation).
- **Automated Testing**: Added browser-based unit tests for `DataManager` and `AIEngine` under `/tests`.
- **License & Cleanups**: Added MIT License, created `PRIVACY.md`, cleaned up legacy backup files.

### Changed
- **Security Hardening (On-Demand Injection)**: Removed passive `<all_urls>` content script injection and `web_accessible_resources` from `manifest.json`. Content scripts are now dynamically injected on-demand using `chrome.scripting.executeScript` via `activeTab` permission to minimize attack surface.

---

## [3.0.9] - 2026-07-06

### Added
- **AI-Native UI**: Overhauled user interface with modern aesthetics, clean design tokens, and smooth transitions.
- **Dark Mode**: Complete support for system-detected and manually-toggled dark mode.
- **CSP Compliance**: Removed inline scripts and modernized the extension popups for strict MV3 compatibility.
- **Refined Layout**: Standardized configuration controls, inputs, and status messages.
