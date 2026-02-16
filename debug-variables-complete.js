// Complete Variable System Debug Script
// Run this in browser console (F12) after running extract command

console.log('=== Variable System Debug ===\n');

// 1. Check if variable was stored in background
chrome.runtime.sendMessage({ action: 'GET_VARIABLES' }, (response) => {
    console.log('1. Variables in Background:');
    if (chrome.runtime.lastError) {
        console.error('  ❌ Error:', chrome.runtime.lastError.message);
        return;
    }

    const vars = response.vars || {};
    console.log('  Raw response:', vars);

    if (Object.keys(vars).length === 0) {
        console.warn('  ⚠️ No variables stored!');
    } else {
        Object.keys(vars).forEach(key => {
            const varData = vars[key];
            if (typeof varData === 'object' && varData.value !== undefined) {
                console.log(`  ✅ ${key} = "${varData.value}" (timestamp: ${varData._timestamp})`);
            } else {
                console.log(`  ⚠️ ${key} = ${JSON.stringify(varData)} (old format?)`);
            }
        });
    }

    // 2. Test substitution
    console.log('\n2. Testing Substitution:');
    const testCmd = '${cdt}';
    console.log(`  Input: "${testCmd}"`);

    if (window.ContentCommands && window.ContentCommands.substituteVariables) {
        const result = window.ContentCommands.substituteVariables(testCmd, vars);
        console.log(`  Output: "${result}"`);

        if (result === testCmd) {
            console.error('  ❌ Substitution failed! Variable not replaced.');
        } else {
            console.log('  ✅ Substitution successful!');
        }
    } else {
        console.error('  ❌ ContentCommands.substituteVariables not found!');
    }
});

// 3. Check chrome.storage directly
chrome.storage.local.get(['variables'], (result) => {
    console.log('\n3. Variables in chrome.storage.local:');
    console.log('  ', result.variables || {});
});

console.log('\n=== Debug Complete ===');
console.log('Expected: Variable should appear in all 3 checks above');
console.log('If missing, check console for SET_VARIABLE logs during extract');
