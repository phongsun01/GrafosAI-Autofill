// MODULE: Background Service Worker (V2.4 - Stop Fix)
import { Utils, storageLocal } from './utils.js';

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
        const result = await storageLocal.get(['bgState']);
        if (result.bgState) bgState = result.bgState;
    } catch (e) { }
})();

// Save & Broadcast
async function saveAndBroadcast() {
    if (!await Utils.checkStorageQuota()) {
        chrome.runtime.sendMessage({ action: "quota_low_warning" }).catch(() => { });
        chrome.runtime.sendMessage({ action: "UI_UPDATE", data: bgState }).catch(() => { });
        return;
    }
    try {
        await storageLocal.set({ bgState: bgState });
        // Only broadcast after successful save
        chrome.runtime.sendMessage({ action: "UI_UPDATE", data: bgState }).catch(() => { });
    } catch (e) { console.error("Save State Error:", e); }
}

function getCurrentRowInfo() {
    if (!bgState.queue || bgState.queue.length === 0) return "---";
    if (bgState.currentIndex >= bgState.total) return "Hoàn tất";
    const item = bgState.queue[bgState.currentIndex];
    return item.itemName ? `${item.itemName} (Dòng ${item.rowIndex})` : `Dòng ${item.rowIndex}`;
}

// Content Script Injection Management
const injectedTabs = new Set();
const injectionPromises = new Map(); // Track ongoing injections to prevent race conditions

async function ensureContentScript(tabId) {
    if (injectedTabs.has(tabId)) return true;

    // Check if injection is already in progress
    if (injectionPromises.has(tabId)) {
        return await injectionPromises.get(tabId);
    }

    const injectionPromise = (async () => {
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
                await new Promise(r => setTimeout(r, 200)); // Wait for initialization
                injectedTabs.add(tabId);
                return true;
            } catch (injectErr) {
                throw injectErr;
            }
        } finally {
            // Always cleanup the promise tracker
            injectionPromises.delete(tabId);
        }
    })();

    injectionPromises.set(tabId, injectionPromise);
    return injectionPromise;
}

// Lifecycle & Memory Management
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
    if (bgState.targetTabId === tabId && bgState.status === "RUNNING") {
        bgState.status = "PAUSED";
        bgState.logs = "⚠️ Tab đã đóng. Mở lại và bấm Tiếp tục.";
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
                saveAndBroadcast();
            }
        }
    }

    if (changeInfo.status === 'complete') {
        if (bgState.targetTabId === tabId && bgState.status === "RUNNING" && bgState.expectingNavigation) {
            console.log("[Background] Auto-resume after navigation");
            bgState.expectingNavigation = false;
            bgState.logs = "✅ Đã tải xong. Đang tiếp tục...";
            saveAndBroadcast();
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
                    await saveAndBroadcast();

                    // Check if all done
                    if (bgState.currentIndex >= bgState.total) {
                        bgState.status = "IDLE";
                        bgState.expectingNavigation = false;
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
                bgState.variables[request.key] = request.value;
                await storageLocal.set({ bgState: bgState });
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
