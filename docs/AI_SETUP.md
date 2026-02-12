# 🤖 AI Form Detection Setup Guide

This feature uses Google's Gemini API to automatically scan web forms and generate stable XPaths for automation.

## 1. Get Your Free API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API Key**.
3. Copy the key (starts with `AIza...`).

## 2. Prepare the "AI_Prompts" Sheet
1. Create a new Google Sheet.
2. In the first row, add headers: `Trigger` | `Prompt`.
3. Fill in the prompts for different form types.

**Template:** (Copy this to your sheet)
| Trigger | Prompt |
| :--- | :--- |
| **login** | Find the email/username input, password input, and the login button. Return XPaths that prefer ID over Name. |
| **signup** | Find all registration fields (email, password, confirm password, name) and the signup button. |
| **contact** | Find name, email, subject, message fields and the submit button. |
| **custom** | Scan the form and identify all visible input fields with their labels. |

4. **Important:** Share the Sheet as "Anyone with the link can view" (or just ensure it's accessible).
5. Copy the **GID** from the URL (e.g., `...#gid=123456` -> `123456`). Note: The Spreadsheet ID is reused from the Config tab if available, otherwise you might need to ensure the extension knows the Sheet ID. *Currently, the extension assumes the main Config Sheet ID is used or the user provides a GID valid for the configured Sheet.*

## 3. Using the Feature
1. Open the **GrafosAI-Autofill** extension.
2. Go to the new **AI Scan 🤖** tab.
3. Paste your **Gemini API Key**.
4. Enter the **Prompt Sheet GID**.
5. Select the **Form Type** (e.g., Login) that matches your current page.
6. Click **🔍 Scan Form & Generate XPaths**.
7. Wait a few seconds for the AI to think.
8. **Copy All** XPaths and paste them into your automation config!

## Troubleshooting
- **"Failed to fetch Sheet CSV"**: Check if your Sheet is shared publicly or if the configured Spreadsheet ID in the "Config" tab is correct.
- **"Gemini API Error"**: Check if your API Key is valid and has quota remaining (Free tier allow 15 req/min).
