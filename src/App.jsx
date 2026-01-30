import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';

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
        // Column R is at index 17 (18th column, zero-indexed)
        const isConfirmed = row[17] === 'TRUE' || row[17] === true;
        
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
          confirmed: isConfirmed
        };
      }).filter(bet => bet.fixture && bet.confirmed); // Only confirmed bets

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
  const filteredDaily = getFilteredData(dailyPNLData);

  // Calculate metrics from filtered data
  const totalPNL = filteredBets.reduce((sum, bet) => sum + bet.pnl, 0);
  const totalTraded = filteredBets.reduce((sum, bet) => sum + bet.betAmount, 0);
  const wins = filteredBets.filter(bet => bet.outcome === 'Win').length;
  const losses = filteredBets.filter(bet => bet.outcome === 'Loss').length;
  const totalSettled = wins + losses;
  const winRate = totalSettled > 0 ? (wins / totalSettled) * 100 : 0;
  const roi = totalTraded > 0 ? (totalPNL / totalTraded) * 100 : 0;
  const avgEdge = filteredBets.length > 0 ? filteredBets.reduce((sum, bet) => sum + bet.margin, 0) / filteredBets.length : 0;
  
  // Calculate Hold % (similar to avgEdge but as a percentage of amount traded)
  const holdPercentage = summaryData?.avgHold || avgEdge;

  // Open positions (no outcome yet)
  const openPositions = filteredBets.filter(bet => !bet.outcome || (bet.outcome !== 'Win' && bet.outcome !== 'Loss'));

  // Recent trades (last 10 settled)
  const recentTrades = filteredBets
    .filter(bet => bet.outcome === 'Win' || bet.outcome === 'Loss')
    .slice(-10)
    .reverse();

  // Market performance
  const marketPerformance = Object.entries(
    filteredBets.reduce((acc, bet) => {
      if (!acc[bet.market]) acc[bet.market] = { wins: 0, losses: 0, pnl: 0 };
      if (bet.outcome === 'Win') acc[bet.market].wins++;
      if (bet.outcome === 'Loss') acc[bet.market].losses++;
      acc[bet.market].pnl += bet.pnl;
      return acc;
    }, {})
  ).map(([market, data]) => ({
    market,
    ...data,
    winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
          <div className="text-[#D4AF37] font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            Loading Market Data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <div className="text-center max-w-2xl p-8">
          <div className="text-4xl font-bold mb-4 text-[#ef4444]" style={{ fontFamily: 'Inter, sans-serif' }}>
            CONNECTION ERROR
          </div>
          <div className="text-sm text-[#94a3b8] mb-6" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {error}
          </div>
          <div className="text-xs text-[#64748b]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Please check your API key configuration and ensure the Google Sheet is publicly accessible.
          </div>
          <button 
            onClick={fetchSheetData}
            className="mt-6 px-6 py-3 bg-[#D4AF37] text-[#0f1419] font-bold rounded-lg hover:bg-[#F5A623] transition-all"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0f1419 100%)',
      color: '#e8e6e3',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          
          body {
            background: #0f1419;
            margin: 0;
            padding: 0;
          }
          
          .card {
            background: linear-gradient(135deg, rgba(26, 31, 46, 0.8) 0%, rgba(15, 20, 25, 0.9) 100%);
            border: 1px solid rgba(212, 175, 55, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            transition: all 0.3s ease;
          }
          
          .card:hover {
            border-color: rgba(212, 175, 55, 0.3);
            box-shadow: 0 12px 48px rgba(212, 175, 55, 0.1);
          }
          
          .stat-card {
            background: linear-gradient(135deg, rgba(20, 30, 50, 0.6) 0%, rgba(15, 20, 35, 0.8) 100%);
            border: 1px solid rgba(245, 166, 35, 0.2);
            transition: all 0.3s ease;
          }
          
          .stat-card:hover {
            border-color: rgba(245, 166, 35, 0.4);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(245, 166, 35, 0.15);
          }
          
          .pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .4;
            }
          }
          
          .glow-text {
            text-shadow: 0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.2);
          }
          
          button {
            transition: all 0.2s ease;
          }
          
          button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
          }
          
          .gradient-gold {
            background: linear-gradient(135deg, #D4AF37 0%, #F5A623 50%, #C9A35C 100%);
          }
          
          .gradient-emerald {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          }
          
          .gradient-ruby {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          }
        `}
      </style>

      <header style={{ 
        borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
        background: 'linear-gradient(180deg, rgba(26, 31, 46, 0.95) 0%, rgba(15, 20, 25, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '900', 
                background: 'linear-gradient(135deg, #D4AF37 0%, #F5A623 50%, #C9A35C 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em'
              }} className="glow-text">
                KEYSTONE+
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#94a3b8',
                fontWeight: '500',
                letterSpacing: '0.1em',
                marginTop: '4px',
                fontFamily: 'Inter, sans-serif'
              }}>
                SPORTS TRADING DIVISION
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>
                  {currentTime.toLocaleTimeString('en-US')}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontFamily: 'Inter, sans-serif' }}>
                  Last Update: {lastUpdate?.toLocaleTimeString() || '--:--:--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '32px' }}>
        
        {/* View Toggles */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {['all', 'bets', 'daily', 'summary'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: activeView === view ? '1px solid #D4AF37' : '1px solid rgba(148, 163, 184, 0.2)',
                background: activeView === view ? 'linear-gradient(135deg, #D4AF37 0%, #F5A623 100%)' : 'rgba(26, 31, 46, 0.6)',
                color: activeView === view ? '#0f1419' : '#e8e6e3',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {view === 'all' ? 'All Views' : view === 'daily' ? 'Daily P&L' : view}
            </button>
          ))}
        </div>

        {/* Date Range Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All Time' },
            { value: '30d', label: '30 Days' },
            { value: '7d', label: '7 Days' }
          ].map(range => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: dateRange === range.value ? '1px solid #F5A623' : '1px solid rgba(148, 163, 184, 0.15)',
                background: dateRange === range.value ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
                color: dateRange === range.value ? '#F5A623' : '#94a3b8',
                fontWeight: '500',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={fetchSheetData}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              background: 'rgba(212, 175, 55, 0.1)',
              color: '#D4AF37',
              fontWeight: '500',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              marginLeft: 'auto'
            }}
          >
            ↻ REFRESH
          </button>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>TOTAL P&L</div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              color: totalPNL >= 0 ? '#10b981' : '#ef4444',
              fontFamily: 'Inter, sans-serif'
            }}>
              {totalPNL >= 0 ? '+' : ''}${totalPNL.toLocaleString()}
            </div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>TOTAL TRADES</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{filteredBets.length}</div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>WIN RATE</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{winRate.toFixed(1)}%</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{wins}W / {losses}L</div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>ROI</div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              color: roi >= 0 ? '#10b981' : '#ef4444',
              fontFamily: 'Inter, sans-serif'
            }}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
            </div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>$ TRADED</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>${totalTraded.toLocaleString()}</div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>HOLD %</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#D4AF37', fontFamily: 'Inter, sans-serif' }}>{holdPercentage.toFixed(2)}%</div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>AVG EDGE</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#D4AF37', fontFamily: 'Inter, sans-serif' }}>{avgEdge.toFixed(2)}%</div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>TRADES/DAY</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{summaryData?.avgTradesPerDay.toFixed(1) || '0'}</div>
          </div>
        </div>

        {/* Cumulative PNL Chart */}
        {(activeView === 'all' || activeView === 'daily') && filteredDaily.length > 0 && (
          <div className="card" style={{ borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                fontFamily: 'Inter, sans-serif',
                color: '#D4AF37'
              }}>
                Cumulative Performance
              </h2>
              <div className="pulse" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#D4AF37' }} />
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={filteredDaily}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(148, 163, 184, 0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="rgba(148, 163, 184, 0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="rgba(148, 163, 184, 0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 20, 25, 0.95)', 
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#D4AF37', fontWeight: '600' }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="cumPNL" 
                  fill="url(#colorPnl)" 
                  stroke="#D4AF37"
                  strokeWidth={2}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="numBets" 
                  fill="rgba(100, 116, 139, 0.4)"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Open Positions */}
        {openPositions.length > 0 && (activeView === 'all' || activeView === 'bets') && (
          <div className="card" style={{ borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                fontFamily: 'Inter, sans-serif',
                color: '#F5A623'
              }}>
                Open Positions
              </h2>
              <div className="pulse" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F5A623' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {openPositions.map((trade, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: 'linear-gradient(90deg, rgba(245, 166, 35, 0.05) 0%, transparent 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(245, 166, 35, 0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ color: '#e8e6e3', fontWeight: '600', fontFamily: 'Inter, sans-serif', fontSize: '15px' }}>
                          {trade.fixture}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          background: 'rgba(212, 175, 55, 0.15)',
                          color: '#D4AF37',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '600'
                        }}>
                          {trade.market}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          background: 'rgba(245, 166, 35, 0.2)',
                          color: '#F5A623',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '600'
                        }}>
                          PENDING
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '24px', fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                        <span>SELECTION: {trade.selection}{trade.handicap ? ` (${trade.handicap > 0 ? '+' : ''}${trade.handicap})` : ''}</span>
                        <span>ODDS: {trade.odds}</span>
                        <span>STAKE: ${trade.betAmount.toLocaleString()}</span>
                        <span>MARGIN: {trade.margin}%</span>
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '800', 
                      color: '#F5A623',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      OPEN
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Performance */}
        {(activeView === 'all' || activeView === 'bets') && marketPerformance.length > 0 && (
          <div className="card" style={{ borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                fontFamily: 'Inter, sans-serif',
                color: '#D4AF37'
              }}>
                Performance by Market
              </h2>
              <div className="pulse" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#D4AF37' }} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={marketPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="market" 
                  stroke="rgba(148, 163, 184, 0.3)" 
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '500' }}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="rgba(148, 163, 184, 0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 20, 25, 0.95)', 
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px'
                  }}
                  labelStyle={{ color: '#D4AF37', fontWeight: '600' }}
                />
                <Bar 
                  dataKey="pnl" 
                  fill="#D4AF37" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Trades */}
        {(activeView === 'all' || activeView === 'bets') && recentTrades.length > 0 && (
          <div className="card" style={{ borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                fontFamily: 'Inter, sans-serif',
                color: '#D4AF37'
              }}>
                Recent Settled Trades
              </h2>
              <div className="pulse" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#D4AF37' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentTrades.map((trade, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: 'linear-gradient(90deg, rgba(26, 31, 46, 0.4) 0%, transparent 100%)',
                    borderRadius: '12px',
                    padding: '18px',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <span style={{ color: '#e8e6e3', fontWeight: '600', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                          {trade.fixture}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          background: 'rgba(212, 175, 55, 0.1)',
                          color: '#D4AF37',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '500'
                        }}>
                          {trade.market}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          background: trade.outcome === 'Win' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: trade.outcome === 'Win' ? '#10b981' : '#ef4444',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '600'
                        }}>
                          {trade.outcome}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                        <span>SELECTION: {trade.selection}{trade.handicap ? ` (${trade.handicap > 0 ? '+' : ''}${trade.handicap})` : ''}</span>
                        <span>ODDS: {trade.odds}</span>
                        <span>STAKE: ${trade.betAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: '800', 
                      color: trade.pnl >= 0 ? '#10b981' : '#ef4444',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary View Additional Stats */}
        {activeView === 'summary' && summaryData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '32px' }}>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>SIDES WIN RATE</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{summaryData.sidesWinRate}%</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace' }}>HOLD: {summaryData.sidesHold}%</div>
            </div>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>TOTALS WIN RATE</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{summaryData.totalsWinRate}%</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace' }}>HOLD: {summaryData.totalsHold}%</div>
            </div>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>AVG ODDS</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{summaryData.avgOdds}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace' }}>MODEL: {summaryData.avgModelOdds}</div>
            </div>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>BANKROLL</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#D4AF37', fontFamily: 'Inter, sans-serif' }}>${summaryData.bankroll.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace' }}>DURATION: {summaryData.duration} DAYS</div>
            </div>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>W/L WEEKS</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{summaryData.wlWeeks}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace' }}>AVG TIME: {summaryData.avgTime}</div>
            </div>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>MTD NOTIONAL</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>${(summaryData.mtdNotional/1000000).toFixed(2)}M</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace' }}>AVG BET: {summaryData.avgBetSize}%</div>
            </div>
          </div>
        )}

      </main>

      <footer style={{ borderTop: '1px solid rgba(212, 175, 55, 0.15)', marginTop: '48px', padding: '24px 0' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>
            KEYSTONE+ SPORTS TRADING DIVISION • REAL-TIME ANALYTICS ENGINE v3.0
          </p>
          <p style={{ fontSize: '10px', color: '#475569', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
            Last Sync: {lastUpdate?.toLocaleString() || 'Initializing...'} • Auto-Refresh: 60s
          </p>
        </div>
      </footer>
    </div>
  );
}
