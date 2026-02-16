// MODULE: Popup UI (V1.1 - Dynamic Batch Cols)

window.PopupUI = {
    // DOM Cache
    dom: {},

    initDOM: function () {
        const getEl = (id) => document.getElementById(id);
        this.dom = {
            tabs: { run: getEl('tabRun'), config: getEl('tabConfig'), tools: getEl('tabTools'), ai: getEl('tabAI') },
            views: { run: getEl('viewRun'), config: getEl('viewConfig'), tools: getEl('viewTools'), ai: getEl('viewAI') },
            mode: {
                radioSingle: document.querySelector('input[name="runMode"][value="single"]'),
                radioBatch: document.querySelector('input[name="runMode"][value="batch"]'),
                sectionSingle: getEl('sectionSingle'),
                sectionBatch: getEl('sectionBatch'),
                noteSingle: getEl('noteAutofillContainer'),
                noteBatch: getEl('noteBatchContainer')
            },
            subTabs: { vars: getEl('subTabVars'), xpath: getEl('subTabXPath'), backup: getEl('subTabBackup'), macros: getEl('subTabMacros') },
            sections: { vars: getEl('sectionVars'), xpath: getEl('sectionXPath'), backup: getEl('sectionBackup'), macros: getEl('sectionMacros') },
            btn: {
                run: getEl('btnRun'), pause: getEl('btnPause'), stop: getEl('btnStop'),
                batchRun: getEl('btnRunBatch'), batchPause: getEl('btnPauseBatch'), batchStop: getEl('btnStopBatch'),
                btnRefreshSingle: getEl('btnRefreshSingle'),
                addProfile: getEl('btnAddProfile'), addProcess: getEl('btnAddProcess'),
                startPicker: getEl('btnStartPicker'), stopPicker: getEl('btnStopPicker'), copyXPath: getEl('btnCopyXPath'),
                export: getEl('btnExport'), import: getEl('btnImport'), clear: getEl('btnClearAll'),
                loadMacros: getEl('btnLoadMacros'), importMacros: getEl('btnImportMacros'), exportMacros: getEl('btnExportMacros'), // [UPDATED]
                testAi: getEl('btnTestAi'), aiScan: getEl('btnAiScan'), copyAi: getEl('btnCopyAi') // [NEW]
            },
            input: {
                profile: getEl('runProfileSelect'), process: getEl('runProcessSelect'), range: getEl('txtRange'),
                files: ['security-utils.js', 'content-utils.js', 'content-commands.js', 'picker.js', 'content.js'],
                newProfile: getEl('newProfileName'), newProcess: getEl('newProcessName'), newLink: getEl('newProcessLink'),
                batchCols: getEl('txtBatchCols'), active: getEl('txtActiveCols'),
                profileList: getEl('profileList'), processList: getEl('processList'), processBox: getEl('processBox'),
                currentXPath: getEl('txtCurrentXPath'),
                searchBatch: getEl('txtSearchBatch'),
                macroLink: getEl('txtMacroSheetLink'), macroGid: getEl('txtMacroGid'), // [UPDATED]
                aiApiKey: getEl('txtAiApiKey'), aiGid: getEl('txtAiGid'), aiTrigger: getEl('selAiTrigger'), aiOutput: getEl('txtAiOutput') // [NEW]
            },
            div: { // [NEW]
                aiResults: getEl('aiResults')
            },
            status: {
                msg: getEl('statusMsg'), msgBatch: getEl('statusMsgBatch'),
                bar: getEl('progressBar'), track: getEl('progressTrack'),
                barBatch: getEl('progressBarBatch'), trackBatch: getEl('progressTrackBatch'),
                xpathMode: getEl('xpathMode'), xpathCopied: getEl('xpathCopied')
            },
            text: { currentProfileName: getEl('currentProfileName'), lblVarCount: getEl('lblVarCount'), lblProfileCount: getEl('lblProfileCount'), lblLastBackup: getEl('lblLastBackup'), lblMacroCount: getEl('lblMacroCount') },
            table: {
                batchTable: getEl('batchTable'), batchHead: getEl('batchTable').querySelector('thead tr'), batchBody: getEl('batchTableBody'), lblTotal: getEl('lblTotalRows'), lblSel: getEl('lblSelectedCount'), lblGid: getEl('lblGid'),
                varsTableBody: getEl('varsTableBody'),
                macrosTable: getEl('macrosTable'), macrosTableBody: getEl('macrosTableBody')
            },
            toastContainer: getEl('toast-container'),
            vars: {
                btnRefresh: getEl('btnRefreshVars'), btnClear: getEl('btnClearVars'), btnExport: getEl('btnExportVars')
            }
        };
        return this.dom;
    },

    bindToolsTabEvent: function () {
        if (this.dom.tabs.tools) {
            this.dom.tabs.tools.onclick = () => {
                console.log('[bindToolsTabEvent] Tools tab clicked');
                PopupUI.switchTab('tools');
                const lastSub = DataManager.appData.lastSubTab || 'xpath';
                console.log('[bindToolsTabEvent] Restoring lastSubTab:', lastSub);
                PopupUI.switchSubTab(lastSub);
                // Trigger render functions if needed
                if (lastSub === 'xpath' && this.renderXPathTab) this.renderXPathTab();
                if (lastSub === 'vars' && this.renderVariablesTab) this.renderVariablesTab();
            };
        }
    },

    showToast: function (message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = message;
        this.dom.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    renderStatusUI: function (bgState) {
        if (!bgState) return;
        const currentStatus = bgState.status;
        const msg = bgState.logs || "Sẵn sàng";
        this.dom.status.msg.innerText = msg; this.dom.status.msgBatch.innerText = msg;

        const isRunning = currentStatus === "RUNNING" || currentStatus === "PAUSED";

        if (isRunning && bgState.total > 0) {
            const percent = Math.min(100, Math.floor((bgState.currentIndex / bgState.total) * 100));
            this.dom.status.track.style.display = "block";
            this.dom.status.bar.style.width = `${percent}%`;
            if (this.dom.status.trackBatch) {
                this.dom.status.trackBatch.style.display = "block";
                this.dom.status.barBatch.style.width = `${percent}%`;
            }
        } else {
            this.dom.status.track.style.display = "none";
            this.dom.status.bar.style.width = "0%";
            if (this.dom.status.trackBatch) {
                this.dom.status.trackBatch.style.display = "none";
                this.dom.status.barBatch.style.width = "0%";
            }
        }

        this.dom.btn.run.style.display = isRunning ? "none" : "block";
        this.dom.btn.batchRun.style.display = isRunning ? "none" : "block";
        [this.dom.btn.pause, this.dom.btn.stop, this.dom.btn.batchPause, this.dom.btn.batchStop].forEach(b => b.style.display = isRunning ? "block" : "none");

        const btnText = (currentStatus === "PAUSED") ? "▶️ TIẾP TỤC" : "⏸️ TẠM DỪNG";
        this.dom.btn.pause.innerText = btnText; this.dom.btn.batchPause.innerText = btnText;
        return currentStatus;
    },

    switchTab: async function (tabName) {
        Object.values(this.dom.tabs).forEach(t => t.classList.remove('active')); Object.values(this.dom.views).forEach(v => v.classList.remove('active'));
        if (this.dom.tabs[tabName]) this.dom.tabs[tabName].classList.add('active');
        if (this.dom.views[tabName]) this.dom.views[tabName].classList.add('active');

        DataManager.appData.lastTab = tabName; await DataManager.save();
    },

    switchSubTab: function (subName) {
        console.log('[switchSubTab] Called with:', subName);
        DataManager.appData.lastSubTab = subName;
        console.log('[switchSubTab] Saving to DataManager:', DataManager.appData.lastSubTab);
        DataManager.save();

        Object.values(this.dom.sections).forEach(s => s.style.display = 'none');
        Object.values(this.dom.subTabs).forEach(b => {
            b.style.opacity = '0.5';
            b.style.background = 'var(--text-sub)';
        });

        if (this.dom.sections[subName]) this.dom.sections[subName].style.display = 'block';
        if (this.dom.subTabs[subName]) {
            this.dom.subTabs[subName].style.opacity = '1';
            this.dom.subTabs[subName].style.background = 'var(--primary)';
        }
    },

    renderBatchGrid: function (rows, batchColsStr) {
        console.log("renderBatchGrid called", { rowsLength: rows ? rows.length : 0, batchColsStr });
        this.dom.table.batchBody.innerHTML = "";
        if (!Array.isArray(rows) || rows.length === 0) {
            console.warn("renderBatchGrid: No rows to render");
            return;
        }

        // Header
        const indices = Utils.parseActiveColumns(batchColsStr || "B,C") || [];
        let thHTML = '<th style="width:20px"><input type="checkbox" id="cbSelectAll"></th><th style="width:30px">#</th>';

        // rows[0] = internal header names, rows[1] usually user header names if we follow common CSV logic? 
        // Based on old code `rows[1][c1]`, let's assume row 1 contains user-friendly headers.
        indices.forEach(idx => {
            const colName = (rows[1] && rows[1][idx]) ? rows[1][idx] : Utils.columnLetterToIndex(idx) || `Col ${idx}`;
            // Convert index back to Letter for display if needed, but the cell content is what matters.
            // Let's just show the cell content of row[1]
            thHTML += `<th>${colName}</th>`;
        });
        this.dom.table.batchHead.innerHTML = thHTML;

        // Re-attach SelectAll Listener
        const cbAll = document.getElementById('cbSelectAll');
        if (cbAll) {
            cbAll.onchange = (e) => {
                document.querySelectorAll('.batch-row-cb').forEach(cb => cb.checked = e.target.checked);
                this.saveSelection();
            };
        }

        // Body
        for (let i = 2; i < rows.length; i++) {
            const tr = document.createElement('tr'); const r = i + 1;
            const chk = DataManager.appData.selectedBatchRows.includes(String(r)) ? "checked" : "";

            let tds = `<td class="col-cb"><input type="checkbox" class="batch-row-cb" data-row="${r}" ${chk}></td><td class="col-id">${i - 1}</td>`;
            indices.forEach(idx => {
                tds += `<td class="col-data">${rows[i][idx] || ''}</td>`;
            });

            tr.innerHTML = tds;
            tr.onclick = (e) => { if (e.target.type !== 'checkbox') tr.querySelector('input').click(); };
            tr.querySelector('input').onchange = () => this.saveSelection();
            this.dom.table.batchBody.appendChild(tr);
        }
    },

    renderVariablesTab: function () {
        // Fetch from Background via Message
        chrome.runtime.sendMessage({ action: "GET_VARIABLES" }, (response) => {
            if (!response || !response.vars) return;

            this.dom.table.varsTableBody.innerHTML = '';
            const vars = response.vars;
            const keys = Object.keys(vars);
            if (this.dom.text.lblVarCount) this.dom.text.lblVarCount.innerText = keys.length;

            if (keys.length === 0) {
                this.dom.table.varsTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;">No variables active</td></tr>';
                return;
            }

            keys.forEach(key => {
                // [FIX] Handle both old format (direct value) and new format ({value, _timestamp})
                const varData = vars[key];
                const displayValue = (typeof varData === 'object' && varData.value !== undefined) 
                    ? varData.value 
                    : varData;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="font-weight:600; color:var(--primary)">${key}</td>
                    <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${displayValue}">${displayValue}</td>
                    <td><button class="btn-icon btn-del" data-key="${key}">×</button></td>
                `;
                row.querySelector('.btn-del').onclick = () => {
                    chrome.runtime.sendMessage({ action: "DELETE_VARIABLE", key: key }, () => {
                        this.renderVariablesTab(); // Refresh
                    });
                };
                this.dom.table.varsTableBody.appendChild(row);
            });
        });
    },

    saveSelection: async function () {
        DataManager.appData.selectedBatchRows = Array.from(document.querySelectorAll('.batch-row-cb:checked')).map(cb => cb.dataset.row);
        await DataManager.save();
        this.dom.table.lblSel.innerText = `${DataManager.appData.selectedBatchRows.length} dòng chọn`;
    },

    renderRunTab: function (updateProcessDropdownCallback) {
        this.dom.input.profile.innerHTML = '<option value="">-- Chọn Profile --</option>';
        DataManager.appData.profiles.forEach(p => { let o = document.createElement('option'); o.value = p.id; o.innerText = p.name; this.dom.input.profile.appendChild(o); });
        if (DataManager.appData.lastProfileId) {
            this.dom.input.profile.value = DataManager.appData.lastProfileId;
            updateProcessDropdownCallback(DataManager.appData.lastProfileId);
        }
    },

    renderConfigTab: function (callbacks) {
        const { renderRunTab, renderProcessList, resetProcessForm, updateProcessDropdown } = callbacks;
        this.dom.input.profileList.innerHTML = "";
        DataManager.appData.profiles.forEach((p, index) => {
            const div = document.createElement('div'); div.className = `list-item`;
            div.innerHTML = `
                <span style="font-weight:600;cursor:pointer;flex:1">${p.name}</span>
                <div class="item-actions">
                    <button class="btn-icon btn-up">▲</button>
                    <button class="btn-icon btn-down">▼</button>
                    <button class="btn-icon btn-edit">✎</button>
                    <button class="btn-icon btn-del">✕</button>
                </div>`;

            div.querySelector('span').onclick = () => {
                callbacks.onSelectProfile(p);
            };

            const moveItem = (arr, idx, dir) => { if ((dir === -1 && idx > 0) || (dir === 1 && idx < arr.length - 1)) { [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]]; return true; } return false; };

            div.querySelector('.btn-up').onclick = async (e) => { e.stopPropagation(); if (moveItem(DataManager.appData.profiles, index, -1)) { await DataManager.save(); callbacks.reRender(); } };
            div.querySelector('.btn-down').onclick = async (e) => { e.stopPropagation(); if (moveItem(DataManager.appData.profiles, index, 1)) { await DataManager.save(); callbacks.reRender(); } };
            div.querySelector('.btn-edit').onclick = async (e) => { e.stopPropagation(); const n = prompt("Tên mới:", p.name); if (n && n.trim()) { p.name = n.trim(); await DataManager.save(); callbacks.reRender(); } };
            div.querySelector('.btn-del').onclick = async (e) => { e.stopPropagation(); if (confirm("Xóa?")) { callbacks.onDeleteProfile(p.id); } };
            this.dom.input.profileList.appendChild(div);
        });
    },

    renderBackupTab: function () {
        if (this.dom.text.lblProfileCount) this.dom.text.lblProfileCount.innerText = DataManager.appData.profiles.length;
        if (this.dom.text.lblLastBackup) this.dom.text.lblLastBackup.innerText = DataManager.appData.lastBackupTime ? new Date(DataManager.appData.lastBackupTime).toLocaleString() : "Never";
    },

    renderMacrosTab: function () {
        const macros = DataManager.appData.macros || {};
        const tbody = this.dom.table.macrosTableBody;
        tbody.innerHTML = '';

        const macroNames = Object.keys(macros);
        this.dom.text.lblMacroCount.innerText = macroNames.length;

        if (macroNames.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-sub);">No macros defined. Click Import to add.</td></tr>';
            return;
        }

        macroNames.forEach(name => {
            const commands = macros[name];
            const row = tbody.insertRow();
            row.innerHTML = `
                <td style="padding:8px; border-bottom:1px solid var(--border);">${name}</td>
                <td style="padding:8px; border-bottom:1px solid var(--border); text-align:center;">${commands.length} commands</td>
                <td style="padding:8px; border-bottom:1px solid var(--border); text-align:center;">
                    <button class="btn-icon btn-del" data-macro-name="${name}" style="padding:4px 8px; font-size:10px;">Del</button>
                </td>
            `;
        });

        // Wire delete buttons
        tbody.querySelectorAll('.btn-del').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const name = e.target.getAttribute('data-macro-name');
                if (confirm(`Delete macro "${name}"?`)) {
                    delete DataManager.appData.macros[name];
                    await DataManager.save();
                    this.renderMacrosTab();
                    this.showToast(`✅ Deleted macro: ${name}`, 'success');
                }
            });
        });
    },

    switchRunMode: function (mode) {
        if (!this.dom.mode.sectionSingle || !this.dom.mode.sectionBatch) return;

        if (mode === 'single') {
            this.dom.mode.sectionSingle.style.display = 'block';
            this.dom.mode.sectionBatch.style.display = 'none';
            if (this.dom.mode.noteSingle) this.dom.mode.noteSingle.style.display = 'block';
            if (this.dom.mode.noteBatch) this.dom.mode.noteBatch.style.display = 'none';
        } else {
            this.dom.mode.sectionSingle.style.display = 'none';
            this.dom.mode.sectionBatch.style.display = 'block';
            if (this.dom.mode.noteSingle) this.dom.mode.noteSingle.style.display = 'none';
            if (this.dom.mode.noteBatch) this.dom.mode.noteBatch.style.display = 'block';
        }
    },

    // Helper to update AI Status Status
    updateAiStatus: function (text, color) {
        const statusBar = document.getElementById('aiStatus');
        const statusText = document.getElementById('aiStatusText');
        if (statusBar && statusText) {
            statusBar.style.display = 'block';
            statusText.innerText = text;
            statusText.style.color = color || 'black';
        }
    }
};
