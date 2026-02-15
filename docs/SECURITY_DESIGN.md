# Bảo Mật Password - NGUYÊN LÝ CORE

Tài liệu này định nghĩa các nguyên tắc bảo mật cốt lõi để xử lý dữ liệu nhạy cảm (Password, API Keys, Secrets) trong GrafosAI-Autofill extension.

---

## 🎯 4 Nguyên Tắc Bảo Mật Password

### 1. NEVER LOG PLAINTEXT
Nguyên lý: Browser console là nhật ký công khai (DevTools, Screen recording, Team shared logs).
- ❌ `console.log(`Password: ${value}`)` // Leak console
- ✅ `console.log(`Password: ***MASKED***`)`

### 2. NEVER STORE IN LOCALSTORAGE
Nguyên lý: LocalStorage là dữ liệu bền vững, có thể bị đồng bộ hoặc leak qua backup.
- ❌ `chrome.storage.local.set({password: value})`
- ✅ Chỉ lưu trong bộ nhớ tạm (Transient memory) → Xóa ngay sau khi điền.

### 3. DETECT AUTOMATIC → TREAT SPECIAL
Nguyên lý: Tự động bảo vệ dựa trên các tín hiệu thay vì chờ người dùng đánh dấu thủ công.
- `input[type="password"]`
- `name/id` chứa "pass", "pwd", "secret"...
- `data-password` attribute
- [SECURE]xpath (Manual override)

### 4. MASK EVERYWHERE (Zero-Trust)
Nguyên lý: Giả định mọi kênh truyền tin đều có thể bị lộ.
- Console: `***MASKED***`
- Network: `[REMOVED]`
- Storage: `[PASSWORD]`
- UI preview: `••••••••`
- Clipboard: `BLOCKED` (Trong ngữ cảnh của extension)

---

## 🛡️ Threat Model & Countermeasures

| Threat | Leak Vector | Countermeasure |
| :--- | :--- | :--- |
| **DevTools** | Console/DOM | Mask logs + transient memory |
| **Screen Record** | Video capture | Fill trực tiếp (Native setter) |
| **Network** | Message passing | Strip passwords trước khi gửi giữa các script |
| **Storage** | chrome.storage | Tuyệt đối không lưu password vào storage |
| **Clipboard** | Copy-paste | Chặn copy trên các trường password (tùy chọn) |
| **Backup** | Browser sync | Loại trừ dữ liệu nhạy cảm khỏi sync |
| **Memory Dump** | Heap dump | Ghi đè bộ nhớ (Overwrite) trước khi giải phóng |

---

## 🔄 Data Lifecycle Secure (Vòng đời dữ liệu)

1. **Input:** Lấy từ Sheet → Chỉ lưu trong biến tạm (Transient memory).
2. **Detect:** `isPasswordField()` → Đánh dấu xử lý đặc biệt.
3. **Fill:** Zero-knowledge fill → Sử dụng Native setter và xóa biến ngay sau đó.
4. **Log:** `safeLog()` → Luôn mask giá trị nhạy cảm.
5. **Forget:** `value = "0".repeat(len)` sau đó `value = null` → Tránh leak qua Memory dump.
6. **Storage:** Bỏ qua hoàn toàn trong tất cả các tiến trình lưu trữ.

---

## 🎨 User Experience (Bảo mật nhưng vẫn dễ dùng)

- **Console:** Người dùng biết tool đang làm gì nhưng không thấy dữ liệu.
  - `🔒 Password field detected: //input[@name='password']`
  - `✅ Secure fill completed (no plaintext)`
- **Popup Preview:**
  - `user: admin@example.com`
  - `password: [SECURE - MASKED]`
- **Variables Tab:**
  - `session: abc-xyz` (Biến thường OK)
  - `password: [PROTECTED]` (Không bao giờ hiển thị)

---

## ⚙️ Cấu Hình Bảo Mật (Proposed Config)

```javascript
security: {
  passwordMasking: true,        // Tự động nhận diện và mask
  passwordStorage: 'never',     // Không bao giờ lưu storage
  clipboardProtection: true,    // Chặn copy trên ô password
  suspiciousKeywords: ['pass', 'pwd', 'secret', 'token', 'key', 'auth'],
  memoryCleanup: true           // Ghi đè bộ nhớ sau khi dùng
}
```

---

## ⚠️ Giới Hạn (Limitations)

1. Không thể chống lại Keylogger ở cấp độ hệ điều hành (OS).
2. Không thể ngăn chặn các extension độc hại khác có quyền can thiệp sâu.
3. Dữ liệu trong file Excel/Google Sheet vẫn là trách nhiệm của người dùng.
4. Memory không được xóa hoàn toàn 100% cho đến khi Garbage Collector chạy (Dùng kỹ thuật Overwrite để giảm thiểu).

---

## 🚀 Triết Lý Thực Thi

1. **Proactive:** Chủ động nhận diện, không dựa dẫm vào người dùng.
2. **Zero-trust:** Giả định mọi thứ đều có thể bị leak.
3. **Transparent:** Người dùng nắm được trạng thái bảo mật của tool.
4. **Audit-ready:** Nhật ký rõ ràng nhưng an toàn cho việc kiểm toán.

> **Mục tiêu cuối cùng:** "Invisible security" - Bảo vệ tối đa mà không gây phiền hà cho quy trình làm việc của người dùng.
