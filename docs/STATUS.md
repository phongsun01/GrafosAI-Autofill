# Project Status: GrafosAI-Autofill - Development Status

## 🎯 Current Version: 2.6.0 (Project Renaming & Unification)
**Release Date:** 2026-02-11

### ✅ What's New in v2.5.0
- **9 Security Fixes** across 3 severity levels (High/Medium/Low)
- **Race Condition Prevention** in content script injection
- **Memory Leak Fix** in XPath picker
- **XPath Injection Protection** with proper escaping
- **Variable DoS Protection** with depth limiting
- **CSV Cache Atomic Operations** to prevent corruption
- **Input Validation** (max 5000 chars)
- **Sensitive Data Redaction** in console logs
- **Variable System Fix** - unified storage mechanism

### 📋 Previous Releases
## Current Version: 1.9 (Stable Release)
**Last Updated:** 2026-02-06
**Status:** ✅ Stable - Production Ready

### Key Features (Merged)
This version combines the stable execution core of V1.5 with the advanced features of V1.8, plus new improvements.

#### 1. Core Stability
- **Fill Field Logic:** Robust handling of Input, Select, Radio, Checkbox, and Angular components.
- **Soft Fail:** Automatically skips "Element not found" errors instead of stopping the entire batch.
- **Retry Mechanism:** Configurable retry attempts for flaky elements.

#### 2. Advanced Automation Commands
| Command | Syntax | Description |
| :--- | :--- | :--- |
| **Fill** | `fill(xpath, value)` | Fill a field with an explicit value or variable. |
| **Extract** | `extract(xp, {var:name})` | Extract text and save to a variable. |
| **Wait** | `wait(2-5)` | Random wait between 2 to 5 seconds. |
| **WaitFor** | `waitfor(xpath, 10, visible)` | Wait up to 10s for element to exist (and be visible). |
| **WaitUrl** | `waiturl(pattern, 15)` | Wait for URL to match pattern. |
| **CheckLogin** | `checklogin(xp, login, cols, target)` | Auto-login if session expired. |
| **Advanced If** | `if(xpath, "val", ==, "text", {cols})` | Conditional logic with operators. |

### Recent Changes (v1.9)
- [x] **Fix:** Removed duplicate `triggerFullEvents` call to prevent double row creation on select elements.
- [x] **Feat:** Added `formcontrolname` to XPath Picker priority (Angular support).

### ✅ Already Implemented (Excluded from Roadmap)
| Feature | Status |
| :--- | :--- |
| Conditional Logic Engine (if, if...else, operators) | ✅ Done |
| Data Extraction Mode (`extract(xpath, {var:name})`) | ✅ Done |
| Error Handling Rules (`config(error:skip, retry:3)`) | ✅ Done |
| Variable System (`${varName}` substitution) | ✅ Done |

---

### Pending Tasks (Roadmap)

#### 🔴 Cao Priority
- [ ] **Macro/Template System:** Save command sequences thành reusable macros (VD: `macro:login`).
- [ ] **Schedule & Triggers:** Auto-run profiles theo schedule (cron) hoặc trigger khi URL match pattern.
- [ ] **Password Security Module:** Implement SECURITY_DESIGN.md (Auto-detect, Mask, Zero-storage).

#### 🟡 Trung Priority
- [ ] **Performance Mode:** Parallel processing (max 3 concurrent tabs), reduce delays.
- [ ] **Capture & Assert:** Command `capture(xpath, expected_value)` để validate results.
- [ ] **Multi-Sheet Support:** Load multiple sheets, join data với syntax `{SheetB.columnC}`.
- [ ] **Analytics Dashboard:** Tab statistics (success rate, avg time, failed XPaths).
- [ ] **Persistence for Variables:** Survive extension reload (optional sync).

#### 🟢 Thấp Priority
- [ ] **Cloud Sync:** Backup/restore profiles qua Google Drive.
- [ ] **AI-Assisted XPath:** Suggest alternatives khi fail, auto-fix common issues.
- [ ] **Diff Tool:** Compare 2 profiles/processes để merge changes.
- [ ] **Webhook Integration:** POST results tới external APIs khi batch complete.
- [ ] **Mobile App Companion:** Remote monitor long-running jobs.

## Known Issues
- [ ] **Navigation Hang**: lệnh `checklogin` và `url` báo "Tab đang reload" và không tự động chạy tiếp. Đã thử dùng `WILL_NAVIGATE` nhưng chưa ổn định. Tạm hoãn.
