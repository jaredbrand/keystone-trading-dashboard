# Keystone+ Live Trading Dashboard 📊

A sophisticated, real-time trading dashboard that connects directly to your Google Sheets data. Built with React and featuring a professional hedge fund aesthetic inspired by TV shows like Billions.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.2-blue)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)

## 🌟 Features

- **Real-Time Data Sync** - Automatically pulls data from Google Sheets every 60 seconds
- **Multiple Views** - Toggle between All, Bets, Daily P&L, and Summary views
- **Date Filtering** - View performance over All Time, 30 Days, or 7 Days
- **Open Positions** - Track pending trades that haven't been settled
- **Candlestick Charts** - Professional P&L visualization with volume bars
- **Market Analytics** - Performance breakdown by bet type (Handicap, Total, Moneyline, etc.)
- **Mobile Responsive** - Works perfectly on desktop, tablet, and mobile
- **Auto-Refresh** - Manual refresh button + automatic 60-second updates
- **Professional UI** - Dark theme with glowing accents and sophisticated typography

## 🚀 Quick Start

### Prerequisites

- Google account with access to your trading spreadsheet
- GitHub account (free)
- 15-20 minutes for setup

### Setup Steps

1. **Get Google Sheets API Key** (5 minutes)
   - See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions
   - Enable Google Sheets API in Google Cloud Console
   - Create and restrict your API key

2. **Configure Your Sheet** (2 minutes)
   - Make your Google Sheet accessible via link
   - Ensure tabs are named: `bets_week_1`, `DailyPNL`, `SummaryStats`

3. **Deploy Dashboard** (10 minutes)
   - Fork/clone this repository
   - Add your API key to `src/App.jsx`
   - Deploy to Vercel or Netlify (free)

📖 **Full setup instructions:** [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## 📁 Project Structure

```
keystone-trading-dashboard/
├── src/
│   ├── App.jsx          # Main dashboard component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── SETUP_GUIDE.md       # Detailed setup instructions
└── README.md            # This file
```

## 🔧 Configuration

### Google Sheets Setup

Your spreadsheet must have these tabs with specific column structures:

**bets_week_1 tab:**
- Game Number, Sport, Fixture, FixtureDate, Market, Selection, Handicap, Odds, Margin, Bet Amount, Outcome, PNL

**DailyPNL tab:**
- Date, Num Bets, Total Risk, Total PNL, Cumulative PNL, Average Edge, ROI (%), Win Rate

**SummaryStats tab:**
- MTD PNL, MTD Win Rate, MTD Total Bets, plus various averages and statistics

### API Key Configuration

In `src/App.jsx`, update line 24:

```javascript
const API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
```

Replace with your actual Google Sheets API key.

### Sheet ID Configuration

In `src/App.jsx`, update line 23 if using a different sheet:

```javascript
const SHEET_ID = '1RBeguOmsBzvR2GO_Jm3JTT_QUsUgVc-TtOWxuR5ExsY';
```

## 🎨 Customization

### Change Refresh Interval

Default: 60 seconds. To change, edit line ~70 in `src/App.jsx`:

```javascript
}, 60000); // Change to 30000 for 30s, 120000 for 2min
```

### Color Scheme

Primary colors used:
- Green (profits): `#00ff88`
- Red (losses): `#ff3366`
- Background: `#0a0e1a`

Search and replace these hex values to customize.

### Typography

Uses two Google Fonts:
- **Orbitron** - Headers and titles
- **JetBrains Mono** - Data and numbers

## 🌐 Deployment Options

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or use the Vercel Dashboard:
1. Import from GitHub
2. Select this repository
3. Framework: Vite
4. Deploy!

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

Or drag-and-drop the `dist` folder after building:
```bash
npm run build
```

## 📊 Data Flow

```
Google Sheets → API → React Dashboard → User's Browser
     ↑                                        ↓
     └────────── Auto-refresh (60s) ─────────┘
```

1. Dashboard fetches data from Google Sheets API
2. Data is processed and visualized
3. Auto-refreshes every 60 seconds
4. Manual refresh available via button

## 🔒 Security

- ✅ API key restricted to Google Sheets API only
- ✅ Sheet set to view-only access
- ✅ No data stored server-side
- ✅ All processing done client-side
- ⚠️ For production, use environment variables for API key

## 🐛 Troubleshooting

### "Failed to fetch data"
- Verify Google Sheet is publicly accessible
- Check API key is correct and enabled
- Ensure Google Sheets API is activated

### Charts not displaying
- Check that tab names match exactly
- Verify column headers are correct
- Ensure data types are as expected

### Build errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📈 Performance

- Initial load: ~1-2 seconds
- Data refresh: ~500ms
- Auto-refresh: Every 60 seconds
- Optimized for 1000+ trades

## 🛣️ Roadmap

- [ ] Add more chart types (heatmaps, scatter plots)
- [ ] Historical comparison features
- [ ] Export to CSV/PDF
- [ ] User authentication
- [ ] Multi-sheet support
- [ ] Real-time alerts/notifications

## 📝 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

This is a custom dashboard, but suggestions welcome!

## 📞 Support

For setup help, refer to [SETUP_GUIDE.md](./SETUP_GUIDE.md).

---

**Built with ❤️ for professional sports traders**

*Powered by React, Vite, Recharts, and Google Sheets API*
