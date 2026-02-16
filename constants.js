// MODULE: Constants
window.ERRORS = {
    NO_ROWS: "Không có dòng nào để chạy!",
    NO_DATA: "⚠️ Dữ liệu chưa tải xong! (Vui lòng kiểm tra lại Link/GID)",
    NO_PROCESS: "Lỗi: Quy trình không tồn tại (Có thể đã bị xóa)!",
    EMPTY_QUEUE: "Lỗi: Hàng đợi rỗng (Dữ liệu lỗi hoặc file rỗng).",
    NO_TAB: "Không tìm thấy Tab mục tiêu để chạy!",
    INVALID_LINK: "Link Google Sheet không hợp lệ.",
    NO_SHEET_ID: "Không tìm thấy ID Sheet trong link.",
    MISSING_LIB: "Thiếu thư viện PapaParse!",
    PRIVATE_403: "Lỗi 403: Sheet bị khóa. Hãy chia sẻ 'Anyone with the link'.",
    PRIVATE_HTML: "Lỗi: Sheet đang ở chế độ Riêng tư (Private). Vui lòng mở quyền truy cập.",
    RANGE_INVALID: "Định dạng phạm vi sai! Chỉ nhập số, dấu phẩy (,) và gạch ngang (-).",
    MISSING_MODULES: "Lỗi: Không tìm thấy module. Hãy kiểm tra file utils.js và data-manager.js"
};

window.TIMEOUTS = {
    POLL_INTERVAL: 2000,
    RETRY_BASE: 500
};

window.RETRY_CONFIG = {
    MAX_RETRIES: 3
};