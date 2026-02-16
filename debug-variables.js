// DEBUG SCRIPT - Paste this into Console to test variables
// Run this in the popup console

console.log("=== VARIABLE DEBUG SCRIPT ===");

// 1. Test SET_VARIABLE
console.log("\n1. Testing SET_VARIABLE...");
chrome.runtime.sendMessage({
    action: 'SET_VARIABLE',
    key: 'test_var',
    value: 'Hello World'
}, (response) => {
    console.log("SET_VARIABLE response:", response);
});

// 2. Wait and test GET_VARIABLES
setTimeout(() => {
    console.log("\n2. Testing GET_VARIABLES...");
    chrome.runtime.sendMessage({
        action: 'GET_VARIABLES'
    }, (response) => {
        console.log("GET_VARIABLES response:", response);

        if (response && response.vars) {
            const vars = response.vars;
            console.log("Variables count:", Object.keys(vars).length);
            console.log("Variables:", vars);

            // Check format
            Object.keys(vars).forEach(key => {
                const varData = vars[key];
                console.log(`\nVariable "${key}":`);
                console.log("  Type:", typeof varData);
                console.log("  Raw:", varData);

                if (typeof varData === 'object' && varData.value !== undefined) {
                    console.log("  ✅ New format {value, _timestamp}");
                    console.log("  Value:", varData.value);
                    console.log("  Timestamp:", varData._timestamp);
                } else {
                    console.log("  ⚠️ Old format (direct value)");
                    console.log("  Value:", varData);
                }
            });
        } else {
            console.error("❌ No variables returned!");
        }
    });
}, 1000);

// 3. Test variable substitution
setTimeout(() => {
    console.log("\n3. Testing variable substitution...");
    const testCmd = "fill(//input, ${test_var})";
    console.log("Command:", testCmd);

    chrome.runtime.sendMessage({
        action: 'GET_VARIABLES'
    }, (response) => {
        const vars = response?.vars || {};

        // Simulate substituteVariables
        const varPattern = /\$\{([a-zA-Z0-9_]{1,50})\}/g;
        const result = testCmd.replace(varPattern, (match, key) => {
            if (vars.hasOwnProperty(key)) {
                const varData = vars[key];
                const rawValue = (typeof varData === 'object' && varData.value !== undefined)
                    ? varData.value
                    : varData;
                return String(rawValue);
            }
            return match;
        });

        console.log("Original:", testCmd);
        console.log("Substituted:", result);
        console.log(result === "fill(//input, Hello World)" ? "✅ PASS" : "❌ FAIL");
    });
}, 2000);

console.log("\n=== Waiting for results... ===");
