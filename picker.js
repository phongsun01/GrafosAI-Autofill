// XPath Picker Module - Enhanced with Security
(function () {
    'use strict';

    if (!window.AutoFillPro) {
        window.AutoFillPro = {
            xpathPickerMode: false,
            xpathPreviewElement: null,
            _pickerListenersActive: false
        };
    }

    // --- OVERLAY HELPER ---
    function createOverlay() {
        let overlay = document.getElementById('autofill-picker-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'autofill-picker-overlay';
            overlay.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 2147483647;
                background: rgba(16, 185, 129, 0.1);
                border: 2px solid #10b981;
                box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
                transition: all 0.05s ease;
                display: none;
            `;
            // Append to documentElement to avoid Body transform issues
            document.documentElement.appendChild(overlay);
        }
        return overlay;
    }

    function moveOverlay(target) {
        const overlay = createOverlay();
        if (!target || target === document.body || target === document.documentElement) {
            overlay.style.display = 'none';
            return;
        }
        const rect = target.getBoundingClientRect();

        // Safety check for invisible elements
        if (rect.width === 0 || rect.height === 0) {
            overlay.style.display = 'none';
            return;
        }

        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.display = 'block';

        // FALLBACK: Also add a subtle outline to the element itself, just in case overlay is z-indexed out
        // valid only if we can write to style
        if (target.style) {
            // Only save if not already saved!
            if (typeof target.dataset.aoOriginalOutline === 'undefined') {
                target.dataset.aoOriginalOutline = target.style.outline || '';
            }
            target.style.outline = '2px solid rgba(16, 185, 129, 0.8)';
        }
    }

    function clearFallback(target) {
        if (!target) return;
        if (target.dataset && typeof target.dataset.aoOriginalOutline !== 'undefined') {
            target.style.outline = target.dataset.aoOriginalOutline;
            delete target.dataset.aoOriginalOutline;
        }
    }

    // --- XPATH PICKER LOGIC ---

    window.onPickerMouseMove = function (e) {
        if (!window.AutoFillPro.xpathPickerMode) return;

        const target = e.target;
        if (target.id === 'autofill-picker-overlay') return;

        // Restore previous element fallback
        if (window.AutoFillPro.xpathPreviewElement && window.AutoFillPro.xpathPreviewElement !== target) {
            clearFallback(window.AutoFillPro.xpathPreviewElement);
        }

        window.AutoFillPro.xpathPreviewElement = target;
        moveOverlay(target);

        // Debug logger (throttled visually)
        // console.log('[Picker] Hover:', target.tagName); 
    };

    window.onPickerClick = function (e) {
        if (!window.AutoFillPro.xpathPickerMode) return;
        e.stopPropagation();
        e.preventDefault();

        const target = e.target;
        // Relaxed check: allow mostly anything except root document
        if (!target || target === document.documentElement) return;

        const xpath = window.generateXPath(target);
        if (xpath) {
            copyToClipboard(xpath);
            window.showOnPageToast(`✅ Copied: ${xpath}`);
            console.log('[AutoFill Pro] XPath copied:', xpath);
        }

        window.stopXPathPicker();
    };

    window.onPickerKeydown = function (e) {
        if (!window.AutoFillPro.xpathPickerMode) return;
        if (e.key === 'Escape' || e.code === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            window.stopXPathPicker();
            window.showOnPageToast('⏹️ Cancelled Picker');
        }
    };

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(err => {
                console.error('Clipboard API failed', err);
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('[Picker] Copy failed:', err);
        }
        document.body.removeChild(textarea);
    }

    window.showOnPageToast = function (message) {
        const div = document.createElement('div');
        div.textContent = message;
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: opacity 0.5s;
        `;
        document.body.appendChild(div);
        setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 500); }, 2000);
    };

    window.generateXPath = function (element) {
        if (!element) return '';

        try {
            // Priority 1: ID (most reliable)
            if (element.id) {
                const safeId = window.SecurityUtils.escapeXPathValue(element.id);
                return `//*[@id=${safeId}]`;
            }

            // Priority 2: formcontrolname (Angular)
            const formControlName = element.getAttribute('formcontrolname');
            if (formControlName) {
                const safeFcn = window.SecurityUtils.escapeXPathValue(formControlName);
                return `//${element.tagName.toLowerCase()}[@formcontrolname=${safeFcn}]`;
            }

            // Priority 3: Name attribute
            if (element.name) {
                const safeName = window.SecurityUtils.escapeXPathValue(element.name);
                return `//${element.tagName.toLowerCase()}[@name=${safeName}]`;
            }

            // Priority 4: Placeholder
            const placeholder = element.getAttribute('placeholder');
            if (placeholder) {
                const safePlaceholder = window.SecurityUtils.escapeXPathValue(placeholder);
                return `//${element.tagName.toLowerCase()}[@placeholder=${safePlaceholder}]`;
            }

            // Priority 5: Class (if unique enough)
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.trim().split(/\s+/);
                if (classes.length > 0) {
                    const cls = classes[0];
                    if (cls && !cls.match(/\d/)) {
                        const safeClass = window.SecurityUtils.escapeXPathValue(cls);
                        return `//${element.tagName.toLowerCase()}[contains(@class, ${safeClass})]`;
                    }
                }
            }

            // Priority 6: Text content
            const text = (element.textContent || "").trim();
            if (text && text.length < 50 && ['button', 'a', 'label', 'span', 'h1', 'h2', 'h3'].includes(element.tagName.toLowerCase())) {
                const safeText = window.SecurityUtils.escapeXPathValue(text);
                return `//${element.tagName.toLowerCase()}[contains(text(), ${safeText})]`;
            }

            // Fallback: Positional path
            return window.getElementPath(element);
        } catch (e) {
            console.error('[Picker] XPath generation error:', e);
            return window.getElementPath(element);
        }
    };

    window.getElementPath = function (element) {
        if (!element || element.nodeType !== 1) return '';
        if (element === document.body) return '/html/body';
        if (!element.parentNode) return '//' + element.tagName.toLowerCase();

        const siblings = Array.from(element.parentNode.children).filter(a => a.tagName === element.tagName);
        const ix = 1 + siblings.indexOf(element);

        const parentPath = window.getElementPath(element.parentNode);
        return parentPath ? `${parentPath}/${element.tagName.toLowerCase()}[${ix}]` : `//${element.tagName.toLowerCase()}`;
    };

    window.startXPathPicker = function () {
        if (window.AutoFillPro._pickerListenersActive) {
            console.warn('[Picker] Already active, skipping');
            return;
        }

        window.AutoFillPro._pickerListenersActive = true;
        window.AutoFillPro.xpathPickerMode = true;

        document.addEventListener('mousemove', window.onPickerMouseMove, true);
        document.addEventListener('click', window.onPickerClick, true);
        document.addEventListener('keydown', window.onPickerKeydown, true);

        document.addEventListener('keydown', window.onPickerKeydown, true);

        window.focus(); // Ensure window has focus for events and clipboard
        createOverlay(); // Init overlay
        console.log('[AutoFill Pro] XPath Picker: ACTIVATED');
        window.showOnPageToast('🎯 Picker Active: Click to Copy');
    };

    window.stopXPathPicker = function () {
        if (!window.AutoFillPro._pickerListenersActive) return;

        window.AutoFillPro._pickerListenersActive = false;
        window.AutoFillPro.xpathPickerMode = false;

        document.removeEventListener('mousemove', window.onPickerMouseMove, true);
        document.removeEventListener('click', window.onPickerClick, true);
        document.removeEventListener('keydown', window.onPickerKeydown, true);

        const overlay = document.getElementById('autofill-picker-overlay');
        if (overlay) overlay.remove();

        // [FIX] Clear fallback outline from the last highlighted element
        if (window.AutoFillPro.xpathPreviewElement) {
            clearFallback(window.AutoFillPro.xpathPreviewElement);
            window.AutoFillPro.xpathPreviewElement = null;
        }

        console.log('[AutoFill Pro] XPath Picker: DEACTIVATED');
    };

    console.log('[AutoFill Pro] Picker Module Loaded (Security Enhanced)');

})();
