/**
 * variables-manager.js (Module Version)
 * Handles variable storage, retrieval, scoping, and substitution.
 */
export class VariablesManager {
    constructor() {
        this.globalVars = {};
        this.csvRowData = {};
        this.currentRowIndex = 0;

        // Default Config
        this.config = {
            maxVars: 100,
            maxVarLength: 2000,
            scopePriority: ['csv', 'global', 'sequence'],
            extractFailPolicy: 'stop'
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Update context for current row execution
     */
    setContext(rowData, index) {
        this.csvRowData = rowData || {};
        this.currentRowIndex = index;
    }

    /**
     * Set a global variable
     */
    set(key, value) {
        if (key === undefined || key === null || key === '') return false;
        const safeKey = String(key);

        // Enforce limits
        if (Object.keys(this.globalVars).length >= this.config.maxVars && !this.globalVars[safeKey]) {
            console.warn(`[Vars] Max limit reached. Cannot save '${safeKey}'`);
            return false;
        }

        let valStr = String(value || "");
        if (valStr.length > this.config.maxVarLength) {
            valStr = valStr.substring(0, this.config.maxVarLength);
        }

        this.globalVars[safeKey] = valStr;
        return true;
    }

    /**
     * Get variable value based on scope priority
     */
    get(key) {
        if (key === 'n') return String(this.currentRowIndex);

        for (const scope of this.config.scopePriority) {
            if (scope === 'csv' && this.csvRowData && this.csvRowData.hasOwnProperty(key)) {
                return this.csvRowData[key];
            }
            if (scope === 'global' && this.globalVars.hasOwnProperty(key)) {
                return this.globalVars[key];
            }
            if (scope === 'sequence' && key === 'n') {
                return String(this.currentRowIndex);
            }
        }
        return null;
    }

    getAll() {
        return { ...this.globalVars };
    }

    delete(key) {
        if (this.globalVars.hasOwnProperty(key)) {
            delete this.globalVars[key];
            return true;
        }
        return false;
    }

    clear() {
        this.globalVars = {};
    }
}

// Create a singleton instance for the background script
export const varsManager = new VariablesManager();
