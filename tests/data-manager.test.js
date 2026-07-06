// data-manager.test.js

test('DataManager.validateAndSanitize handles empty/malformed data', () => {
    const defaultData = window.DataManager.DEFAULT_DATA;
    
    // Test with null
    let result = window.DataManager.validateAndSanitize(null);
    assert.equal(result.profiles.length, 0);
    assert.equal(result.lastProfileId, "");
    
    // Test with missing properties
    result = window.DataManager.validateAndSanitize({ lastProfileId: "prof_123" });
    assert.equal(result.lastProfileId, "prof_123");
    assert.equal(result.profiles.length, 0);
    assert.equal(result.aiConfig.apiKey, "");
});

test('DataManager.validateAndSanitize handles valid configuration profiles', () => {
    const raw = {
        profiles: [
            {
                id: "prof_1",
                name: "Test Profile",
                processes: [
                    {
                        id: "proc_1",
                        name: "Fill Form",
                        url: "https://example.com",
                        gid: "100"
                    }
                ]
            }
        ]
    };
    
    const result = window.DataManager.validateAndSanitize(raw);
    assert.equal(result.profiles.length, 1);
    assert.equal(result.profiles[0].name, "Test Profile");
    assert.equal(result.profiles[0].processes[0].url, "https://example.com");
    assert.equal(result.profiles[0].processes[0].gid, "100");
});

test('DataManager load and save encrypts/decrypts Gemini API key', async () => {
    // Set up test data
    window.DataManager.appData = {
        profiles: [],
        lastProfileId: "",
        lastProcessId: "",
        lastRange: "3",
        lastTab: "run",
        lastSubTab: "xpath",
        runMode: "single",
        selectedBatchRows: [],
        macros: {},
        macroSheetConfig: { url: "", gid: "0" },
        aiConfig: { apiKey: "AIzaSyTestApiKey123", gid: "999" }
    };
    
    // Clear mock storage
    chrome.storage.local.store = {};
    
    // Save data (should encrypt the API key in storage)
    await window.DataManager.save();
    
    // Check inside raw storage - it should not be cleartext!
    const storedData = chrome.storage.local.store['appData'];
    assert.ok(storedData, 'Data should be saved in storage');
    assert.ok(typeof storedData.aiConfig.apiKey === 'object', 'API key should be encrypted into an object');
    assert.ok(storedData.aiConfig.apiKey.encrypted, 'API key object should have encrypted bytes');
    assert.ok(storedData.aiConfig.apiKey.iv, 'API key object should have initialization vector');
    assert.ok(storedData.aiConfig.apiKey.apiKey !== "AIzaSyTestApiKey123", 'API key should not be stored in cleartext');
    
    // Load it back (should decrypt the API key back to cleartext)
    window.DataManager.appData = null; // Clear memory first
    const loadedData = await window.DataManager.load();
    
    assert.equal(loadedData.aiConfig.apiKey, "AIzaSyTestApiKey123", 'Loaded API key should be decrypted back to the original value');
});
