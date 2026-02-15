# Hướng dẫn Tái sử dụng Công cụ Dự án

Tài liệu này cung cấp các đoạn code và quy trình chuẩn đã được tối ưu hóa cho dự án **GrafosAI-Autofill** để bạn có thể áp dụng nhanh vào các dự án Chrome Extension hoặc JavaScript tương tự.

## 1. Script tự động hóa Git (`git_sync.bat`)

Lưu đoạn code sau vào file `git_sync.bat` ở thư mục gốc của dự án. Script này giúp bạn đẩy code lên GitHub chỉ với 1 click hoặc 1 lệnh.

```batch
@echo off
setlocal enabledelayedexpansion

:: 0. Kiểm tra thư mục Git
if not exist .git (
    echo [ERROR] Day khong phai la thu muc Git!
    echo Vui long chay 'git init' truoc.
    pause
    exit /b
)

:: 1. Nhập message commit
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" (
    set /p "COMMIT_MSG=Nhap noi dung thay doi (Commit message): "
)

:: Nếu không nhập gì, tự lấy ngày giờ
if "%COMMIT_MSG%"=="" (
    set "COMMIT_MSG=Update: %date% %time%"
)

echo.
echo [1/3] Dang staging cac thay doi (git add .)...
git add .

echo [2/3] Dang commit voi noi dung: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

echo [3/3] Dang day code len server (git push)...
git push

echo.
echo === HOAN THANH SYNC ===
echo.

:: 4. Hoi ve viec tao Tag (Version)
set /p "CREATE_TAG=Ban co muon tao Tag (version) cho ban nay khong? (y/n): "
if /i "%CREATE_TAG%"=="y" (
    set /p "TAG_NAME=Nhap ten Tag (VD: v2.6.0): "
    if not "!TAG_NAME!"=="" (
        set /p "TAG_MSG=Nhap mo ta cho Tag: "
        echo Dang tao Tag !TAG_NAME!...
        git tag -a !TAG_NAME! -m "!TAG_MSG!"
        git push origin !TAG_NAME!
        echo === DA TAO TAG !TAG_NAME! ===
    ) else (
        echo [Bỏ qua] Khong nhap ten Tag.
    )
)

echo.
echo === TAT CA DA HOAN THANH ===
pause
```

## 2. Quản lý Phiên bản (Chrome Extension)

Với Chrome Extension, phiên bản được quản lý duy nhất tại file `manifest.json`. Để đồng bộ, hãy tuân thủ quy trình:

### Bước 1: Cập nhật `manifest.json`
Luôn thay đổi số phiên bản tại đây:
```json
{
  "version": "1.0.1",
  ...
}
```

### Bước 2: Đồng bộ tài liệu
Sau khi thay đổi trong manifest, hãy cập nhật thủ công tại:
- **README.md**: Dòng `**Version:** 1.0.1` ở ngay đầu file.
- **STATUS.md**: Cập nhật mục `Current Version`.

## 3. Cấu hình `.gitignore` cho Extension

Dưới đây là cấu hình `.gitignore` tối ưu cho các dự án Extension để tránh đẩy các file rác của AI, backup hoặc hệ thống lên GitHub:

```text
# OS files
.DS_Store
Thumbs.db
desktop.ini

# Backups & Temp files
*.backup
*.bak
*.tmp

# AI Agent & Workspace Data (Quan trọng)
.agent/
.gemini/
.antigravity/

# IDE settings
.vscode/
.idea/

# JavaScript dependencies (nếu có)
node_modules/
package-lock.json
```

## 4. Quy trình Đóng gói (Load Unpacked)
Khi chia sẻ hoặc tái sử dụng ở máy khác:
1. Tải code về máy.
2. Vào `chrome://extensions/`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked** và trỏ đúng vào thư mục chứa file `manifest.json`.
