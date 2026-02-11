// Security Logger Module - v2.6.0
// Centralized security event logging and monitoring

window.SecurityLogger = {
    _events: [],
    _MAX_EVENTS: 100,

    /**
     * Log a security event
     * @param {string} type - Event type: 'sanitization_failure', 'rate_limit', 'validation_error', etc.
     * @param {string} message - Event message
     * @param {object} details - Additional details
     */
    log(type, message, details = {}) {
        const event = {
            timestamp: Date.now(),
            type,
            message,
            details,
            url: window.location.href
        };

        this._events.push(event);

        // Keep only last 100 events
        if (this._events.length > this._MAX_EVENTS) {
            this._events.shift();
        }

        // Console output with color coding
        const prefix = this._getPrefix(type);
        console.warn(`${prefix} [SecurityLogger] ${message}`, details);

        // Send to background for persistent logging (optional)
        try {
            chrome.runtime.sendMessage({
                action: 'SECURITY_EVENT',
                event
            }).catch(() => { });
        } catch (e) {
            // Ignore if extension context invalidated
        }
    },

    /**
     * Get console prefix based on event type
     * @param {string} type 
     * @returns {string}
     */
    _getPrefix(type) {
        const prefixes = {
            'sanitization_failure': '🛡️',
            'rate_limit': '⏱️',
            'validation_error': '❌',
            'quota_exceeded': '💾',
            'permission_denied': '🚫',
            'injection_attempt': '⚠️'
        };
        return prefixes[type] || '🔒';
    },

    /**
     * Get recent events
     * @param {number} count - Number of events to retrieve
     * @returns {Array}
     */
    getRecentEvents(count = 10) {
        return this._events.slice(-count);
    },

    /**
     * Clear all events
     */
    clear() {
        this._events = [];
    },

    /**
     * Export events as JSON
     * @returns {string}
     */
    export() {
        return JSON.stringify(this._events, null, 2);
    }
};
