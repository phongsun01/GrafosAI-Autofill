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

    // --- XPATH PICKER LOGIC ---

    window.onPickerMouseMove = function (e) {
        if (!window.AutoFillPro.xpathPickerMode) return;
        e.stopPropagation();
        e.preventDefault();

        const target = e.target;
        if (!target || target === document.body || target === document.documentElement) return;

        // Restore previous element
        if (window.AutoFillPro.xpathPreviewElement && window.AutoFillPro.xpathPreviewElement !== target) {
            restoreElementStyle(window.AutoFillPro.xpathPreviewElement);
        }

        // Highlight current element
        window.AutoFillPro.xpathPreviewElement = target;
        highlightElement(target);
    };

    window.onPickerClick = function (e) {
        if (!window.AutoFillPro.xpathPickerMode) return;
        e.stopPropagation();
        e.preventDefault();

        const target = e.target;
        if (!target || target === document.body || target === document.documentElement) return;

        const xpath = window.generateXPath(target);
        if (xpath) {
            copyToClipboard(xpath);
            window.showOnPageToast(`✅ Copied: ${xpath}`);
            console.log('[AutoFill Pro] XPath copied:', xpath);
        }

        window.stopXPathPicker();
    };

    window.onPickerKeydown = function (e) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            window.stopXPathPicker();
            window.showOnPageToast('❌ Picker Cancelled');
        }
    };

    function highlightElement(element) {
        if (!element || !element.style) return;
        element.dataset.originalOutline = element.style.outline || '';
        element.dataset.originalBackground = element.style.backgroundColor || '';
        element.style.outline = '2px solid #00ff00';
        element.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    }

    function restoreElementStyle(element) {
        if (!element || !element.style) return;
        element.style.outline = element.dataset.originalOutline || '';
        element.style.backgroundColor = element.dataset.originalBackground || '';
        delete element.dataset.originalOutline;
        delete element.dataset.originalBackground;
    }

    function copyToClipboard(text) {
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

        if (window.AutoFillPro.xpathPreviewElement) {
            restoreElementStyle(window.AutoFillPro.xpathPreviewElement);
            window.AutoFillPro.xpathPreviewElement = null;
        }
        console.log('[AutoFill Pro] XPath Picker: DEACTIVATED');
    };

    console.log('[AutoFill Pro] Picker Module Loaded (Security Enhanced)');

})();
