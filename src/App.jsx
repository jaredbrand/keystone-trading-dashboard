import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function LiveTradingDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Data states
  const [betsData, setBetsData] = useState([]);
  const [dailyPNLData, setDailyPNLData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  // Google Sheets Configuration
  const SHEET_ID = '1RBeguOmsBzvR2GO_Jm3JTT_QUsUgVc-TtOWxuR5ExsY';
  const API_KEY = 'AIzaSyBTtxKBss2sKNHFYKeYHj0CedPBVN9GxEs';
  
  // Tab names and ranges
  const BETS_RANGE = 'bets_week_1!A:V';
  const DAILY_PNL_RANGE = 'DailyPNL!A:O';
  const SUMMARY_RANGE = 'SummaryStats!A:P';

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data from Google Sheets
  const fetchSheetData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all three sheets in parallel
      const [betsResponse, dailyResponse, summaryResponse] = await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${BETS_RANGE}?key=${API_KEY}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${DAILY_PNL_RANGE}?key=${API_KEY}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SUMMARY_RANGE}?key=${API_KEY}`)
      ]);

      if (!betsResponse.ok || !dailyResponse.ok || !summaryResponse.ok) {
        throw new Error('Failed to fetch data from Google Sheets');
      }

      const betsJson = await betsResponse.json();
      const dailyJson = await dailyResponse.json();
      const summaryJson = await summaryResponse.json();

    // Process Bets Data
const betsRows = betsJson.values || [];
const betsHeaders = betsRows[0] || [];
const processedBets = betsRows.slice(1).map(row => {
  const bet = {};
  betsHeaders.forEach((header, idx) => {
    bet[header] = row[idx] || '';
  });
  return {
    game: bet['Game Number'],
    fixture: bet['Fixture'],
    date: bet['FixtureDate'],
    market: bet['Market'],
    selection: bet['Selection'],
    handicap: bet['Handicap'] ? parseFloat(bet['Handicap']) : null,
    odds: parseFloat(bet['Odds']) || 0,
    margin: parseFloat(bet['Margin']?.replace('%', '')) || 0,
    betAmount: parseFloat(bet['Bet Amount']?.replace(/[$,]/g, '')) || 0,
    outcome: bet['Outcome'] || '',
    pnl: parseFloat(bet['PNL']?.replace(/[$,()]/g, '').replace('-', '-')) || 0,
    confirmed: bet['Confirmed']
  };
}).filter(bet => {
  // Debug: log first 5 to see what confirmed values look like
  if (bet.game) {
    console.log('Game:', bet.game, 'Confirmed:', bet.confirmed, 'Type:', typeof bet.confirmed);
  }
  // For now, show everything so we can see the data
  return bet.fixture;
});
      
      // Process Daily PNL Data
      const dailyRows = dailyJson.values || [];
      const dailyHeaders = dailyRows[0] || [];
      const processedDaily = dailyRows.slice(1).map(row => {
        const day = {};
        dailyHeaders.forEach((header, idx) => {
          day[header] = row[idx] || '';
        });
        return {
          date: day['Date'],
          numBets: parseInt(day['Num Bets']) || 0,
          totalRisk: parseFloat(day['Total Risk']?.replace(/[$,]/g, '')) || 0,
          totalPNL: parseFloat(day['Total PNL']?.replace(/[$,()]/g, '').replace('-', '-')) || 0,
          cumPNL: parseFloat(day['Cumulative PNL']?.replace(/[$,()]/g, '').replace('-', '-')) || 0,
          avgEdge: parseFloat(day['Average Edge']?.replace('%', '')) || 0,
          roi: parseFloat(day['ROI (%)']?.replace('%', '')) || 0,
          winRate: parseFloat(day['Win Rate']?.replace('%', '')) || 0
        };
      }).filter(day => day.date && day.date !== ''); // Filter out empty rows

      // Process Summary Data
      const summaryRows = summaryJson.values || [];
      const summaryObj = {
        mtdPNL: parseFloat(summaryRows[1]?.[0]?.replace(/[$,]/g, '')) || 0,
        mtdWinRate: parseFloat(summaryRows[1]?.[1]?.replace(/[()%]/g, '')) || 0,
        mtdTotalBets: parseInt(summaryRows[1]?.[3]) || 0,
        mtdNotional: parseFloat(summaryRows[1]?.[4]?.replace(/[$,]/g, '')) || 0,
        avgEdge: parseFloat(summaryRows[1]?.[5]?.replace('%', '')) || 0,
        avgHold: parseFloat(summaryRows[1]?.[6]?.replace('%', '')) || 0,
        roi: parseFloat(summaryRows[1]?.[7]?.replace('%', '')) || 0,
        bankroll: parseFloat(summaryRows[1]?.[8]?.replace(/[$,]/g, '')) || 0,
        duration: parseInt(summaryRows[1]?.[9]) || 0,
        wlWeeks: summaryRows[1]?.[10] || '',
        avgTradesPerDay: parseFloat(summaryRows[9]?.[0]) || 0,
        avgTime: summaryRows[9]?.[1] || '',
        avgOdds: parseFloat(summaryRows[9]?.[2]) || 0,
        avgModelOdds: parseFloat(summaryRows[9]?.[3]) || 0,
        avgBetSize: parseFloat(summaryRows[9]?.[4]?.replace('%', '')) || 0,
        sidesHold: parseFloat(summaryRows[13]?.[0]?.replace('%', '')) || 0,
        totalsHold: parseFloat(summaryRows[13]?.[1]?.replace('%', '')) || 0,
        sidesWinRate: parseFloat(summaryRows[15]?.[0]?.replace('%', '')) || 0,
        totalsWinRate: parseFloat(summaryRows[15]?.[1]?.replace('%', '')) || 0
      };

      setBetsData(processedBets);
      setDailyPNLData(processedDaily);
      setSummaryData(summaryObj);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSheetData();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchSheetData();
    }, 60000); // 60 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Filter data by date range
  const getFilteredData = (data, dateField = 'date') => {
    if (dateRange === 'all') return data;
    const now = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 0;
    if (days === 0) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      const diffTime = Math.abs(now - itemDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= days;
    });
  };

  const filteredBets = getFilteredData(betsData);
  const filteredDailyPNL = getFilteredData(dailyPNLData);

  // Calculate stats
  const settledBets = filteredBets.filter(b => b.outcome && b.outcome !== "");
  const openBets = filteredBets.filter(b => !b.outcome || b.outcome === "");
  const wins = settledBets.filter(b => b.outcome === "Win").length;
  const losses = settledBets.filter(b => b.outcome === "Loss").length;
  const totalTrades = settledBets.length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
  const totalPnL = settledBets.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalRisked = settledBets.reduce((sum, t) => sum + (t.betAmount || 0), 0);
  const roi = totalRisked > 0 ? ((totalPnL / totalRisked) * 100).toFixed(2) : 0;

  // Candlestick data
  const candlestickData = filteredDailyPNL.map(day => {
    const open = (day.cumPNL || 0) - (day.totalPNL || 0);
    const close = day.cumPNL || 0;
    return {
      date: day.date ? day.date.substring(0, 6) : '',
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      volume: day.totalRisk || 0,
      pnl: day.totalPNL || 0,
      color: (day.totalPNL || 0) >= 0 ? '#00ff88' : '#ff3366'
    };
  });

  // Market performance
  const marketTypes = ["Handicap", "Total", "Moneyline", "First Half Total"];
  const marketPerformance = marketTypes.map(market => {
    const marketTrades = settledBets.filter(t => t.market === market);
    const marketPnL = marketTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const marketWins = marketTrades.filter(t => t.outcome === "Win").length;
    const marketTotal = marketTrades.length;
    return {
      market,
      pnl: marketPnL,
      winRate: marketTotal > 0 ? ((marketWins / marketTotal) * 100).toFixed(1) : 0,
      trades: marketTotal
    };
  }).filter(m => m.trades > 0);

  const recentTrades = settledBets.slice(-5).reverse();

  if (loading && !betsData.length) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
            LOADING DASHBOARD...
          </div>
          <div className="text-sm text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Connecting to Google Sheets...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center max-w-2xl p-8">
          <div className="text-4xl font-bold mb-4 text-red-500" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            CONNECTION ERROR
          </div>
          <div className="text-sm text-gray-400 mb-6" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {error}
          </div>
          <div className="text-xs text-gray-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Please check your API key configuration and ensure the Google Sheet is publicly accessible.
          </div>
          <button 
            onClick={fetchSheetData}
            className="mt-6 px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00ff88]/80 transition-all"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;600&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: #0a0e1a;
          overflow-x: hidden;
        }
        
        .glow {
          text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
        }
        
        .card {
          background: linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(10, 14, 26, 0.9) 100%);
          border: 1px solid rgba(0, 255, 136, 0.2);
          backdrop-filter: blur(10px);
        }
        
        .stat-card {
          background: linear-gradient(135deg, rgba(30, 40, 60, 0.6) 0%, rgba(15, 20, 35, 0.8) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          border-color: rgba(0, 255, 136, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 255, 136, 0.15);
        }
        
        .pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.8), transparent);
          animation: scan 3s linear infinite;
        }
        
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
        
        .grid-bg {
          background-image: 
            linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .tab-button, .date-button {
          padding: 0.5rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .tab-button:hover, .date-button:hover {
          color: #00ff88;
          border-color: rgba(0, 255, 136, 0.3);
        }

        .tab-button.active, .date-button.active {
          background: rgba(0, 255, 136, 0.1);
          border-color: #00ff88;
          color: #00ff88;
        }
      `}</style>

      <div className="fixed inset-0 grid-bg pointer-events-none opacity-30" />
      <div className="scan-line pointer-events-none" />
      
      <header className="border-b border-[#00ff88]/20 bg-[#0a0e1a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center border border-gray-600">
                <div className="w-8 h-8 border-4 border-white/30 rotate-45" style={{ borderTopColor: 'white', borderRightColor: 'white' }}></div>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter glow" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                  KEYSTONE+
                </h1>
                <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  SPORTS TRADING DIVISION
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold glow" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {lastUpdate ? `Last Update: ${lastUpdate.toLocaleTimeString()}` : 'Connecting...'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button className={`tab-button ${activeView === 'all' ? 'active' : ''}`} onClick={() => setActiveView('all')}>All Views</button>
              <button className={`tab-button ${activeView === 'bets' ? 'active' : ''}`} onClick={() => setActiveView('bets')}>Bets</button>
              <button className={`tab-button ${activeView === 'daily' ? 'active' : ''}`} onClick={() => setActiveView('daily')}>Daily P&L</button>
              <button className={`tab-button ${activeView === 'summary' ? 'active' : ''}`} onClick={() => setActiveView('summary')}>Summary</button>
            </div>
            <div className="flex gap-2 items-center">
              <button className={`date-button ${dateRange === 'all' ? 'active' : ''}`} onClick={() => setDateRange('all')}>All Time</button>
              <button className={`date-button ${dateRange === '30d' ? 'active' : ''}`} onClick={() => setDateRange('30d')}>30 Days</button>
              <button className={`date-button ${dateRange === '7d' ? 'active' : ''}`} onClick={() => setDateRange('7d')}>7 Days</button>
              <button 
                onClick={fetchSheetData}
                className="ml-4 px-3 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20 transition-all text-xs font-bold rounded"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                ⟳ REFRESH
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-8 py-8">
        
        {(activeView === 'all' || activeView === 'summary') && summaryData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {activeView === 'summary' ? 'MTD P&L' : 'TOTAL P&L'}
              </div>
              <div className={`text-4xl font-black ${(activeView === 'summary' ? summaryData.mtdPNL : totalPnL) >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                ${(activeView === 'summary' ? summaryData.mtdPNL : totalPnL) >= 0 ? '+' : ''}
                {(activeView === 'summary' ? summaryData.mtdPNL : totalPnL).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {activeView === 'summary' ? summaryData.mtdTotalBets : totalTrades} TOTAL TRADES
              </div>
            </div>

            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>WIN RATE</div>
              <div className="text-4xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {activeView === 'summary' ? summaryData.mtdWinRate : winRate}%
              </div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {wins}W / {losses}L
              </div>
            </div>

            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>ROI</div>
              <div className={`text-4xl font-black ${(activeView === 'summary' && summaryData ? summaryData.roi : roi) >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {(activeView === 'summary' && summaryData ? summaryData.roi : roi) >= 0 ? '+' : ''}
                {(activeView === 'summary' && summaryData ? summaryData.roi : roi)}%
              </div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                ${totalRisked.toLocaleString()} RISKED
              </div>
            </div>

            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>AVG EDGE</div>
              <div className="text-4xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {summaryData.avgEdge}%
              </div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {summaryData.avgTradesPerDay.toFixed(1)} TRADES/DAY
              </div>
            </div>
          </div>
        )}

        {(activeView === 'all' || activeView === 'daily') && candlestickData.length > 0 && (
          <div className="card rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                CUMULATIVE P&L WITH VOLUME
              </h2>
              <div className="pulse w-3 h-3 rounded-full bg-[#00ff88]" />
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={candlestickData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ff88" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#00ff88" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                />
                <YAxis 
                  yAxisId="pnl"
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="volume"
                  orientation="right"
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(10, 14, 26, 0.95)', 
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px'
                  }}
                />
                <Bar yAxisId="volume" dataKey="volume" fill="url(#volumeGradient)" opacity={0.3} />
                <Line 
                  yAxisId="pnl"
                  type="monotone" 
                  dataKey="close" 
                  stroke="#ffffff" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {(activeView === 'all' || activeView === 'bets') && openBets.length > 0 && (
          <div className="card rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                OPEN POSITIONS ({openBets.length})
              </h2>
              <div className="pulse w-3 h-3 rounded-full bg-[#00ff88]" />
            </div>
            <div className="space-y-3">
              {openBets.slice(0, 10).map((trade, idx) => (
                <div 
                  key={idx}
                  className="bg-gradient-to-r from-[#141e32]/40 to-transparent rounded-lg p-4 border border-yellow-500/30 hover:border-yellow-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {trade.fixture}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-[#00ff88]/10 text-[#00ff88]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {trade.market}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          PENDING
                        </span>
                      </div>
                      <div className="flex gap-6 text-xs text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        <span>SELECTION: {trade.selection}{trade.handicap ? ` (${trade.handicap > 0 ? '+' : ''}${trade.handicap})` : ''}</span>
                        <span>ODDS: {trade.odds}</span>
                        <span>STAKE: ${trade.betAmount.toLocaleString()}</span>
                        <span>MARGIN: {trade.margin}%</span>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-yellow-500" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      OPEN
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeView === 'all' || activeView === 'bets') && marketPerformance.length > 0 && (
          <div className="card rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                PERFORMANCE BY MARKET
              </h2>
              <div className="pulse w-3 h-3 rounded-full bg-[#00ff88]" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={marketPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="market" 
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(10, 14, 26, 0.95)', 
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="pnl" fill="#00ff88" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {(activeView === 'all' || activeView === 'bets') && recentTrades.length > 0 && (
          <div className="card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                RECENT SETTLED TRADES
              </h2>
              <div className="pulse w-3 h-3 rounded-full bg-[#00ff88]" />
            </div>
            <div className="space-y-3">
              {recentTrades.map((trade, idx) => (
                <div 
                  key={idx}
                  className="bg-gradient-to-r from-[#141e32]/40 to-transparent rounded-lg p-4 border border-white/5 hover:border-[#00ff88]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {trade.fixture}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-[#00ff88]/10 text-[#00ff88]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {trade.market}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${trade.outcome === 'Win' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff3366]/20 text-[#ff3366]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {trade.outcome}
                        </span>
                      </div>
                      <div className="flex gap-6 text-xs text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        <span>SELECTION: {trade.selection}{trade.handicap ? ` (${trade.handicap > 0 ? '+' : ''}${trade.handicap})` : ''}</span>
                        <span>ODDS: {trade.odds}</span>
                        <span>STAKE: ${trade.betAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className={`text-2xl font-black ${trade.pnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'summary' && summaryData && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>SIDES WIN RATE</div>
              <div className="text-3xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{summaryData.sidesWinRate}%</div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>HOLD: {summaryData.sidesHold}%</div>
            </div>
            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>TOTALS WIN RATE</div>
              <div className="text-3xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{summaryData.totalsWinRate}%</div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>HOLD: {summaryData.totalsHold}%</div>
            </div>
            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>AVG ODDS</div>
              <div className="text-3xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{summaryData.avgOdds}</div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>MODEL: {summaryData.avgModelOdds}</div>
            </div>
            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>BANKROLL</div>
              <div className="text-3xl font-black text-[#00ff88]" style={{ fontFamily: 'Orbitron, sans-serif' }}>${summaryData.bankroll.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>DURATION: {summaryData.duration} DAYS</div>
            </div>
            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>W/L WEEKS</div>
              <div className="text-3xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{summaryData.wlWeeks}</div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>AVG TIME: {summaryData.avgTime}</div>
            </div>
            <div className="stat-card rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>MTD NOTIONAL</div>
              <div className="text-3xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>${(summaryData.mtdNotional/1000000).toFixed(2)}M</div>
              <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>AVG BET: {summaryData.avgBetSize}%</div>
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-[#00ff88]/20 mt-12 py-6">
        <div className="max-w-[1800px] mx-auto px-8 text-center">
          <p className="text-xs text-gray-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            KEYSTONE+ SPORTS TRADING DIVISION • REAL-TIME ANALYTICS ENGINE v3.0 • LIVE DATA FEED
          </p>
          <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Last Sync: {lastUpdate?.toLocaleString() || 'Initializing...'} • Auto-Refresh: 60s
          </p>
        </div>
      </footer>
    </div>
  );
}
