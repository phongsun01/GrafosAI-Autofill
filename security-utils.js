// Security Utilities Module - v2.6.0
// Provides comprehensive input sanitization, validation, and security monitoring

window.SecurityUtils = {
    // Rate limiting state
    _commandTimestamps: [],
    _MAX_COMMANDS_PER_SECOND: 100,

    /**
     * Escape XPath attribute values to prevent injection
     * Uses concat() method for values containing single quotes
     * @param {string} value - Raw attribute value
     * @returns {string} - Safely escaped XPath expression
     */
    escapeXPathValue(value) {
        if (!value) return "''";
        // If no single quotes, simple case
        if (!value.includes("'")) {
            return `'${value}'`;
        }
        // If contains single quotes, use concat() method
        return `concat('${value.replace(/'/g, "',\"'\",'")}')`;
    },

    /**
     * Sanitize and validate XPath with complexity checks
     * @param {string} xpath - Raw XPath from user input
     * @returns {string} - Sanitized XPath
     */
    sanitizeXPath(xpath) {
        if (!xpath || typeof xpath !== 'string') return '';

        // Length validation
        const MAX_XPATH_LENGTH = 2000;
        if (xpath.length > MAX_XPATH_LENGTH) {
            console.warn(`[Security] XPath too long (${xpath.length} chars), rejecting`);
            return '';
        }

        // Depth validation (count // and /)
        const depth = (xpath.match(/\//g) || []).length;
        const MAX_DEPTH = 20;
        if (depth > MAX_DEPTH) {
            console.warn(`[Security] XPath too deep (${depth} levels), rejecting`);
            return '';
        }

        // Remove dangerous characters that could break out of XPath context
        // Allow: alphanumeric, spaces, common XPath chars: / @ [ ] ( ) ' " = . - _ : *
        const sanitized = xpath.replace(/[^\w\s\/\@\[\]\(\)'"=.\-_:*]/g, '');

        // Validate basic XPath structure
        if (!this.isValidXPath(sanitized)) {
            console.warn('[Security] Invalid XPath structure:', xpath);
            return '';
        }

        return sanitized;
    },

    /**
     * Validate XPath syntax (balanced brackets, quotes, etc.)
     * @param {string} xpath 
     * @returns {boolean}
     */
    isValidXPath(xpath) {
        if (!xpath) return false;

        const singleQuotes = xpath.match(/'/g) || [];
        const doubleQuotes = xpath.match(/"/g) || [];

        // Odd number of quotes implies unclosed string
        if (singleQuotes.length % 2 !== 0 || doubleQuotes.length % 2 !== 0) return false;

        let bracketCount = 0;
        let parenCount = 0;

        for (let char of xpath) {
            if (char === '[') bracketCount++;
            if (char === ']') bracketCount--;
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;

            // Early exit if unbalanced
            if (bracketCount < 0 || parenCount < 0) return false;
        }

        return bracketCount === 0 && parenCount === 0;
    },

    /**
     * Sanitize URL with strict protocol whitelist
     * @param {string} url 
     * @returns {string} - Sanitized URL or empty string if invalid
     */
    sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '';

        const MAX_URL_LENGTH = 2048;
        if (url.length > MAX_URL_LENGTH) {
            console.warn(`[Security] URL too long (${url.length} chars)`);
            return '';
        }

        const trimmed = url.trim();
        const lowerUrl = trimmed.toLowerCase();

        // Block dangerous protocols
        const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
        for (let protocol of BLOCKED_PROTOCOLS) {
            if (lowerUrl.startsWith(protocol)) {
                console.warn('[Security] Blocked dangerous URL protocol:', protocol);
                return '';
            }
        }

        // Validate with URL API
        try {
            const parsed = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);

            // Only allow http and https
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                console.warn('[Security] Invalid protocol:', parsed.protocol);
                return '';
            }

            // Block localhost and internal IPs in production (optional)
            // Uncomment if needed:
            // if (parsed.hostname === 'localhost' || parsed.hostname.startsWith('127.') || parsed.hostname.startsWith('192.168.')) {
            //     console.warn('[Security] Blocked internal URL');
            //     return '';
            // }

            return parsed.href;
        } catch (e) {
            console.warn('[Security] Invalid URL format:', url);
            return '';
        }
    },

    /**
     * Validate command with rate limiting
     * @param {string} cmd - Command string
     * @returns {boolean} - True if command is valid and not rate-limited
     */
    validateCommand(cmd) {
        if (!cmd || typeof cmd !== 'string') return false;

        // Length check
        const MAX_COMMAND_LENGTH = 5000;
        if (cmd.length > MAX_COMMAND_LENGTH) {
            console.warn(`[Security] Command too long (${cmd.length} chars)`);
            return false;
        }

        // Rate limiting check
        const now = Date.now();
        this._commandTimestamps = this._commandTimestamps.filter(t => now - t < 1000);

        if (this._commandTimestamps.length >= this._MAX_COMMANDS_PER_SECOND) {
            console.warn('[Security] Command rate limit exceeded');
            return false;
        }

        this._commandTimestamps.push(now);
        return true;
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text 
     * @returns {string}
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Validate command parameter by type
     * @param {string} param 
     * @param {string} type - 'xpath', 'url', 'text', 'number'
     * @returns {boolean}
     */
    validateParam(param, type) {
        if (!param) return false;

        switch (type) {
            case 'xpath':
                return this.isValidXPath(param);
            case 'url':
                return this.sanitizeUrl(param) !== '';
            case 'number':
                return !isNaN(parseFloat(param));
            case 'text':
                return typeof param === 'string' && param.length < 10000;
            default:
                return true;
        }
    },

    /**
     * Check storage quota before save
     * @param {number} estimatedSize - Estimated size in bytes
     * @returns {boolean} - True if safe to save
     */
    checkStorageQuota(estimatedSize = 0) {
        const MAX_STORAGE = 5 * 1024 * 1024; // 5MB hard limit

        if (estimatedSize > MAX_STORAGE) {
            throw new Error('Data exceeds 5MB storage limit. Please reduce data size.');
        }

        return true;
    },

    /**
     * Sanitize command string before parsing
     * @param {string} cmd 
     * @returns {string}
     */
    sanitizeCommand(cmd) {
        if (!cmd || typeof cmd !== 'string') return '';

        const trimmed = cmd.trim();
        if (trimmed.length > 5000) {
            console.warn('[Security] Command too long, truncating');
            return trimmed.substring(0, 5000);
        }

        return trimmed;
    },

    /**
     * Detect if a field is password-like (for sensitive data handling)
     * @param {HTMLElement} element 
     * @returns {boolean}
     */
    isPasswordField(element) {
        if (!element) return false;

        // Type check
        if (element.type === 'password') return true;

        // Attribute checks
        const SENSITIVE_PATTERNS = [
            /password/i,
            /passwd/i,
            /pwd/i,
            /secret/i,
            /token/i,
            /key/i,
            /auth/i,
            /credential/i
        ];

        const name = element.name || '';
        const id = element.id || '';
        const placeholder = element.placeholder || '';
        const ariaLabel = element.getAttribute('aria-label') || '';

        const checkString = `${name} ${id} ${placeholder} ${ariaLabel}`;

        return SENSITIVE_PATTERNS.some(pattern => pattern.test(checkString));
    }
};

