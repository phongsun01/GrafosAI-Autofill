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
     * Dynamically find the best available model for the API Key
     * @param {string} apiKey 
     * @returns {Promise<string>} Model name (e.g. 'models/gemini-1.5-flash')
     */
    async discoverBestModel(apiKey) {
        console.log("[AI] Discovering available models...");
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                // If ListModels fails, fall back to a safe default
                console.warn("[AI] ListModels failed, using default.");
                return "gemini-1.5-flash";
            }

            const data = await response.json();
            if (!data.models) return "gemini-1.5-flash"; // No models returned?

            // Filter for models that support generateContent
            const candidates = data.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes("generateContent")
            );

            // Sort logic: Prefer flash > pro > 1.5 > 1.0
            const preferredOrder = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];

            for (const pref of preferredOrder) {
                const found = candidates.find(m => m.name.endsWith(pref));
                if (found) {
                    console.log(`[AI] Selected best model: ${found.name}`);
                    return found.name.replace("models/", ""); // API expects just name usually, or models/name
                }
            }

            // Fallback to the first available candidate
            if (candidates.length > 0) {
                console.log(`[AI] Selected fallback model: ${candidates[0].name}`);
                return candidates[0].name.replace("models/", "");
            }

            return "gemini-1.5-flash"; // Absolute fallback

        } catch (e) {
            console.error("[AI] Discovery error:", e);
            return "gemini-1.5-flash";
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

        const safeKey = apiKey.trim();

        // 1. Discover valid model
        let modelName = await this.discoverBestModel(safeKey);
        // Ensure prefix consistency
        if (!modelName.startsWith("models/") && !modelName.startsWith("tunedModels/")) {
            // actually the API endpoint format is models/{model}:generateContent
            // so if discovery returns 'models/gemini-pro', we extract 'gemini-pro'
            modelName = modelName.replace("models/", "");
        }

        console.log(`[AI] Using Model: ${modelName}`);

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        const fullPrompt = `${prompt}\n\nTarget Form HTML:\n${html}\n\nReturn JSON format: [{"label": "...", "xpath": "..."}]`;

        try {
            const response = await fetch(`${API_URL}?key=${safeKey}`, {
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
                const msg = errorData.error?.message || "Unknown API Error";
                throw new Error(`${modelName} failed: ${msg}`);
            }

            const data = await response.json();
            if (!data.candidates || !data.candidates[0].content) {
                throw new Error("Invalid API response format");
            }
            const text = data.candidates[0].content.parts[0].text;
            return JSON.parse(text);

        } catch (error) {
            console.error(`[AI] Error with ${modelName}:`, error);
            throw error;
        }
    }
};

console.log("[AI] Engine Loaded");
