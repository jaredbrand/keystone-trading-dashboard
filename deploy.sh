#!/bin/bash

# Keystone+ Trading Dashboard - Quick Deployment Script
# This script helps automate the setup process

echo "🚀 Keystone+ Trading Dashboard - Quick Setup"
echo "============================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first:"
    echo "   https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git found"
echo ""

# Prompt for API key
echo "📋 Step 1: Google Sheets API Key"
echo "-----------------------------------"
echo "Please enter your Google Sheets API Key:"
echo "(Get it from: https://console.cloud.google.com/apis/credentials)"
read -p "API Key: " API_KEY

if [ -z "$API_KEY" ]; then
    echo "❌ API Key cannot be empty"
    exit 1
fi

# Update the API key in App.jsx
echo ""
echo "📝 Updating API key in App.jsx..."
sed -i "s/YOUR_GOOGLE_API_KEY_HERE/$API_KEY/g" src/App.jsx
echo "✅ API key updated"

# Initialize git repository
echo ""
echo "📦 Step 2: Initializing Git Repository"
echo "---------------------------------------"
git init
git add .
git commit -m "Initial commit: Keystone+ Trading Dashboard"
echo "✅ Git repository initialized"

# Prompt for GitHub
echo ""
echo "🌐 Step 3: GitHub Repository Setup"
echo "-----------------------------------"
echo "Create a new repository on GitHub:"
echo "1. Go to: https://github.com/new"
echo "2. Name: keystone-trading-dashboard"
echo "3. Keep it Public"
echo "4. Do NOT initialize with README"
echo "5. Click 'Create repository'"
echo ""
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/keystone-trading-dashboard.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Repository URL cannot be empty"
    exit 1
fi

git remote add origin $REPO_URL
git branch -M main
git push -u origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""

echo "🚀 Step 4: Deploy to Vercel"
echo "----------------------------"
echo "1. Go to: https://vercel.com/new"
echo "2. Import your GitHub repository: keystone-trading-dashboard"
echo "3. Framework Preset: Vite"
echo "4. Click 'Deploy'"
echo ""
echo "⏳ Wait 2-3 minutes for deployment..."
echo ""
echo "✅ Setup complete! Your dashboard will be live at:"
echo "   https://keystone-trading-dashboard.vercel.app"
echo ""
echo "📖 For detailed instructions, see SETUP_GUIDE.md"
