// rate-limiter.js - Token Bucket Rate Limiter

/**
 * Token Bucket Rate Limiter for API calls
 */
class RateLimiter {
    constructor(maxRequests = 60, timeWindow = 60000) {
        this.maxRequests = maxRequests; // Maximum requests allowed
        this.timeWindow = timeWindow; // Time window in milliseconds
        this.tokens = maxRequests; // Available tokens
        this.queue = []; // Queue for pending requests
        this.lastRefill = Date.now();

        // Start token refill interval
        this.startRefill();
    }

    /**
     * Refill tokens based on elapsed time
     */
    refillTokens() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;

        if (elapsed >= this.timeWindow) {
            // Full refill after time window
            this.tokens = this.maxRequests;
            this.lastRefill = now;
            Logger?.debug(`[RateLimiter] Tokens refilled: ${this.tokens}`);
        } else {
            // Gradual refill based on elapsed time
            const tokensToAdd = Math.floor((elapsed / this.timeWindow) * this.maxRequests);
            if (tokensToAdd > 0) {
                this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
                this.lastRefill = now;
            }
        }
    }

    /**
     * Start automatic token refill
     */
    startRefill() {
        // Refill every second
        this.refillInterval = setInterval(() => {
            this.refillTokens();
            this.processQueue();
        }, 1000);
    }

    /**
     * Process queued requests
     */
    async processQueue() {
        while (this.queue.length > 0 && this.tokens > 0) {
            const { fn, resolve, reject } = this.queue.shift();
            this.tokens--;

            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }

    /**
     * Throttle a function call
     * @param {Function} fn - Async function to throttle
     * @returns {Promise} - Result of the function
     */
    async throttle(fn) {
        this.refillTokens();

        if (this.tokens > 0) {
            // Execute immediately if tokens available
            this.tokens--;
            Logger?.debug(`[RateLimiter] Executing immediately (tokens: ${this.tokens})`);
            return await fn();
        } else {
            // Queue the request
            Logger?.info(`[RateLimiter] Queueing request (queue size: ${this.queue.length + 1})`);
            return new Promise((resolve, reject) => {
                this.queue.push({ fn, resolve, reject });
            });
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            tokens: this.tokens,
            maxRequests: this.maxRequests,
            queueSize: this.queue.length,
            timeWindow: this.timeWindow
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.refillInterval) {
            clearInterval(this.refillInterval);
        }
    }
}

// Create global instance for Gemini API (only if in browser context)
if (typeof window !== 'undefined') {
    try {
        window.GeminiRateLimiter = new RateLimiter(
            window.APP_CONFIG?.rateLimiting?.geminiMaxRequests || 60,
            window.APP_CONFIG?.rateLimiting?.geminiTimeWindow || 60000
        );
    } catch (e) {
        console.warn('[RateLimiter] Failed to initialize:', e);
    }
}
