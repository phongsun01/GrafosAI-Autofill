// logger.js - Structured Logging Utility

/**
 * Centralized Logger with log levels and environment detection
 */
window.Logger = {
    // Log levels: debug < info < warn < error
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        none: 4
    },

    // Current log level (can be changed via config or runtime)
    currentLevel: 1, // Default to 'info'

    /**
     * Initialize logger with config
     */
    init() {
        // Auto-detect environment (only if chrome.runtime is available)
        let isDev = true; // Default to dev mode
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                isDev = !('update_url' in chrome.runtime.getManifest());
            }
        } catch (e) {
            // Fallback to dev mode if detection fails
        }

        // Set log level based on environment
        this.currentLevel = isDev ? this.levels.debug : this.levels.info;

        // Allow override from config
        if (window.APP_CONFIG?.logging?.level) {
            const configLevel = window.APP_CONFIG.logging.level;
            if (this.levels.hasOwnProperty(configLevel)) {
                this.currentLevel = this.levels[configLevel];
            }
        }

        this.info(`Logger initialized (level: ${this.getLevelName()})`);
    },

    /**
     * Get current level name
     */
    getLevelName() {
        return Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel) || 'unknown';
    },

    /**
     * Format log message with timestamp and context
     */
    format(level, context, message, ...args) {
        const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        const contextStr = context ? ` [${context}]` : '';
        return [prefix + contextStr, message, ...args];
    },

    /**
     * Debug level logging (most verbose)
     */
    debug(message, ...args) {
        if (this.currentLevel <= this.levels.debug) {
            console.log(...this.format('debug', null, message, ...args));
        }
    },

    /**
     * Info level logging (general information)
     */
    info(message, ...args) {
        if (this.currentLevel <= this.levels.info) {
            console.log(...this.format('info', null, message, ...args));
        }
    },

    /**
     * Warning level logging
     */
    warn(message, ...args) {
        if (this.currentLevel <= this.levels.warn) {
            console.warn(...this.format('warn', null, message, ...args));
        }
    },

    /**
     * Error level logging
     */
    error(message, ...args) {
        if (this.currentLevel <= this.levels.error) {
            console.error(...this.format('error', null, message, ...args));
        }
    },

    /**
     * Contextual logging (with module/component name)
     */
    withContext(context) {
        return {
            debug: (msg, ...args) => {
                if (this.currentLevel <= this.levels.debug) {
                    console.log(...this.format('debug', context, msg, ...args));
                }
            },
            info: (msg, ...args) => {
                if (this.currentLevel <= this.levels.info) {
                    console.log(...this.format('info', context, msg, ...args));
                }
            },
            warn: (msg, ...args) => {
                if (this.currentLevel <= this.levels.warn) {
                    console.warn(...this.format('warn', context, msg, ...args));
                }
            },
            error: (msg, ...args) => {
                if (this.currentLevel <= this.levels.error) {
                    console.error(...this.format('error', context, msg, ...args));
                }
            }
        };
    },

    /**
     * Set log level at runtime
     */
    setLevel(level) {
        if (typeof level === 'string' && this.levels.hasOwnProperty(level)) {
            this.currentLevel = this.levels[level];
            this.info(`Log level changed to: ${level}`);
        } else if (typeof level === 'number') {
            this.currentLevel = level;
        }
    }
};

// Auto-initialize on load
if (typeof window !== 'undefined') {
    Logger.init();
}
