# GrafosAI-Autofill: chế độ Popup / Side Panel (có nút chuyển)

Áp dụng trên bản 3.1.1. Cả hai chế độ dùng chung `popup.html`.
Sau khi sửa: `edge://extensions` -> Reload extension -> bấm icon -> bấm nút ◧.

---

## 1. manifest.json

```diff
   "permissions": [
     "activeTab",
     "scripting",
     "storage",
     "clipboardRead",
-    "clipboardWrite"
+    "clipboardWrite",
+    "sidePanel"
   ],
@@
+  "side_panel": {
+    "default_path": "popup.html?mode=panel"
+  },
   "action": {
     "default_popup": "popup.html",
```

(Giữ `default_popup`; chế độ panel sẽ tắt nó bằng `setPopup` trong background.)

---

## 2. background.js

Thêm sau khối `const Utils = { ... };`:

```diff
+// --- UI MODE: popup <-> side panel ---
+// Lưu ở khoá riêng 'uiMode' (KHÔNG để trong appData vì validateAndSanitize sẽ xoá khoá lạ)
+async function applyUiMode() {
+    try {
+        const { uiMode = 'popup' } = await storageLocal.get(['uiMode']);
+        const usePanel = uiMode === 'panel' && !!chrome.sidePanel;
+        await chrome.action.setPopup({ popup: usePanel ? '' : 'popup.html' });
+        if (chrome.sidePanel) {
+            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: usePanel });
+        }
+    } catch (e) {
+        Logger.error('applyUiMode failed:', e);
+    }
+}
+applyUiMode(); // chạy mỗi lần service worker thức dậy
+chrome.storage.onChanged.addListener((changes, area) => {
+    if (area === 'local' && changes.uiMode) applyUiMode();
+});
```

Sửa 2 listener có sẵn:

```diff
 chrome.runtime.onStartup.addListener(() => {
     injectedTabs.clear();
+    applyUiMode();
     console.log('[Background] Extension started, cleared injectedTabs');
 });

 chrome.runtime.onInstalled.addListener(() => {
     injectedTabs.clear();
+    applyUiMode();
     console.log('[Background] Extension installed/updated, cleared injectedTabs');
 });
```

Sửa luôn lỗi `window` còn sót ở cuối file:

```diff
 chrome.runtime.onSuspend.addListener(() => {
     Logger.info('[Background] Extension suspending, cleaning up...');
-    if (window.GeminiRateLimiter?.destroy) {
-        window.GeminiRateLimiter.destroy();
-    }
+    self.GeminiRateLimiter?.destroy?.();
 });
```

---

## 3. popup.html

Thêm nút vào cuối `.tabs`:

```diff
     <div class="tab-btn" id="tabConfig" data-target="viewConfig">Config ⚙️</div>
+    <div class="tab-btn" id="btnUiMode" style="flex:0 0 40px" title="Chuyển popup / side panel">◧</div>
   </div>
```

---

## 4. popup.js (trong `DOMContentLoaded`)

### 4a. Nút chuyển chế độ — đặt ngay sau `window.PopupUI.bindToolsTabEvent();`

```diff
         window.PopupUI.bindToolsTabEvent();
+
+        // --- UI MODE TOGGLE (popup <-> side panel) ---
+        const isPanel = new URLSearchParams(location.search).get('mode') === 'panel';
+        document.body.classList.toggle('is-panel', isPanel);
+
+        const btnMode = document.getElementById('btnUiMode');
+        if (btnMode) {
+            if (!chrome.sidePanel || !chrome.sidePanel.open) {
+                btnMode.style.display = 'none'; // trình duyệt không hỗ trợ -> ẩn nút
+            } else {
+                btnMode.textContent = isPanel ? '🗗' : '◧';
+                btnMode.title = isPanel ? 'Chuyển sang popup' : 'Chuyển sang side panel';
+                btnMode.onclick = async () => {
+                    try {
+                        if (!isPanel) {
+                            const win = await chrome.windows.getCurrent();
+                            await chrome.sidePanel.open({ windowId: win.id }); // gọi trước khi await khác, còn user gesture
+                            await chrome.storage.local.set({ uiMode: 'panel' });
+                        } else {
+                            await chrome.storage.local.set({ uiMode: 'popup' });
+                        }
+                        window.close();
+                    } catch (e) {
+                        window.PopupUI.showToast('Không chuyển được chế độ: ' + e.message, 'error');
+                    }
+                };
+            }
+        }
```

### 4b. XPath Picker: xin quyền trước khi inject (activeTab không còn bao phủ khi panel mở lâu)

```diff
         dom.btn.startPicker.onclick = async () => {
             const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
             if (!tab) return window.PopupUI.showToast('Không tìm thấy tab!', 'error');
             if (tab.url.startsWith('chrome://')) return window.PopupUI.showToast('Không thể chạy trên trang nội bộ Chrome!', 'warning');
+            if (tab.url.startsWith('edge://')) return window.PopupUI.showToast('Không thể chạy trên trang nội bộ Edge!', 'warning');
+            if (!(await requestTabPermission())) return;
```

### 4c. Reset trạng thái picker khi đổi tab — đặt cạnh khai báo `let xpathPickerActive = false;`

```diff
         let xpathPickerActive = false;
+        chrome.tabs.onActivated.addListener(() => {
+            xpathPickerActive = false;
+            if (typeof renderXPathTab === 'function') renderXPathTab();
+        });
```

(`renderXPathTab` là function declaration trong cùng scope nên được hoisted; dòng kiểm tra `typeof` chỉ để an toàn.)

---

## 5. styles.css

```diff
 body {
     width: 400px;
     margin: 0;
@@
 }
+
+/* Side panel: co giãn theo chiều rộng panel */
+body.is-panel {
+    width: 100%;
+    min-width: 320px;
+}
+body.is-panel .batch-container {
+    height: calc(100vh - 380px);
+    min-height: 220px;
+}
```

---

## Checklist kiểm tra trên Edge

1. `edge://extensions` -> Reload. Không có lỗi manifest.
2. Bấm icon -> popup hiện, nút ◧ ở cuối thanh tab.
3. Bấm ◧ -> panel mở bên phải, popup đóng. Bấm icon lần sau -> mở thẳng panel.
4. Trong panel bấm 🗗 -> panel đóng; bấm icon -> popup quay lại.
5. Chạy thử 1 dòng Run ở chế độ panel, rồi đổi sang tab khác và xem picker/nút Run có chạy đúng tab mong muốn không.
6. Nếu nút ◧ không hiện: Edge chưa có `chrome.sidePanel` (cần bản 114+), extension vẫn chạy bình thường ở chế độ popup.

## Lưu ý

- `chrome.action.setPopup` không được giữ sau khi khởi động lại trình duyệt, vì vậy `applyUiMode()` phải gọi ở top-level service worker + `onStartup` + `onInstalled` như trên.
- Panel gắn theo cửa sổ và nhìn thấy ở mọi tab. `startNewBatch` lấy tab đang active lúc bấm Run, nên hãy nhìn đúng tab trước khi chạy.
- Cập nhật `docs/PUBLISHING.md`: thêm giải trình quyền `sidePanel` ("Hiển thị giao diện điều khiển dạng side panel song song với trang đang làm việc"), và bump `version` trong manifest.
