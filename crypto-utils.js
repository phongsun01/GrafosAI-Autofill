// Crypto Utilities Module - v2.6.0
// Provides encryption/decryption for sensitive data using Web Crypto API

window.CryptoUtils = {
    /**
     * Derive encryption key from extension ID
     * @returns {Promise<CryptoKey>}
     */
    async getDerivedKey() {
        const extensionId = chrome.runtime.id || 'fallback-key-12345';
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(extensionId),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('autofill-pro-salt'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt plaintext data
     * @param {string} plaintext 
     * @returns {Promise<{encrypted: ArrayBuffer, iv: Uint8Array}>}
     */
    async encrypt(plaintext) {
        try {
            const key = await this.getDerivedKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoder = new TextEncoder();

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                encoder.encode(plaintext)
            );

            return {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv)
            };
        } catch (e) {
            console.error('[Crypto] Encryption failed:', e);
            throw new Error('Encryption failed');
        }
    },

    /**
     * Decrypt encrypted data
     * @param {Array} encryptedArray - Array of bytes
     * @param {Array} ivArray - IV array
     * @returns {Promise<string>}
     */
    async decrypt(encryptedArray, ivArray) {
        try {
            const key = await this.getDerivedKey();
            const encrypted = new Uint8Array(encryptedArray);
            const iv = new Uint8Array(ivArray);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (e) {
            console.error('[Crypto] Decryption failed:', e);
            throw new Error('Decryption failed');
        }
    },

    /**
     * Check if a variable should be encrypted
     * @param {string} varName 
     * @returns {boolean}
     */
    shouldEncrypt(varName) {
        const SENSITIVE_PATTERNS = [
            /password/i,
            /passwd/i,
            /pwd/i,
            /secret/i,
            /token/i,
            /key/i,
            /auth/i,
            /credential/i,
            /api[_-]?key/i
        ];

        return SENSITIVE_PATTERNS.some(pattern => pattern.test(varName));
    }
};
