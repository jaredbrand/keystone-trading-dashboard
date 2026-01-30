# Keystone+ Live Trading Dashboard - Setup Guide

## 🎯 What You're Building

A **live, real-time trading dashboard** that:
- Connects directly to your Google Sheets
- Auto-refreshes every 60 seconds
- Shows open trades, daily P&L, and comprehensive stats
- Works on any device with internet access
- Hosted on a free platform (Vercel or Netlify)

---

## 📋 Prerequisites

- Google account (you already have the sheet)
- GitHub account (free - create at github.com)
- 15-20 minutes for setup

---

## 🔧 STEP 1: Get Google Sheets API Key

### 1.1 Enable Google Sheets API

1. Go to: https://console.cloud.google.com/
2. Click **"Select a project"** → **"New Project"**
3. Name it: `keystone-trading-dashboard`
4. Click **"Create"**

### 1.2 Enable the API

1. In the search bar at top, search: **"Google Sheets API"**
2. Click on it, then click **"Enable"**

### 1.3 Create API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials"** → **"API Key"**
3. Copy your API key (looks like: `AIzaSyD...`)
4. Click **"Edit API Key"**
5. Under "API restrictions", select **"Restrict key"**
6. Check only: **"Google Sheets API"**
7. Click **"Save"**

**IMPORTANT:** Keep this API key safe! You'll need it in Step 3.

---

## 📊 STEP 2: Make Your Google Sheet Public

1. Open your sheet: https://docs.google.com/spreadsheets/d/1RBeguOmsBzvR2GO_Jm3JTT_QUsUgVc-TtOWxuR5ExsY/
2. Click **"Share"** (top right)
3. Click **"Change to anyone with the link"**
4. Make sure it's set to **"Viewer"** (not Editor)
5. Click **"Done"**

✅ This allows the dashboard to read (but not edit) your data.

---

## 💻 STEP 3: Set Up the Dashboard

### 3.1 Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `keystone-trading-dashboard`
3. Keep it **Public**
4. Click **"Create repository"**

### 3.2 Upload Dashboard Files

I've created all the necessary files for you. You'll need to upload:

**File 1: `package.json`**
```json
{
  "name": "keystone-trading-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

**File 2: `vite.config.js`**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**File 3: `index.html`**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Keystone+ Trading Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**File 4: `src/main.jsx`**
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**File 5: `src/index.css`**
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #0a0e1a;
}

#root {
  min-height: 100vh;
}
```

**File 6: `src/App.jsx`**
(This is the main dashboard file - copy the content from LiveDashboard.jsx I created)

### 3.3 Add Your API Key

In `src/App.jsx`, find this line (around line 24):
```javascript
const API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
```

Replace `YOUR_GOOGLE_API_KEY_HERE` with your actual API key from Step 1.3.

---

## 🚀 STEP 4: Deploy to Vercel (Free Hosting)

### 4.1 Create Vercel Account

1. Go to: https://vercel.com/signup
2. Sign up with your **GitHub** account
3. Authorize Vercel to access your repositories

### 4.2 Deploy Your Dashboard

1. Click **"Add New Project"**
2. Select **"Import Git Repository"**
3. Find and select `keystone-trading-dashboard`
4. Click **"Import"**
5. Framework Preset: **Vite**
6. Click **"Deploy"**

⏳ Wait 2-3 minutes for deployment...

### 4.3 Access Your Dashboard

Once deployed, Vercel will give you a URL like:
```
https://keystone-trading-dashboard.vercel.app
```

🎉 **Your dashboard is now LIVE!**

---

## 🔄 How Auto-Updates Work

- Dashboard automatically fetches data from your Google Sheet every **60 seconds**
- You can also manually refresh with the **⟳ REFRESH** button
- Just update your Google Sheet normally - the dashboard will sync automatically

---

## 📱 Access Your Dashboard

Your dashboard works on:
- Desktop computers
- Tablets
- Mobile phones
- Any device with a web browser

Just bookmark the Vercel URL!

---

## 🔒 Security Notes

✅ **What's Safe:**
- API key is restricted to only read Google Sheets
- Google Sheet is view-only (no one can edit it)
- Dashboard only displays data, can't modify it

⚠️ **Important:**
- Don't share your API key with anyone
- Don't commit it to public GitHub repos (use environment variables for production)

---

## 🛠️ Troubleshooting

### "Failed to fetch data"
- Check that your Google Sheet is set to "Anyone with link can view"
- Verify your API key is correct in `src/App.jsx`
- Make sure Google Sheets API is enabled in Google Cloud Console

### "Loading forever"
- Check browser console for errors (F12)
- Verify the Sheet ID in the code matches your actual sheet

### Data looks wrong
- Check that tab names match exactly: `bets_week_1`, `DailyPNL`, `SummaryStats`
- Ensure column headers in your sheet match expected format

---

## 🎨 Customization Options

Want to tweak the dashboard? Here are easy changes:

### Change refresh interval
In `src/App.jsx`, line ~70:
```javascript
}, 60000); // Change to 30000 for 30 seconds, 120000 for 2 minutes
```

### Change color scheme
Primary green color: `#00ff88`
Red (losses): `#ff3366`

Search for these hex codes in the file and replace them!

---

## 📞 Need Help?

If you run into issues:
1. Check the troubleshooting section above
2. Verify all steps were completed
3. Check browser console (F12) for error messages

---

## 🎯 What You Get

✅ Real-time data sync with Google Sheets
✅ Auto-refresh every 60 seconds
✅ View toggle (All, Bets, Daily P&L, Summary)
✅ Date range filtering (All Time, 30 Days, 7 Days)
✅ Open positions tracking
✅ Candlestick charts with volume bars
✅ Market performance breakdown
✅ Recent trades feed
✅ Comprehensive summary statistics
✅ Mobile-responsive design
✅ Professional hedge fund aesthetic

Your trading dashboard is now production-ready! 🚀
