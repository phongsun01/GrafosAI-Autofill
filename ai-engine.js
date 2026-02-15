// ai-engine.js

window.AIEngine = {
    /**
     * Initialize AI Engine
     * @returns {Promise<boolean>}
     */
    async init() {
        console.log('[AI] Initializing...');
        return true;
    },

    /**
     * Fetch prompts from Google Sheet CSV
     * @param {string} gid - Sheet GID
     * @returns {Promise<Array>} Prompts data
     */
    async fetchPrompts(gid) {
        if (!gid) throw new Error("GID is required");

        let csvUrl = "";

        // 1. Try to detect if 'gid' is actually a full URL
        if (gid.startsWith("http")) {
            try {
                const m = gid.match(/\/d\/([a-zA-Z0-9-_]+)/);
                const g = gid.match(/[#&]gid=([0-9]+)/);
                if (m) {
                    const sheetId = m[1];
                    const actualGid = g ? g[1] : "0";
                    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${actualGid}`;
                }
            } catch (e) { console.error("URL parsing error", e); }
        }

        // 2. If not a generic URL, try to build from DataManager (window.DataManager)
        if (!csvUrl && window.DataManager) {
            // Case A: DataManager has getSheetIds (from config)
            if (window.DataManager.getSheetIds) {
                const ids = window.DataManager.getSheetIds();
                if (ids && ids.spreadsheetId) {
                    csvUrl = `https://docs.google.com/spreadsheets/d/${ids.spreadsheetId}/export?format=csv&gid=${gid}`;
                }
            }
            // Case B: DataManager has appData (fallback to macro config?)
            if (!csvUrl && window.DataManager.appData && window.DataManager.appData.macroSheetConfig && window.DataManager.appData.macroSheetConfig.url) {
                const url = window.DataManager.appData.macroSheetConfig.url;
                const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (m) {
                    csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
                }
            }
        }

        if (!csvUrl) {
            // Final attempt: If the user provided a GID but we have no Sheet ID context
            throw new Error("Cannot determine Spreadsheet ID. Please paste the FULL Google Sheet URL into the GID field.");
        }

        try {
            const response = await fetch(csvUrl);
            if (!response.ok) {
                if (response.status === 404) throw new Error("Sheet not found (404). Check permissions.");
                if (response.status === 403) throw new Error("Access denied (403). Share sheet with 'Anyone with link'.");
                throw new Error("Failed to fetch Sheet (Status: " + response.status + ")");
            }
            const csvText = await response.text();

            if (typeof Papa === 'undefined') throw new Error("PapaParse library not found");

            const parseResult = Papa.parse(csvText, { header: false });
            if (parseResult.errors.length) console.warn("CSV Parse warnings:", parseResult.errors);

            const prompts = parseResult.data.map(row => ({
                trigger: (row[0] || "").toLowerCase().trim(),
                prompt: row[1] || ""
            })).filter(p => p.trigger && p.prompt);

            return prompts;
        } catch (e) {
            console.error("[AI] Fetch prompts failed:", e);
            throw e;
        }
    },

    /**
     * Generate XPath using Gemini API
     * @param {string} html - Form HTML
     * @param {string} prompt - Prompt template
     * @param {string} apiKey - Gemini API Key
     * @returns {Promise<Array>} Generated XPaths
     */
    async generateXPath(html, prompt, apiKey) {
        if (!apiKey) throw new Error("API Key is required");

        const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
        const fullPrompt = `${prompt}\n\nTarget Form HTML:\n${html}\n\nReturn JSON format: [{"label": "...", "xpath": "..."}]`;

        try {
            const response = await fetch(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Gemini API Error");
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            return JSON.parse(text);
        } catch (error) {
            console.error("[AI] Generation failed:", error);
            throw error;
        }
    }
};

console.log("[AI] Engine Loaded");
