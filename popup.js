// VERSION: 4.0 (Modularized)

// Expose modules for non-module scripts (like ai-engine.js)
window.DataManager = DataManager;
window.Utils = Utils;

// Ensure AIEngine is available
if (!window.AIEngine) {
    console.warn("AIEngine not found at startup. Waiting for script load...");
} else {
    console.log("AIEngine loaded successfully.");
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // INIT DOM
        const dom = window.PopupUI.initDOM();

        // --- 2. INIT ---
        if (!DataManager || !Utils) return window.PopupUI.showToast(window.ERRORS.MISSING_MODULES, 'error');

        if (typeof window.APP_CONFIG !== 'undefined') {
            const getEl = (id) => document.getElementById(id);
            if (getEl('noteAutofillContainer')) getEl('noteAutofillContainer').innerHTML = window.APP_CONFIG.noteAutoFill || "";
            if (getEl('noteBatchContainer')) getEl('noteBatchContainer').innerHTML = window.APP_CONFIG.noteBatch || "";
            if (getEl('noteConfigContainer')) getEl('noteConfigContainer').innerHTML = window.APP_CONFIG.noteConfig || "";
        }

        // Initialize Logic
        await window.PopupLogic.init();

        // Initial Renders
        // Fix: Define renderConfig object to be reused recursively
        const renderConfig = {
            reRender: () => {
                window.PopupUI.renderConfigTab(renderConfig);
                window.PopupUI.renderRunTab(window.PopupLogic.updateProcessDropdown.bind(PopupLogic));
            },
            onDeleteProfile: window.PopupLogic.onDeleteProfile.bind(PopupLogic),
            onSelectProfile: window.PopupLogic.onSelectProfile.bind(PopupLogic)
        };

        // Initial Renders
        window.PopupUI.renderRunTab(window.PopupLogic.updateProcessDropdown.bind(PopupLogic));
        window.PopupUI.renderConfigTab(renderConfig);

        // Bind Tools Tab
        window.PopupUI.bindToolsTabEvent();

        // Listen for Background Updates
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === "UI_UPDATE" && request.data) {
                window.PopupLogic.updateStatusFromBg();
            } else if (request.action === "quota_low_warning") {
                window.PopupUI.showToast("⚠️ Bộ nhớ đầy! Hãy xóa bớt Profile cũ.", 'warning');
            } else if (request.action === "error_occurred") {
                window.PopupUI.showToast(`Lỗi: ${request.error}`, 'error');
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
                if (!granted) { window.PopupUI.showToast(`⚠️ Cần quyền truy cập ${url.hostname}`, 'warning'); return false; }
                return true;
            } catch (e) { return false; }
        }

        async function startNewBatch(rows) {
            try {
                if (!Array.isArray(rows) || rows.length === 0) throw new Error(window.ERRORS.NO_ROWS);
                if (!window.DataManager.currentCsvData) throw new Error(window.ERRORS.NO_DATA);
                const hasPerm = await requestTabPermission();
                if (!hasPerm) return;

                const pid = dom.input.profile.value; const procId = dom.input.process.value;
                const p = window.DataManager.appData.profiles.find(x => x.id === pid);
                const proc = p ? p.processes.find(x => x.id === procId) : null;
                if (!p || !proc) throw new Error(window.ERRORS.NO_PROCESS);

                const activeIndices = window.Utils.parseActiveColumns(proc.activeCols || "");

                // IDENTIFIER COLUMN LOGIC
                let idColIndex = 1;
                if (proc.batchCols) {
                    const batchIndices = window.Utils.parseActiveColumns(proc.batchCols);
                    if (batchIndices && batchIndices.length > 0) idColIndex = batchIndices[0];
                } else if (proc.col1) { // fallback
                    idColIndex = window.Utils.columnLetterToIndex(proc.col1);
                }

                const queue = [];
                rows.forEach(r => {
                    const idx = r - 1;
                    if (window.DataManager.currentCsvData[idx]) {
                        const { xpaths, values } = window.Utils.filterData(window.DataManager.currentCsvData[0], window.DataManager.currentCsvData[idx], activeIndices);

                        const rowData = {};
                        const fullRow = window.DataManager.currentCsvData[idx];
                        for (let i = 0; i < fullRow.length; i++) {
                            rowData[window.Utils.indexToColumnLetter(i)] = fullRow[i] || '';
                        }

                        queue.push({
                            rowIndex: r,
                            itemName: window.DataManager.currentCsvData[idx][idColIndex],
                            xpaths: xpaths,
                            values: values,
                            rowData: rowData
                        });
                    }
                });

                if (queue.length === 0) throw new Error(window.ERRORS.EMPTY_QUEUE);
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error(window.ERRORS.NO_TAB);

                chrome.runtime.sendMessage({
                    action: "START_BATCH", queue: queue, tabId: tab.id, profileName: p.name, processName: proc.name
                }, (response) => {
                    if (chrome.runtime.lastError) return;
                    if (response && !response.success) window.PopupUI.showToast(response.error, 'error');
                });
            } catch (e) { window.PopupUI.showToast(e.message, 'error'); }
        }


        // --- HANDLERS ---
        dom.btn.run.onclick = () => { try { startNewBatch(window.Utils.parseRange(dom.input.range.value)); } catch (e) { window.PopupUI.showToast(e.message, 'error'); } };
        dom.btn.batchRun.onclick = () => { try { const rows = (window.DataManager.appData.selectedBatchRows || []).map(Number); startNewBatch(rows); } catch (e) { window.PopupUI.showToast(e.message, 'error'); } };

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

                if (window.DataManager.appData) {
                    window.DataManager.appData.macroSheetConfig = { url, gid };
                    await window.DataManager.save();
                }
            };
        }

        dom.btn.addProfile.onclick = window.PopupLogic.saveProfileFn.bind(PopupLogic);

        // VARS HANDLERS
        dom.vars.btnRefresh.onclick = () => window.PopupUI.renderVariablesTab();
        dom.vars.btnClear.onclick = () => {
            if (confirm("Xóa tất cả biến?")) {
                chrome.runtime.sendMessage({ action: "CLEAR_VARIABLES" }, () => window.PopupUI.renderVariablesTab());
            }
        };
        dom.vars.btnExport.onclick = () => {
            chrome.runtime.sendMessage({ action: "GET_VARIABLES" }, (res) => {
                const blob = new Blob([JSON.stringify(res.vars, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = "variables.json"; a.click();
            });
        };

        dom.btn.addProcess.onclick = window.PopupLogic.saveProcessFn.bind(PopupLogic);

        // --- RENDERERS ---
        dom.tabs.run.onclick = () => window.PopupUI.switchTab('run');
        // dom.tabs.macros.onclick = () => { window.PopupUI.switchTab('macros'); window.PopupUI.renderMacrosTab(); }; // REMOVED
        dom.tabs.config.onclick = () => window.PopupUI.switchTab('config');
        dom.tabs.tools.onclick = () => window.PopupUI.switchTab('tools');
        dom.tabs.ai.onclick = () => window.PopupUI.switchTab('ai');

        // Sub-tab event listeners
        if (dom.subTabs.vars) dom.subTabs.vars.onclick = () => window.PopupUI.switchSubTab('vars');
        if (dom.subTabs.xpath) dom.subTabs.xpath.onclick = () => window.PopupUI.switchSubTab('xpath');
        if (dom.subTabs.backup) dom.subTabs.backup.onclick = () => window.PopupUI.switchSubTab('backup');
        if (dom.subTabs.macros) dom.subTabs.macros.onclick = () => { window.PopupUI.switchSubTab('macros'); window.PopupUI.renderMacrosTab(); };

        // Wire radio mode switchers
        const radioSingle = document.querySelector('input[name="runMode"][value="single"]');
        const radioBatch = document.querySelector('input[name="runMode"][value="batch"]');
        if (radioSingle) radioSingle.addEventListener('change', () => {
            window.DataManager.appData.runMode = 'single'; window.DataManager.save();
            window.PopupUI.switchRunMode('single');
        });
        if (radioBatch) radioBatch.addEventListener('change', () => {
            window.DataManager.appData.runMode = 'batch'; window.DataManager.save();
            window.PopupUI.switchRunMode('batch');
            const o = dom.input.process.selectedOptions[0];
            if (o) window.PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols);
        });

        // Refresh Button Handlers
        const btnRefreshBatch = document.getElementById('btnRefreshBatch');
        if (btnRefreshBatch) {
            btnRefreshBatch.onclick = () => {
                const o = dom.input.process.selectedOptions[0];
                if (o) window.PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols, true);
                else window.PopupUI.showToast("Vui lòng chọn quy trình trước", "warning");
            };
        }
        if (dom.btn.btnRefreshSingle) {
            dom.btn.btnRefreshSingle.onclick = () => {
                const o = dom.input.process.selectedOptions[0];
                if (o) window.PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols, true);
                else window.PopupUI.showToast("Vui lòng chọn quy trình trước", "warning");
            };
        }

        // SUB TABS
        dom.subTabs.vars.onclick = () => { window.PopupUI.switchSubTab('vars'); window.PopupUI.renderVariablesTab(); };
        dom.subTabs.xpath.onclick = () => { window.PopupUI.switchSubTab('xpath'); if (window.PopupUI.renderXPathTab) window.PopupUI.renderXPathTab(); };
        dom.subTabs.backup.onclick = () => { window.PopupUI.switchSubTab('backup'); window.PopupUI.renderBackupTab(); };

        dom.input.profile.onchange = async (e) => {
            window.DataManager.appData.lastProfileId = e.target.value;
            window.DataManager.appData.lastProcessId = "";
            await window.DataManager.save();
            window.PopupLogic.updateProcessDropdown(e.target.value);
        };

        dom.input.process.onchange = async (e) => {
            window.DataManager.appData.lastProcessId = e.target.value;
            await window.DataManager.save();
            const o = dom.input.process.selectedOptions[0];
            if (o) window.PopupLogic.loadCsvForProcess(o.dataset.url, o.dataset.gid, o.dataset.batchCols);
        };

        const handleCtrl = (action) => chrome.runtime.sendMessage({ action: action });
        dom.btn.pause.onclick = dom.btn.batchPause.onclick = () => handleCtrl(window.PopupLogic.currentStatus === "RUNNING" ? "PAUSE_BATCH" : "RESUME_BATCH");

        dom.btn.stop.onclick = dom.btn.batchStop.onclick = () => {
            if (confirm("Dừng hẳn quy trình?")) {
                chrome.runtime.sendMessage({ action: "STOP_BATCH" });
            }
        };
        dom.input.range.onchange = async (e) => { window.DataManager.appData.lastRange = e.target.value; await window.DataManager.save(); };

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
            if (!tab) return window.PopupUI.showToast('Không tìm thấy tab!', 'error');
            if (tab.url.startsWith('chrome://')) return window.PopupUI.showToast('Không thể chạy trên trang nội bộ Chrome!', 'warning');

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
                    window.PopupUI.showToast(msg, 'error');
                    xpathPickerActive = false;
                    renderXPathTab(); // ensure UI reset
                }
            }
        };

        function onPickerStarted() {
            xpathPickerActive = true;
            renderXPathTab();
            window.PopupUI.showToast('🎯 Chế độ chọn XPath đã bật!', 'success');
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
                window.PopupUI.showToast('⏹️ Đã thoát chế độ XPath', 'info');
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
                const json = window.DataManager.exportProfiles();
                navigator.clipboard.writeText(json).then(() => {
                    window.DataManager.appData.lastBackupTime = Date.now();
                    window.DataManager.save();
                    window.PopupUI.renderBackupTab();
                    window.PopupUI.showToast("✅ Copied to clipboard!", 'success');
                });
            } catch (e) { window.PopupUI.showToast("Export failed: " + e.message, 'error'); }
        };

        dom.btn.import.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (!text) return window.PopupUI.showToast("Clipboard empty!", 'warning');

                const res = await window.DataManager.importProfiles(text);

                if (res.success) {
                    window.PopupUI.showToast(`✅ Imported: ${res.imported} new profiles`, 'success');
                    window.PopupUI.renderBackupTab();
                    window.PopupLogic.onDeleteProfile(null);
                } else if (res.conflicts) {
                    const names = res.conflicts.map(c => c.name).join(', ');
                    const overwrite = confirm(`⚠️ ${res.conflicts.length} profile(s) already exist: ${names}\n\nOverwrite existing profiles?\n\nOK = Overwrite | Cancel = Skip`);

                    const mergeRes = await window.DataManager.mergeProfiles(res.data, overwrite);
                    if (mergeRes.success) {
                        window.PopupUI.showToast(`✅ Imported: ${mergeRes.imported} new, ${mergeRes.updated} updated`, 'success');
                        window.PopupUI.renderBackupTab();
                        window.PopupLogic.onDeleteProfile(null);
                    }
                } else {
                    window.PopupUI.showToast("❌ Error: " + res.error, 'error');
                }
            } catch (e) { window.PopupUI.showToast("❌ " + e.message, 'error'); }
        };

        dom.btn.clear.onclick = async () => {
            if (confirm("⚠️ Xóa tất cả dữ liệu?\n\nThao tác này KHÔNG THỂ hoàn tác!")) {
                window.DataManager.appData.profiles = [];
                await window.DataManager.save();
                window.PopupUI.renderBackupTab();
                window.PopupLogic.onDeleteProfile(null);
                window.PopupUI.showToast("🗑️ Đã xóa dữ liệu.", 'success');
            }
        };

        // MACRO IMPORT/EXPORT
        // MACRO IMPORT/EXPORT
        if (dom.btn.loadMacros) {
            dom.btn.loadMacros.onclick = window.PopupLogic.syncMacrosFromSheet.bind(PopupLogic);
        }

        if (dom.btn.importMacros) {
            dom.btn.importMacros.onclick = async () => {
                const text = await navigator.clipboard.readText();
                try {
                    const imported = JSON.parse(text);
                    if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid JSON format');
                    Object.keys(imported).forEach(name => { window.DataManager.validateMacro(imported[name]); });
                    window.DataManager.appData.macros = { ...window.DataManager.appData.macros, ...imported };
                    await window.DataManager.save();
                    window.PopupUI.renderMacrosTab();
                    window.PopupUI.showToast(`✅ Imported ${Object.keys(imported).length} macros`, 'success');
                } catch (e) { window.PopupUI.showToast(`❌ Import failed: ${e.message}`, 'error'); }
            };
        }

        if (dom.btn.exportMacros) {
            dom.btn.exportMacros.onclick = async () => {
                const macros = window.DataManager.appData.macros || {};
                const json = JSON.stringify(macros, null, 2);
                await navigator.clipboard.writeText(json);
                window.PopupUI.showToast(`📋 Copied ${Object.keys(macros).length} macros to clipboard!`, 'success');
            };
        }

        // --- AI TAB HANDLERS ---
        // --- AI TAB HANDLERS ---

        // 1. Auto-save Config
        dom.input.aiApiKey.oninput = async () => {
            console.log("[AI] API Key changing...");
            if (window.DataManager.appData) {
                window.DataManager.appData.aiConfig = window.DataManager.appData.aiConfig || {};
                window.DataManager.appData.aiConfig.apiKey = dom.input.aiApiKey.value.trim();
                await window.DataManager.save();
                console.log("[AI] API Key saved.");
            }
        };

        dom.input.aiGid.oninput = async () => {
            let val = dom.input.aiGid.value.trim();
            console.log("[AI] GID/URL Input:", val);

            if (window.DataManager.appData) {
                window.DataManager.appData.aiConfig = window.DataManager.appData.aiConfig || {};
                window.DataManager.appData.aiConfig.gid = val;
                await window.DataManager.save();
                console.log("[AI] GID Config saved.");
            }
        };

        // 3. Auto-save Form Type
        if (dom.input.aiTrigger) {
            dom.input.aiTrigger.onchange = async () => {
                const val = dom.input.aiTrigger.value;
                if (window.DataManager.appData) {
                    window.DataManager.appData.lastTrigger = val;
                    await window.DataManager.save();
                    console.log("[AI] Trigger saved:", val);
                }
            };
        }

        dom.btn.testAi.onclick = async () => {
            const apiKey = dom.input.aiApiKey.value.trim();
            const gid = dom.input.aiGid.value.trim();

            if (!apiKey) return window.PopupUI.showToast("Cần nhập API Key!", 'error');
            if (!gid) return window.PopupUI.showToast("Cần nhập Sheet GID (hoặc Link)!", 'error');

            // Save first
            if (window.DataManager.appData) {
                window.DataManager.appData.aiConfig = { apiKey, gid };
                await window.DataManager.save();
            }

            try {
                window.PopupUI.updateAiStatus("Checking Connection...", "blue");

                // REAL TEST: Fetch Prompts
                if (!window.AIEngine) {
                    console.error("window.AIEngine is undefined");
                    throw new Error("AIEngine script not loaded. Please reload.");
                }

                console.log("Fetching prompts with GID:", gid);
                const prompts = await window.AIEngine.fetchPrompts(gid);
                console.log("Prompts fetched:", prompts);

                if (prompts.length === 0) {
                    window.PopupUI.showToast("Connected, but found NO prompts in sheet.", 'warning');
                    window.PopupUI.updateAiStatus("Empty Sheet", "orange");
                } else {
                    window.PopupUI.showToast(`✅ Connection OK! Found ${prompts.length} prompts.`, 'success');
                    window.PopupUI.updateAiStatus("Ready", "green");
                }

            } catch (e) {
                window.PopupUI.showToast("Connection Failed: " + e.message, 'error');
                window.PopupUI.updateAiStatus("Error", "red");
            }
        };

        dom.btn.aiScan.onclick = async () => {
            const apiKey = dom.input.aiApiKey.value.trim();
            const gid = dom.input.aiGid.value.trim();
            const trigger = dom.input.aiTrigger.value;

            if (!apiKey || !gid) return window.PopupUI.showToast("Thiếu cấu hình AI!", 'error');

            window.PopupUI.updateAiStatus("Scanning & Generating...", "blue");

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            chrome.tabs.sendMessage(tab.id, { action: "AI_SCAN" }, async (response) => {
                const lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.error("Msg Error:", lastError);
                    window.PopupUI.showToast("Error: Content script not loaded. Reload page!", 'error');
                    window.PopupUI.updateAiStatus("Conn. Error", "red");
                    return;
                }

                if (response && response.success) {
                    try {
                        if (!window.AIEngine) throw new Error("AIEngine module not loaded");

                        window.PopupUI.updateAiStatus("Fetching Prompts...", "blue");
                        const prompts = await window.AIEngine.fetchPrompts(gid);

                        window.PopupUI.updateAiStatus("AI Thinking...", "purple");
                        const promptTemplate = prompts.find(p => p.trigger === trigger)?.prompt || prompts[0]?.prompt;

                        if (!promptTemplate) throw new Error("No prompt found for trigger: " + trigger);

                        const xpaths = await window.AIEngine.generateXPath(response.formHTML, promptTemplate, apiKey);

                        dom.input.aiOutput.value = JSON.stringify(xpaths, null, 2);
                        dom.div.aiResults.style.display = 'block';
                        window.PopupUI.updateAiStatus("Done!", "green");

                    } catch (e) {
                        window.PopupUI.showToast("AI Error: " + e.message, 'error');
                        window.PopupUI.updateAiStatus("AI Error", "red");
                        console.error(e);
                    }
                } else {
                    const err = response ? response.error : "Unknown Error";
                    window.PopupUI.showToast("Scan Failed: " + err, 'error');
                    window.PopupUI.updateAiStatus(err.substring(0, 15) + "...", "red");
                }
            });
        };

        dom.btn.copyAi.onclick = () => {
            const text = dom.input.aiOutput.value;
            if (text) {
                navigator.clipboard.writeText(text);
                window.PopupUI.showToast("Copied to clipboard!", 'success');
            }
        };

        // Load AI Config
        if (window.DataManager.appData && window.DataManager.appData.aiConfig) {
            dom.input.aiApiKey.value = window.DataManager.appData.aiConfig.apiKey || "";
            dom.input.aiGid.value = window.DataManager.appData.aiConfig.gid || "";
            console.log("[AI] Loaded Config into UI");
        }

    } catch (criticalError) {
        console.error("CRITICAL POPUP ERROR:", criticalError);
        alert("Autofill Extension Error:\n" + criticalError.message + "\n\nPlease check console.");
    }
});