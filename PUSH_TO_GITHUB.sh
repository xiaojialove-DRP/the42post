#!/bin/bash

# =====================================
# Skill Forging Methodology - GitHub推送脚本
# =====================================

echo "🚀 准备推送到GitHub..."
echo ""

# 检查git状态
echo "📋 检查git状态..."
git status
echo ""

# 设置用户名和邮箱（如果需要）
echo "⚙️  配置git..."
git config user.name "Skill Forging Contributors" || true
git config user.email "contributors@skill-forging.dev" || true

# 验证remote是否存在
echo ""
echo "🔍 检查GitHub Remote..."
if git remote get-url origin &> /dev/null; then
    echo "✅ Remote已配置："
    git remote -v
else
    echo "❌ Remote未配置，请先执行："
    echo "   git remote add origin https://github.com/YOUR_USERNAME/skill-forging-methodology.git"
    exit 1
fi

# 最后一次检查
echo ""
echo "📦 最终提交检查..."
echo "总提交数："
git rev-list --count HEAD
echo ""
echo "最近5个提交："
git log --oneline -5
echo ""

# 推送
echo ""
echo "🚀 开始推送到GitHub..."
echo ""

git push -u origin main

echo ""
echo "✅ 推送完成！"
echo ""
echo "🎉 下一步："
echo "   1. 进入 https://github.com/YOUR_USERNAME/skill-forging-methodology"
echo "   2. 在Settings中配置Repository信息"
echo "   3. 添加Description和Topics"
echo "   4. 启用Discussions"
echo ""
echo "📢 然后分享到社交媒体！"
