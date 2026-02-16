// MODULE: Utils (V2.9 - Enhanced Logging)
import { ERRORS, TIMEOUTS, RETRY_CONFIG } from './constants.js';

export const storageLocal = {
    get: (keys) => new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(result);
        });
    }),
    set: (items) => new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    }),
    remove: (keys) => new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    })
};

const _columnLetterToIndex = (letter) => {
    if (typeof letter !== 'string') return 0;
    const l = letter.toUpperCase().trim();
    if (!/^[A-Z]+$/.test(l)) return 0;
    let index = 0;
    for (let i = 0; i < l.length; i++) index = index * 26 + (l.charCodeAt(i) - 64);
    return index - 1;
};

const _indexToColumnLetter = (index) => {
    let result = '';
    let num = index + 1; // Convert to 1-based

    while (num > 0) {
        const remainder = (num - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        num = Math.floor((num - 1) / 26);
    }

    return result;
};

// --- ERROR HANDLING ---
/**
 * Standard Error Codes for consistent error handling
 */
const ERROR_CODES = {
    // XPath Errors (1xxx)
    ERR_XPATH_INVALID: 1001,
    ERR_XPATH_NOT_FOUND: 1002,
    ERR_XPATH_DANGEROUS: 1003,

    // Network Errors (2xxx)
    ERR_NETWORK_TIMEOUT: 2001,
    ERR_NETWORK_FAILED: 2002,
    ERR_API_RATE_LIMIT: 2003,

    // Storage Errors (3xxx)
    ERR_STORAGE_QUOTA: 3001,
    ERR_STORAGE_FAILED: 3002,

    // Content Script Errors (4xxx)
    ERR_SCRIPT_INJECTION: 4001,
    ERR_TAB_NOT_FOUND: 4002,
    ERR_TAB_DISCONNECTED: 4003,

    // AI Errors (5xxx)
    ERR_AI_HTML_TOO_LARGE: 5001,
    ERR_AI_INVALID_RESPONSE: 5002,
    ERR_AI_MODEL_NOT_FOUND: 5003,

    // General Errors (9xxx)
    ERR_UNKNOWN: 9999
};

/**
 * Custom Extension Error with error code
 */
export class ExtensionError extends Error {
    constructor(message, code = ERROR_CODES.ERR_UNKNOWN, context = {}) {
        super(message);
        this.name = 'ExtensionError';
        this.code = code;
        this.context = context;
        this.timestamp = Date.now();
    }
}

/**
 * Centralized error logger with error codes
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {number} code - Error code from ERROR_CODES
 */
function logError(error, context = 'Unknown', code = ERROR_CODES.ERR_UNKNOWN) {
    const errorLog = {
        code,
        message: error.message || String(error),
        context,
        timestamp: new Date().toISOString(),
        stack: error.stack
    };

    console.error(`[Error ${code}] ${context}:`, errorLog);

    // Could integrate with error tracking service here (e.g., Sentry)
    // Sentry.captureException(error, { extra: errorLog });

    return errorLog;
}

/**
 * Enhanced error handler with recovery logic based on error codes
 */
export function handleError(error, context = 'Unknown') {
    let code = ERROR_CODES.ERR_UNKNOWN;

    // Determine error code from error type/message
    if (error instanceof ExtensionError) {
        code = error.code;
    } else if (error.message?.includes('XPath')) {
        code = ERROR_CODES.ERR_XPATH_INVALID;
    } else if (error.message?.includes('timeout')) {
        code = ERROR_CODES.ERR_NETWORK_TIMEOUT;
    } else if (error.message?.includes('quota')) {
        code = ERROR_CODES.ERR_STORAGE_QUOTA;
    } else if (error.message?.includes('Tab')) {
        code = ERROR_CODES.ERR_TAB_NOT_FOUND;
    }

    const errorLog = logError(error, context, code);

    // Recovery logic based on error code
    const recoveryActions = {
        [ERROR_CODES.ERR_NETWORK_TIMEOUT]: 'Retry with exponential backoff',
        [ERROR_CODES.ERR_STORAGE_QUOTA]: 'Clear old variables and retry',
        [ERROR_CODES.ERR_TAB_NOT_FOUND]: 'Pause automation and notify user',
        [ERROR_CODES.ERR_XPATH_INVALID]: 'Skip item and continue',
    };

    const recovery = recoveryActions[code] || 'Log and continue';
    console.log(`[Recovery] ${recovery}`);

    return { error: errorLog, recovery };
}

export const Utils = {
    // [FIX 2] Detailed Timeout Log
    sendMessageWithRetry: async (tabId, message, maxRetries = RETRY_CONFIG.MAX_RETRIES) => {
        if (!tabId || typeof tabId !== 'number') return false;

        const SEND_TIMEOUT = 5000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                await Promise.race([
                    chrome.tabs.sendMessage(tabId, message),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${SEND_TIMEOUT}ms`)), SEND_TIMEOUT))
                ]);
                return true;
            } catch (error) {
                console.warn(`[Retry ${i + 1}/${maxRetries}] Send Fail: ${error.message}`);
                if (i === maxRetries - 1) throw error;
                await new Promise(r => setTimeout(r, TIMEOUTS.RETRY_BASE * Math.pow(2, i)));
            }
        }
    },

    columnLetterToIndex: _columnLetterToIndex,
    indexToColumnLetter: _indexToColumnLetter,

    parseActiveColumns: (str) => {
        if (!str || typeof str !== 'string' || !str.trim()) return null;
        const indices = new Set();
        const parts = str.split(',');
        for (let part of parts) {
            part = part.trim().toUpperCase();
            if (!part) continue;
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(s => s.trim());
                if (start && end) {
                    const s = _columnLetterToIndex(start);
                    const e = _columnLetterToIndex(end);
                    if (s >= 0 && e >= 0) for (let i = Math.min(s, e); i <= Math.max(s, e); i++) indices.add(i);
                }
            } else {
                const idx = _columnLetterToIndex(part);
                if (idx >= 0) indices.add(idx);
            }
        }
        return Array.from(indices).sort((a, b) => a - b);
    },

    filterData: (xpaths, values, activeIndices) => {
        if (!Array.isArray(activeIndices) || activeIndices.length === 0) return { xpaths, values };
        const newX = []; const newV = [];
        activeIndices.forEach(idx => {
            if (idx < xpaths.length) { newX.push(xpaths[idx]); newV.push(values[idx]); }
        });
        return { xpaths: newX, values: newV };
    },

    parseRange: (str) => {
        if (!str) return [];
        if (/[^0-9,\-\s]/.test(str)) throw new Error(ERRORS.RANGE_INVALID);

        const s = new Set();
        str.split(',').forEach(p => {
            if (p.includes('-')) {
                const [a, b] = p.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(a) && !isNaN(b) && a <= b) for (let i = a; i <= b; i++) s.add(i);
            } else {
                const n = parseInt(p.trim());
                if (!isNaN(n)) s.add(n);
            }
        });
        return Array.from(s).sort((a, b) => a - b);
    },

    checkStorageQuota: async () => {
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const quota = estimate.quota || 5242880;
                const used = estimate.usage || await chrome.storage.local.getBytesInUse(null);
                const SAFETY_MARGIN = 100000;
                if (quota - used < SAFETY_MARGIN) {
                    console.warn(`⚠️ Storage Low: Used ${used}/${quota}`);
                    return false;
                }
                return true;
            }
            return true;
        } catch (e) { return true; }
    }
};