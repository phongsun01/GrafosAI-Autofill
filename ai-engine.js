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

        // Construct CSV export URL
        // Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}
        // We need the SHEET_ID from config or user input. For now, assuming user provides full URL or we use a configured ID.
        // IMPROVEMENT: Ideally, we use the same DataManager logic.

        // Re-use DataManager if available, otherwise fetch directly
        // Since ai-engine.js is a module, we can import likely, but let's keep it standalone-ish or use window.DataManager

        let csvUrl = "";
        if (window.DataManager && window.DataManager.getSheetIds) {
            const sheetId = window.DataManager.getSheetIds().spreadsheetId;
            if (!sheetId) throw new Error("Setup Sheet ID in Config tab first");
            csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        } else {
            throw new Error("DataManager not found");
        }

        try {
            const response = await fetch(csvUrl);
            if (!response.ok) throw new Error("Failed to fetch Sheet CSV");
            const csvText = await response.text();

            const parseResult = Papa.parse(csvText, { header: false });
            // Expected: A=Trigger, B=Prompt
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
