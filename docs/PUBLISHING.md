# Hướng Dẫn Push Extension Lên Store (Chrome & Edge)

Tài liệu này hướng dẫn chi tiết quy trình đăng tải tiện ích (extension) lên Chrome Web Store và Microsoft Edge Add-ons.

---

## 1. Chuẩn Bị File (Đóng Gói)

Trước khi upload, bạn cần đóng gói extension thành file `.zip`.

1.  **Dọn dẹp code**: Xóa các file không cần thiết (`.git`, `node_modules`, `docs`...).
2.  **Kiểm tra `manifest.json`**:
    *   Đảm bảo `version` là mới nhất (ví dụ `3.0.9`).
    *   Xóa các quyền (`permissions`) không sử dụng để tránh bị review lâu.
    *   Đảm bảo có đủ icon (16, 48, 128px) trong folder `icons/`.
3.  **Tạo file zip**:
    *   Select tất cả các file trong thư mục dự án (manifest.json, popup.html, js files, icons...).
    *   Right click -> **Compress** (hoặc Nén).
    *   Đặt tên file: `sheet-automator-v3.0.9.zip`.

---

## 2. Chrome Web Store (Google)

### Bước 1: Đăng ký Tài khoản Developer
*   **Phí đăng ký**: $5 (thanh toán 1 lần duy nhất).
*   **Truy cập**: [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
*   Đăng nhập bằng tài khoản Google.
*   Chấp nhận thỏa thuận và thanh toán phí $5 visa/mastercard.

### Bước 2: Tạo Item Mới
1.  Tại Dashboard, nhấn nút **+ New Item** (Thêm mục mới).
2.  Tải lên file `.zip` bạn vừa tạo.

### Bước 3: Điền Thông Tin Store Listing (Quan Trọng)
Chrome yêu cầu rất kỹ phần này.

*   **Store Listing**:
    *   **Description**: Mô tả chi tiết tính năng. Dòng đầu tiên cực quan trọng (SEO).
    *   **Category**: Chọn "Productivity" (Năng suất) hoặc "Developer Tools".
    *   **Language**: Vietnamese (hoặc English).
*   **Graphics (Hình ảnh)**:
    *   **Store Icon**: 128x128px (PNG).
    *   **Screenshots**: Ít nhất 1 cái (1280x800px hoặc 640x400px). Nên chụp màn hình popup đẹp nhất.
    *   **Promo Tile** (Optional but recommended): 440x280px.

### Bước 4: Privacy Practices (Chính sách riêng tư)
Tab này quyết định việc bạn có được duyệt nhanh hay không.

*   **Single Purpose**: Mô tả ngắn gọn (e.g., "Automate form filling from Google Sheets").
*   **Permission Justification**: Giải thích tại sao bạn cần quyền `storage`, `tabs`, `scripting`.
	*   `storage`: "To save user preferences and profiles locally."
	*   `tabs` & `scripting`: "To insert content scripts for autofilling forms."
*   **Data Usage**:
    *   Tick vào các mục nếu có thu thập (thường là **No** nếu chỉ lưu local storage).
    *   Nếu code chỉ chạy local, hãy khẳng định "The extension does not collect or transmit any user data".

### Bước 5: Submit for Review
*   Nhấn **Submit for Review**.
*   **Thời gian duyệt**:
    *   Lần đầu: 1 - 3 ngày làm việc (có thể lâu hơn nếu dùng quyền nhạy cảm).
    *   Update version sau này: Thường vài giờ.

---

## 3. Microsoft Edge Add-ons (Miễn Phí)

Edge cho phép đăng ký miễn phí và import trực tiếp từ Chrome Store (nếu muốn).

### Bước 1: Đăng ký Tài khoản
*   **Truy cập**: [Partner Center (Microsoft)](https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview).
*   Đăng nhập bằng tài khoản Microsoft (Outlook/Hotmail).
*   Đăng ký tài khoản Developer (Individual). **Miễn phí**.
*   **Địa chỉ đăng ký**: Điền địa chỉ chính xác. Nếu hệ thống báo *"We couldn't validate this address"*, chỉ cần nhấn **Proceed** (hoặc **Use as entered**) để bỏ qua.
    *   *Mẹo điền địa chỉ tối ưu:*
        *   **Address Line 1**: `Quang Ninh Obstetric and Pediatric Hospital, Tuan Chau`
        *   **City**: `Ha Long`
        *   **State/Province**: `Quang Ninh`
        *   **Country/Region**: `Vietnam`
        *   **Postal Code**: `200000` (Mã bưu chính Quảng Ninh)

### Bước 2: Chuẩn Bị File Đóng Gói (ZIP)
*   **File nén chuẩn**: [GrafosAI-Autofill.zip](file:///d:/Antigravity/GrafosAI-Autofill.zip)
*   **Lưu ý cực kỳ quan trọng**: File `manifest.json` và các file code khác phải nằm ngay tại **thư mục gốc (root)** của file ZIP, không được bọc trong thư mục cha khác.
*   **Loại bỏ các file**: Thư mục `.git/`, `.gitignore`, `docs/`, các file backup (`popup.html.backup`), và các file script chạy cục bộ (`git_sync.*`, `release.sh`).

### Bước 3: Tạo Extension Mới & Thiết Lập Cấu Hình
1.  Truy cập **[Microsoft Edge Add-ons Dashboard](https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview)**.
2.  Nhấn **Create new extension** và tải lên file `.zip` đã chuẩn bị.
3.  **Cấu hình từng phần**:

#### 📂 3.1. Availability (Độ khả dụng)
*   **Visibility**: Chọn **`Public`** (Công khai cho mọi người).
*   **Markets**: Giữ nguyên mặc định **`241 of 241 markets`** và tích chọn ô **`Make my extension available in any future market`**.

#### 📂 3.2. Properties (Thuộc tính)
*   **Category**: Chọn **`Productivity`** (Năng suất).
*   **Support details**:
    *   *Website*: `https://github.com/phongsun01/GrafosAI-Autofill`
    *   *Support contact detail*: `https://github.com/phongsun01/GrafosAI-Autofill/issues` (hoặc Email của bạn).
*   **Mature content**: **BỎ TRỐNG (Không tích chọn)**.

#### 📂 3.3. Privacy (Quyền riêng tư - Quan trọng)
Copy các nội dung giải trình tiếng Anh chuẩn dưới đây:

*   **Single purpose description**:
    ```text
    GrafosAI-Autofill is a secure browser extension designed to automate form filling by mapping and importing data directly from user-provided Google Sheets, supporting macros, and custom XPaths.
    ```
*   **activeTab justification**:
    ```text
    Required to securely interact with the active browser tab to perform form filling, run automation macros, and allow the user to select form fields (using the XPath picker) on the current page.
    ```
*   **scripting justification**:
    ```text
    Needed to dynamically inject content scripts and helper tools into the active tab to analyze forms and fill inputs based on the user's active profile.
    ```
*   **storage justification**:
    ```text
    Required to save and retrieve user configuration profiles, saved XPaths, and local variables securely on the user's local device.
    ```
*   **clipboardRead justification**:
    ```text
    Needed to allow the user to quickly paste spreadsheet URLs, macro commands, or XPaths into the popup settings.
    ```
*   **clipboardWrite justification**:
    ```text
    Required to let users copy generated XPaths or debug logs from the extension popup interface to their clipboard.
    ```
*   **Host permission justification**:
    ```text
    The host permissions (docs.google.com and googleusercontent.com) are required to retrieve data from the user's public Google Sheets via export URLs. The optional host permissions allow users to run autofill actions on their target websites upon explicit permission.
    ```
*   **Are you using remote code?**: Chọn **`No`**. (Bỏ trống phần Justification).
*   **Data usage**:
    *   Tích chọn: **`My extension does not collect or transmit user data`** (hoặc bỏ trống toàn bộ các ô danh mục dữ liệu).
    *   Mô tả sử dụng:
        ```text
        None. The extension does not collect, store, or transmit any user data, personal information, or browsing history. All processing is done locally on the client machine.
        ```
*   **Privacy policy URL**:
    ```text
    https://github.com/phongsun01/GrafosAI-Autofill/blob/main/PRIVACY.md
    ```
*   Tích chọn chứng thực **cả 3 ô vuông** ở cuối trang.

#### 📂 3.4. Store Listings (Chi tiết cửa hàng)
*   **Description**:
    ```text
    GrafosAI-Autofill is an enterprise-grade form automation tool designed to make repetitive data entry effortless, fast, and secure. Directly import spreadsheet data and automate web forms with precision.

    🚀 Key Features:
    - Google Sheets Integration: Seamlessly map columns to input fields and run automated data filling directly from your spreadsheets.
    - Intelligent Macro System: Build step-by-step automation sequences (clicks, navigation, delay, and conditional logic).
    - Custom XPath Picker: Easily select and target complex input fields, dropdowns, and checkboxes on any webpage.
    - Security-First Architecture: Fully local processing. Your API keys (such as Gemini API for smart field detection) and configuration profiles are stored securely in your browser's local storage.
    - Rate Limiting & Input Sanitization: Built-in protections to ensure secure and stable automation sessions.

    Simplify your workflow and eliminate manual errors today with GrafosAI-Autofill!
    ```
*   **Search terms** (Nhập và add 7 từ khóa): `autofill`, `form filler`, `xpath picker`, `automation`, `google sheets`, `macro runner`, `smart fill`.
*   **Logo & Screenshots**:
    *   *Logo*: Tải lên file `icon.png` có sẵn trong dự án.
    *   *Screenshots*: Sử dụng 4 file ảnh chụp màn hình chất lượng cao kích thước chuẩn `1280x800` đã được tạo sẵn tại thư mục `D:\Antigravity\`:
        *   [screenshot_1.png](file:///d:/Antigravity/screenshot_1.png)
        *   [screenshot_2.png](file:///d:/Antigravity/screenshot_2.png)
        *   [screenshot_3.png](file:///d:/Antigravity/screenshot_3.png)
        *   [screenshot_4.png](file:///d:/Antigravity/screenshot_4.png)
    *   *Ảnh quảng cáo (Promotional tiles)*: Không có dấu `*` bắt buộc nên có thể bỏ qua.

### Bước 4: Nộp Duyệt (Publish)
Khi nhấn **Publish**, ở phần **Notes for certification**, copy nội dung sau:

```text
Hello Reviewer,

GrafosAI-Autofill is a secure automation tool that allows users to autofill web forms using data from Google Sheets and customized XPaths. 

To help you test the extension easily, please follow these steps:

1. Setup Test Sheet:
We have prepared a public sample Google Sheet containing mock data for testing. You can copy or use this URL directly in the GID/Sheet field in the popup:
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing
(No Google authentication is required as the sheet is shared as "Anyone with the link can view").

2. How to test basic Autofill:
- Pin and open the extension popup.
- Go to the "Config" tab to create a new Profile and Process. Enter the Google Sheet URL above.
- Go to the "Run" tab, select your profile and process.
- Navigate to any standard web form (e.g., a login or registration page).
- Enter "2" or "2-3" in the "Range" field.
- Click "Run" (CHẠY NGAY). The extension will automatically read columns from the sheet and fill out the fields matching your configured targets.

3. External Integrations:
- The extension integrates directly with Google Sheets for fetching CSV data.
- The extension optionally supports Gemini API for smart form field detection (configured in the "AI" tab). Testers can input their own Gemini API key to test the AI functionality, which makes direct client-side requests to 'https://generativelanguage.googleapis.com'.

No special test accounts or server backends are required, as all automation logic and configuration storage run locally on the client's browser.

Thank you!
```

---

## 4. Mẹo Để Duyệt Nhanh (Tips)

1.  **Permissions Tối Thiểu**: Chỉ xin quyền thật sự cần. (`activeTab` dễ duyệt hơn `host_permissions` `<all_urls>`).
2.  **Privacy Policy**: Bắt buộc phải cung cấp link như link file `PRIVACY.md` trên GitHub.
3.  **Video Demo**: Nên có 1 video ngắn (khoảng 30s) trên YouTube quay cách tool hoạt động, chèn link vào phần Listing hoặc Notes to Reviewer sẽ giúp rút ngắn thời gian duyệt rất nhiều.
4.  **Notes to Reviewer**: Cung cấp đầy đủ hướng dẫn test cùng dữ liệu mẫu (như bản mẫu ở trên).

