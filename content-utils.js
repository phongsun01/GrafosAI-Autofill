// MODULE: Content Utilities
// Shared helper functions for DOM manipulation and cleaning

window.ContentUtils = {
    getElementByXPath: function (xpath) {
        if (!xpath) return null;
        let xpathStr = String(xpath).trim();

        // ID/Name shorthand support
        if (!xpathStr.startsWith("/") && !xpathStr.startsWith("(")) {
            return document.getElementById(xpathStr) || document.getElementsByName(xpathStr)[0];
        }

        try {
            return document.evaluate(xpathStr, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
            console.error('[AutoFill Pro] XPath Error:', {
                xpath: xpathStr,
                error: e.message
            });
            // Send error to background if running
            if (window.isRunning) {
                chrome.runtime.sendMessage({
                    action: 'XPATH_ERROR',
                    xpath: xpathStr,
                    error: e.message
                }).catch(() => { });
            }
            return null;
        }
    },

    highlightElement: function (element) {
        if (window.lastHighlightedElement && window.lastHighlightedElement !== element) {
            window.lastHighlightedElement.style.border = "";
        }
        if (element) {
            element.style.border = "2px solid #2ecc71";
            window.lastHighlightedElement = element;
        }
    },

    isTrulyVisible: function (elem) {
        if (!elem) return false;
        const style = window.getComputedStyle(elem);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        if (elem.offsetParent === null) return false;
        return true;
    },

    triggerFullEvents: function (element) {
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        element.blur();
    },

    scanAndClickByText: async function (container, textStr, maxNodesToScan = 500) {
        if (!container) return false;

        const targetValues = String(textStr).split(/[,;]/).map(s => s.trim().toLowerCase()).filter(s => s);
        if (targetValues.length === 0) return false;

        // FAST FAIL
        const containerText = (container.textContent || "").toLowerCase();
        const hasPotentialMatch = targetValues.some(val => containerText.includes(val));
        if (!hasPotentialMatch) return false;

        let found = false;
        const xpath = ".//text()[normalize-space()]";

        try {
            const snapshot = document.evaluate(xpath, container, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const limit = Math.min(snapshot.snapshotLength, maxNodesToScan);

            for (let i = 0; i < limit; i++) {
                const node = snapshot.snapshotItem(i);
                const nodeText = node.nodeValue.trim().toLowerCase();

                if (targetValues.some(val => nodeText.includes(val))) {
                    let clickable = node.parentElement;
                    let bestCandidate = clickable;

                    // Improved Recursive Parent Traversal
                    let current = bestCandidate;
                    let maxDepth = 15; // Increased depth
                    while (current && current !== document.body && maxDepth > 0) {
                        const tag = current.tagName;
                        if (tag === 'LABEL' ||
                            tag === 'BUTTON' ||
                            tag === 'A' ||
                            current.getAttribute('role') === 'button' ||
                            current.getAttribute('role') === 'checkbox' ||
                            current.getAttribute('role') === 'radio' ||
                            current.classList.contains('ant-checkbox-wrapper') ||
                            current.classList.contains('nz-checkbox-wrapper') ||
                            current.querySelector('input[type="checkbox"], input[type="radio"]')) {
                            clickable = current;
                            break;
                        }
                        // Stop if we hit a container that shouldn't be clicked triggers
                        if (['TR', 'SECTION', 'FORM', 'TBODY'].includes(tag)) break;

                        current = current.parentElement;
                        maxDepth--;
                    }

                    if (!this.isTrulyVisible(clickable)) continue;

                    this.highlightElement(clickable);
                    const input = clickable.querySelector('input');
                    const isCheckedInput = input ? input.checked : false;
                    const isCheckedClass = clickable.classList.contains('ant-checkbox-wrapper-checked') ||
                        clickable.classList.contains('nz-checkbox-wrapper-checked');

                    if (!isCheckedClass && !isCheckedInput) {
                        try { clickable.scrollIntoView({ behavior: 'auto', block: 'center' }); } catch (e) { }
                        clickable.click();
                        if (input) input.click();
                        // Also try clicking the node parent directly if it differs
                        if (node.parentElement && node.parentElement !== clickable && this.isTrulyVisible(node.parentElement)) {
                            node.parentElement.click();
                        }

                        found = true;
                        await new Promise(r => setTimeout(r, 100));
                        break;
                    } else {
                        found = true;
                        break;
                    }
                }
            }
        } catch (err) {
            console.error("[Scan Error]", err);
        }
        return found;
    },

    handleAngularSelect: async function (element, text) {
        const targetText = String(text).trim();
        let clickTarget = element;
        if (element.tagName.toLowerCase() === 'input') {
            clickTarget = element.closest('nz-select-top-control') || element.closest('nz-select') || element;
        }

        clickTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clickTarget.click();
        await new Promise(r => setTimeout(r, 1000));

        const xpath = `//div[contains(@class, 'cdk-overlay-container') or contains(@class, 'ant-select-dropdown')]//div[contains(@class, 'ant-select-item-option') or contains(@class, 'nz-option-item')]//div[normalize-space(text())='${targetText}']`;
        const xpathBackup = `//div[contains(@class, 'cdk-overlay-container')]//div[contains(text(), '${targetText}')]`;

        try {
            let result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            let optionElement = result.singleNodeValue;
            if (!optionElement) {
                result = document.evaluate(xpathBackup, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                optionElement = result.singleNodeValue;
            }
            if (optionElement) {
                optionElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                optionElement.click();
                if (optionElement.parentElement) optionElement.parentElement.click();
                return true; // Success
            } else {
                const input = element.tagName.toLowerCase() === 'input' ? element : element.querySelector('input');
                if (input) {
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                    if (nativeSetter) nativeSetter.call(input, targetText);
                    this.triggerFullEvents(input);
                    return true; // Fallback success
                }
            }
        } catch (e) { console.error(e); }
        return false;
    },

    // --- NEW UTILITIES FOR COMMAND ENGINE ---

    /**
     * Wait for element to exist and return it
     * @param {string} xpath - XPath expression
     * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
     * @returns {Promise<Element|null>} - The valid DOM element or null
     */
    waitForElement: function (xpath, timeoutMs = 5000) {
        return new Promise((resolve) => {
            const element = this.getElementByXPath(xpath);
            if (element) { resolve(element); return; }

            const observer = new MutationObserver(() => {
                const el = this.getElementByXPath(xpath);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeoutMs);
        });
    },

    /**
     * Check if element exists by xpath
     * @param {string} xpath - XPath expression
     * @param {number} timeoutMs - Optional timeout to wait for element (default: 0)
     * @returns {Promise<boolean>} - True if element exists
     */
    elementExists: function (xpath, timeoutMs = 0) {
        if (timeoutMs === 0) {
            const element = this.getElementByXPath(xpath);
            return Promise.resolve(element !== null && element !== undefined);
        }

        // Use MutationObserver instead of polling for performance
        return new Promise((resolve) => {
            const element = this.getElementByXPath(xpath);
            if (element) { resolve(true); return; }

            const observer = new MutationObserver(() => {
                const el = this.getElementByXPath(xpath);
                if (el) {
                    observer.disconnect();
                    resolve(true);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(false);
            }, timeoutMs);
        });
    },

    /**
     * Parse column range string like "{B,D-F,H}" into array of column letters
     * @param {string} rangeStr - Column range string
     * @returns {Array<string>} - Array of column letters
     */
    parseColumnRange: function (rangeStr) {
        // Remove curly braces and whitespace
        const cleaned = rangeStr.replace(/[{}]/g, '').trim();
        if (!cleaned) return [];

        const result = [];
        const parts = cleaned.split(',').map(s => s.trim());

        for (let part of parts) {
            if (part.includes('-')) {
                // Range like "D-F"
                const [start, end] = part.split('-').map(s => s.trim());
                const startIdx = this.columnLetterToIndex(start);
                const endIdx = this.columnLetterToIndex(end);

                for (let i = startIdx; i <= endIdx; i++) {
                    result.push(this.indexToColumnLetter(i));
                }
            } else {
                // Single column like "B"
                result.push(part.toUpperCase());
            }
        }

        return result;
    },

    /**
     * Convert column letter to 0-based index (A=0, B=1, ..., Z=25, AA=26, etc.)
     * @param {string} letter - Column letter
     * @returns {number} - 0-based index
     */
    columnLetterToIndex: function (letter) {
        letter = letter.toUpperCase();
        let result = 0;
        for (let i = 0; i < letter.length; i++) {
            result = result * 26 + (letter.charCodeAt(i) - 64);
        }
        return result - 1; // Convert to 0-based
    },

    /**
     * Convert 0-based index to column letter (0=A, 1=B, ..., 25=Z, 26=AA, etc.)
     * @param {number} index - 0-based index
     * @returns {string} - Column letter
     */
    indexToColumnLetter: function (index) {
        let result = '';
        let num = index + 1; // Convert to 1-based

        while (num > 0) {
            const remainder = (num - 1) % 26;
            result = String.fromCharCode(65 + remainder) + result;
            num = Math.floor((num - 1) / 26);
        }

        return result;
    },

    /**
     * Navigate to URL safely
     * @param {string} url - Target URL
     */
    // --- NAVIGATION ---

    /**
     * Navigate to URL safely
     * @param {string} url - Target URL
     */
    navigateToUrl: function (url) {
        if (!url) return;

        // Sanitize URL if SecurityUtils is available, otherwise basic check
        let safeUrl = url.trim();
        if (typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl) {
            safeUrl = SecurityUtils.sanitizeUrl(url);
        } else {
            // Basic fallback
            if (safeUrl.toLowerCase().startsWith('javascript:')) return;
        }

        if (!safeUrl) return;

        console.log(`[AutoFill Pro] Navigating to: ${safeUrl}`);
        window.location.href = safeUrl;
    },

    // --- FORM FILLING LOGIC ---

    async fillField(element, value) {
        if (!element) return false;
        try { element.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
        this.highlightElement(element);

        // Enhanced Ant Design/Angular Select Detection
        const nzSelect = element.closest('nz-select') ||
            this.getElementByXPath('.//nz-select | .//*[@class*="select" or @class[contains(., "select")]]', element);

        if (element.classList.contains('nz-select-top-control') || nzSelect) {
            await this.handleAngularSelect(nzSelect || element, String(value)); return true;
        }

        const tagNameInitial = element.tagName.toLowerCase();
        if ((tagNameInitial === 'nz-select' || element.tagName === 'NZ-SELECT') && !nzSelect) {
            await this.handleAngularSelect(element, String(value)); return true;
        }
        const isPotentialGroup = element.querySelector('nz-checkbox-group') ||
            tagNameInitial === 'nz-checkbox-group' ||
            tagNameInitial === 'div' ||
            tagNameInitial === 'span' ||
            (tagNameInitial === 'div' && element.querySelectorAll('input[type="checkbox"], input[type="radio"]').length > 0);

        if (isPotentialGroup) {
            const result = await this.scanAndClickByText(element, value);
            if (result) return true;
        }

        if (tagNameInitial !== 'input' && tagNameInitial !== 'select' && tagNameInitial !== 'textarea') {
            const innerInput = element.querySelector('input');
            if (innerInput) {
                element = innerInput;
                this.highlightElement(element);
            }
        }

        const currentTagName = element.tagName.toLowerCase();
        const inputType = element.getAttribute('type');

        if (!this.isTrulyVisible(element)) return false;

        let finalValue = String(value);
        if (inputType === 'number') finalValue = finalValue.replace(/,/g, '').trim();

        element.focus();
        const delay = (typeof window.APP_CONFIG !== 'undefined' ? window.APP_CONFIG.elementFillDelay : 50);
        await new Promise(r => setTimeout(r, delay));

        if (inputType === 'checkbox' || inputType === 'radio') {
            const wrapper = element.closest('.ant-checkbox-wrapper') || element.closest('label') || element.closest('.ant-radio-wrapper');
            const isChecked = element.checked || (wrapper && (wrapper.classList.contains('ant-checkbox-wrapper-checked') || wrapper.classList.contains('ant-radio-wrapper-checked')));
            if (!isChecked) { element.click(); if (wrapper) wrapper.click(); }
        }
        else if (currentTagName === 'select') {
            let found = false;
            for (let i = 0; i < element.options.length; i++) { if (element.options[i].value == finalValue) { element.selectedIndex = i; found = true; break; } }
            if (!found) { for (let i = 0; i < element.options.length; i++) { if (element.options[i].text.trim().toLowerCase() === finalValue.toLowerCase()) { element.selectedIndex = i; found = true; break; } } }
            this.triggerFullEvents(element);
        }
        else {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            const nativeTextSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;

            if (currentTagName === 'input' && nativeSetter) nativeSetter.call(element, finalValue);
            else if (currentTagName === 'textarea' && nativeTextSetter) nativeTextSetter.call(element, finalValue);
            else element.value = finalValue;

            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: finalValue }));
            await new Promise(r => setTimeout(r, 100));
            this.triggerFullEvents(element);
            await new Promise(r => setTimeout(r, 50));
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
        }
        return true;
    },
};
