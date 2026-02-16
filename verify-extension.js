// Quick Verification Script for Extension
// Run this in the browser console (F12) on any webpage after reloading extension

console.log('=== Extension Verification ===');

// 1. Check if content scripts loaded
console.log('1. Content Scripts Check:');
console.log('  - window.Utils:', typeof window.Utils);
console.log('  - window.DataManager:', typeof window.DataManager);
console.log('  - window.ERRORS:', typeof window.ERRORS);
console.log('  - window.Logger:', typeof window.Logger);
console.log('  - window.storageLocal:', typeof window.storageLocal);

// 2. Check if AutoFillPro namespace exists
console.log('2. AutoFillPro Namespace:');
console.log('  - window.AutoFillPro:', typeof window.AutoFillPro);
if (window.AutoFillPro) {
    console.log('  - AFP.isRunning:', window.AutoFillPro.isRunning);
    console.log('  - AFP.stopRequested:', window.AutoFillPro.stopRequested);
}

// 3. Check if ContentCommands loaded
console.log('3. ContentCommands:');
console.log('  - window.ContentCommands:', typeof window.ContentCommands);

// 4. Test background connection
console.log('4. Background Connection Test:');
chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('  ❌ Background Error:', chrome.runtime.lastError.message);
    } else {
        console.log('  ✅ Background Connected:', response);
    }
});

console.log('\n=== If all checks pass, extension is working! ===');
console.log('If you see "undefined" for any window.* objects, content scripts failed to load.');
console.log('Solution: Reload extension (chrome://extensions) AND reload this page (F5)');
