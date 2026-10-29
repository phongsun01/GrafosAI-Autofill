# GrafosAI - Sheet Automator Pro 🚀

![Version](https://img.shields.io/badge/version-4.0.1-blue?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)

**[English](#english)** | **[Tiếng Việt](#vietnamese)**

---

<a name="english"></a>
## 🇬🇧 English

### Introduction
**GrafosAI - Sheet Automator Pro** is a high-performance Chrome Extension that automates web form filling directly from Google Sheets. Featuring a modern **Popup & Side Panel dual mode**, background execution via Service Worker, resilient XPath sanitization, and AI-powered selector generation.

### ✨ Key Features
- **Smart Autofill**: Automatically detects and fills Inputs, Selects, Checkboxes, Radios, Angular / Ng-Zorro custom date pickers, and Textareas.
- **Dual UI Mode**: Toggle seamlessly between quick Popup and permanent Side Panel without interrupting page interactions.
- **Background Processing**: Runs automation smoothly in the Service Worker without freezing your cursor or browser tabs.
- **AI XPath Generator**: Integrated with Google Gemini AI to analyze form structures and suggest selectors (with user confirmation before sending).
- **Dynamic Variables**: Extract page content (`extract`) and reuse it downstream (`${var}`).
- **Logic & Flow Control**: Supports conditional branching (`if`/`else`), retry logic, custom delays, and auto login (`checklogin`).
- **Privacy & Local Hardening**: Zero external telemetry or third-party web font calls. Sensitive variables and API keys are obfuscated at rest with AES-GCM in local storage.

### 🛠️ Installation (Developer Mode)
1. Download or Clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked**.
5. Select the folder containing this extension.
6. Pin the extension to your toolbar.

### 📖 Usage Guide

#### 1. Setup Google Sheet
Structure your Google Sheet with the exact 3-tier hierarchy:
* **Row 1 (Commands / XPath)**: Automation commands or XPath expressions (e.g. `fill(//*[@id="name"])`, `click(...)`, `delay(1000)`).
* **Row 2 (Labels / Headers)**: Human-readable column names (e.g. Full Name, Email, Phone Number). The extension skips executing this row and displays it as the table header in Batch mode.
* **Row 3+ (Data)**: The actual data records to be filled into the target web forms.

> ⚠️ **Google Sheets Privacy Warning**: The extension reads sheet data via Google's CSV export endpoint, which requires the sheet link to be set to *"Anyone with the link can view"*. **Never store sensitive passwords, confidential personal data, or payment information on publicly accessible Google Sheets.**

#### 2. Command Reference
Place these commands in **Row 1** of your Google Sheet.

| Command | Description | Example |
| :--- | :--- | :--- |
| `click(xpath)` | Clicks a target element. | `click(//*[@id="submit"])` |
| `fill(xpath, value)` | Fills input field. If `value` is omitted, uses the current data cell. | `fill(//*[@id="name"])` |
| `extract(xpath, varName)` | Extracts text from an element into a variable. | `extract(//*[@id="order-id"], {var:orderId})` |
| `delay(ms)` | Pauses execution for a specified duration in milliseconds. | `delay(2000)` |
| `waitfor(xpath, sec, visible)` | Waits up to `sec` seconds for element presence. | `waitfor(//*[@id="alert"], 10, visible)` |
| `if(xpath, {cols})` | Runs specific columns only if element exists on page. | `if(//*[@id="popup"], {K,L})` |
| `url(link)` | Navigates the active tab to a URL. | `url(https://example.com)` |

### 🤖 AI Form Detection & Variables
* **AI Integration**: In the **AI** tab, enter your Gemini API Key and Prompt Sheet URL/GID. Clicking **Scan Form** will show a privacy confirmation prompt before sending form tag metadata (passwords and sensitive values are excluded) to the Gemini API.
* **Variables**: Use `${variableName}` to reference extracted values. Manage and delete stored variables in the **Variables** tab.

---

<br>

<a name="vietnamese"></a>
## 🇻🇳 Tiếng Việt

### Giới thiệu
**GrafosAI - Sheet Automator Pro** là tiện ích mở rộng Chrome chuyên nghiệp giúp tự động hóa việc điền biểu mẫu (Form Filling) trên mọi trang web trực tiếp từ Google Sheets. Sở hữu giao diện kép **Popup & Side Panel**, chạy nền qua Service Worker, bộ lọc XPath hỗ trợ tiếng Việt có dấu, và AI tạo bộ chọn thông minh.

### ✨ Tính năng nổi bật
- **Điền form thông minh**: Nhận diện và điền tự động Input, Select, Checkbox, Radio, Angular / Ng-Zorro date picker và Textarea.
- **Chế độ hiển thị kép (Dual Mode)**: Chuyển đổi linh hoạt giữa Popup cửa sổ nhỏ và Side Panel ghim bên hông màn hình.
- **Chạy nền (Background Processing)**: Toàn bộ quá trình điền form diễn ra trong Service Worker, không chiếm chuột hay đơ giao diện.
- **AI XPath Generator**: Kết nối Gemini AI quét cấu trúc form và tự sinh XPath (kèm cảnh báo xác nhận của người dùng).
- **Hệ thống biến động (Variables)**: Bóc tách dữ liệu từ web (`extract`) và tái sử dụng linh hoạt (`${var}`).
- **Hỗ trợ logic & rẽ nhánh**: Đầy đủ lệnh điều kiện `if`/`else`, tự động đăng nhập lại `checklogin`, điều hướng URL.
- **Bảo mật & Quyền riêng tư**: 100% offline, không gửi telemetry ra ngoài, không tải font bên ngoài. Dữ liệu nhạy cảm được che giấu cục bộ (AES-GCM Local Obfuscation).

### 🛠️ Cài đặt (Chế độ Nhà phát triển)
1. Tải xuống hoặc Clone mã nguồn về máy.
2. Mở Chrome và truy cập `chrome://extensions/`.
3. Bật **Developer mode** (góc trên bên phải).
4. Nhấn **Load unpacked** (Tải tiện ích đã giải nén).
5. Chọn thư mục dự án `GrafosAI-Autofill`.
6. Ghim extension lên thanh công cụ để sử dụng.

### 📖 Hướng dẫn cấu trúc Google Sheet chuẩn

Để tiện ích chạy chính xác, Google Sheet cần được thiết lập theo cấu trúc 3 tầng:
* **Dòng 1 (Lệnh / XPath)**: Chứa lệnh thực thi hoặc XPath cho từng cột (VD: `fill(//*[@id="ten"])`, `click(...)`, `delay(1500)`).
* **Dòng 2 (Tiêu đề gợi nhớ)**: Tên cột cho người dùng dễ đọc (VD: Họ tên, Email, Số điện thoại). Tiện ích sẽ bỏ qua không thực thi dòng này và dùng làm tiêu đề hiển thị trên bảng Batch.
* **Dòng 3 trở đi (Dữ liệu)**: Chứa các dòng dữ liệu thực tế cần điền.

> ⚠️ **Cảnh báo bảo mật dữ liệu trên Google Sheets**: Tiện ích đọc dữ liệu qua cổng export CSV trực tiếp của Google Sheet (yêu cầu quyền chia sẻ *"Bất kỳ ai có đường liên kết đều có thể xem"*). **Tuyệt đối không lưu trữ mật khẩu, thông tin CCCD/CMND, số tài khoản ngân hàng hoặc bí mật kinh doanh trên các Google Sheet chia sẻ công khai.**

### 📋 Bảng tra cứu lệnh thông dụng (Dòng 1)

| Lệnh | Ý nghĩa | Ví dụ |
| :--- | :--- | :--- |
| `click(xpath)` | Click vào phần tử trên web. | `click(//*[@id="btn-submit"])` |
| `fill(xpath, value)` | Điền dữ liệu vào ô. Nếu bỏ trống `value`, sẽ lấy dữ liệu tại dòng tương ứng. | `fill(//*[@id="ho-ten"])` |
| `extract(xpath, varName)` | Trích xuất nội dung text lưu vào biến. | `extract(//*[@id="ma-don"], {var:maDon})` |
| `delay(ms)` | Tạm dừng luồng điền (mili-giây). | `delay(2000)` (Chờ 2 giây) |
| `waitfor(xpath, sec, visible)` | Chờ phần tử xuất hiện tối đa `sec` giây. | `waitfor(//*[@id="modal-success"], 10, visible)` |
| `if(xpath, {cols})` | Chỉ điền các cột chỉ định nếu phần tử tồn tại. | `if(//*[@id="chk-confirm"], {D,E})` |
| `url(link)` | Điều hướng tab hiện tại đến địa chỉ web mới. | `url(https://example.com)` |

### 🤖 AI Form Scanner & Quản lý Biến
* **Quét Form AI**: Tại tab **AI**, cấu hình Gemini API Key và GID sheet prompt. Khi nhấn **Scan Form**, một thông báo cảnh báo sẽ xuất hiện để bạn xác nhận trước khi cấu trúc form (đã loại bỏ các trường nhạy cảm như password) được gửi tới Google Gemini API.
* **Quản lý biến**: Biến đã trích xuất được quản lý trong tab **Variables**, các biến có tên nhạy cảm được che giấu tự động bằng dấu `••••••••`.

---

## 🔒 Chính sách bảo mật & Quyền riêng tư (Privacy Policy)
* **Không thu thập dữ liệu**: Tiện ích không có máy chủ theo dõi, không thu thập lịch sử duyệt web hay dữ liệu cá nhân.
* **Lưu trữ cục bộ**: Mọi thiết lập, biến và API key chỉ lưu tại thiết bị người dùng (`chrome.storage.local`).
* **Mã hóa che giấu (Obfuscation at rest)**: Dữ liệu nhạy cảm được mã hóa cục bộ bằng chuẩn AES-GCM nhằm chống đọc trộm dữ liệu thô từ file profile.

## 📄 License
Phát hành theo giấy phép **MIT License**.
