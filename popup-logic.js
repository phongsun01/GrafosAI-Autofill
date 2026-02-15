// MODULE: Popup Logic
// Handles business logic, data loading, and state management
import { DataManager } from './data-manager.js';
import { PopupUI } from './popup-ui.js';

export const PopupLogic = {
    // State
    editingProfileId: null,
    editingProcessId: null,
    currentStatus: "IDLE",

    // --- INITIALIZATION ---
    init: async function () {
        try {
            console.log("PopupLogic: Initializing...");
            await DataManager.load();
            if (!DataManager.appData) throw new Error("App Data is null after load");
            console.log("PopupLogic: Data Loaded", DataManager.appData);
            this.restoreState();
        } catch (e) {
            console.error("Init failed:", e);
            PopupUI.showToast("Init Data Error: " + e.message, 'error');
        }
    },

    restoreState: function () {
        // Restore Tabs
        const lastTab = DataManager.appData.lastTab || 'run';
        PopupUI.switchTab(lastTab);

        if (lastTab === 'tools') {
            const lastSub = DataManager.appData.lastSubTab || 'xpath';
            PopupUI.switchSubTab(lastSub);
            if (lastSub === 'xpath' && PopupUI.renderXPathTab) PopupUI.renderXPathTab();
            if (lastSub === 'vars' && PopupUI.renderVariablesTab) PopupUI.renderVariablesTab();
        }

        // Restore Run Mode
        const mode = DataManager.appData.runMode || 'single';
        PopupUI.switchRunMode(mode);

        // Sync UI toggles (delayed to ensure DOM is ready)
        setTimeout(() => {
            const dom = PopupUI.dom;
            const radioSingle = document.querySelector('input[name="runMode"][value="single"]');
            const radioBatch = document.querySelector('input[name="runMode"][value="batch"]');

            if (mode === 'batch') {
                if (radioBatch) radioBatch.checked = true;
                const o = dom.input.process.selectedOptions[0];
                if (o) this.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols);
            } else {
                if (radioSingle) radioSingle.checked = true;
            }

            // Restore Macro Config
            if (DataManager.appData.macroSheetConfig) {
                if (dom.input.macroLink) dom.input.macroLink.value = DataManager.appData.macroSheetConfig.url || "";
                if (dom.input.macroGid) dom.input.macroGid.value = DataManager.appData.macroSheetConfig.gid || "";
            }

            // Restore AI Form Type
            if (DataManager.appData.lastTrigger) {
                const sel = document.getElementById('selAiTrigger');
                if (sel) sel.value = DataManager.appData.lastTrigger;
            }

            // Restore Macros Table
            if (DataManager.appData.macros) {
                const mCount = Object.keys(DataManager.appData.macros).length;
                if (dom.text.lblMacroCount) dom.text.lblMacroCount.innerText = mCount;
                if (dom.table.macrosTableBody) PopupUI.renderMacrosTab();
            }

        }, 200);

        this.updateStatusFromBg();
    },

    updateStatusFromBg: function () {
        chrome.runtime.sendMessage({ action: "get_state" }, (res) => {
            if (!chrome.runtime.lastError && res && res.state) {
                this.currentStatus = PopupUI.renderStatusUI(res.state);
            }
        });
    },

    // --- DATA & PROCESS LOGIC ---
    loadCsvForProcess: async function (url, gid, batchColsStr, force = false) {
        if (DataManager.appData.runMode === 'batch') {
            PopupUI.dom.table.batchBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
        }
        PopupUI.dom.table.lblTotal.innerText = "Loading...";

        try {
            const data = await DataManager.fetchGoogleSheetCsv(url, gid, force);
            PopupUI.dom.table.lblTotal.innerText = data.length + " dòng";
            PopupUI.dom.table.lblGid.innerText = gid;

            if (DataManager.appData.runMode === 'batch') {
                PopupUI.renderBatchGrid(data, batchColsStr);
            }
        } catch (e) {
            console.error(e);
            const errShort = e.message.length > 20 ? e.message.substring(0, 20) + '...' : e.message;
            PopupUI.dom.table.lblTotal.innerHTML = `<span class="error" title="${e.message}">${errShort}</span>`;
            if (PopupUI.dom.table.batchBody) PopupUI.dom.table.batchBody.innerHTML = `<tr><td colspan="4" class="error">❌ ${e.message}</td></tr>`;
        }
    },

    updateProcessDropdown: function (pid) {
        const dom = PopupUI.dom;
        dom.input.process.innerHTML = '<option value="">-- Chọn Quy Trình --</option>';
        const p = DataManager.appData.profiles.find(x => x.id === pid);

        if (!p) {
            dom.table.lblGid.innerText = "...";
            dom.table.lblTotal.innerText = "...";
            return;
        }

        p.processes.forEach(proc => {
            let o = document.createElement('option'); o.value = proc.id; o.innerText = proc.name;
            o.dataset.url = proc.url; o.dataset.gid = proc.gid;
            o.dataset.batchCols = proc.batchCols || ((proc.col1 && proc.col2) ? `${proc.col1},${proc.col2}` : "B,D");
            o.dataset.active = proc.activeCols;
            dom.input.process.appendChild(o);
        });

        if (DataManager.appData.lastProcessId) {
            dom.input.process.value = DataManager.appData.lastProcessId;
            const o = dom.input.process.selectedOptions[0];

            if (o) {
                dom.table.lblGid.innerText = o.dataset.gid || "...";
                this.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols);
            } else {
                dom.table.lblGid.innerText = "...";
            }
        }
    },

    saveProcessFn: async function () {
        const dom = PopupUI.dom;
        if (!this.editingProfileId) return;

        const name = dom.input.newProcess.value.trim();
        const url = dom.input.newLink.value.trim();

        if (!name || !url) return PopupUI.showToast("Thiếu tên hoặc link!", 'warning');

        let gid = "0";
        const m = url.match(/[#&]gid=([0-9]+)/);
        if (m) gid = m[1];

        const p = DataManager.appData.profiles.find(x => x.id === this.editingProfileId);

        const data = {
            id: this.editingProcessId || 'proc_' + Date.now(),
            name: name,
            url: url,
            gid: gid,
            batchCols: dom.input.batchCols.value || "B,D",
            activeCols: dom.input.active.value
        };

        if (this.editingProcessId) {
            const idx = p.processes.findIndex(x => x.id === this.editingProcessId);
            if (idx >= 0) p.processes[idx] = data;
        } else {
            p.processes.push(data);
        }

        await DataManager.save();
        this.renderProcessList(p);
        this.resetProcessForm();

        if (dom.input.profile.value === this.editingProfileId) {
            this.updateProcessDropdown(this.editingProfileId);
        }
        PopupUI.showToast("Đã lưu quy trình", "success");
    },

    saveProfileFn: async function () {
        const name = PopupUI.dom.input.newProfile.value.trim();
        if (!name) return PopupUI.showToast("Thiếu tên Profile!", 'warning');

        DataManager.appData.profiles.push({ id: 'prof_' + Date.now(), name: name, processes: [] });
        await DataManager.save();

        PopupUI.dom.input.newProfile.value = "";
        PopupUI.renderConfigTab({
            reRender: () => {
                PopupUI.renderConfigTab({}); // Circular ref fix?
                this.updateProcessDropdown(PopupUI.dom.input.profile.value);
            },
            onDeleteProfile: this.onDeleteProfile.bind(this),
            onSelectProfile: this.onSelectProfile.bind(this)
        });

        this.updateProcessDropdown(PopupUI.dom.input.profile.value);
        PopupUI.showToast("Đã thêm Profile", "success");
    },

    // --- LIST HELPERS ---
    renderProcessList: function (p) {
        const dom = PopupUI.dom;
        dom.input.processList.innerHTML = "";
        if (!p.processes) p.processes = [];

        p.processes.forEach((proc, i) => {
            const div = document.createElement('div'); div.className = "list-item";
            div.innerHTML = `
                <div style="flex:1;cursor:pointer"><b>${proc.name}</b></div>
                <div class="item-actions">
                    <button class="btn-icon btn-up">▲</button>
                    <button class="btn-icon btn-down">▼</button>
                    <button class="btn-icon btn-edit">✎</button>
                    <button class="btn-icon btn-del">✕</button>
                </div>`;

            div.querySelector('.btn-up').onclick = async (e) => {
                e.stopPropagation();
                if (this.moveItem(p.processes, i, -1)) {
                    await DataManager.save();
                    this.renderProcessList(p);
                    if (dom.input.profile.value === p.id) this.updateProcessDropdown(p.id);
                }
            };
            div.querySelector('.btn-down').onclick = async (e) => {
                e.stopPropagation();
                if (this.moveItem(p.processes, i, 1)) {
                    await DataManager.save();
                    this.renderProcessList(p);
                    if (dom.input.profile.value === p.id) this.updateProcessDropdown(p.id);
                }
            };
            div.querySelector('.btn-edit').onclick = (e) => {
                e.stopPropagation();
                this.loadProcessToEdit(proc);
            };
            div.querySelector('.btn-del').onclick = async (e) => {
                e.stopPropagation();
                if (confirm("Xóa?")) {
                    p.processes.splice(i, 1);
                    await DataManager.save();
                    this.renderProcessList(p);
                }
            };
            dom.input.processList.appendChild(div);
        });
    },

    moveItem: function (arr, idx, dir) {
        if ((dir === -1 && idx > 0) || (dir === 1 && idx < arr.length - 1)) {
            [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
            return true;
        }
        return false;
    },

    loadProcessToEdit: function (proc) {
        const dom = PopupUI.dom;
        dom.input.newProcess.value = proc.name;
        dom.input.newLink.value = proc.url;
        dom.input.batchCols.value = proc.batchCols || (proc.col1 ? `${proc.col1},${proc.col2 || ""}` : "");
        dom.input.active.value = proc.activeCols || "";
        this.editingProcessId = proc.id;
        dom.btn.addProcess.innerText = "CẬP NHẬT";
        dom.btn.addProcess.style.background = "#f59e0b";
    },

    resetProcessForm: function () {
        const dom = PopupUI.dom;
        this.editingProcessId = null;
        dom.input.newProcess.value = "";
        dom.input.newLink.value = "";
        dom.input.batchCols.value = "";
        dom.input.active.value = "";
        dom.btn.addProcess.innerText = "LƯU QUY TRÌNH";
        dom.btn.addProcess.style.background = "#2563eb";
    },

    onDeleteProfile: async function (pid) {
        DataManager.appData.profiles = DataManager.appData.profiles.filter(x => x.id !== pid);
        await DataManager.save();
        if (this.editingProfileId === pid) {
            this.editingProfileId = null;
            PopupUI.dom.input.processBox.style.opacity = "0.5";
            PopupUI.dom.input.processBox.style.pointerEvents = "none";
            PopupUI.dom.input.processList.innerHTML = "";
        }
        PopupUI.renderConfigTab({
            reRender: () => {
                // renderConfigTabWrapper(); 
                PopupUI.renderConfigTab({ onDeleteProfile: this.onDeleteProfile.bind(this), onSelectProfile: this.onSelectProfile.bind(this) });
                this.updateProcessDropdown();
            },
            onDeleteProfile: this.onDeleteProfile.bind(this),
            onSelectProfile: this.onSelectProfile.bind(this)
        });
        this.updateProcessDropdown();
    },

    onSelectProfile: function (p) {
        this.editingProfileId = p.id;
        const dom = PopupUI.dom;
        Array.from(dom.input.profileList.children).forEach(child => {
            const span = child.querySelector('span');
            if (span.innerText === p.name) child.classList.add('selected'); else child.classList.remove('selected');
        });
        this.renderProcessList(p);
        dom.input.processBox.style.opacity = "1";
        dom.input.processBox.style.pointerEvents = "auto";
        dom.text.currentProfileName.innerText = p.name;
        this.resetProcessForm();
    },

    // --- MACROS LOGIC ---
    syncMacrosFromSheet: async function () {
        const dom = PopupUI.dom;
        const url = dom.input.macroLink.value.trim();
        const gid = dom.input.macroGid.value.trim();

        if (!url) return PopupUI.showToast("Thiếu link Sheet Macros!", "warning");
        if (!gid) return PopupUI.showToast("Thiếu GID Macros!", "warning");
        if (!url.includes("docs.google.com/spreadsheets")) return PopupUI.showToast("Link không hợp lệ!", "error");

        dom.btn.loadMacros.innerText = "⏳ Loading...";
        try {
            const macros = await DataManager.fetchAndParseMacros(url, gid);

            // Re-render
            const count = Object.keys(macros).length;
            if (dom.text.lblMacroCount) dom.text.lblMacroCount.innerText = count;
            PopupUI.renderMacrosTab();
            PopupUI.showToast(`Đã load ${count} macros!`, "success");

        } catch (e) {
            console.error(e);
            PopupUI.showToast("Lỗi load Macros: " + e.message, "error");
        } finally {
            dom.btn.loadMacros.innerText = "LOAD MACROS";
        }
    }
};
