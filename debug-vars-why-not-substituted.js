// Debug script - paste in console AFTER extract command runs
// This will show exactly what's in the variables store

chrome.runtime.sendMessage({ action: 'GET_VARIABLES' }, (response) => {
    console.log('=== VARIABLE DEBUG ===');
    console.log('Raw response:', response);

    if (!response || !response.vars) {
        console.error('❌ No vars in response!');
        return;
    }

    const vars = response.vars;
    console.log('Variables object:', vars);
    console.log('Keys:', Object.keys(vars));

    // Check specific variable
    if (vars.cdt) {
        console.log('✅ cdt exists:', vars.cdt);
        console.log('  Type:', typeof vars.cdt);
        console.log('  Value:', vars.cdt.value || vars.cdt);
    } else {
        console.error('❌ cdt NOT FOUND in variables!');
    }

    // Test substitution manually
    const testCmd = '${cdt}';
    console.log('\nTesting substitution of:', testCmd);

    if (window.ContentCommands && window.ContentCommands.substituteVariables) {
        const result = window.ContentCommands.substituteVariables(testCmd, vars);
        console.log('Result:', result);

        if (result === testCmd) {
            console.error('❌ SUBSTITUTION FAILED - returned same string');
            console.log('Checking why:');
            console.log('  - vars has cdt?', vars.hasOwnProperty('cdt'));
            console.log('  - vars.cdt value:', vars.cdt);
        } else {
            console.log('✅ Substitution worked!');
        }
    }
});
