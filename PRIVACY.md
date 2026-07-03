# Privacy Policy for GrafosAI-Autofill

**Effective Date:** July 3, 2026

At GrafosAI-Autofill, we are committed to protecting your privacy. This Privacy Policy explains how our browser extension collects, uses, and safeguards your information.

---

## 1. Information Collection and Use

GrafosAI-Autofill is designed to run entirely locally in your browser. We respect your privacy and enforce the following principles:

*   **No Personal Data Collection:** We do not collect, store, or transmit any of your personal data, browsing history, or form inputs to our own servers.
*   **Local Processing:** All automation actions, XPath queries, and form detection logic are processed entirely on your local machine.

---

## 2. Third-Party Integrations & Data Transmission

To perform its automation tasks, the extension interacts with specific third-party APIs. All interactions are direct and secure:

*   **Google Sheets Integration:** 
    *   The extension fetches spreadsheet data from Google Sheets URLs provided by you.
    *   This data is fetched directly from Google's servers to your browser client using the standard Google Sheets export APIs. It is never routed through any middleman or external servers.
*   **Gemini API Integration:**
    *   The extension uses the Gemini API for smart form field detection if configured.
    *   You must provide your own Gemini API key. This key is stored securely in your browser's local extension storage (`chrome.storage.local`).
    *   Requests to the Gemini API (`generativelanguage.googleapis.com`) are sent directly from your browser to Google APIs. No third-party servers are involved.

---

## 3. Data Storage

*   All configuration settings, active profiles, customized XPaths, and local variables are saved using the browser's local storage (`chrome.storage.local`).
*   This data remains on your device and is deleted when you uninstall the extension.

---

## 4. Security

We implement security measures including input sanitization, rate limiting, and secure local storage practices to prevent data leakage and ensure safe automation.

---

## 5. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.

---

## 6. Contact Us

If you have any questions or suggestions about this Privacy Policy, please contact us at:
*   GitHub Repository: [phongsun01/GrafosAI-Autofill](https://github.com/phongsun01/GrafosAI-Autofill)
