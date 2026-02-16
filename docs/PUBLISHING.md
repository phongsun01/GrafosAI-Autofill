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

### Bước 2: Tạo Extension Mới
1.  Nhấn **Create new extension**.
2.  Tải lên file `.zip` (hoặc import từ Chrome Web Store nếu đã có).

### Bước 3: Điền Thông Tin
Tương tự Chrome, nhưng Edge có thể yêu cầu ít hình ảnh bắt buộc hơn.

*   **Properties**: Chọn Category.
*   **Store Listings**: Description, Screenshots.
*   **Availability**: Chọn "All markets" hoặc chỉ "Vietnam/US".

### Bước 4: Submit
*   Nhấn **Publish**.
*   **Thời gian duyệt**: 1 - 7 ngày (thường chậm hơn Chrome một chút lần đầu).

---

## 4. Mẹo Để Duyệt Nhanh (Tips)

1.  **Permissions Tối Thiểu**: Chỉ xin quyền thật sự cần. (`activeTab` dễ duyệt hơn `host_permissions` `<all_urls>`).
2.  **Privacy Policy**: Nếu app có thu thập data (Google Analytics...), BẮT BUỘC phải có link Privacy Policy. Nếu không, viết rõ trong mô tả là "No data collection".
3.  **Video Demo**: Nên có 1 video YouTube ngắn (30s) demo cách tool hoạt động, link vào mục Store Listing. Reviewer sẽ xem cái này đầu tiên.
4.  **Test Account**: Nếu tool cần đăng nhập, hãy cung cấp user/pass test cho reviewer trong phần "Notes to Reviewer".
