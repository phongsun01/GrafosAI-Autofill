# Macro/Template System - Implementation Guide

> **Status**: 📋 Planning Phase  
> **Priority**: Medium  
> **Estimated Effort**: 5-8h (MVP: 5h)  
> **Last Updated**: 2026-02-09

---

## 🎯 Overview

Reusable command sequences to eliminate repetitive typing:

**Syntax:**
```
macro:login                    → Execute login sequence
macro:login(john,pass123)      → With parameters
```

**Example:**
```
Sheet Header: macro:login
Data Row:     (empty)

→ Executes 5 login commands in 1 line!
```

---

## 📋 Features

- ✅ Pre-defined command sequences
- ✅ Parameter substitution ({user}, {pass})
- ✅ CRUD (Create/Edit/Delete) via JSON
- ✅ Export/Import JSON
- ✅ Team sharing
- ✅ Security sanitized
- ❌ ~~Visual macro builder~~ (Postponed to v2)
- ❌ ~~Drag-drop UI~~ (Nice-to-have)

---

## 🏗️ Implementation Plan (Revised)

### Phase 1: Core Parser & Executor (2h) - P0
**Files**: `content.js`

1. **parseCommand()**: Detect `macro:name` or `macro:name(param1, param2)`
   ```javascript
   if (/^macro:([a-z_]+)(\(.*\))?/.test(header)) {
     return { type: 'macro', name, params };
   }
   ```

2. **executeMacro()**: Lookup `macros[name]` → forEach `processCommand()`
   ```javascript
   async executeMacro(name, params, rowData) {
     const commands = this.macros[name];
     for (const cmd of commands) {
       const substituted = this.substituteParams(cmd, params, rowData);
       await this.processCommand(substituted);
     }
   }
   ```

3. **substituteParams()**: Replace `{user}`, `{pass}` with actual data
   ```javascript
   substituteParams(cmd, params, rowData) {
     return cmd.replace(/{(\w+)}/g, (match, key) => {
       return rowData[key] || params[key] || match;
     });
   }
   ```

**Test Cases:**
- `macro:delay` → Execute 3x `delay(1000)`
- `macro:login({user}, {pass})` → Substitute with row data

---

### Phase 2: Storage & Persistence (1h) - P0
**Files**: `data-manager.js`

1. Add `appData.macros` structure:
   ```javascript
   macros: {
     "login": [
       "click(//button[@id='login'])",
       "fill(//input[@name='user'], {user})",
       "fill(//input[@name='pass'], {pass})",
       "click(//button[@type='submit'])",
       "waitfor(//div[@class='dashboard'], 10)"
     ]
   }
   ```

2. **Validation**:
   ```javascript
   validateMacro(macro) {
     const MAX_COMMANDS = 20;
     const ALLOWED = ['click', 'fill', 'delay', 'wait', 'waitfor', 'waiturl', 'extract'];
     
     if (macro.commands.length > MAX_COMMANDS) 
       throw new Error("Macro too long (max 20 commands)");
     
     macro.commands.forEach(cmd => {
       const type = cmd.split('(')[0];
       if (!ALLOWED.includes(type))
         throw new Error(`Forbidden command: ${type}`);
     });
   }
   ```

3. Save/load with profiles sync

---

### Phase 3: Minimal UI (30min) - P0
**Files**: `popup.html`, `popup-ui.js`

**Location**: Tools tab → Sub-tab #4 "Macros" (cùng Variables, XPath, Backup)

**UI Structure:**
```html
<div id="sectionMacros" style="display:none">
  <div class="group-box">
    <div class="group-title">📦 Macros</div>
    <div class="info-bar">
      <span>Total: <b id="lblMacroCount">0</b></span>
    </div>
    <div style="max-height:200px; overflow-y:auto;">
      <table id="macrosTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Commands</th>
            <th style="width:60px">Action</th>
          </tr>
        </thead>
        <tbody id="macrosTableBody"></tbody>
      </table>
    </div>
    <div class="btn-wrapper" style="margin-top:10px;">
      <button id="btnImportMacros" class="btn-main">📥 IMPORT JSON</button>
      <button id="btnExportMacros" class="btn-main">📤 EXPORT JSON</button>
    </div>
  </div>
  <div class="note-box">
    <strong>📖 Hướng dẫn:</strong><br>
    <strong>1. Import:</strong> Paste JSON định nghĩa macros<br>
    <strong>2. Use:</strong> Trong Sheet header: <code>macro:login</code><br>
    <strong>3. Params:</strong> <code>macro:fill({name})</code> → Lấy từ cột Sheet
  </div>
</div>
```

**popup-ui.js**:
```javascript
renderMacrosTab: function() {
  const macros = DataManager.appData.macros || {};
  const tbody = this.dom.table.macrosTableBody;
  tbody.innerHTML = '';
  
  Object.entries(macros).forEach(([name, cmds]) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${name}</td>
      <td>${cmds.length} commands</td>
      <td>
        <button class="btn-icon btn-del" data-name="${name}">Delete</button>
      </td>
    `;
  });
  
  this.dom.text.lblMacroCount.innerText = Object.keys(macros).length;
}
```

---

### Phase 4: Testing & Security (1h) - P0

**Test Matrix:**
1. ✅ Basic execution: `macro:delay` → 3x delays
2. ✅ Parameter substitution: `macro:login({user}, {pass})`
3. ✅ Security: Malicious commands blocked
4. ✅ Validation: Max 20 commands per macro
5. ✅ Storage: Reload extension → Macros persist

**Security Measures:**
```javascript
// SecurityUtils addition
sanitizeMacroCommand(cmd) {
  // Strip script tags, eval, etc.
  if (cmd.includes('<script>') || cmd.includes('eval(')) {
    throw new Error("Malicious command detected");
  }
  return cmd;
}
```

---

### Phase 5: Export/Import (30min) - P1

**Export:**
```javascript
btnExportMacros.onclick = () => {
  const json = JSON.stringify(DataManager.appData.macros, null, 2);
  navigator.clipboard.writeText(json);
  PopupUI.showToast("✅ Exported to clipboard", 'success');
};
```

**Import:**
```javascript
btnImportMacros.onclick = async () => {
  const text = await navigator.clipboard.readText();
  try {
    const macros = JSON.parse(text);
    // Validate each macro
    Object.entries(macros).forEach(([name, cmds]) => {
      DataManager.validateMacro({ commands: cmds });
    });
    DataManager.appData.macros = macros;
    await DataManager.save();
    PopupUI.renderMacrosTab();
    PopupUI.showToast("✅ Imported successfully", 'success');
  } catch (e) {
    PopupUI.showToast("❌ " + e.message, 'error');
  }
};
```

---

## 📂 File Impact Summary

| File | Changes | Effort |
|------|---------|--------|
| `content.js` | Parser + executor + params | 2h |
| `data-manager.js` | Storage + validation | 1h |
| `popup.html` | Sub-tab UI | 15m |
| `popup-ui.js` | Render + handlers | 45m |
| `popup.js` | Import/Export | 30m |
| **TOTAL** | **MVP** | **~5h** |

---

## 🔄 User Workflow

### 1. Create Macro (JSON)
```json
{
  "login": [
    "click(//button[@id='login'])",
    "fill(//input[@name='password'], {pass})",
    "waitfor(//div[@class='dashboard'], 10, visible)"
  ],
  "fill_form": [
    "fill(//input[@id='name'], {name})",
    "fill(//input[@id='email'], {email})",
    "click(//button[@type='submit'])"
  ]
}
```

### 2. Import
1. Tools → Macros → 📥 IMPORT JSON
2. Paste JSON → Save

### 3. Use in Sheet
```
Header A: macro:login
Data A:   (empty or params)

Header B: macro:fill_form({name}, {email})
Data B:   John Doe | john@email.com
```

---

## 🛡️ Security Measures

1. ✅ **Command whitelist**: Only allow safe commands
2. ✅ **Max length**: 20 commands per macro
3. ✅ **Sanitization**: Strip malicious patterns
4. ✅ **Parameter masking**: Auto-detect password params
5. ✅ **Audit log**: "macro:login executed (row 5)"

---

## 📈 ROI & Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Typing | 5 lines | 1 line | **-80%** |
| Errors | Manual repetition | 0 | **Eliminated** |
| Team | Inconsistent | Standardized | **+100%** |
| Maintenance | N updates | 1 config update | **-90%** |

---

## 🎯 Success Metrics

- ✅ 10+ macros per power user
- ✅ 80% workflows use macros
- ✅ Team adoption: 90%
- ✅ Typing time reduction: 80%
- ✅ Zero macro-related crashes

---

## 🚀 Future Enhancements (Post-MVP)

### v2.0 Features (Optional)
- [ ] **Visual Macro Builder**: Drag-drop UI
- [ ] **Macro debugging**: Step-through execution
- [ ] **Conditional macros**: `if(condition) macro:name`
- [ ] **Nested macros**: `macro:parent` → calls `macro:child`
- [ ] **Keyboard shortcuts**: Ctrl+M to quick-run macro

---

## 📝 Original Plan (Reference)

<details>
<summary>Click to expand original 6-8h plan</summary>

### Original Phase Structure
- Phase 1: Parser (2h)
- Phase 2: Storage (1h)
- Phase 3: Visual UI Builder (1.5h) ← **Postponed**
- Phase 4: Parameters (1h)
- Phase 5: Templates & Polish (1h) ← **Simplified**

### Changes Made
- ✅ Consolidated phases 1+4 (Parser + Params together)
- ✅ Simplified UI: JSON-based instead of visual builder
- ✅ Added dedicated testing phase
- ✅ Reduced total time: 6-8h → 5h MVP

</details>

---

## 🔗 Related Documents

- `STATUS.md`: Add to "Pending Tasks - 🔴 Cao Priority"
- `README.md`: Will add Section 8 after implementation
- `SECURITY_DESIGN.md`: Extend with macro sanitization rules

---

**Next Steps**: Review and approve this plan before starting implementation.
