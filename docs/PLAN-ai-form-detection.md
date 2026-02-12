# PLAN: AI Form Detection (Gemini API)

## 1. Overview
Implement an AI-powered XPath generator using the Google Gemini API. This feature allows users to automatically scan web forms and generate reliable XPaths based on prompts stored in a Google Sheet.

**Key Decision:** Use **Gemini API (Cloud)** instead of Gemini Nano (Local) for better reliability and broader device support.

## 2. Project Type
**WEB** (Chrome Extension)

## 3. Success Criteria
- [ ] Users can input their Gemini API Key in the extension popup.
- [ ] Extension can fetch prompts from a configured Google Sheet (GID).
- [ ] "AI Scan" button successfully extracts form structure (inputs, labels).
- [ ] Gemini API generates accurate XPaths for standard forms (Login, Signup, Contact).
- [ ] Generated XPaths can be copied or pasted directly into the run config.
- [ ] < 5s latency for typical forms.

## 4. Tech Stack
- **AI Model:** Google Gemini API (`models/gemini-1.5-flash` or `gemini-pro`).
- **Frontend:** Vanilla JS / HTML / CSS (Extension Popup).
- **Backend:** None (Serverless/Client-side API call).
- **Data:** Google Sheets (for Prompts), Chrome Storage (for API Key & Cache).

## 5. File Structure
```text
GrafosAI-Autofill/
├── manifest.json              # Update permissions
├── ai-engine.js               # [NEW] Core AI logic & API handling
├── content.js                 # Update to include form scanning
├── popup.html                 # Update to add AI tab
├── popup.js                   # Update to handle AI UI events
└── docs/
    └── AI_SETUP.md            # [NEW] Setup guide for users
```

## 6. Task Breakdown

### Phase 1: Setup & Configuration
- [ ] **[1.1] Update Manifest:** Add necessary permissions (`scripting`, `activeTab`) and host permissions for Google Generative AI API if needed (usually handled via content script or background fetch). <!-- agent: frontend-specialist -->
- [ ] **[1.2] Config UI:** Add "AI Settings" section in Popup (API Key input, Prompt Sheet ID). <!-- agent: frontend-specialist -->
- [ ] **[1.3] Storage Logic:** Save/Load API Key and Sheet settings using `chrome.storage`. <!-- agent: frontend-specialist -->

### Phase 2: Core AI Engine (`ai-engine.js`)
- [ ] **[2.1] Form Scanner:** Implement `scanForm()` in `content.js` to extract semantic HTML (inputs, labels, buttons) and minify it for the prompt. <!-- agent: frontend-specialist -->
- [ ] **[2.2] Prompt Fetcher:** Implement `fetchPrompts(gid)` to get prompts from Google Sheet CSV. <!-- agent: frontend-specialist -->
- [ ] **[2.3] Gemini Client:** Implement `generateXPath(html, prompt, apiKey)` using `fetch()` to call Gemini API. <!-- agent: frontend-specialist -->
- [ ] **[2.4] Response Parser:** Implement logic to parse Gemini's JSON/Text response into a structured XPath list. <!-- agent: frontend-specialist -->

### Phase 3: UI Integration
- [ ] **[3.1] AI Tab UI:** Create the "AI Scan" tab layout in `popup.html`. <!-- agent: frontend-specialist -->
- [ ] **[3.2] Event Wiring:** Connect "Scan" button to `ai-engine.js` flow. <!-- agent: frontend-specialist -->
- [ ] **[3.3] Results Display:** Render generated XPaths with "Copy" and "Test" buttons. <!-- agent: frontend-specialist -->

### Phase 4: Testing & Polish
- [ ] **[4.1] Test:** Validate against test forms (Tiki, Shopee, Google Login). <!-- agent: test-engineer -->
- [ ] **[4.2] Error Handling:** Handle Invalid Key, Network Error, No Form Found, API Quota Exceeded. <!-- agent: frontend-specialist -->
- [ ] **[4.3] Documentation:** Create `docs/AI_SETUP.md` guide. <!-- agent: documentation-writer -->

## 7. Phase X: Verification Checklist
- [ ] **Lint:** `npm run lint` (or manual JS check)
- [ ] **Security:** API Key stored securely (not in local storage if possible, or masked).
- [ ] **Build:** Extension loads without errors.
- [ ] **Functional:** Scan -> Generate -> Result works end-to-end.
