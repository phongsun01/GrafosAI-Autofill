// VERSION: 2.0 (Refactored)
// Depend on content-utils.js and content-commands.js

// Namespace to prevent global pollution
if (typeof window.AutoFillPro === 'undefined') {
    window.AutoFillPro = {
        isLoaded: false,
        stopRequested: false,
        isRunning: false,
        lastHighlightedElement: null,
        errorPolicy: 'stop',
        retryCount: 0,
        scanCache: {},
        runtimeId: null,
        xpathPickerMode: false,
        xpathPreviewElement: null
    };
}

const currentRuntimeId = chrome.runtime.id;
// Initialize if not loaded OR if extension was reloaded (runtimeId mismatch)
if (!window.AutoFillPro.isLoaded || window.AutoFillPro.runtimeId !== currentRuntimeId) {
    window.AutoFillPro.isLoaded = true;
    window.AutoFillPro.runtimeId = currentRuntimeId;
    window.AutoFillPro.xpathPickerMode = false;
    console.log(`[AutoFill Pro] Content script loaded (ID: ${currentRuntimeId})`);

    const AFP = window.AutoFillPro;
    const Cmd = window.ContentCommands;

    // --- MESSAGE LISTENER ---
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        if (request.action === "PING") { sendResponse({ status: "ALIVE" }); return true; }
        if (request.action === "stop_automation") {
            AFP.stopRequested = true;
            AFP.isRunning = false;
            if (window.stopXPathPicker) window.stopXPathPicker();
            return true;
        }
        if (request.action === "XPATH_PICKER_START") {
            if (window.startXPathPicker) window.startXPathPicker();
            sendResponse({ status: 'STARTED' });
            return true;
        }
        if (request.action === "XPATH_PICKER_STOP") {
            if (window.stopXPathPicker) window.stopXPathPicker();
            sendResponse({ status: 'STOPPED' });
            return true;
        }
        if (request.action === "UNPAUSE") { return true; }

        if (request.action === "AI_SCAN") {
            try {
                const formHTML = window.ContentUtils.scanForm();
                const inputs = JSON.parse(formHTML);

                if (inputs.length === 0) {
                    sendResponse({ success: false, error: "No inputs found on page" });
                } else {
                    sendResponse({ success: true, formHTML: formHTML });
                }
            } catch (e) {
                console.error("[Content] Scan failed:", e);
                sendResponse({ success: false, error: e.message });
            }
            return true;
        }

        if (request.action === "fill_single_row") {
            AFP.stopRequested = false;
            AFP.isRunning = true;
            if (window.stopXPathPicker) window.stopXPathPicker();

            const xpaths = request.xpaths;
            const values = request.values;
            const rowIndex = request.rowIndex;
            const sequenceNumber = request.sequenceNumber || 1;
            const rowData = request.rowData || null;

            for (let i = 0; i < xpaths.length; i++) {
                if (AFP.stopRequested) { AFP.isRunning = false; return; }
                const rawHeader = xpaths[i] ? String(xpaths[i]).trim() : "";
                const cellValue = values[i] ? String(values[i]).trim() : "";
                if (!rawHeader) continue;
                const commands = rawHeader.split('&&');
                for (let cmd of commands) {
                    if (AFP.stopRequested) break;
                    // Delegate to ContentCommands
                    if (Cmd && Cmd.processCommand) {
                        await Cmd.processCommand(cmd, cellValue, rowIndex, sequenceNumber, rowData);
                    } else {
                        console.error("ContentCommands module not loaded!");
                    }
                }
            }

            AFP.isRunning = false;
            if (AFP.lastHighlightedElement) {
                AFP.lastHighlightedElement.style.border = "";
                AFP.lastHighlightedElement = null;
            }
            if (!AFP.stopRequested) {
                try { chrome.runtime.sendMessage({ action: "automation_completed" }); } catch (e) { }
            }
        }
        return true;
    });

    console.log('[AutoFill Pro] Setup Complete');
}
