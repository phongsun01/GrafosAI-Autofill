// run-node-tests.js
// Automated test runner for Node.js environment

const path = require('path');
const fs = require('fs');

console.log('==========================================');
console.log('🧪 Running GrafosAI-Autofill Unit Tests');
console.log('==========================================\n');

// Setup Node test environment
global.window = global;
global.self = global;

let passed = 0;
let failed = 0;

global.assert = {
    ok(val, msg) {
        if (!val) throw new Error(msg || `Expected truthy, got ${val}`);
    },
    equal(a, b, msg) {
        if (a !== b) throw new Error(msg || `Expected "${a}" to equal "${b}"`);
    }
};

global.test = function (name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${e.message}`);
        failed++;
    }
};

// Load modules
require(path.join(__dirname, '../security-utils.js'));
require(path.join(__dirname, '../crypto-utils.js'));
require(path.join(__dirname, '../content-commands.js'));

// Load test suite
require(path.join(__dirname, 'commands-and-xpath.test.js'));

console.log('\n------------------------------------------');
console.log(`Test Results: ${passed} Passed | ${failed} Failed | Total: ${passed + failed}`);
console.log('------------------------------------------');

if (failed > 0) {
    process.exit(1);
} else {
    console.log('🎉 All automated tests passed successfully!\n');
    process.exit(0);
}
