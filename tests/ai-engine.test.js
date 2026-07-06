// ai-engine.test.js

// Mock the global fetch function
const originalFetch = window.fetch;

test('AIEngine.discoverBestModel cache and fallback', async () => {
    // Reset cache
    window.AIEngine.modelCache = {
        model: null,
        timestamp: 0,
        TTL: 86400000
    };
    
    // Mock fetch for model discovery
    window.fetch = async (url) => {
        if (url.includes('models')) {
            return {
                ok: true,
                json: async () => ({
                    models: [
                        { name: "models/gemini-1.5-pro", supportedGenerationMethods: ["generateContent"] },
                        { name: "models/gemini-1.5-flash", supportedGenerationMethods: ["generateContent"] }
                    ]
                })
            };
        }
        return { ok: false };
    };
    
    const model = await window.AIEngine.discoverBestModel("mock-api-key");
    assert.equal(model, "gemini-1.5-flash", "Should select gemini-1.5-flash since preferred order is flash then pro");
    
    // Test cache hit
    window.fetch = () => { throw new Error("Fetch should not be called due to cache!"); };
    const cachedModel = await window.AIEngine.discoverBestModel("mock-api-key");
    assert.equal(cachedModel, "gemini-1.5-flash", "Should read from cache");
    
    // Restore fetch
    window.fetch = originalFetch;
});

test('AIEngine.generateXPath validation checks', async () => {
    // 1. Missing API Key
    await assert.throwsAsync(
        () => window.AIEngine.generateXPath("<div></div>", "test prompt", null),
        /API Key must be a non-empty string/
    );
    
    // 2. HTML too large
    const hugeHTML = "a".repeat(100001);
    await assert.throwsAsync(
        () => window.AIEngine.generateXPath(hugeHTML, "test prompt", "valid-key"),
        /HTML too large/
    );
});

test('AIEngine.generateXPath calls API correctly with rate limiting', async () => {
    // Reset model cache so it discovers
    window.AIEngine.modelCache = {
        model: "gemini-1.5-flash",
        timestamp: Date.now(),
        TTL: 86400000
    };
    
    let fetchCalled = false;
    let requestBody = null;
    
    window.fetch = async (url, options) => {
        fetchCalled = true;
        requestBody = JSON.parse(options.body);
        return {
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: JSON.stringify([{ label: "Full Name", xpath: "//input[@id='name']" }]) }
                            ]
                        }
                    }
                ]
            })
        };
    };
    
    // Create rate limiter mock if it wasn't initialized
    if (!window.GeminiRateLimiter) {
        window.GeminiRateLimiter = {
            throttle: async (fn) => await fn()
        };
    }
    
    const result = await window.AIEngine.generateXPath("<input id='name'>", "Find name field", "mock-key");
    
    assert.ok(fetchCalled, "Fetch should be called");
    assert.equal(result.length, 1, "Should parse response content JSON");
    assert.equal(result[0].xpath, "//input[@id='name']");
    assert.ok(requestBody.contents[0].parts[0].text.includes("Find name field"));
    
    // Restore fetch
    window.fetch = originalFetch;
});
