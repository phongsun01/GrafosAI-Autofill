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
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey
                }
            });

            if (!response.ok) {
                console.warn("[AI] ListModels failed, using default.");
                return "gemini-1.5-flash";
            }

            const data = await response.json();
            if (!data.models) return "gemini-1.5-flash";

            const candidates = data.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes("generateContent")
            );

            // [OPTIMIZATION] Use Map for O(1) lookup instead of nested loops
            const modelMap = new Map(candidates.map(m => [
                m.name.split('/').pop(), // Extract short name (e.g., gemini-1.5-flash)
                m.name
            ]));

            const preferredOrder = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];

            for (const pref of preferredOrder) {
                if (modelMap.has(pref)) {
                    const fullName = modelMap.get(pref);
                    console.log(`[AI] Selected best model: ${fullName}`);
                    return fullName.replace("models/", "");
                }
            }

            // Fallback to the first available candidate
            if (candidates.length > 0) {
                console.log(`[AI] Selected fallback model: ${candidates[0].name}`);
                return candidates[0].name.replace("models/", "");
            }

            return "gemini-1.5-flash";

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
    async generateXPath(html, prompt, apiKey, retries = 3) {
        // [VALIDATION] Input checks
        if (!apiKey || typeof apiKey !== 'string') throw new Error("API Key must be a non-empty string");
        if (!html || typeof html !== 'string') throw new Error("HTML must be a non-empty string");

        // [OPTIMIZATION] Limit HTML size to prevent payload issues (100KB limit)
        const MAX_HTML_SIZE = 100000;
        let safeHtml = html;
        if (safeHtml.length > MAX_HTML_SIZE) {
            console.warn(`[AI] HTML too large (${safeHtml.length} chars), truncating to ${MAX_HTML_SIZE}...`);
            safeHtml = safeHtml.substring(0, MAX_HTML_SIZE) + "...[truncated]";
        }

        const safeKey = apiKey.trim();
        let modelName = await this.discoverBestModel(safeKey);

        // Ensure prefix consistency
        if (!modelName.startsWith("models/") && !modelName.startsWith("tunedModels/")) {
            modelName = modelName.replace("models/", "");
        }

        console.log(`[AI] Using Model: ${modelName}`);

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        const fullPrompt = `${prompt}\n\nTarget Form HTML:\n${safeHtml}\n\nReturn JSON format: [{"label": "...", "xpath": "..."}]`;

        // [RELIABILITY] Retry wrapper
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': safeKey
                    },
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

                    // Handle Rate Limiting (429)
                    if (response.status === 429) {
                        if (attempt < retries - 1) {
                            const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                            console.warn(`[AI] Rate limited. Retrying in ${backoff}ms...`);
                            await new Promise(r => setTimeout(r, backoff));
                            continue;
                        }
                    }

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
                // Retry on network errors
                if (attempt < retries - 1 && (error.message.includes('fetch') || error.message.includes('network'))) {
                    console.warn(`[AI] Network error (Attempt ${attempt + 1}/${retries}). Retrying...`);
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                console.error(`[AI] Error with ${modelName}:`, error);
                throw error;
            }
        }
    }
};

console.log("[AI] Engine Loaded");
