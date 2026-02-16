// MODULE: Content Commands
// Handles parsing and execution of automation commands

window.ContentCommands = {
    // Parser
    parseCommand: function (cmdStr) {
        const cmd = cmdStr.trim();
        if (!cmd) return { type: 'empty', params: {} };

        // [SECURITY] Validate input length and complexity before regex parsing
        const MAX_COMMAND_LENGTH = 5000;
        if (cmd.length > MAX_COMMAND_LENGTH) {
            console.warn(`[Security] Command too long (${cmd.length} chars), truncating`);
            return { type: 'empty', params: {} };
        }

        // [ADVANCED] Config
        const configMatch = cmd.match(/^config\((.+)\)$/i);
        if (configMatch) {
            const params = {};
            const parts = configMatch[1].split(',');
            parts.forEach(p => {
                const [key, val] = p.split(':').map(s => s.trim().toLowerCase());
                if (key === 'on_error' || key === 'error') params.onError = val;
                if (key === 'retry') params.retryCount = parseInt(val) || 1;
            });
            return { type: 'config', params };
        }

        if (cmd.match(/^disable\s*:/i)) return { type: 'disabled', params: {} };
        if (cmd.toLowerCase() === 'pause' || cmd.toLowerCase() === 'tạm dừng') return { type: 'pause', params: {} };

        const clickMatch = cmd.match(/^click\((.+)\)$/i);
        if (clickMatch) return { type: 'click', params: { xpath: clickMatch[1].trim() } };

        const delayMatch = cmd.match(/^delay\((\d+)\)$/i);
        if (delayMatch) return { type: 'delay', params: { milliseconds: parseInt(delayMatch[1]) } };

        const waitMatch = cmd.match(/^wait\(([^,]+)(?:,\s*(.+))?\)$/i);
        if (waitMatch) return { type: 'wait', params: { duration: waitMatch[1].trim(), log: waitMatch[2] ? waitMatch[2].trim() : null } };

        const waitForMatch = cmd.match(/^waitfor\(([^,]+)(?:,\s*(\d+))?(?:,\s*(.+))?\)$/i);
        if (waitForMatch) return { type: 'waitfor', params: { xpath: waitForMatch[1].trim(), timeout: waitForMatch[2] ? parseInt(waitForMatch[2]) : 10, mustBeVisible: waitForMatch[3] && waitForMatch[3].trim() === 'visible' } };

        const waitUrlMatch = cmd.match(/^waiturl\(([^,]+)(?:,\s*(\d+))?(?:,\s*(.+))?\)$/i);
        if (waitUrlMatch) return { type: 'waiturl', params: { pattern: waitUrlMatch[1].trim(), timeout: waitUrlMatch[2] ? parseInt(waitUrlMatch[2]) : 15, useRegex: waitUrlMatch[3] && waitUrlMatch[3].trim() === 'regex' } };

        const urlMatch = cmd.match(/^url\(([^,]+),\s*([^,]+),\s*(\{[^}]+\})\)$/i);
        if (urlMatch) return { type: 'url', params: { target: urlMatch[1].trim(), prelink: urlMatch[2].trim(), columns: urlMatch[3].trim() } };

        if (cmd.startsWith('checklogin(')) {
            const inner = cmd.substring(11, cmd.length - 1);
            const braceMatch = inner.match(/\{([^}]*)\}/);
            if (braceMatch) {
                const colsPart = braceMatch[0];
                const fullMatchIndex = braceMatch.index;
                let prePart = inner.substring(0, fullMatchIndex).trim();
                let postPart = inner.substring(fullMatchIndex + colsPart.length).trim();

                if (prePart.endsWith(',')) prePart = prePart.substring(0, prePart.length - 1).trim();
                if (postPart.startsWith(',')) postPart = postPart.substring(1).trim();

                const lastCommaIndex = prePart.lastIndexOf(',');
                if (lastCommaIndex > 0) {
                    return {
                        type: 'checklogin',
                        params: {
                            loggedInXpath: prePart.substring(0, lastCommaIndex).trim(),
                            loginUrl: prePart.substring(lastCommaIndex + 1).trim(),
                            loginCols: colsPart,
                            targetUrl: postPart
                        }
                    };
                }
            }
        }

        const advancedIfMatch = cmd.match(/^if\(([^,]+),\s*(?:"([^"]*)"|([^,]+)),\s*(==|!=|contains|regex|exists),\s*(?:"([^"]*)"|([^,]+))?,\s*(\{[^}]+\})\)$/i);
        if (advancedIfMatch) return { type: 'if_advanced', params: { xpath: advancedIfMatch[1].trim(), sourceVal: advancedIfMatch[2] || advancedIfMatch[3], operator: advancedIfMatch[4].trim(), targetVal: advancedIfMatch[5] || advancedIfMatch[6], columns: advancedIfMatch[7] } };

        const ifElseMatch = cmd.match(/^if\(([^,]+),\s*(\{[^}]+\})\s+else\s+(\{[^}]+\})\)$/i);
        if (ifElseMatch) return { type: 'if', params: { xpath: ifElseMatch[1].trim(), columns: ifElseMatch[2].trim() }, elseColumns: ifElseMatch[3].trim() };

        const ifMatch = cmd.match(/^if\(([^,]+),\s*(\{[^}]+\})\)$/i);
        if (ifMatch) return { type: 'if', params: { xpath: ifMatch[1].trim(), columns: ifMatch[2].trim() } };

        if (cmd.includes('??')) return { type: 'conditional', params: { expression: cmd } };

        const macroMatch = cmd.match(/^macro:([a-z_]+)(?:\((.*)\))?$/i);
        if (macroMatch) {
            const name = macroMatch[1].trim();
            const paramsStr = macroMatch[2] ? macroMatch[2].trim() : '';
            const params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];
            return { type: 'macro', params: { name, args: params } };
        }

        const extractMatch = cmd.match(/^extract\((.+),\s*\{var:([a-zA-Z0-9_]+)\}\)$/i);
        if (extractMatch) return { type: 'extract', params: { xpath: extractMatch[1].trim(), varName: extractMatch[2].trim() } };

        const fillMatch = cmd.match(/^fill\((.+)\)$/i);
        if (fillMatch) {
            const inner = fillMatch[1];
            const lastComma = inner.lastIndexOf(',');
            if (lastComma > 0) {
                const xpath = inner.substring(0, lastComma).trim();
                const val = inner.substring(lastComma + 1).trim();
                return { type: 'fill', params: { xpath, value: val } };
            }
        }

        return { type: 'fill', params: { xpath: cmd } };
    },

    /**
     * Substitute variables with DoS protection
     * @param {string} cmd - Command string with ${var} placeholders
     * @param {object} vars - Variable map
     * @param {number} depth - Current recursion depth
     * @returns {string} - Substituted command
     */
    substituteVariables: function (cmd, vars, depth = 0) {
        const MAX_SUBSTITUTION_DEPTH = 3;

        if (depth > MAX_SUBSTITUTION_DEPTH) {
            console.warn('[Security] Max variable substitution depth reached');
            return cmd;
        }

        // Use simpler regex with length limit to prevent catastrophic backtracking
        const varPattern = /\$\{([a-zA-Z0-9_]{1,50})\}/g;

        let substituted = cmd.replace(varPattern, (match, key) => {
            if (vars.hasOwnProperty(key)) {
                // [FIX] Handle both old format (direct value) and new format ({value, _timestamp})
                const varData = vars[key];
                const rawValue = (typeof varData === 'object' && varData.value !== undefined)
                    ? varData.value
                    : varData;
                const value = String(rawValue);
                // Prevent nested expansion attacks
                if (value.includes('${')) {
                    console.warn(`[Security] Nested variable detected in ${key}, stripping`);
                    return value.replace(/\$/g, ''); // Strip $ to prevent expansion
                }
                return value;
            }
            return match;
        });

        // Recurse only if something changed
        if (substituted !== cmd) {
            return this.substituteVariables(substituted, vars, depth + 1);
        }

        return substituted;
    },

    /**
     * Redact sensitive values for logging
     * @param {string} varName - Variable name
     * @param {string} value - Raw value
     * @returns {string} - Redacted value for logging
     */
    redactSensitiveValue: function (varName, value) {
        const SENSITIVE_PATTERNS = [
            /password/i,
            /token/i,
            /secret/i,
            /key/i,
            /auth/i,
            /credential/i
        ];

        // Check if variable name suggests sensitive data
        const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(varName));

        if (isSensitive) {
            return value.length > 0 ? `[REDACTED ${value.length} chars]` : '[EMPTY]';
        }

        // Truncate long values
        if (value.length > 100) {
            return value.substring(0, 100) + `... [${value.length} chars total]`;
        }

        return value;
    },

    // Executors
    executeClickCommand: async function (rawXpathString) {
        const xpathList = String(rawXpathString).split('|');
        for (let xp of xpathList) {
            const cleanXpath = xp.trim();
            if (!cleanXpath) continue;
            const element = ContentUtils.getElementByXPath(cleanXpath);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ContentUtils.highlightElement(element);
                await new Promise(r => setTimeout(r, 200));
                element.click();
                const btn = element.querySelector('button');
                if (btn) btn.click();
                return true;
            }
        }
        return false;
    },

    executeExtractCommand: async function ({ xpath, varName }, rowIndex) {
        try {
            const element = await ContentUtils.waitForElement(xpath, 3000);
            if (!element) throw new Error(`Element not found: ${xpath}`);

            ContentUtils.highlightElement(element);

            const value = element.value || element.textContent || element.innerText || '';

            // [SECURITY] Redact sensitive values in logs (passwords, tokens, etc.)
            const redactedValue = this.redactSensitiveValue(varName, value);
            console.log(`[AutoFillPro] Extracted '${varName}' = '${redactedValue}'`);

            // Store in background
            await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'SET_VARIABLE',
                    key: varName,
                    value: value  // Store actual value, not redacted
                }, resolve);
            });

            return true;
        } catch (e) {
            // Need access to AFP.errorPolicy
            const policy = window.AutoFillPro.errorPolicy || 'stop';
            console.error(`[AutoFill Pro] Extract Failed: ${e.message}`);

            if (policy === 'stop') throw e;
            if (policy === 'skip') {
                console.warn(`[AutoFill Pro] Skipping variable ${varName}`);
                chrome.runtime.sendMessage({ action: "SAVE_VARIABLE", key: varName, value: "" });
            }
        }
    },

    executeUrlCommand: async function (parsed, rowData, rowIndex, sequenceNumber) {
        const { target, prelink, columns } = parsed.params;
        const targetPattern = target.replace(/\*/g, '.*');
        const targetRegex = new RegExp(targetPattern);
        const U = window.ContentUtils;
        const AFP = window.AutoFillPro;

        if (targetRegex.test(window.location.href)) {
            console.log(`[AutoFill Pro] Already on target page: ${window.location.href}`);
            return;
        }

        const columnList = U.parseColumnRange(columns);

        if (window.location.href.includes(prelink)) {
            console.log(`[AutoFill Pro] On prelink page, executing pre-commands...`);
            for (let col of columnList) {
                if (AFP.stopRequested) break;
                const preCmd = rowData && rowData[col] ? String(rowData[col]).trim() : '';
                if (preCmd) await this.processCommand(preCmd, '', rowIndex, sequenceNumber, rowData);
            }
            U.navigateToUrl(target);
            // After nav, we expect page unload. Background will pause. 
            // We sleep to let unload happen.
            await new Promise(r => setTimeout(r, 5000));
        } else {
            U.navigateToUrl(prelink);
            // Expect unload.
            await new Promise(r => setTimeout(r, 5000));

            // If we are still here (SPA or fast load), we might need to continue? 
            // Better to rely on Background detecting load and resuming if it was a real nav.

            for (let col of columnList) {
                if (AFP.stopRequested) break;
                const preCmd = rowData && rowData[col] ? String(rowData[col]).trim() : '';
                if (preCmd) await this.processCommand(preCmd, '', rowIndex, sequenceNumber, rowData);
            }
            U.navigateToUrl(target);
            await new Promise(r => setTimeout(r, 5000));
        }
    },

    executeCheckLoginCommand: async function ({ loggedInXpath, loginUrl, loginCols, targetUrl }, rowData, rowIndex, sequenceNumber) {
        const U = window.ContentUtils;
        const AFP = window.AutoFillPro;

        const loggedInElement = await U.elementExists(loggedInXpath, 2000);
        if (loggedInElement) {
            console.log('[AutoFill Pro] CheckLogin: Already logged in ✅');
            if (window.location.href.includes(targetUrl)) return;
            U.navigateToUrl(targetUrl);
            await new Promise(r => setTimeout(r, 5000)); // Wait for unload
            return;
        }

        if (!window.location.href.includes(loginUrl)) {
            U.navigateToUrl(loginUrl);
            await new Promise(r => setTimeout(r, 5000)); // Wait for unload
            // If script resumes here, it means no full reload or we are back
        }

        const columnList = U.parseColumnRange(loginCols);
        for (let col of columnList) {
            if (AFP.stopRequested) break;
            const cmdStr = rowData && rowData[col] ? String(rowData[col]).trim() : '';
            if (cmdStr) await this.processCommand(cmdStr, '', rowIndex, sequenceNumber, rowData);
        }

        // Final nav
        U.navigateToUrl(targetUrl);
        await new Promise(r => setTimeout(r, 5000));
    },

    executeAdvancedIfCommand: async function (params, rowData, rowIndex, sequenceNumber) {
        const { xpath, sourceVal, operator, targetVal, columns } = params;
        const U = window.ContentUtils;
        const AFP = window.AutoFillPro;
        let actualValue = sourceVal;

        if (xpath && xpath !== 'null' && (!sourceVal || sourceVal === 'text')) {
            const el = U.getElementByXPath(xpath);
            actualValue = el ? (el.value || el.textContent || '').trim() : '';
        }

        let conditionMet = false;
        const target = targetVal ? targetVal.trim() : '';

        switch (operator) {
            case '==': conditionMet = (actualValue == target); break;
            case '!=': conditionMet = (actualValue != target); break;
            case 'contains': conditionMet = actualValue.includes(target); break;
            case 'regex': try { conditionMet = new RegExp(target).test(actualValue); } catch (e) { } break;
            case 'exists':
                const el = U.getElementByXPath(xpath);
                conditionMet = !!el && (U.isElementVisible(el));
                break;
        }

        if (conditionMet) {
            const columnList = U.parseColumnRange(columns);
            for (let col of columnList) {
                if (AFP.stopRequested) break;
                const cmdStr = rowData && rowData[col] ? String(rowData[col]).trim() : '';
                if (cmdStr) await this.processCommand(cmdStr, '', rowIndex, sequenceNumber, rowData);
            }
        }
    },

    executeIfCommand: async function (parsed, rowData, rowIndex, sequenceNumber) {
        const { xpath, columns } = parsed.params;
        const elseColumns = parsed.elseColumns;
        const U = window.ContentUtils;
        const AFP = window.AutoFillPro;
        const exists = await U.elementExists(xpath);

        if (exists) {
            const columnList = U.parseColumnRange(columns);
            for (let col of columnList) {
                if (AFP.stopRequested) break;
                const cmdStr = rowData && rowData[col] ? String(rowData[col]).trim() : '';
                if (cmdStr) await this.processCommand(cmdStr, '', rowIndex, sequenceNumber, rowData);
            }
        } else if (elseColumns) {
            const elseColumnList = U.parseColumnRange(elseColumns);
            for (let col of elseColumnList) {
                if (AFP.stopRequested) break;
                const cmdStr = rowData && rowData[col] ? String(rowData[col]).trim() : '';
                if (cmdStr) await this.processCommand(cmdStr, '', rowIndex, sequenceNumber, rowData);
            }
        }
    },

    executeWait: async function ({ duration, log }) {
        let seconds;
        if (duration.includes('-')) {
            const [min, max] = duration.split('-').map(Number);
            seconds = Math.random() * (max - min) + min;
        } else {
            seconds = parseFloat(duration);
        }
        if (log) console.log(`[AutoFill Pro] ${log}`);
        await new Promise(r => setTimeout(r, seconds * 1000));
    },

    executeWaitFor: async function ({ xpath, timeout, mustBeVisible }) {
        const configTimeout = (typeof window.APP_CONFIG !== 'undefined' ? window.APP_CONFIG.waitForTimeout : 10);
        const actualTimeout = (timeout && timeout > 0) ? timeout : configTimeout;
        const timeoutMs = actualTimeout * 1000;
        const U = window.ContentUtils;

        const exists = await U.elementExists(xpath, timeoutMs);
        if (!exists) throw new Error(`WaitFor timeout (${actualTimeout}s): ${xpath}`);
        if (mustBeVisible) {
            const element = U.getElementByXPath(xpath);
            if (!element || !U.isTrulyVisible(element)) throw new Error(`Element exists but not visible: ${xpath}`);
        }
    },

    executeWaitUrl: async function ({ pattern, timeout, useRegex }) {
        const startTime = Date.now();
        const maxWait = timeout * 1000;
        while (Date.now() - startTime < maxWait) {
            const currentUrl = window.location.href;
            const matched = useRegex ? new RegExp(pattern).test(currentUrl) : currentUrl.includes(pattern);
            if (matched) return true;
            await new Promise(r => setTimeout(r, 500));
        }
        throw new Error(`WaitUrl timeout (${timeout}s): ${pattern}`);
    },

    executeWithTimeout: async function (fn, timeoutMs = 10000) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), timeoutMs))
        ]);
    },

    waitForResume: async function (rowIndex) {
        console.log(`⏸️ Pause tại dòng ${rowIndex}`);
        chrome.runtime.sendMessage({ action: "PAUSE_TRIGGERED", rowIndex: rowIndex });
        return new Promise(resolve => {
            const listener = (request) => {
                if (request.action === "UNPAUSE") {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve();
                }
            };
            chrome.runtime.onMessage.addListener(listener);
        });
    },

    // Macro Logic
    substituteParams: function (cmdStr, macroArgs, rowData) {
        let result = cmdStr;
        result = result.replace(/{(\w+)}/g, (match, key) => {
            const index = parseInt(key);
            if (!isNaN(index) && macroArgs[index] !== undefined) {
                return macroArgs[index];
            }
            if (rowData && rowData[key] !== undefined) {
                return rowData[key];
            }
            return match;
        });
        return result;
    },

    executeMacro: async function (macroName, macroArgs, cellValue, rowIndex, sequenceNumber, rowData) {
        const AFP = window.AutoFillPro;
        try {
            const response = await new Promise(resolve =>
                chrome.runtime.sendMessage({ action: "GET_MACROS" }, resolve)
            );

            const macros = response?.macros || {};
            if (!macros[macroName]) {
                throw new Error(`Macro not found: ${macroName}`);
            }

            const commands = macros[macroName];
            console.log(`[AutoFill Pro] Executing macro '${macroName}' with ${commands.length} commands`);

            for (const cmd of commands) {
                if (AFP.stopRequested) break;
                const substitutedCmd = this.substituteParams(cmd, macroArgs, rowData);
                await this.processCommand(substitutedCmd, cellValue, rowIndex, sequenceNumber, rowData);
            }

            console.log(`[AutoFill Pro] ✅ Macro '${macroName}' completed`);
        } catch (error) {
            console.error(`[AutoFill Pro] Macro execution failed: ${error.message}`);
            throw error;
        }
    },

    processCommand: async function (commandStr, cellValue, rowIndex, sequenceNumber, rowData = null) {
        const AFP = window.AutoFillPro;
        const U = window.ContentUtils;

        let cmd = commandStr.trim();
        if (typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeCommand) {
            cmd = SecurityUtils.sanitizeCommand(cmd);
        }
        if (!cmd) return;

        if (typeof sequenceNumber !== 'undefined' && sequenceNumber !== null) {
            const n = parseInt(sequenceNumber);
            cmd = cmd.replace(/\{n\}/g, n).replace(/\$\{n\}/g, n);
            cmd = cmd.replace(/\{n\s*([+-])\s*(\d+)\}/g, (match, op, val) => op === '+' ? n + parseInt(val) : n - parseInt(val));
        }

        if (rowIndex) {
            const rowNum = parseInt(rowIndex);
            cmd = cmd.replace(/\{i\}/g, rowNum);
        }

        // Variable Substitution with DoS Protection
        if (cmd.includes('${')) {
            try {
                const response = await new Promise(resolve => chrome.runtime.sendMessage({ action: "GET_VARIABLES" }, resolve));
                const vars = response?.vars || {};
                cmd = this.substituteVariables(cmd, vars);
            } catch (e) { console.warn("Var sub failed", e); }
        }

        const parsed = this.parseCommand(cmd);

        if (parsed.type === 'config') {
            if (parsed.params.onError) AFP.errorPolicy = parsed.params.onError;
            if (parsed.params.retryCount) AFP.retryCount = parsed.params.retryCount;
            return;
        }

        if (parsed.type === 'pause') {
            await this.waitForResume(rowIndex);
            return;
        }

        const maxRetries = AFP.retryCount || 0;
        let attempt = 0;
        let success = false;
        let lastError = null;

        while (attempt <= maxRetries && !success) {
            if (AFP.stopRequested) return;
            attempt++;

            try {
                await this.executeWithTimeout(async () => {
                    switch (parsed.type) {
                        case 'empty': case 'disabled': return;
                        case 'click':
                            if (cellValue.toLowerCase() !== 'no') {
                                await this.executeClickCommand(parsed.params.xpath);
                                await new Promise(r => setTimeout(r, 500));
                            }
                            break;
                        case 'delay':
                            if (cellValue.toLowerCase() !== 'no') await new Promise(r => setTimeout(r, parsed.params.milliseconds));
                            break;
                        case 'wait': await this.executeWait(parsed.params); break;
                        case 'waitfor': await this.executeWaitFor(parsed.params); break;
                        case 'waiturl': await this.executeWaitUrl(parsed.params); break;
                        case 'macro':
                            await this.executeMacro(parsed.params.name, parsed.params.args, cellValue, rowIndex, sequenceNumber, rowData);
                            break;
                        case 'extract': await this.executeExtractCommand(parsed.params, rowIndex); break;
                        case 'url': await this.executeUrlCommand(parsed, rowData, rowIndex, sequenceNumber); break;
                        case 'checklogin': await this.executeCheckLoginCommand(parsed.params, rowData, rowIndex, sequenceNumber); break;
                        case 'if': await this.executeIfCommand(parsed, rowData, rowIndex, sequenceNumber); break;
                        case 'if_advanced': await this.executeAdvancedIfCommand(parsed.params, rowData, rowIndex, sequenceNumber); break;
                        case 'conditional':
                            const parts = parsed.params.expression.split('??').map(s => s.trim());
                            const strVal = cellValue.toLowerCase();
                            const targetXPath = (strVal === 'true' || strVal === 'yes' || strVal === 'có' || strVal === '1') ? parts[0] : parts[1];
                            const element = U.getElementByXPath(targetXPath);
                            if (element) await U.fillField(element, 'true');
                            await new Promise(r => setTimeout(r, 1000));
                            break;
                        case 'fill':
                        default:
                            // Fill command
                            let filled = false;
                            const selectors = [parsed.params.xpath, `input[name="${parsed.params.xpath}"]`, `#${parsed.params.xpath}`];
                            for (let selector of selectors) {
                                if (filled) break;
                                const elements = await U.findElements(selector);
                                for (let el of elements) {
                                    if (AFP.stopRequested) return;
                                    U.highlightElement(el);

                                    // [FIX] Substitute variables in value before filling
                                    let valueToFill = parsed.params.value !== undefined ? parsed.params.value : cellValue;
                                    if (valueToFill && valueToFill.includes('${')) {
                                        try {
                                            const response = await new Promise(resolve => chrome.runtime.sendMessage({ action: "GET_VARIABLES" }, resolve));
                                            const vars = response?.vars || {};
                                            valueToFill = this.substituteVariables(valueToFill, vars);
                                            console.log(`[Variables] Substituted value: "${valueToFill}"`);
                                        } catch (e) {
                                            console.warn("[Variables] Substitution failed:", e);
                                        }
                                    }

                                    const result = await U.fillElement(el, valueToFill);

                                    if (result) {
                                        await new Promise(r => setTimeout(r, 1000));
                                        filled = true;
                                        break;
                                    }
                                }
                            }
                            if (!filled) throw new Error(`Element not found: ${parsed.params.xpath}`);
                            break;
                    }
                }, 10000);
                success = true;

            } catch (error) {
                lastError = error;
                console.warn(`[AutoFill Pro] Retry ${attempt}/${maxRetries + 1} failed: ${error.message}`);
                if (attempt <= maxRetries) await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!success) {
            const policy = AFP.errorPolicy || 'stop';
            if (lastError.message.includes('Element not found')) {
                console.warn(`[AutoFill Pro] ⚠️ Skipping missing element: ${cmd}`);
                chrome.runtime.sendMessage({ action: 'COMMAND_ERROR', command: cmd, error: '[SKIPPED] Element not found', rowIndex: rowIndex }).catch(() => { });
                return;
            }

            console.error(`[AutoFill Pro] Failed after retries: ${lastError.message}`);
            if (AFP.isRunning && lastError.message !== 'Command timeout') {
                chrome.runtime.sendMessage({ action: 'COMMAND_ERROR', command: cmd, error: `[${policy.toUpperCase()}] ${lastError.message}`, rowIndex: rowIndex }).catch(() => { });
            }

            if (policy === 'skip') return;
            if (policy === 'pause') { await this.waitForResume(rowIndex); return; }

            AFP.stopRequested = true;
            AFP.isRunning = false;
        }
    }
};
