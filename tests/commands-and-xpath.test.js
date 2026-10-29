// commands-and-xpath.test.js
// Unit tests for command parser, Vietnamese XPath sanitization, and sensitive data checks

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const testFn = typeof test === 'function' ? test : (name, fn) => fn();

    testFn('SecurityUtils.sanitizeXPath preserves Vietnamese characters and commas', () => {
        const Security = typeof window !== 'undefined' ? window.SecurityUtils : (typeof SecurityUtils !== 'undefined' ? SecurityUtils : null);
        assert.ok(Security, "SecurityUtils must be defined");
        
        // 1. Vietnamese XPath with contains() and comma
        const xp1 = "//button[contains(text(), 'Hà Nội - Đấu thầu')]";
        assert.equal(Security.sanitizeXPath(xp1), xp1, "Should keep Vietnamese diacritics and comma");

        // 2. Complex Vietnamese expression
        const xp2 = "//span[normalize-space(.)='Lưu dữ liệu, xác nhận']";
        assert.equal(Security.sanitizeXPath(xp2), xp2, "Should preserve comma and accents in normalize-space");

        // 3. Reject dangerous scripts
        const dangerousXp = "//div[@id='test']<script>alert(1)</script>";
        assert.equal(Security.sanitizeXPath(dangerousXp), "", "Dangerous pattern should return empty string");

        // 4. Reject javascript: pseudoprotocol
        const jsXp = "//a[@href='javascript:alert(1)']";
        assert.equal(Security.sanitizeXPath(jsXp), "", "Dangerous javascript: should return empty string");

        // 5. Reject overly long XPath
        const longXp = "/div".repeat(600); // 2400 chars > 2000 limit
        assert.equal(Security.sanitizeXPath(longXp), "", "Overly long XPath should be rejected");
    });

    testFn('ContentCommands.parseCommand parses fill, click, delay and complex commands', () => {
        const Commands = typeof window !== 'undefined' ? window.ContentCommands : (typeof ContentCommands !== 'undefined' ? ContentCommands : null);
        assert.ok(Commands, "ContentCommands must be defined");

        // 1. fill(xpath, value)
        const cmd1 = Commands.parseCommand("fill(//input[@name='fullName'], Nguyễn Văn A)");
        assert.equal(cmd1.type, "fill");
        assert.equal(cmd1.params.xpath, "//input[@name='fullName']");
        assert.equal(cmd1.params.value, "Nguyễn Văn A");

        // 2. fill(xpath) without value (inner treated as XPath)
        const cmd2 = Commands.parseCommand("fill(//button[contains(text(), 'Lưu')])");
        assert.equal(cmd2.type, "fill");
        assert.equal(cmd2.params.xpath, "//button[contains(text(), 'Lưu')]");

        // 3. click command
        const cmd3 = Commands.parseCommand("click(//button[@id='btnSubmit'])");
        assert.equal(cmd3.type, "click");
        assert.equal(cmd3.params.xpath, "//button[@id='btnSubmit']");

        // 4. delay command
        const cmd4 = Commands.parseCommand("delay(1500)");
        assert.equal(cmd4.type, "delay");
        assert.equal(cmd4.params.milliseconds, 1500);

        // 5. waitfor command
        const cmd5 = Commands.parseCommand("waitfor(//div[@class='success'], 10, visible)");
        assert.equal(cmd5.type, "waitfor");
        assert.equal(cmd5.params.xpath, "//div[@class='success']");
        assert.equal(cmd5.params.timeout, 10);
        assert.equal(cmd5.params.mustBeVisible, true);
    });

    testFn('CryptoUtils.shouldEncrypt detects sensitive variable names', () => {
        const Crypto = typeof window !== 'undefined' ? window.CryptoUtils : (typeof CryptoUtils !== 'undefined' ? CryptoUtils : null);
        assert.ok(Crypto, "CryptoUtils must be defined");

        // Sensitive patterns
        assert.ok(Crypto.shouldEncrypt('user_password'), "password should be encrypted");
        assert.ok(Crypto.shouldEncrypt('so_dien_thoai'), "phone/sdt should be encrypted");
        assert.ok(Crypto.shouldEncrypt('sdt_khach_hang'), "sdt should be encrypted");
        assert.ok(Crypto.shouldEncrypt('email_contact'), "email should be encrypted");
        assert.ok(Crypto.shouldEncrypt('so_cccd_chu_ho'), "cccd should be encrypted");
        assert.ok(Crypto.shouldEncrypt('ma_so_thue_mst'), "mst should be encrypted");
        assert.ok(Crypto.shouldEncrypt('stk_ngan_hang'), "stk should be encrypted");
        assert.ok(Crypto.shouldEncrypt('gemini_api_key'), "api_key should be encrypted");

        // Non-sensitive patterns
        assert.ok(!Crypto.shouldEncrypt('ho_va_ten'), "normal name should not be encrypted");
        assert.ok(!Crypto.shouldEncrypt('dia_chi'), "address should not be encrypted");
        assert.ok(!Crypto.shouldEncrypt('so_luong'), "quantity should not be encrypted");
    });

    testFn('SecurityUtils.escapeHtml prevents XSS', () => {
        const Security = typeof window !== 'undefined' ? window.SecurityUtils : (typeof SecurityUtils !== 'undefined' ? SecurityUtils : null);
        assert.ok(Security, "SecurityUtils must be defined");

        const escaped = Security.escapeHtml("<script>alert('xss')</script>");
        assert.ok(escaped.includes("&lt;script&gt;"), "Tags should be escaped");
        assert.equal(Security.escapeHtml(0), "0", "Number 0 should return '0'");
        assert.equal(Security.escapeHtml(null), "", "Null should return empty string");
    });
}));
