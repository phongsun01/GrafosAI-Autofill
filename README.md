# GrafosAI - Sheet Automator Pro 🚀

![Version](https://img.shields.io/badge/version-3.1.0-blue?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)

**[English](#english)** | **[Tiếng Việt](#vietnamese)**

---

<a name="english"></a>
## 🇬🇧 English

### Introduction
**GrafosAI - Sheet Automator Pro** is a powerful Chrome Extension that automates form filling on any website using data directly from Google Sheets. Built with a modern **AI-Native** interface, it supports background processing, complex logic (if/else), and AI-powered selector generation.

### ✨ Key Features
- **Smart Autofill**: Automatically fills Inputs, Selects, Checkboxes, Radios, and handles complex Textareas.
- **Background Processing**: Runs tasks in the background (Service Worker), allowing you to work on other tabs while the automation runs.
- **AI XPath Generator**: deeply integrated with Gemini AI to scan forms and generate robust XPaths automatically.
- **Dynamic Variables**: Extract data from the web (`extract`) and reuse it in subsequent steps (`${var}`).
- **Logic & Control Flow**: Support for `if`, `else`, `wait`, `checklogin`, and URL navigation logic.
- **Modern UI**: Dark Mode support, standardized controls, and a smooth user experience.
- **Secure**: Sensitive data (API Keys) is stored locally and never transmitted to external servers (except directly to Gemini AI for processing).

### 🛠️ Installation (Developer Mode)
1.  Download or Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the folder containing this extension.
6.  Pin the extension to your toolbar for easy access.

### 📖 Usage Guide

#### 1. Setup Google Sheet
Create a Google Sheet with the following structure:
*   **Row 1 (Header)**: Contains generic names (e.g., Name, Email, Phone).
*   **Row 2 (Commands)**: Contains the automation commands/logic for each column.
*   **Row 3+ (Data)**: The actual data to be filled.

#### 2. Command Reference
Place these commands in the **Header Row (Row 2)** of your sheet.

| Command | Description | Example |
| :--- | :--- | :--- |
| `click(xpath)` | Clicks an element. | `click(//*[@id="submit"])` |
| `fill(xpath, value)` | Fills an input. If `value` is omitted, uses the cell data. | `fill(//*[@id="name"])` |
| `extract(xpath, varName)` | Extracts text from an element into a variable. | `extract(//*[@id="ord-id"], {var:orderId})` |
| `delay(ms)` | Waits for a specific time. | `delay(2000)` |
| `waitfor(xpath, sec, visible)` | Waits for an element to appear. | `waitfor(//*[@id="alert"], 10, visible)` |
| `if(xpath, {cols})` | Runs specific columns only if element exists. | `if(//*[@id="popup"], {K,L})` |
| `url(link)` | Navigates to a URL. | `url(https://example.com)` |

### 🤖 AI & Variables
*   **AI Integration**: Go to the **AI** tab in the extension, enter your Gemini API Key and Prompt Sheet ID. Click **Scan Form** to generate automation commands instantly.
*   **Variables**: Use `${variableName}` to insert dynamic data. Manage active variables in the **Variables** tab.

---

<br>

<a name="vietnamese"></a>
## 🇻🇳 Tiếng Việt

### Giới thiệu
**GrafosAI - Sheet Automator Pro** là tiện ích mở rộng Chrome giúp tự động hóa việc điền biểu mẫu (Form Filling) trên bất kỳ trang web nào, sử dụng dữ liệu trực tiếp từ Google Sheets. Được thiết kế với giao diện **AI-Native** hiện đại, công cụ hỗ trợ chạy ngầm, xử lý logic phức tạp, và tích hợp AI để tạo XPath thông minh.

### ✨ Tính năng nổi bật
- **Điền form thông minh**: Tự động nhận diện và điền Input, Select, Checkbox, Radio, Textarea.
- **Chạy nền (Background Mode)**: Automation chạy trong Service Worker, không chiếm chuột, cho phép bạn làm việc khác song song.
- **AI XPath Generator**: Tích hợp Google Gemini để quét form và tạo lệnh tự động chỉ với 1 click.
- **Biến động (Variables)**: Trích xuất dữ liệu từ web (`extract`) và sử dụng lại (`${var}`) ở các bước sau.
- **Logic điều khiển**: Hỗ trợ đầy đủ `if`, `else`, `checklogin` (tự đăng nhập lại), điều hướng URL.
- **Giao diện hiện đại**: Hỗ trợ Dark Mode, thiết kế tối ưu trải nghiệm người dùng (UX).
- **Bảo mật**: Dữ liệu và API Key chỉ lưu cục bộ (Local Storage), an toàn tuyệt đối.

### 🛠️ Cài đặt (Chế độ Nhà phát triển)
1.  Tải xuống hoặc Clone kho lưu trữ này về máy.
2.  Mở Chrome và truy cập địa chỉ `chrome://extensions/`.
3.  Bật chế độ **Developer mode** (công tắc góc trên bên phải).
4.  Nhấn nút **Load unpacked** (Tải tiện ích đã giải nén).
5.  Chọn thư mục chứa mã nguồn extension.
6.  Ghim tiện ích lên thanh công cụ để sử dụng.

### 📖 Hướng dẫn sử dụng

#### 1. Cấu hình Google Sheet
Tạo một Google Sheet với cấu trúc sau:
*   **Dòng 1 (Tiêu đề)**: Tên gợi nhớ (VD: Họ tên, Email, SĐT).
*   **Dòng 2 (Lệnh - Command)**: Chứa lệnh thực thi cho cột đó.
*   **Dòng 3+ (Dữ liệu)**: Dữ liệu thực tế sẽ được điền vào web.

#### 2. Danh sách lệnh (Command Reference)
Điền các lệnh này vào **Dòng 2 (Header)** của Sheet.

| Lệnh | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| `click(xpath)` | Click vào phần tử trên web. | `click(//*[@id="btn-gui"])` |
| `fill(xpath, value)` | Điền dữ liệu. Nếu bỏ qua `value`, sẽ dùng dữ liệu trong ô. | `fill(//*[@id="ten"])` |
| `extract(xpath, varName)` | Lấy nội dung text trên web lưu vào biến. | `extract(//*[@id="ma-don"], {var:maDon})` |
| `delay(ms)` | Chờ một khoảng thời gian (mili-giây). | `delay(2000)` (Chờ 2s) |
| `waitfor(xpath, sec, visible)` | Chờ phần tử xuất hiện. | `waitfor(//*[@id="thong-bao"], 10, visible)` |
| `if(xpath, {cols})` | Chỉ chạy các cột chỉ định nếu phần tử tồn tại. | `if(//*[@id="quang-cao"], {K,L})` |
| `url(link)` | Điều hướng đến trang web. | `url(https://example.com)` |

### 🤖 AI & Biến Hệ Thống
*   **Tích hợp AI**: Truy cập tab **AI** trong extension, nhập Gemini API Key và GID của Sheet chứa Prompt. Nhấn **Scan Form** để AI tự động tạo lệnh cho bạn.
*   **Hệ thống Biến**: Sử dụng cú pháp `${tenBien}` để điền dữ liệu động. Quản lý, xem và xóa biến tại tab **Variables**.

---

## 🔒 Privacy Policy (Chính sách quyền riêng tư)
*   **Data Collection**: This extension **does not** collect user data, browsing history, or personal information.
*   **Storage**: All settings and profiles are stored locally on your device via Chrome Storage API.
*   **Google Sheets**: We access your Google Sheets only to read data for automation purposes accurately triggered by you.
*   **AI**: Data sent to Gemini AI is transient and strictly for the purpose of generating automation selectors.

## 🤝 Contributing
Contributions are welcome! Please submit a Pull Request or create an Issue if you find any bugs.

## 📄 License
This project is licensed under the **MIT License**.
