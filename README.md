# GrafosAI-Autofill (Background Runner)

**Version:** 5.6  
**Manifest:** V3  

## Giới thiệu
Extension Chrome giúp tự động điền biểu mẫu (Form Filling) dựa trên dữ liệu từ Google Sheets. Hỗ trợ chạy ngầm (Background Service Worker), xử lý hàng đợi (Queue) và tương tác với các giao diện web phức tạp (Angular, Ant Design).

## Cấu Trúc Dự Án

- **manifest.json**: Cấu hình Extension (Permissions: `activeTab`, `scripting`, `storage`).
- **popup.html / popup.js**: Giao diện người dùng.
  - Quản lý Profile & Quy trình.
  - Tab "Run": Chạy tự động theo range.
  - Tab "Batch": Chạy theo danh sách chọn lọc.
  - Tab "Variables": Quản lý biến động (Xem, Xóa, Export).
  - Tab "Config": Cấu hình liên kết Google Sheet.
- **background.js**: Service Worker.
  - Quản lý Application State (Queue, Status).
  - Giữ kết nối và điều phối tiến trình chạy dòng tiếp theo.
- **content.js**: Script thực thi trên trang target.
  - Logic tìm phần tử thông minh (`scanAndClickByText`, `getElementByXPath`).
  - Điền dữ liệu và trigger events.
- **data-manager.js**: Module xử lý CSV và tải dữ liệu từ Google Sheet.
- **variables-manager.js**: Module quản lý biến hệ thống (ES Module).
- **utils.js**: Các hàm tiện ích (Retry mechanism, Storage check).

## Cài đặt & Sử dụng (Developer)

1. Mở Chrome, truy cập `chrome://extensions/`.
2. Bật **Developer mode** (Góc phải trên).
3. Chọn **Load unpacked** và trỏ đến thư mục này.
4. Pin Extension lên thanh công cụ.

## Tính năng chính
- **Smart Filling**: Hỗ trợ điền Input, Select, Checkbox, Radio.
- **Commands**: Hỗ trợ lệnh trong Sheet như `Click(xpath)`, `Delay(ms)`, `Pause`.
- **Batch Processing**: Xử lý hàng loạt dòng dữ liệu liên tục.
- **Dynamic Variables**: Trích xuất dữ liệu từ web và dùng lại cho các bước sau.
- **Resume Capability**: Tự động phát hiện và xử lý khi Tab bị reload hoặc đóng.

---

# Hướng Dẫn Sử Dụng Lệnh (Command Reference)

Dưới đây là danh sách đầy đủ các lệnh bạn có thể sử dụng trong dòng tiêu đề (Header) của Google Sheet. Các lệnh có thể được nối với nhau bằng `&&`.

### 1. Lệnh Cơ Bản (Basic Commands)

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `click(xpath)` | Click vào phần tử được xác định bởi XPath. | `click(//*[@id="submit"])` |
| `delay(ms)` | Chờ một khoảng thời gian (mili-giây). | `delay(2000)` (Chờ 2 giây) |
| `pause` / `tạm dừng` | Tạm dừng chạy tại dòng hiện tại. Extension sẽ hiện thông báo và chờ bạn bấm "Resume". | `pause` |
| `disable:` | Vô hiệu hóa cột này (Extension sẽ bỏ qua). | `disable: click(...)` |
| `fill(xpath, value)` | Điền giá trị cố định hoặc biến động vào phần tử. | `fill(//*[@id="name"], ${var})` |
| `xpath` (mặc định) | Nếu không có lệnh nào, Extension sẽ hiểu chuỗi là XPath của ô input cần điền dữ liệu. | `//*[@id="username"]` |

### 2. Lệnh Chờ Nâng Cao (Advanced Wait)

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `wait(seconds)` | Chờ số giây cố định hoặc ngẫu nhiên. | `wait(5)` hoặc `wait(2-5)` (ngẫu nhiên 2-5s) |
| `waitfor(xpath, time, visible)` | Chờ phần tử xuất hiện trong DOM. | `waitfor(//*[@id="alert"], 10, visible)` |
| `waiturl(pattern, time, regex)` | Chờ URL thay đổi khớp với pattern. | `waiturl(success.html, 15)` |

### 3. Lệnh Điều Kiện & Logic (Logic Control)

Nhóm lệnh này giúp bạn xử lý các tình huống động trên trang web.

#### 3.1. `if` - Kiểm tra phần tử tồn tại
Nếu phần tử `xpath` xuất hiện trên trang, Extension sẽ chạy các lệnh nằm ở cột khác.

- **Cú pháp:** `if(xpath_check, {columns_to_run})`
- **Ví dụ:** Tắt popup quảng cáo nếu nó hiện ra.
  - Cột hiện tại: `if(//*[@id="popup-close"], {K})`
  - Cột K: `click(//*[@id="popup-close"])`

#### 3.2. `if...else` - Rẽ nhánh
Giống `if`, nhưng nếu KHÔNG tìm thấy phần tử, nó sẽ chạy các cột ở nhánh `else`.

- **Cú pháp:** `if(xpath_check, {true_cols}) else {false_cols}`
- **Ví dụ:** `if(//*[@id="new-layout"], {N,O}) else {P}`

#### 3.3. `checklogin` - Tự động đăng nhập
Giúp script không bị gãy khi đang chạy mà bị logout.

- **Cú pháp:** `checklogin(loggedInXpath, loginUrl, loginCols, targetUrl)`
- **Ví dụ:** `checklogin(//*[@id="avatar"], https://web.com/login, {A,B}, https://web.com/dashboard)`

#### 3.4. `url` - Điều hướng thông minh
Dùng để vào trang đích, nhưng hỗ trợ chạy các bước "chuẩn bị" (Pre-link) nếu cần.

- **Cú pháp:** `url(target_url, pre_url, {setup_cols})`

#### 3.5. `??` - Chọn XPath theo dữ liệu
Dùng cho trường hợp 1 ô Excel quyết định chọn phần tử nào (VD: Chọn giới tính Nam/Nữ).

- **Cú pháp:** `xpath_TRUE ?? xpath_FALSE`
- **Ví dụ:** `//*[@id="male"] ?? //*[@id="female"]` (Excel nhập "Nam" hoặc "true" sẽ chọn cái đầu).

### 4. Lệnh Logic Nâng Cao (Advanced IF)

Cú pháp: `if(xpath, source_val, operator, target_val, {columns})`

- **operator**: `==`, `!=`, `contains`, `regex`, `exists`.
- **Ví dụ:** `if(//*[@id="status"], text, ==, Complete, {F})`

---

### 5. Biến Hệ Thống & Trích Xuất Dữ Liệu (Variable System)

Hệ thống cho phép bạn lưu trữ dữ liệu từ trang web và sử dụng lại ở các bước sau hoặc dòng sau.

#### 5.1. Variables Hệ Thống
Extension cung cấp sẵn các biến tự động:
- `{n}`: Số thứ tự (Sequence Number) của lần chạy hiện tại.
- `{i}`: Số thứ tự dòng trong Google Sheet (Row Index).
- Phép toán (chỉ hỗ trợ cộng/trừ đơn giản): `{n+1}`, `{n-1}`, `{i+1}`...
- **Ví dụ dùng trong XPath:** `//*[@id="item-{n}"]` -> Khi chạy dòng 1 sẽ thành `item-1`.

#### 5.2. Trích Xuất Dữ Liệu (Extract)
Lưu giá trị text hoặc value của một phần tử vào biến toàn cục.

- **Cú pháp:** `extract(xpath, {var:varName})`
- **Tham số:**
  - `xpath`: Đường dẫn phần tử cần lấy dữ liệu.
  - `varName`: Tên biến muốn lưu (viết liền, không dấu).
- **Ví dụ:** `extract(//*[@id="order-id"], {var:orderId})`
  -> Extension sẽ tìm phần tử `#order-id`, lấy text (VD: "ORD-123") và lưu vào biến `orderId`.

#### 5.3. Sử Dụng Biến (Substitution)
Sử dụng giá trị đã lưu trong bất kỳ lệnh nào khác bằng cú pháp `${varName}`.

- **Cú pháp:** `${varName}`
- **Ví dụ:**
  - Điền vào ô tìm kiếm: `fill(//*[@id="search"], ${orderId})`
  - Tạo URL động: `url(https://myshop.com/admin/orders/${orderId}, ...)`
  - So sánh điều kiện: `if(..., ${expectedStatus}, ==, ${currentStatus}, {X})`

#### 5.4. Quản Lý Biến (Variables Tab)
Tại popup extension, tab **"Variables"** cho phép bạn:
- **Xem danh sách:** Các biến đang active và giá trị hiện tại.
- **Xóa:** Xóa từng biến hoặc xóa tất cả (Clear All).
- **Export JSON:** Xuất danh sách biến ra file để backup hoặc debug.

⚠️ **Lưu ý:** Biến được lưu trong bộ nhớ background. Nếu bạn Reload extension hoặc trình duyệt, biến sẽ mất (trừ khi dùng module Persistence trong tương lai).

---

### 6. Cấu Hình (Config)

Đặt lệnh này ở bất kỳ đâu để thay đổi cài đặt cho dòng đó.
- `config(error:stop)`: Dừng nếu lỗi (Mặc định).
- `config(error:skip)`: Bỏ qua lỗi và chạy tiếp.
- `config(error:pause)`: Tạm dừng nếu lỗi.
- `config(retry:3)`: Thử lại 3 lần nếu lệnh thất bại.

**Ví dụ:** `config(error:skip, retry:5)`

---
**Mẹo:** Để lấy XPath chính xác, hãy dùng tính năng **XPath Picker** (Tab "XPath 🎯" trong Popup) hoặc click phải vào phần tử -> Inspect -> Copy XPath.
