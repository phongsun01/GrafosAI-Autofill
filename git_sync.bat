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
echo === HOAN THANH ===
pause
