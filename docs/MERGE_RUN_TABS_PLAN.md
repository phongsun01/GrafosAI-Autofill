# Kế Hoạch Gộp Tab Auto Fill & Batch Run

> **Objective**: Consolidate Auto Fill và Batch Run thành 1 tab duy nhất với sub-tabs  
> **Benefits**: Giảm số lượng main tabs xuống 3 (Run, Config, Tools), giao diện gọn hơn  
> **Status**: 📋 Planning Phase  
> **Last Updated**: 2026-02-09

---

## 📊 Phân Tích Hiện Trạng

### Tab "Auto Fill" (viewRun)
**Chức năng**: Chạy tự động theo range (VD: dòng 3, hoặc 5-10)

**UI Components**:
1. ✅ **Profile Selector** (`runProfileSelect`)
2. ✅ **Process Selector** (`runProcessSelect`)
3. ✅ **GID Display** (`lblGid`)
4. ✅ **Total Rows** (`lblTotalRows`)
5. ✅ **Range Input** (`txtRange`) - "3, 5-10"
6. ✅ **Progress Bar** (`progressBar`)
7. ✅ **Status Message** (`statusMsg`)
8. ✅ **Control Buttons**: RUN, PAUSE, STOP
9. ✅ **Note Box** (`noteAutofillContainer`)

---

### Tab "Batch Run" (viewBatch)
**Chức năng**: Chạy theo danh sách chọn lọc (checkbox)

**UI Components**:
1. ✅ **Search Box** (`txtSearchBatch`) - Tìm kiếm dữ liệu
2. ✅ **GID Display** (`lblBatchGid`)
3. ✅ **Total Rows** (`lblBatchTotal`)
4. ✅ **Data Table** (`batchTable`) - Hiển thị dữ liệu Sheet
5. ✅ **Select All Checkbox** (`cbSelectAll`)
6. ✅ **Selected Count** (`lblSelectedCount`)
7. ✅ **Progress Bar** (`progressBarBatch`)
8. ✅ **Status Message** (`statusMsgBatch`)
9. ✅ **Control Buttons**: RUN BATCH, PAUSE, STOP
10. ✅ **Note Box** (`noteBatchContainer`)

---

## 🔄 So Sánh & Xác Định Phần Chung

| Component | Auto Fill | Batch Run | **Có thể chung?** |
|-----------|-----------|-----------|-------------------|
| Profile Selector | ✅ | ❌ (ẩn) | ✅ **CHUNG** (cần cho cả 2) |
| Process Selector | ✅ | ❌ (ẩn) | ✅ **CHUNG** (cần cho cả 2) |
| GID Display | ✅ | ✅ | ✅ **CHUNG** (dùng chung 1 label) |
| Total Rows | ✅ | ✅ | ✅ **CHUNG** (dùng chung 1 label) |
| Range Input | ✅ | ❌ | ❌ **RIÊNG Auto Fill** |
| Search Box | ❌ | ✅ | ❌ **RIÊNG Batch** |
| Data Table | ❌ | ✅ | ❌ **RIÊNG Batch** |
| Select All | ❌ | ✅ | ❌ **RIÊNG Batch** |
| Selected Count | ❌ | ✅ | ❌ **RIÊNG Batch** |
| Progress Bar | ✅ | ✅ | ✅ **CHUNG** (1 progress bar cho cả 2) |
| Status Message | ✅ | ✅ | ✅ **CHUNG** (1 status line cho cả 2) |
| Control Buttons | ✅ (3 nút) | ✅ (3 nút) | ✅ **CHUNG** (Run text thay đổi) |

---

## 🎨 Thiết Kế UI Mới

### Cấu trúc: Main Tab "Run" → 2 Sub-tabs

```
┌─────────────────────────────────────────────────┐
│ [Run ⚡] [Config] [Tools 🛠️]                    │ ← Main Tabs
├─────────────────────────────────────────────────┤
│                                                 │
│  [Auto Fill]  [Batch Select]  [Guide 📖]       │ ← Sub-tabs
│  ─────────────────────────────────────          │
│                                                 │
│  ┌─ PHẦN CHUNG (Common Section) ───────────┐   │
│  │ 1. Chọn Profile:  [Dropdown ▼]          │   │
│  │ 2. Chọn Process:  [Dropdown ▼]          │   │
│  │                                          │   │
│  │ GID: 123456789 | Tổng: 100 dòng         │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌─ PHẦN RIÊNG (Mode-specific) ─────────────┐   │
│  │                                           │   │
│  │ [IF Auto Fill]:                           │   │
│  │   Range: [3, 5-10____________]            │   │
│  │                                           │   │
│  │ [IF Batch Select]:                        │   │
│  │   🔍 [Search...____________]              │   │
│  │   ┌─────────────────────────────┐        │   │
│  │   │☑ #  Col1      Col2          │        │   │
│  │   │☑ 3  Data1     Data2         │        │   │
│  │   │☐ 4  Data3     Data4         │        │   │
│  │   └─────────────────────────────┘        │   │
│  │   Selected: 5 dòng                        │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  Progress: [████████░░░░░░░░] 60%              │
│  Status: Đang chạy dòng 3/5...                  │
│                                                 │
│  [▶ CHẠY NGAY] [⏸ TẠM DỪNG] [🛑 DỪNG]          │
│                                                 │
│  💡 Note: ...                                   │
└─────────────────────────────────────────────────┘
```

---

## 📋 Kế Hoạch Triển Khai

### Phase 1: Cấu Trúc HTML (1h)

**Thay đổi main tabs**:
```html
<!-- Before -->
<div class="tab-btn" id="tabRun">Auto Fill</div>
<div class="tab-btn" id="tabBatch">Batch Run</div>

<!-- After -->
<div class="tab-btn" id="tabRun">Run ⚡</div>
```

**Tạo sub-tabs structure**:
```html
<div id="viewRun" class="tab-content active">
  <!-- Sub-nav -->
  <div class="btn-wrapper" style="margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:10px;">
    <button id="subTabAutoFill" class="btn-main" style="background:#2563eb; width:30%;">Auto Fill</button>
    <button id="subTabBatch" class="btn-main" style="background:#64748b; width:30%;">Batch</button>
    <button id="subTabGuide" class="btn-main" style="background:#64748b; width:30%;">Guide 📖</button>
  </div>

  <!-- COMMON SECTION (Always visible) -->
  <div id="commonRunSection">
    <div class="group-box">
      <label>1. Chọn Profile</label>
      <select id="runProfileSelect"></select>
      <label>2. Chọn Process</label>
      <select id="runProcessSelect"></select>
    </div>
    
    <div class="info-bar">
      <span>GID: <b id="lblGid">...</b></span>
      <span>Tổng: <b id="lblTotalRows">...</b></span>
    </div>
  </div>

  <!-- MODE-SPECIFIC SECTIONS -->
  <div id="sectionAutoFill">
    <div class="group-box">
      <label>Phạm vi dòng (Range):</label>
      <input type="text" id="txtRange" value="3" placeholder="VD: 3, 5-10">
    </div>
  </div>

  <div id="sectionBatch" style="display:none">
    <input type="text" id="txtSearchBatch" placeholder="🔍 Tìm kiếm...">
    <div class="batch-container">
      <table id="batchTable"><!-- Table content --></table>
    </div>
    <div style="margin-top:8px;">
      <span id="lblSelectedCount">0 dòng chọn</span>
    </div>
  </div>

  <div id="sectionGuide" style="display:none">
    <!-- Hướng dẫn sử dụng -->
    <div class="note-box">
      <h3>📖 Auto Fill vs Batch</h3>
      <p><strong>Auto Fill:</strong> Chạy theo range (VD: 3-10)</p>
      <p><strong>Batch:</strong> Chọn từng dòng cụ thể</p>
      <!-- More guide content -->
    </div>
  </div>

  <!-- COMMON CONTROLS (Always visible) -->
  <div id="commonControls">
    <div class="progress-track" id="progressTrack">
      <div class="progress-fill" id="progressBar"></div>
    </div>
    <div id="statusMsg">Sẵn sàng</div>
    
    <div class="btn-wrapper">
      <button id="btnRun" class="btn-main">CHẠY NGAY</button>
      <button id="btnPause" class="btn-main btn-pause">⏸️ TẠM DỪNG</button>
      <button id="btnStop" class="btn-main btn-stop">🛑 DỪNG</button>
    </div>
  </div>

  <div id="noteContainer" class="note-box"></div>
</div>
```

**Files**: `popup.html`  
**Effort**: 1h

---

### Phase 2: JS Logic (1.5h)

**popup-ui.js changes**:
```javascript
// 1. Add sub-tab section mappings
sections: { 
  autoFill: getEl('sectionAutoFill'), 
  batch: getEl('sectionBatch'),
  guide: getEl('sectionGuide')
}

// 2. Extend switchSubTab to handle Run sub-tabs
switchSubTab: function(subName) {
  // Hide all sections
  Object.values(this.dom.sections).forEach(s => s.style.display = 'none');
  
  // Show selected section
  if (this.dom.sections[subName]) {
    this.dom.sections[subName].style.display = 'block';
  }
  
  // Update button styles
  Object.values(this.dom.subTabs).forEach(b => {
    b.style.background = "#64748b";
    b.style.opacity = '0.7';
  });
  
  if (this.dom.subTabs[subName]) {
    this.dom.subTabs[subName].style.background = "#2563eb";
    this.dom.subTabs[subName].style.opacity = '1';
  }
  
  // Update button text based on mode
  if (subName === 'autoFill') {
    this.dom.btn.run.innerText = 'CHẠY NGAY';
  } else if (subName === 'batch') {
    this.dom.btn.run.innerText = 'CHẠY BATCH';
  }
}
```

**popup.js changes**:
```javascript
// Wire sub-tab clicks
dom.tabs.run.onclick = () => { 
  PopupUI.switchTab('run'); 
  PopupUI.switchSubTab('autoFill'); // Default
};

dom.subTabs.autoFill.onclick = () => PopupUI.switchSubTab('autoFill');
dom.subTabs.batch.onclick = () => { 
  PopupUI.switchSubTab('batch'); 
  // Load batch data if not loaded
  if (!batchDataLoaded) loadBatchData();
};
dom.subTabs.guide.onclick = () => PopupUI.switchSubTab('guide');

// Unified Run button logic
dom.btn.run.onclick = () => {
  const currentMode = getCurrentMode(); // 'autoFill' or 'batch'
  if (currentMode === 'autoFill') {
    handleAutoFillRun();
  } else {
    handleBatchRun();
  }
};

function getCurrentMode() {
  // Check which section is visible
  if (dom.sections.autoFill.style.display !== 'none') return 'autoFill';
  if (dom.sections.batch.style.display !== 'none') return 'batch';
  return 'autoFill'; // default
}
```

**Files**: `popup-ui.js`, `popup.js`  
**Effort**: 1.5h

---

### Phase 3: Testing & Polish (30min)

**Test Cases**:
1. ✅ Switch Auto Fill → Batch → Auto Fill (state persists)
2. ✅ Run button text changes correctly
3. ✅ Progress/Status shared correctly
4. ✅ Profile/Process selection affects both modes
5. ✅ Guide tab displays instructions

**Files**: Manual testing  
**Effort**: 30min

---

## 📊 Tổng Kết: Những Gì Có Thể Chung

### ✅ CHUNG (Shared UI - Always visible)
1. **Profile Selector** - Dropdown chọn profile
2. **Process Selector** - Dropdown chọn quy trình
3. **GID Display** - Label hiển thị GID
4. **Total Rows** - Label tổng số dòng
5. **Progress Bar** - Thanh tiến trình (1 bar dùng chung)
6. **Status Message** - Dòng text trạng thái (1 dùng chung)
7. **Control Buttons** - RUN/PAUSE/STOP (3 nút dùng chung, text RUN thay đổi)
8. **Note Container** - Ghi chú/hướng dẫn

### ❌ RIÊNG (Mode-specific - Toggle visibility)

**Auto Fill Mode:**
- Range Input (`txtRange`)

**Batch Mode:**
- Search Box (`txtSearchBatch`)
- Data Table (`batchTable`)
- Select All Checkbox
- Selected Count Label

**Guide Mode:**
- Instructions content
- Usage examples
- Tips & tricks

---

## 📂 File Impact Summary

| File | Changes | Effort |
|------|---------|--------|
| `popup.html` | Remove `viewBatch`, restructure `viewRun` with sub-tabs | 1h |
| `popup-ui.js` | Add section mappings, extend `switchSubTab()` | 45m |
| `popup.js` | Wire sub-tab events, unify run logic | 45m |
| **TOTAL** | | **~3h** |

---

## 🎯 Benefits

1. ✅ **Giảm main tabs**: 4 → 3 (Run, Config, Tools)
2. ✅ **Code reuse**: 1 progress bar, 1 status, 3 buttons (thay vì 2 sets)
3. ✅ **Cleaner UI**: Related features grouped together
4. ✅ **Easier navigation**: All run modes in 1 place
5. ✅ **Guide tab**: Centralized instructions

---

## ⚠️ Considerations

1. **State Management**: Cần track current mode (autoFill/batch) để biết sub-tab nào đang active
2. **Data Loading**: Batch table chỉ load khi user click vào Batch sub-tab (lazy loading)
3. **Button Text**: "CHẠY NGAY" vs "CHẠY BATCH" - dynamically change based on mode
4. **Note Content**: Có thể cần 2 note boxes riêng, hoặc 1 note box với nội dung thay đổi

---

## 🚀 Next Steps

1. Review và approve kế hoạch này
2. Implement Phase 1 (HTML structure)
3. Implement Phase 2 (JS logic)
4. Test & verify
5. Update documentation (README.md)

---

**Decision Point**: Bạn muốn triển khai ngay hay cần điều chỉnh gì thêm?
