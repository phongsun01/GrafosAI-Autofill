// VERSION: 4.0 (Modularized)
import { Utils } from './utils.js';
import { DataManager } from './data-manager.js';
import { ERRORS } from './constants.js';
import { PopupUI } from './popup-ui.js';
import { PopupLogic } from './popup-logic.js';

document.addEventListener('DOMContentLoaded', async () => {
    // INIT DOM
    const dom = PopupUI.initDOM();

    // --- 2. INIT ---
    if (!DataManager || !Utils) return PopupUI.showToast(ERRORS.MISSING_MODULES, 'error');

    if (typeof window.APP_CONFIG !== 'undefined') {
        const getEl = (id) => document.getElementById(id);
        if (getEl('noteAutofillContainer')) getEl('noteAutofillContainer').innerHTML = window.APP_CONFIG.noteAutoFill || "";
        if (getEl('noteBatchContainer')) getEl('noteBatchContainer').innerHTML = window.APP_CONFIG.noteBatch || "";
        if (getEl('noteConfigContainer')) getEl('noteConfigContainer').innerHTML = window.APP_CONFIG.noteConfig || "";
    }

    // Initialize Logic
    await PopupLogic.init();

    // Initial Renders
    PopupUI.renderRunTab(PopupLogic.updateProcessDropdown.bind(PopupLogic));
    PopupUI.renderConfigTab({
        reRender: () => {
            PopupUI.renderConfigTab({});
            PopupUI.renderRunTab(PopupLogic.updateProcessDropdown.bind(PopupLogic));
        },
        onDeleteProfile: PopupLogic.onDeleteProfile.bind(PopupLogic),
        onSelectProfile: PopupLogic.onSelectProfile.bind(PopupLogic)
    });

    // Bind Tools Tab
    PopupUI.bindToolsTabEvent();

    // Listen for Background Updates
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "UI_UPDATE" && request.data) {
            PopupLogic.updateStatusFromBg();
        } else if (request.action === "quota_low_warning") {
            PopupUI.showToast("⚠️ Bộ nhớ đầy! Hãy xóa bớt Profile cũ.", 'warning');
        } else if (request.action === "error_occurred") {
            PopupUI.showToast(`Lỗi: ${request.error}`, 'error');
        }
    });

    // --- 3. BUSINESS LOGIC WRAPPERS ---

    async function requestTabPermission() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) return false;
            if (tab.url.includes("docs.google.com") || tab.url.includes("googleusercontent.com")) return true;
            const url = new URL(tab.url);
            if (!['http:', 'https:'].includes(url.protocol)) return true;
            const origin = url.origin + '/*';
            const has = await chrome.permissions.contains({ origins: [origin] });
            if (has) return true;
            const granted = await chrome.permissions.request({ origins: [origin] });
            if (!granted) { PopupUI.showToast(`⚠️ Cần quyền truy cập ${url.hostname}`, 'warning'); return false; }
            return true;
        } catch (e) { return false; }
    }

    async function startNewBatch(rows) {
        try {
            if (!Array.isArray(rows) || rows.length === 0) throw new Error(ERRORS.NO_ROWS);
            if (!DataManager.currentCsvData) throw new Error(ERRORS.NO_DATA);
            const hasPerm = await requestTabPermission();
            if (!hasPerm) return;

            const pid = dom.input.profile.value; const procId = dom.input.process.value;
            const p = DataManager.appData.profiles.find(x => x.id === pid);
            const proc = p ? p.processes.find(x => x.id === procId) : null;
            if (!p || !proc) throw new Error(ERRORS.NO_PROCESS);

            const activeIndices = Utils.parseActiveColumns(proc.activeCols || "");

            // IDENTIFIER COLUMN LOGIC
            let idColIndex = 1;
            if (proc.batchCols) {
                const batchIndices = Utils.parseActiveColumns(proc.batchCols);
                if (batchIndices && batchIndices.length > 0) idColIndex = batchIndices[0];
            } else if (proc.col1) { // fallback
                idColIndex = Utils.columnLetterToIndex(proc.col1);
            }

            const queue = [];
            rows.forEach(r => {
                const idx = r - 1;
                if (DataManager.currentCsvData[idx]) {
                    const { xpaths, values } = Utils.filterData(DataManager.currentCsvData[0], DataManager.currentCsvData[idx], activeIndices);

                    const rowData = {};
                    const fullRow = DataManager.currentCsvData[idx];
                    for (let i = 0; i < fullRow.length; i++) {
                        rowData[Utils.indexToColumnLetter(i)] = fullRow[i] || '';
                    }

                    queue.push({
                        rowIndex: r,
                        itemName: DataManager.currentCsvData[idx][idColIndex],
                        xpaths: xpaths,
                        values: values,
                        rowData: rowData
                    });
                }
            });

            if (queue.length === 0) throw new Error(ERRORS.EMPTY_QUEUE);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error(ERRORS.NO_TAB);

            chrome.runtime.sendMessage({
                action: "START_BATCH", queue: queue, tabId: tab.id, profileName: p.name, processName: proc.name
            }, (response) => {
                if (chrome.runtime.lastError) return;
                if (response && !response.success) PopupUI.showToast(response.error, 'error');
            });
        } catch (e) { PopupUI.showToast(e.message, 'error'); }
    }


    // --- HANDLERS ---
    dom.btn.run.onclick = () => { try { startNewBatch(Utils.parseRange(dom.input.range.value)); } catch (e) { PopupUI.showToast(e.message, 'error'); } };
    dom.btn.batchRun.onclick = () => { try { const rows = (DataManager.appData.selectedBatchRows || []).map(Number); startNewBatch(rows); } catch (e) { PopupUI.showToast(e.message, 'error'); } };

    // Batch Search Handler
    if (dom.input.searchBatch) {
        dom.input.searchBatch.oninput = (e) => {
            const kw = e.target.value.toLowerCase();
            const rows = dom.table.batchBody.querySelectorAll('tr');
            rows.forEach(r => {
                const text = r.innerText.toLowerCase();
                r.style.display = text.includes(kw) ? '' : 'none';
            });
        };
    }

    // Auto-save macro config on change
    if (dom.input.macroLink) {
        dom.input.macroLink.onchange = async () => {
            let url = dom.input.macroLink.value.trim();

            // Auto-extract GID
            const m = url.match(/[#&]gid=([0-9]+)/);
            if (m && dom.input.macroGid) {
                dom.input.macroGid.value = m[1];
            }

            const gid = dom.input.macroGid ? dom.input.macroGid.value.trim() : "0";

            if (DataManager.appData) {
                DataManager.appData.macroSheetConfig = { url, gid };
                await DataManager.save();
            }
        };
    }

    dom.btn.addProfile.onclick = PopupLogic.saveProfileFn.bind(PopupLogic);

    // VARS HANDLERS
    dom.vars.btnRefresh.onclick = () => PopupUI.renderVariablesTab();
    dom.vars.btnClear.onclick = () => {
        if (confirm("Xóa tất cả biến?")) {
            chrome.runtime.sendMessage({ action: "CLEAR_VARIABLES" }, () => PopupUI.renderVariablesTab());
        }
    };
    dom.vars.btnExport.onclick = () => {
        chrome.runtime.sendMessage({ action: "GET_VARIABLES" }, (res) => {
            const blob = new Blob([JSON.stringify(res.vars, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = "variables.json"; a.click();
        });
    };

    dom.btn.addProcess.onclick = PopupLogic.saveProcessFn.bind(PopupLogic);

    // --- RENDERERS ---
    dom.tabs.run.onclick = () => PopupUI.switchTab('run');
    dom.tabs.macros.onclick = () => { PopupUI.switchTab('macros'); PopupUI.renderMacrosTab(); };
    dom.tabs.config.onclick = () => PopupUI.switchTab('config');
    dom.tabs.tools.onclick = () => PopupUI.switchTab('tools');
    dom.tabs.ai.onclick = () => PopupUI.switchTab('ai');

    // Sub-tab event listeners
    if (dom.subTabs.vars) dom.subTabs.vars.onclick = () => PopupUI.switchSubTab('vars');
    if (dom.subTabs.xpath) dom.subTabs.xpath.onclick = () => PopupUI.switchSubTab('xpath');
    if (dom.subTabs.backup) dom.subTabs.backup.onclick = () => PopupUI.switchSubTab('backup');

    // Wire radio mode switchers
    const radioSingle = document.querySelector('input[name="runMode"][value="single"]');
    const radioBatch = document.querySelector('input[name="runMode"][value="batch"]');
    if (radioSingle) radioSingle.addEventListener('change', () => {
        DataManager.appData.runMode = 'single'; DataManager.save();
        PopupUI.switchRunMode('single');
    });
    if (radioBatch) radioBatch.addEventListener('change', () => {
        DataManager.appData.runMode = 'batch'; DataManager.save();
        PopupUI.switchRunMode('batch');
        const o = dom.input.process.selectedOptions[0];
        if (o) PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols);
    });

    // Refresh Button Handlers
    const btnRefreshBatch = document.getElementById('btnRefreshBatch');
    if (btnRefreshBatch) {
        btnRefreshBatch.onclick = () => {
            const o = dom.input.process.selectedOptions[0];
            if (o) PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols, true);
            else PopupUI.showToast("Vui lòng chọn quy trình trước", "warning");
        };
    }
    if (dom.btn.btnRefreshSingle) {
        dom.btn.btnRefreshSingle.onclick = () => {
            const o = dom.input.process.selectedOptions[0];
            if (o) PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols, true);
            else PopupUI.showToast("Vui lòng chọn quy trình trước", "warning");
        };
    }

    // SUB TABS
    dom.subTabs.vars.onclick = () => { PopupUI.switchSubTab('vars'); PopupUI.renderVariablesTab(); };
    dom.subTabs.xpath.onclick = () => { PopupUI.switchSubTab('xpath'); if (PopupUI.renderXPathTab) PopupUI.renderXPathTab(); };
    dom.subTabs.backup.onclick = () => { PopupUI.switchSubTab('backup'); PopupUI.renderBackupTab(); };

    dom.input.profile.onchange = async (e) => {
        DataManager.appData.lastProfileId = e.target.value;
        DataManager.appData.lastProcessId = "";
        await DataManager.save();
        PopupLogic.updateProcessDropdown(e.target.value);
    };

    dom.input.process.onchange = async (e) => {
        DataManager.appData.lastProcessId = e.target.value;
        await DataManager.save();
        const o = dom.input.process.selectedOptions[0];
        if (o) PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols);
    };

    const handleCtrl = (action) => chrome.runtime.sendMessage({ action: action });
    dom.btn.pause.onclick = dom.btn.batchPause.onclick = () => handleCtrl(PopupLogic.currentStatus === "RUNNING" ? "PAUSE_BATCH" : "RESUME_BATCH");

    dom.btn.stop.onclick = dom.btn.batchStop.onclick = () => {
        if (confirm("Dừng hẳn quy trình?")) {
            chrome.runtime.sendMessage({ action: "STOP_BATCH" });
        }
    };
    dom.input.range.onchange = async (e) => { DataManager.appData.lastRange = e.target.value; await DataManager.save(); };

    // --- XPATH PICKER LOGIC ---
    let xpathPickerActive = false;

    function renderXPathTab() {
        if (!dom.status.xpathMode) return;
        dom.status.xpathMode.textContent = xpathPickerActive ? '🟢 Đang hoạt động' : '🚫 Chế độ tắt';
        dom.btn.startPicker.style.display = xpathPickerActive ? 'none' : 'block';
        dom.btn.stopPicker.style.display = xpathPickerActive ? 'block' : 'none';
    }

    dom.btn.startPicker.onclick = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return PopupUI.showToast('Không tìm thấy tab!', 'error');
        if (tab.url.startsWith('chrome://')) return PopupUI.showToast('Không thể chạy trên trang nội bộ Chrome!', 'warning');

        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'XPATH_PICKER_START' });
            onPickerStarted();
        } catch (e) {
            console.log("Message failed, attempting injection...", e);
            try {
                // Determine if we need to inject
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['security-utils.js', 'content-utils.js', 'content-commands.js', 'picker.js', 'content.js']
                });

                // Wait small delay for script to init
                await new Promise(r => setTimeout(r, 200));

                // Retry message
                await chrome.tabs.sendMessage(tab.id, { action: 'XPATH_PICKER_START' });
                onPickerStarted();

            } catch (injectError) {
                console.error(injectError);
                let msg = injectError.message;
                if (msg.includes("Could not establish connection") || msg.includes("Receiving end does not exist")) {
                    msg = "⚠️ Hãy reload (F5) trang web và thử lại!";
                }
                PopupUI.showToast(msg, 'error');
                xpathPickerActive = false;
                renderXPathTab(); // ensure UI reset
            }
        }
    };

    function onPickerStarted() {
        xpathPickerActive = true;
        renderXPathTab();
        PopupUI.showToast('🎯 Chế độ chọn XPath đã bật!', 'success');
    }

    dom.btn.stopPicker.onclick = stopXPathPicker;

    async function stopXPathPicker() {
        xpathPickerActive = false;
        renderXPathTab(); // immediate UI update
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, { action: 'XPATH_PICKER_STOP' });
            }
            PopupUI.showToast('⏹️ Đã thoát chế độ XPath', 'info');
        } catch (e) { console.error(e); }
    }

    dom.btn.copyXPath.onclick = () => {
        const xpath = dom.input.currentXPath.value;
        if (xpath) {
            navigator.clipboard.writeText(xpath).then(() => {
                dom.status.xpathCopied.style.display = 'inline';
                setTimeout(() => { dom.status.xpathCopied.style.display = 'none'; }, 2000);
            });
        }
    };

    // Listen for XPath picked
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'XPATH_PICKED') {
            dom.input.currentXPath.value = request.xpath;
            dom.status.xpathMode.innerHTML = `🟢 Đã chọn: <strong>${request.tagName}</strong>`;
            navigator.clipboard.writeText(request.xpath);
            dom.status.xpathCopied.style.display = 'inline';
            setTimeout(() => { dom.status.xpathCopied.style.display = 'none'; }, 2000);
            xpathPickerActive = false;
            renderXPathTab();
        }

        if (request.action === 'XPATH_HOVER') {
            dom.input.currentXPath.value = request.xpath;
            dom.status.xpathMode.innerHTML = `🟢 Đang chọn: <strong>${request.tagName}</strong>`;
        }
    });

    // BACKUP HANDLERS
    dom.btn.export.onclick = () => {
        try {
            const json = DataManager.exportProfiles();
            navigator.clipboard.writeText(json).then(() => {
                DataManager.appData.lastBackupTime = Date.now();
                DataManager.save();
                PopupUI.renderBackupTab();
                PopupUI.showToast("✅ Copied to clipboard!", 'success');
            });
        } catch (e) { PopupUI.showToast("Export failed: " + e.message, 'error'); }
    };

    dom.btn.import.onclick = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return PopupUI.showToast("Clipboard empty!", 'warning');

            const res = await DataManager.importProfiles(text);

            if (res.success) {
                PopupUI.showToast(`✅ Imported: ${res.imported} new profiles`, 'success');
                PopupUI.renderBackupTab();
                PopupLogic.onDeleteProfile(null);
            } else if (res.conflicts) {
                const names = res.conflicts.map(c => c.name).join(', ');
                const overwrite = confirm(`⚠️ ${res.conflicts.length} profile(s) already exist: ${names}\n\nOverwrite existing profiles?\n\nOK = Overwrite | Cancel = Skip`);

                const mergeRes = await DataManager.mergeProfiles(res.data, overwrite);
                if (mergeRes.success) {
                    PopupUI.showToast(`✅ Imported: ${mergeRes.imported} new, ${mergeRes.updated} updated`, 'success');
                    PopupUI.renderBackupTab();
                    PopupLogic.onDeleteProfile(null);
                }
            } else {
                PopupUI.showToast("❌ Error: " + res.error, 'error');
            }
        } catch (e) { PopupUI.showToast("❌ " + e.message, 'error'); }
    };

    dom.btn.clear.onclick = async () => {
        if (confirm("⚠️ Xóa tất cả dữ liệu?\n\nThao tác này KHÔNG THỂ hoàn tác!")) {
            DataManager.appData.profiles = [];
            await DataManager.save();
            PopupUI.renderBackupTab();
            PopupLogic.onDeleteProfile(null);
            PopupUI.showToast("🗑️ Đã xóa dữ liệu.", 'success');
        }
    };

    // MACRO IMPORT/EXPORT
    dom.btn.loadMacros.onclick = PopupLogic.syncMacrosFromSheet.bind(PopupLogic);

    dom.btn.importMacros.onclick = async () => {
        const text = await navigator.clipboard.readText();
        try {
            const imported = JSON.parse(text);
            if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid JSON format');
            Object.keys(imported).forEach(name => { DataManager.validateMacro(imported[name]); });
            DataManager.appData.macros = { ...DataManager.appData.macros, ...imported };
            await DataManager.save();
            PopupUI.renderMacrosTab();
            PopupUI.showToast(`✅ Imported ${Object.keys(imported).length} macros`, 'success');
        } catch (e) { PopupUI.showToast(`❌ Import failed: ${e.message}`, 'error'); }
    };

    dom.btn.exportMacros.onclick = async () => {
        const macros = DataManager.appData.macros || {};
        const json = JSON.stringify(macros, null, 2);
        await navigator.clipboard.writeText(json);
        PopupUI.showToast(`📋 Copied ${Object.keys(macros).length} macros to clipboard!`, 'success');
    };

    // --- AI TAB HANDLERS ---
    dom.btn.testAi.onclick = async () => {
        const apiKey = dom.input.aiApiKey.value.trim();
        const gid = dom.input.aiGid.value.trim();

        if (!apiKey) return PopupUI.showToast("Cần nhập API Key!", 'error');
        if (!gid) return PopupUI.showToast("Cần nhập Sheet GID!", 'error');

        if (DataManager.appData) {
            DataManager.appData.aiConfig = { apiKey, gid };
            await DataManager.save();
        }

        try {
            PopupUI.updateAiStatus("Checking...", "blue");
            PopupUI.showToast("Connection Test: OK (Saved)", 'success');
            PopupUI.updateAiStatus("Ready", "#666");
        } catch (e) {
            PopupUI.showToast("Connection Failed: " + e.message, 'error');
            PopupUI.updateAiStatus("Error", "red");
        }
    };

    dom.btn.aiScan.onclick = async () => {
        const apiKey = dom.input.aiApiKey.value.trim();
        const gid = dom.input.aiGid.value.trim();
        const trigger = dom.input.aiTrigger.value;

        if (!apiKey || !gid) return PopupUI.showToast("Thiếu cấu hình AI!", 'error');

        PopupUI.updateAiStatus("Scanning & Generating...", "blue");

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        chrome.tabs.sendMessage(tab.id, { action: "AI_SCAN" }, async (response) => {
            if (response && response.success) {
                try {
                    if (!window.AIEngine) throw new Error("AIEngine module not loaded");

                    PopupUI.updateAiStatus("Fetching Prompts...", "blue");
                    const prompts = await window.AIEngine.fetchPrompts(gid);

                    PopupUI.updateAiStatus("AI Thinking...", "purple");
                    const promptTemplate = prompts.find(p => p.trigger === trigger)?.prompt || prompts[0]?.prompt;

                    if (!promptTemplate) throw new Error("No prompt found for trigger: " + trigger);

                    const xpaths = await window.AIEngine.generateXPath(response.formHTML, promptTemplate, apiKey);

                    dom.input.aiOutput.value = JSON.stringify(xpaths, null, 2);
                    dom.div.aiResults.style.display = 'block';
                    PopupUI.updateAiStatus("Done!", "green");

                } catch (e) {
                    PopupUI.showToast("AI Error: " + e.message, 'error');
                    PopupUI.updateAiStatus("Failed", "red");
                    console.error(e);
                }
            } else {
                PopupUI.showToast("Scan Failed: " + (response ? response.error : "Unknown"), 'error');
                PopupUI.updateAiStatus("Scan Failed", "red");
            }
        });
    };

    dom.btn.copyAi.onclick = () => {
        const text = dom.input.aiOutput.value;
        if (text) {
            navigator.clipboard.writeText(text);
            PopupUI.showToast("Copied to clipboard!", 'success');
        }
    };

    // Load AI Config
    if (DataManager.appData && DataManager.appData.aiConfig) {
        dom.input.aiApiKey.value = DataManager.appData.aiConfig.apiKey || "";
        dom.input.aiGid.value = DataManager.appData.aiConfig.gid || "";
    }
});