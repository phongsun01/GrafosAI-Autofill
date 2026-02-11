@echo off
setlocal enabledelayedexpansion

:: 0. Check if this is a Git repository
if not exist .git (
    echo [ERROR] Day khong phai la thu muc Git!
    echo Vui long chay 'git init' truoc.
    pause
    exit /b
)

:: 1. Nhập message commit (nếu không có tham số)
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" (
    set /p "COMMIT_MSG=Nhap noi dung thay doi (Commit message): "
)

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
