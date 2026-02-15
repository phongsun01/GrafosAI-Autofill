// MODULE: Data Manager (Retry Fetch + Logging)
import { ERRORS } from './constants.js';
import { Utils, storageLocal } from './utils.js';

export const DataManager = {
    DEFAULT_DATA: {
        profiles: [], lastProfileId: "", lastProcessId: "", lastRange: "3", lastTab: "run", lastSubTab: "xpath", runMode: "single", selectedBatchRows: [], macros: {},
        macroSheetConfig: { url: "", gid: "0" },
        aiConfig: { apiKey: "", gid: "" }
    },
    appData: null,
    currentCsvData: null,

    validateAndSanitize: (rawData) => {
        if (!rawData || typeof rawData !== 'object') return { ...DataManager.DEFAULT_DATA };
        const safeProfiles = (Array.isArray(rawData.profiles) ? rawData.profiles : []).map(p => ({
            id: String(p.id || 'prof_' + Date.now()),
            name: String(p.name || 'Unnamed Profile'),
            processes: (Array.isArray(p.processes) ? p.processes : []).map(proc => ({
                id: String(proc.id || 'proc_' + Date.now()),
                name: String(proc.name || 'Unnamed Process'),
                url: String(proc.url || ''),
                gid: String(proc.gid || '0'),
                col1: String(proc.col1 || 'B'),
                col2: String(proc.col2 || 'D'),
                activeCols: String(proc.activeCols || ''),
                batchCols: String(proc.batchCols || "B,D")
            }))
        }));
        return {
            profiles: safeProfiles,
            lastProfileId: String(rawData.lastProfileId || ""),
            lastProcessId: String(rawData.lastProcessId || ""),
            lastRange: String(rawData.lastRange || "3"),
            lastTab: String(rawData.lastTab || "run"),
            lastSubTab: String(rawData.lastSubTab || "xpath"),
            runMode: String(rawData.runMode || "single"),
            selectedBatchRows: Array.isArray(rawData.selectedBatchRows) ? rawData.selectedBatchRows : [],
            macros: (rawData.macros && typeof rawData.macros === 'object') ? rawData.macros : {},
            macroSheetConfig: (rawData.macroSheetConfig && typeof rawData.macroSheetConfig === 'object') ? rawData.macroSheetConfig : { url: "", gid: "0" },
            aiConfig: (rawData.aiConfig && typeof rawData.aiConfig === 'object') ? rawData.aiConfig : { apiKey: "", gid: "" }
        };
    },

    load: async function () {
        try {
            const result = await storageLocal.get(['appData']);
            DataManager.appData = result.appData ? DataManager.validateAndSanitize(result.appData) : { ...DataManager.DEFAULT_DATA };
            return DataManager.appData;
        } catch (e) {
            console.error('[DataManager] Load Error:', e);
            DataManager.appData = { ...DataManager.DEFAULT_DATA };
            return DataManager.appData;
        }
    },

    save: async function () {
        if (!DataManager.appData) return;
        try { await storageLocal.set({ appData: DataManager.appData }); }
        catch (e) { console.error('[DataManager] Save Error:', e); throw e; }
    },

    /**
     * Get current storage usage in bytes
     * @returns {Promise<number>}
     */
    async getStorageUsage() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse();
            return bytesInUse;
        } catch (e) {
            console.warn('[DataManager] Could not get storage usage:', e);
            return 0;
        }
    },

    saveProfile: async function (profileName, data) {
        if (!profileName) throw new Error('Profile name required');

        // Estimate data size
        const dataString = JSON.stringify(data);
        const estimatedSize = new Blob([dataString]).size;

        // Check storage quota (5MB hard limit)
        const MAX_STORAGE = (window.APP_CONFIG?.security?.maxStorageSize) || (5 * 1024 * 1024);
        if (estimatedSize > MAX_STORAGE) {
            throw new Error(`Data size (${(estimatedSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${(MAX_STORAGE / 1024 / 1024).toFixed(2)}MB). Please reduce data size.`);
        }

        const bytesInUse = await chrome.storage.local.getBytesInUse();
        if (bytesInUse + estimatedSize > MAX_STORAGE) {
            throw new Error(`Storage quota exceeded. Current: ${(bytesInUse / 1024 / 1024).toFixed(2)}MB, New data: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB, Limit: ${(MAX_STORAGE / 1024 / 1024).toFixed(2)}MB`);
        }

        await chrome.storage.local.set({ [`profile_${profileName}`]: data });
        console.log(`[DataManager] Saved profile: ${profileName} (${(estimatedSize / 1024).toFixed(2)}KB)`);
    },

    // [FIX 3] Added logging
    /**
     * Clear old CSV caches atomically to prevent corruption
     * Uses prepare-commit pattern for safety
     */
    clearOldCaches: async function () {
        try {
            const allData = await storageLocal.get(null);
            const keys = Object.keys(allData);
            const csvKeys = keys.filter(k => k.startsWith('csv_'));
            const CACHE_TTL = 300000; // 5 minutes

            // Prepare phase: Collect keys to delete
            const keysToDelete = [];
            for (let key of csvKeys) {
                if (!allData[key].timestamp ||
                    (Date.now() - allData[key].timestamp > CACHE_TTL)) {
                    keysToDelete.push(key);
                }
            }

            // Commit phase: Delete in one atomic batch
            if (keysToDelete.length > 0) {
                await storageLocal.remove(keysToDelete);
                console.log(`🧹 Removed ${keysToDelete.length} old caches.`);
            }
        } catch (e) {
            console.error('[Cleaner] Failed:', e);
            // Don't throw - cache cleaning is not critical
        }
    },


    fetchGoogleSheetCsv: async function (url, gid, force = false, retries = 3) {
        // 1. Dependency Check
        if (typeof Papa === 'undefined') throw new Error(ERRORS.MISSING_LIB);
        if (!url || !url.includes("docs.google.com/spreadsheets")) throw new Error(ERRORS.INVALID_LINK);
        const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!m) throw new Error(ERRORS.NO_SHEET_ID);

        const sheetId = m[1];
        const cacheKey = `csv_${sheetId}_${gid}`;
        const CACHE_TTL = 300000;

        // 2. Check Cache
        if (!force) {
            try {
                const cached = await storageLocal.get([cacheKey]);
                if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_TTL)) {
                    DataManager.currentCsvData = cached[cacheKey].data;
                    return cached[cacheKey].data;
                }
            } catch (e) { }
        }

        // [SECURITY FIX] Use window.SecurityUtils if available
        if (window.SecurityUtils && window.SecurityUtils.sanitizeUrl) {
            try {
                url = window.SecurityUtils.sanitizeUrl(url);
                console.log("[DataManager] URL sanitized:", url);
            } catch (e) {
                console.error("[DataManager] SecurityUtils error:", e);
            }
        } else {
            console.warn("[DataManager] SecurityUtils NOT found or sanitizeUrl missing", window.SecurityUtils);
        }

        // 3. Fetch Loop
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`;
        console.log("[DataManager] Fetching:", exportUrl);

        let attempts = 0;
        const MAX_RETRIES = 3;
        let response = null;

        while (attempts < MAX_RETRIES) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s Timeout

            try {
                attempts++;
                response = await fetch(exportUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                console.log(`[DataManager] Attempt ${attempts} Status:`, response.status);
                if (response.ok) break;

                // Handle specific errors
                if (response.status === 403) throw new Error(ERRORS.PRIVATE_403);
                if (response.status === 404) throw new Error("Sheet không tồn tại (404). Kiểm tra Link.");
                throw new Error(`HTTP ${response.status}`);

            } catch (err) {
                clearTimeout(timeoutId);
                console.warn(`[DataManager] Fetch Attempt ${attempts} failed:`, err.message);

                if (attempts === MAX_RETRIES) {
                    if (err.name === 'AbortError') throw new Error("Kết nối quá hạn (15s). Sheet quá lớn?");
                    throw err;
                }

                const backoffDelay = Math.pow(2, attempts) * 1000;
                await new Promise(r => setTimeout(r, backoffDelay));
            }
        }

        const text = await response.text();
        if (text.trim().startsWith("<!DOCTYPE html") || text.includes("<html")) {
            throw new Error(ERRORS.PRIVATE_HTML);
        }

        // 4. Parse CSV
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                skipEmptyLines: true,
                complete: async (res) => {
                    if (!res.data || res.data.length === 0) {
                        reject(new Error(ERRORS.EMPTY_QUEUE));
                    } else {
                        DataManager.currentCsvData = res.data;

                        // Check quota and clear old caches if needed
                        const hasSpace = await Utils.checkStorageQuota();
                        if (!hasSpace) await DataManager.clearOldCaches();

                        try {
                            await storageLocal.set({ [cacheKey]: { data: res.data, timestamp: Date.now() } });
                        } catch (e) { console.warn("Cache write skipped (Quota)"); }
                        resolve(res.data);
                    }
                },
                error: (err) => reject(new Error(err.message))
            });
        });
    },

    // NEW: Fetch and Parse Macros from Sheet (Horizontal)
    fetchAndParseMacros: async function (url, gid) {
        const data = await this.fetchGoogleSheetCsv(url, gid, true); // Always force fresh load for macros
        const macros = {};

        // Horizontal Parsing: Col A = Name, Col B+ = Commands
        // Skip header if needed? Usually Macro sheets might have a header. 
        // Let's assume Row 1 is header if it contains "MacroName" or similar, otherwise treat as data.
        // Or simply: just iterate all rows. If command is invalid, it gets skipped.

        data.forEach(row => {
            if (!row || row.length < 2) return;
            const macroName = String(row[0]).trim();
            if (!macroName || macroName.toLowerCase() === 'macroname') return; // Skip empty or header

            const commands = [];
            for (let i = 1; i < row.length; i++) {
                const cmd = String(row[i]).trim();
                if (cmd) commands.push(cmd);
            }

            if (commands.length > 0) {
                // If macro exists, append? Or overwrite? 
                // Horizontal design usually implies 1 row = 1 macro sequence. 
                // But user might split same macro across multiple rows? 
                // Implementation plan said: "Horizontal layout (1 row = 1 macro)".
                // So we overwrite or push to array if we supported multi-line.
                // Let's assume 1 row per macro for now as per "Horizontal" request.
                macros[macroName] = commands;
            }
        });

        this.appData.macros = macros;
        this.appData.macroSheetConfig = { url, gid };
        await this.save();
        return macros;
    },

    exportProfiles: function () {
        const profiles = JSON.parse(JSON.stringify(DataManager.appData.profiles));

        // Mask sensitive fields
        profiles.forEach(p => {
            p.processes.forEach(proc => {
                if (proc.password) proc.password = "***MASKED***";
                if (proc.api_key) proc.api_key = "***MASKED***";
            });
        });

        const metadata = {
            version: chrome.runtime.getManifest().version,
            timestamp: new Date().toISOString(),
            deviceId: "user-device",
            maskedFields: ["password", "api_key"]
        };

        return JSON.stringify({ profiles, metadata }, null, 2);
    },

    validateImport: function (data) {
        if (!data.profiles || !Array.isArray(data.profiles)) {
            throw new Error("Invalid format: missing profiles array");
        }

        if (!data.metadata || !data.metadata.version) {
            console.warn("Missing metadata, proceeding with caution");
        } else if (data.metadata.version !== chrome.runtime.getManifest().version) {
            console.warn(`Version mismatch: ${data.metadata.version} vs ${chrome.runtime.getManifest().version}`);
        }

        data.profiles.forEach((p, idx) => {
            if (!p.id || !p.name) {
                throw new Error(`Profile ${idx} missing required fields (id, name)`);
            }
        });
    },

    importProfiles: async function (jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            this.validateImport(data);

            let imported = 0, updated = 0;
            const conflicts = [];
            const existingMap = new Map(DataManager.appData.profiles.map(p => [p.id, p]));

            data.profiles.forEach(newP => {
                if (existingMap.has(newP.id)) {
                    conflicts.push({ id: newP.id, name: newP.name });
                }
            });

            // If conflicts exist, return them for user decision
            if (conflicts.length > 0) {
                return { success: false, conflicts, data };
            }

            // No conflicts, proceed with import
            data.profiles.forEach(newP => {
                DataManager.appData.profiles.push(newP);
                imported++;
            });

            await DataManager.save();
            return { success: true, imported, updated: 0 };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    mergeProfiles: async function (data, overwrite = false) {
        let imported = 0, updated = 0;
        const existingMap = new Map(DataManager.appData.profiles.map(p => [p.id, p]));

        data.profiles.forEach(newP => {
            if (existingMap.has(newP.id)) {
                if (overwrite) {
                    Object.assign(existingMap.get(newP.id), newP);
                    updated++;
                }
            } else {
                DataManager.appData.profiles.push(newP);
                imported++;
            }
        });

        await DataManager.save();
        return { success: true, imported, updated };
    },

    // --- MACRO VALIDATION ---
    validateMacro: function (macro) {
        const ALLOWED_COMMANDS = ['click', 'fill', 'delay', 'wait', 'waitfor', 'waiturl', 'extract', 'url', 'checklogin', 'if', 'config'];
        const MAX_COMMANDS = 20;

        if (!macro || !Array.isArray(macro)) {
            throw new Error('Macro must be an array of commands');
        }

        if (macro.length === 0) {
            throw new Error('Macro cannot be empty');
        }

        if (macro.length > MAX_COMMANDS) {
            throw new Error(`Macro exceeds max ${MAX_COMMANDS} commands (got ${macro.length})`);
        }

        macro.forEach((cmd, index) => {
            if (typeof cmd !== 'string' || !cmd.trim()) {
                throw new Error(`Invalid command at index ${index}: must be non-empty string`);
            }

            // Extract command type (before opening parenthesis)
            const cmdType = cmd.trim().split('(')[0].toLowerCase();

            if (!ALLOWED_COMMANDS.includes(cmdType)) {
                throw new Error(`Forbidden command type at index ${index}: "${cmdType}". Allowed: ${ALLOWED_COMMANDS.join(', ')}`);
            }
        });

        return true;
    }
};