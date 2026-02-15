#!/bin/bash

# 0. Check if this is a Git repository
if [ ! -d ".git" ]; then
    echo "[ERROR] Day khong phai la thu muc Git!"
    echo "Vui long chay 'git init' truoc."
    exit 1
fi

# 1. Nhập message commit (nếu không có tham số)
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
    read -p "Nhap noi dung thay doi (Commit message): " COMMIT_MSG
fi

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update: $(date)"
fi

echo ""
echo "[1/3] Dang staging cac thay doi (git add .)..."
git add .

echo "[2/3] Dang commit voi noi dung: \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"

echo "[3/3] Dang day code len server (git push)..."
git push

echo ""
echo "=== HOAN THANH SYNC ==="
echo ""

# 4. Hoi ve viec tao Tag (Version)
read -p "Ban co muon tao Tag (version) cho ban nay khong? (y/n): " CREATE_TAG
if [[ "$CREATE_TAG" =~ ^[Yy]$ ]]; then
    read -p "Nhap ten Tag (VD: v2.6.0): " TAG_NAME
    if [ -n "$TAG_NAME" ]; then
        read -p "Nhap mo ta cho Tag: " TAG_MSG
        echo "Dang tao Tag $TAG_NAME..."
        git tag -a "$TAG_NAME" -m "$TAG_MSG"
        git push origin "$TAG_NAME"
        echo "=== DA TAO TAG $TAG_NAME ==="
    else
        echo "[Bo qua] Khong nhap ten Tag."
    fi
fi

echo ""
echo "=== TAT CA DA HOAN THANH ==="
read -p "Nhan Enter de thoat..."
