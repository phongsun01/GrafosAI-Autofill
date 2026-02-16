// VERSION: V113 (Global Config Fix)

window.APP_CONFIG = {
    noteAutoFill: `
        ℹ️ <b>Hướng dẫn sử dụng:</b><br>
        - <b>Dòng 1 (Header):</b> Chứa XPath định danh ô nhập hoặc Lệnh đặc biệt.<br>
        - <b>Các Lệnh hỗ trợ (Tại dòng 1):</b><br>
        <strong>📌 Hướng dẫn:</strong><br>
        1. Chọn Profile và Quy trình<br>
        2. Nhập phạm vi dòng (VD: 3, 5-10, 2-5)<br>
        3. Nhấn "CHẠY NGAY"<br><br>
        <strong>⚡ Lưu ý:</strong> Extension sẽ chạy ngầm, có thể đóng popup.
    `,
    noteBatch: `
        <strong>📌 Batch Run:</strong><br>
        - Chọn nhiều dòng bằng checkbox<br>
        - Nhấn "CHẠY BATCH" để xử lý hàng loạt<br>
        - Có thể Tạm dừng/Tiếp tục bất cứ lúc nào
    `,
    noteConfig: `
        <strong>⚙️ Cấu hình:</strong><br>
        - <b>Cột hiển thị:</b> Các cột hiển thị ở tab Batch (VD: B,D hoặc E-G)<br>
        - <b>Cột chạy:</b> Để trống = Chạy hết các cột. Hoặc chỉ định (VD: A-C)
    `,

    // --- PERFORMANCE SETTINGS ---
    performance: {
        // Delay between batch items (ms)
        batchItemDelay: 1000,

        // --- Variable System Config ---
        variables: {
            maxVars: 50,
            maxVarLength: 1000,
            // Priority: CSV column > Global var > Sequence number
            scopePriority: ['csv', 'global', 'sequence'],
            // Policy when extract fails: 'stop' | 'skip' | 'warn'
            extractFailPolicy: 'stop',
            extractRetries: 2,
            extractRetryDelay: 1000
        },

        // --- General Config ---
        // Script injection wait time (ms)
        scriptInjectionWait: 200,

        // Default command timeout (ms)
        commandTimeout: 10000,

        // Wait command default timeout (seconds)
        waitCommandTimeout: 15,

        // WaitFor command default timeout (seconds)
        waitForTimeout: 10,

        // WaitUrl command default timeout (seconds)
        waitUrlTimeout: 15,

        // Navigation wait time (ms)
        navigationWait: 3000,

        // Element interaction delays (ms)
        elementFocusDelay: 50,
        elementFillDelay: 100,
        elementClickDelay: 500,

        // DOM scanning limits
        maxDomScanNodes: 500,

        // Polling interval for waitUrl (ms)
        urlPollInterval: 500,

        // Navigation resume delay after page load (ms)
        navigationResumeDelay: 1500,

        // Retry backoff multiplier (ms)
        retryBackoffMultiplier: 1000,

        // Model discovery cache TTL (ms) - 24 hours
        modelCacheTTL: 86400000
    },

    // --- SECURITY SETTINGS ---
    security: {
        // Maximum storage size (bytes) - 5MB
        maxStorageSize: 5 * 1024 * 1024,

        // Maximum command length
        maxCommandLength: 5000,

        // Maximum text input length
        maxTextLength: 10000,

        // Enable XPath sanitization
        sanitizeXPath: true,

        // Enable URL sanitization
        sanitizeUrls: true
    },

    // --- LOGGING SETTINGS ---
    logging: {
        // Log level: 'debug', 'info', 'warn', 'error', 'none'
        level: 'info',

        // Enable structured logging
        structured: true
    },

    // --- RATE LIMITING SETTINGS ---
    rateLimiting: {
        // Gemini API rate limit (requests per minute)
        geminiMaxRequests: 60,
        geminiTimeWindow: 60000 // 1 minute in ms
    }
};