# Privacy Policy for GrafosAI-Autofill

**Effective Date:** October 29, 2026  
**Version:** 4.0.1  

At GrafosAI-Autofill, we are committed to transparency and user privacy. This Privacy Policy outlines how the extension handles data, interactions with third-party services, and local security practices.

---

## 1. Information Collection and Local Processing

GrafosAI-Autofill is designed to run self-contained and locally inside your browser:

* **Zero Outbound Telemetry:** We do not collect, store, or transmit your browsing history, keystrokes, personal identity, or automation logs to any external server.
* **100% Local Execution:** Script execution, DOM traversal, XPath evaluation, and data filling occur entirely on your machine via Chrome Extension APIs and Service Workers.
* **No External Web Fonts or Assets:** All user interface fonts and stylesheets rely strictly on standard system font stacks without making external network calls to third-party font CDNs.

---

## 2. Third-Party Integrations & Data Transmission

The extension only communicates across the network when explicitly commanded by the user for two specific workflows:

### A. Google Sheets Data Fetching
* The extension fetches tabular data directly from Google Sheets URLs provided by the user using Google's direct CSV export endpoint.
* **Important Privacy Notice:** Because access is unauthenticated (no OAuth token required), your Google Sheet must be configured with link-sharing enabled (*"Anyone with the link can view"*). Users are strongly cautioned against placing passwords, sensitive payment info, or confidential personal data on publicly accessible sheets.

### B. Optional Google Gemini AI Form Scanner
* When utilizing the AI tab, the extension contacts Google's Generative Language API (`generativelanguage.googleapis.com`) using your personal Gemini API key.
* **Explicit User Confirmation:** Before sending any form structure, an interactive confirmation dialog is presented.
* **Sensitive Field Redaction:** Form scanning strictly excludes password values and redacts sensitive field placeholders before transmitting form metadata to the Gemini API.

---

## 3. Data Storage & Local Hardening

* **Local Storage Only:** Profiles, process flows, active variables, and extension settings reside solely in your browser's `chrome.storage.local`.
* **Obfuscation at Rest:** Sensitive variables and API keys are protected using AES-GCM encryption with keys derived from the extension environment to prevent raw plaintext exposure in profile backups and local inspection.
* **Data Deletion:** All stored data is immediately deleted when the extension is removed from Google Chrome.

---

## 4. Contact & Open Source

GrafosAI-Autofill is open-source under the MIT License.  
For technical inquiries, security reports, or code contributions:
* GitHub Repository: [phongsun01/GrafosAI-Autofill](https://github.com/phongsun01/GrafosAI-Autofill)
