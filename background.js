// MODULE: Background Service Worker (V2.4 - Stop Fix)
import { Utils, storageLocal } from './utils.js';

// [LOGGING] Inline Logger for service worker (can't load external scripts)
const Logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args)
};


const defaultState = {
    status: "IDLE",
    pausedBySheet: false,
    queue: [],
    currentIndex: 0,
    total: 0,
    logs: "Sẵn sàng",
    targetTabId: null,
    profileName: "",
    processName: "",
    startTime: null,
    variables: {}
};

let bgState = { ...defaultState };
let queueLock = Promise.resolve(); // Lock for concurrency

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes} phút ${seconds} giây`;
    return `${seconds} giây`;
}

// Load State
(async () => {
    try {
        const result = await storageLocal.get(['bgState', 'variables']); // Load both
        if (result.bgState) bgState = result.bgState;
        if (result.variables) bgState.variables = result.variables;
    } catch (e) { }
})();

// --- STATE MANAGEMENT & PERSISTENCE ---
let saveTimeout = null;
let isDirty = false; // [OPTIMIZATION] Track if state has changed

async function saveAndBroadcast(immediate = false) {
    if (!immediate && saveTimeout) {
        clearTimeout(saveTimeout);
    }

    if (!immediate) {
        // [OPTIMIZATION] Increased debounce from 200ms to 500ms to reduce I/O
        saveTimeout = setTimeout(() => actualSaveAndBroadcast(false), 500);
    } else {
        await actualSaveAndBroadcast(true);
    }
}

async function actualSaveAndBroadcast(immediate) {
    // [OPTIMIZATION] Only save if state has actually changed
    if (!isDirty && !immediate) {
        console.log('[Storage] Skipping save - no changes detected');
        return;
    }

    if (!await Utils.checkStorageQuota()) {
        chrome.runtime.sendMessage({ action: "quota_low_warning" }).catch(() => { });
        const { variables, ...stateWithoutVars } = bgState;
        chrome.runtime.sendMessage({ action: "UI_UPDATE", data: stateWithoutVars }).catch(() => { });
        return;
    }

    try {
        const { variables, ...stateWithoutVars } = bgState;
        await Promise.all([
            storageLocal.set({ bgState: stateWithoutVars }),
            storageLocal.set({ variables: variables })
        ]);

        isDirty = false; // Reset dirty flag after successful save

        // Only broadcast UI state (exclude heavy variables)
        chrome.runtime.sendMessage({ action: "UI_UPDATE", data: stateWithoutVars }).catch(() => { });
    } catch (e) {
        console.error("Save State Error:", e);
    }
}

// [OPTIMIZATION] Helper to mark state as dirty
function markDirty() {
    isDirty = true;
}

function getCurrentRowInfo() {
    if (!bgState.queue || bgState.queue.length === 0) return "---";
    if (bgState.currentIndex >= bgState.total) return "Hoàn tất";
    const item = bgState.queue[bgState.currentIndex];
    return item.itemName ? `${item.itemName} (Dòng ${item.rowIndex})` : `Dòng ${item.rowIndex}`;
}

// Content Script Injection Management
const injectedTabs = new Set();
const injectionLocks = new Map(); // Atomic lock to prevent race conditions

async function ensureContentScript(tabId) {
    // Check if injection is already in progress
    if (injectionLocks.has(tabId)) {
        return await injectionLocks.get(tabId);
    }

    if (injectedTabs.has(tabId)) return true;

    const lock = (async () => {
        try {
            // Test if content script is already loaded
            await chrome.tabs.sendMessage(tabId, { action: "PING" });
            injectedTabs.add(tabId);
            return true;
        } catch (e) {
            // Not loaded, inject now
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['security-utils.js', 'content-utils.js', 'content-commands.js', 'picker.js', 'content.js']
                });
                // [CONFIG] Use scriptInjectionWait
                const waitTime = (typeof window !== 'undefined' && window.APP_CONFIG?.performance?.scriptInjectionWait) || 200;
                await new Promise(r => setTimeout(r, waitTime));
                injectedTabs.add(tabId);
                return true;
            } catch (injectErr) {
                throw injectErr;
            }
        }
    })();

    injectionLocks.set(tabId, lock);
    try {
        return await lock;
    } finally {
        // Always cleanup the lock, even if error occurs
        injectionLocks.delete(tabId);
    }
}

// Lifecycle & Memory Management
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
    if (bgState.targetTabId === tabId && bgState.status === "RUNNING") {
        bgState.status = "PAUSED";
        bgState.logs = "⚠️ Tab đã đóng. Mở lại và bấm Tiếp tục.";
        markDirty();
        saveAndBroadcast();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        injectedTabs.delete(tabId);
        if (bgState.targetTabId === tabId && bgState.status === "RUNNING") {
            // [FIX] Don't pause if we expect navigation
            if (bgState.expectingNavigation) {
                bgState.logs = "🔄 Đang tải trang mới...";
                saveAndBroadcast();
            } else {
                bgState.status = "PAUSED";
                bgState.logs = "⚠️ Tab đang reload. Chờ tải xong hãy bấm Tiếp tục.";
                markDirty();
                saveAndBroadcast();
            }
        }
    }

    if (changeInfo.status === 'complete') {
        // [FIX] Always clear timeout when page loads, even if not expecting navigation
        if (bgState.targetTabId === tabId && bgState.navigationTimeoutId) {
            clearTimeout(bgState.navigationTimeoutId);
            bgState.navigationTimeoutId = null;
        }

        if (bgState.targetTabId === tabId && bgState.status === "RUNNING" && bgState.expectingNavigation) {
            console.log("[Background] Auto-resume after navigation");
            bgState.expectingNavigation = false;

            bgState.logs = "✅ Đã tải xong. Đang tiếp tục...";
            saveAndBroadcast();
            // [CONFIG] Use navigationWait or similar
            setTimeout(() => runNextItem(), 1500);
        }
    }
});

// Cleanup on extension restart/update
chrome.runtime.onStartup.addListener(() => {
    injectedTabs.clear();
    console.log('[Background] Extension started, cleared injectedTabs');
});

chrome.runtime.onInstalled.addListener(() => {
    injectedTabs.clear();
    console.log('[Background] Extension installed/updated, cleared injectedTabs');
});

// [NEW] TTL-based Variable Cleanup (Prevent Memory Leak)
setInterval(() => {
    const now = Date.now();
    const maxVarLength = window.APP_CONFIG?.performance?.variables?.maxVarLength || 1000;
    let cleaned = 0;

    for (const [key, val] of Object.entries(bgState.variables || {})) {
        // Check TTL (1 hour expiry)
        if (val && typeof val === 'object' && val._timestamp && now - val._timestamp > 3600000) {
            delete bgState.variables[key];
            cleaned++;
            continue;
        }

        // Enforce maxVarLength for string values
        if (val && typeof val === 'object' && typeof val.value === 'string' && val.value.length > maxVarLength) {
            bgState.variables[key].value = val.value.substring(0, maxVarLength);
            console.warn(`[Cleanup] Truncated variable "${key}" from ${val.value.length} to ${maxVarLength} chars`);
        }
    }

    if (cleaned > 0) {
        console.log(`[Cleanup] Removed ${cleaned} expired variables`);
        saveAndBroadcast(true); // Immediate save after cleanup
    }
}, 300000); // Every 5 minutes


// Messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            if (request.action === "get_state") { sendResponse({ state: bgState }); return; }
            if (request.action === "GET_STATUS") { sendResponse(bgState); return; }

            if (request.action === "START_BATCH") {
                bgState = {
                    ...defaultState,
                    status: "RUNNING",
                    queue: request.queue,
                    total: request.queue.length,
                    targetTabId: request.tabId,
                    profileName: request.profileName,
                    processName: request.processName,
                    startTime: Date.now(),
                    logs: `🚀 Bắt đầu: ${getCurrentRowInfo()}...`
                };
                await saveAndBroadcast();
                runNextItem();
                sendResponse({ success: true });
                return;
            }

            if (request.action === "PAUSE_BATCH") {
                bgState.status = "PAUSED"; bgState.pausedBySheet = false;
                bgState.logs = "⏸️ Đã bấm Tạm dừng.";
                markDirty();
                await saveAndBroadcast();
                sendResponse({ success: true });
                return;
            }

            if (request.action === "RESUME_BATCH") {
                if (bgState.status === "PAUSED") {
                    try {
                        const tab = await chrome.tabs.get(bgState.targetTabId);
                        if (!tab) throw new Error();
                        await ensureContentScript(bgState.targetTabId);
                        bgState.status = "RUNNING"; bgState.logs = "▶️ Đang tiếp tục...";
                        markDirty();
                        // If we were paused during nav, reset flag just in case
                        bgState.expectingNavigation = false;
                        await saveAndBroadcast();

                        if (bgState.pausedBySheet) {
                            try {
                                await Utils.sendMessageWithRetry(bgState.targetTabId, { action: "UNPAUSE" });
                            } catch (err) {
                                bgState.status = "PAUSED"; bgState.logs = "⚠️ Mất kết nối Tab."; await saveAndBroadcast();
                            }
                        } else {
                            runNextItem();
                        }
                    } catch (e) {
                        bgState.logs = "❌ Tab không tồn tại."; await saveAndBroadcast();
                    }
                }
                sendResponse({ success: true });
                return;
            }

            if (request.action === "STOP_BATCH") {
                if (bgState.targetTabId) {
                    try {
                        await chrome.tabs.sendMessage(bgState.targetTabId, { action: "stop_automation" });
                    } catch (e) { }
                }

                // Auto-cleanup old variables
                const varKeys = Object.keys(bgState.variables || {});
                if (varKeys.length > 100) {
                    bgState.variables = {};
                }

                bgState = { ...defaultState, logs: "🛑 Đã DỪNG." };
                await saveAndBroadcast();
                sendResponse({ success: true });
                return;
            }

            if (request.action === "WILL_NAVIGATE") {
                if (bgState.status === "RUNNING") {
                    console.log("[Background] WILL_NAVIGATE received");
                    bgState.expectingNavigation = true;
                    // Mark current item as done because the script will die
                    bgState.currentIndex++;
                    bgState.logs = `🔄 Đang chuyển hướng...`;

                    // THÊM: Timeout safety net
                    if (bgState.navigationTimeoutId) clearTimeout(bgState.navigationTimeoutId);

                    // [CONFIG] Use navigationWait or similar (default 30s)
                    const navigationTimeout = (typeof window !== 'undefined' && window.APP_CONFIG?.performance?.navigationWait) || 30000;

                    bgState.navigationTimeoutId = setTimeout(() => {
                        if (bgState.expectingNavigation) {
                            bgState.expectingNavigation = false;
                            bgState.status = "PAUSED";
                            bgState.logs = "❌ Navigation timeout. Vui lòng kiểm tra lại.";
                            saveAndBroadcast();
                        }
                    }, navigationTimeout);

                    await saveAndBroadcast();

                    // Check if all done
                    if (bgState.currentIndex >= bgState.total) {
                        bgState.status = "IDLE";
                        bgState.expectingNavigation = false;
                        if (bgState.navigationTimeoutId) clearTimeout(bgState.navigationTimeoutId);

                        const start = bgState.startTime || Date.now();
                        const duration = Math.max(0, Date.now() - start);
                        bgState.logs = `🎉 Xong ${bgState.total} dòng (${formatDuration(duration)})`;
                        await saveAndBroadcast();
                    }
                }
                sendResponse({ success: true });
                return;
            }

            if (request.action === "PAUSE_TRIGGERED") {
                bgState.status = "PAUSED"; bgState.pausedBySheet = true;
                bgState.logs = `⏸️ Tạm dừng theo lệnh tại: ${getCurrentRowInfo()}`;
                await saveAndBroadcast();
                sendResponse({ success: true });
                return;
            }

            if (request.action === "XPATH_ERROR") {
                bgState.status = "PAUSED";
                bgState.logs = `❌ Lỗi XPath: "${request.xpath}"`;
                await saveAndBroadcast();
                sendResponse({ success: true });
                return;
            }

            if (request.action === "automation_completed") {
                if (bgState.status === "RUNNING") {
                    const info = getCurrentRowInfo();
                    bgState.currentIndex++; bgState.pausedBySheet = false;

                    if (bgState.currentIndex >= bgState.total) {
                        bgState.status = "IDLE";
                        const start = bgState.startTime || Date.now();
                        const duration = Math.max(0, Date.now() - start);
                        bgState.logs = `🎉 Xong ${bgState.total} dòng (${formatDuration(duration)})`;
                        await saveAndBroadcast();
                    } else {
                        bgState.logs = `✅ Xong [${info}]. Chờ 1s...`;
                        await saveAndBroadcast();
                        // [CONFIG] Use batchItemDelay
                        const delay = (typeof window !== 'undefined' && window.APP_CONFIG?.performance?.batchItemDelay) || 1000;
                        setTimeout(() => { if (bgState.status === "RUNNING") runNextItem(); }, delay);
                    }
                }
                sendResponse({ success: true });
                return;
            }


            // --- VARIABLE SYSTEM HANDLERS ---
            if (request.action === "SET_VARIABLE") {
                if (!bgState.variables) bgState.variables = {};

                // [FIX] Enforce maxVarLength in real-time
                const maxLen = window.APP_CONFIG?.performance?.variables?.maxVarLength || 1000;
                let value = request.value;
                if (typeof value === 'string' && value.length > maxLen) {
                    value = value.substring(0, maxLen);
                    console.warn(`[Variables] Truncated "${request.key}" to ${maxLen} chars`);
                }

                // [FIX] Add timestamp for TTL tracking
                bgState.variables[request.key] = {
                    value: value,
                    _timestamp: Date.now()
                };

                await storageLocal.set({ variables: bgState.variables });
                sendResponse({ success: true });
                return true;
            }

            if (request.action === "GET_VARIABLES") {
                sendResponse({ vars: bgState.variables || {} });
                return;
            }

            if (request.action === "DELETE_VARIABLE") {
                if (bgState.variables && bgState.variables[request.key]) {
                    delete bgState.variables[request.key];
                    await storageLocal.set({ bgState: bgState });
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false });
                }
                return;
            }

            if (request.action === "CLEAR_VARIABLES") {
                bgState.variables = {};
                await storageLocal.set({ bgState: bgState });
                sendResponse({ success: true });
                return;
            }

            // --- MACRO SYSTEM HANDLERS ---
            if (request.action === "GET_MACROS") {
                try {
                    const result = await storageLocal.get(['appData']);
                    const macros = result.appData?.macros || {};
                    sendResponse({ macros: macros });
                } catch (e) {
                    sendResponse({ macros: {} });
                }
                return;
            }

            // Fallback for unknown actions but expected async
            sendResponse({ success: false, error: "Unknown action" });

        } catch (e) {
            console.error("BG Message Error:", e);
            sendResponse({ success: false, error: e.message });
        }
    })();
    return true;
});

async function runNextItem(retryCount = 0) {
    queueLock = queueLock.then(async () => {
        if (bgState.status !== "RUNNING" || bgState.currentIndex >= bgState.total) return;
        const item = bgState.queue[bgState.currentIndex];

        // Don't spam save for retries, but do save for new items
        if (retryCount === 0) {
            bgState.logs = `🚀 Đang chạy: ${getCurrentRowInfo()}...`;
            await saveAndBroadcast();
        }

        try {
            await ensureContentScript(bgState.targetTabId);
            await Utils.sendMessageWithRetry(bgState.targetTabId, {
                action: "fill_single_row",
                xpaths: item.xpaths,
                values: item.values,
                rowIndex: item.rowIndex,
                sequenceNumber: bgState.currentIndex + 1,
                rowData: item.rowData || null  // NEW: Full row data for url() and if() commands
            });
        } catch (e) {
            console.error("FATAL:", e);

            // Retry logic for transient connection errors
            if (retryCount < 2 && (e.message.includes("establish connection") || e.message.includes("Receiving end does not exist"))) {
                console.warn(`Retry ${retryCount + 1}/2 for connection error...`);
                // Clear cache to force re-inject
                injectedTabs.delete(bgState.targetTabId);
                await new Promise(r => setTimeout(r, 1000));
                return runNextItem(retryCount + 1);
            }

            injectedTabs.delete(bgState.targetTabId);
            bgState.status = "PAUSED";
            bgState.logs = "❌ Mất kết nối. Vui lòng F5 trang web.";
            await saveAndBroadcast();
        }
    });
    await queueLock;
}
