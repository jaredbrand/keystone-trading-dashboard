import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';

export default function LiveTradingDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Password protection
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Set your password here (change this to whatever you want)
  const DASHBOARD_PASSWORD = 'keystone2025';
  
  // Data states
  const [betsData, setBetsData] = useState([]);
  const [dailyPNLData, setDailyPNLData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  // Google Sheets Configuration
  const SHEET_ID = '12ERObVmJ6Zq8C_tMoWLPHcx_fkHvNBB6RfbMcEtOa5Q';
  const API_KEY = 'AIzaSyBTtxKBss2sKNHFYKeYHj0CedPBVN9GxEs';
  
  // Tab names and ranges
  const BETS_RANGE = 'bets_week_1!A:V';
  const DAILY_PNL_RANGE = 'DailyPNL!A:O';
  const SUMMARY_RANGE = 'SummaryStats!A:P';

  // Check for saved password in sessionStorage
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('keystoneAuth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle password submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === DASHBOARD_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('keystoneAuth', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

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

      // DEBUG - log the raw API response for DailyPNL
      console.log('=== DAILY PNL RAW RESPONSE ===');
      console.log('Status:', dailyResponse.status);
      console.log('Total rows returned:', (dailyJson.values || []).length);
      console.log('Headers (row 1):', (dailyJson.values || [])[0]);
      console.log('First data row (row 2):', (dailyJson.values || [])[1]);
      console.log('Second data row (row 3):', (dailyJson.values || [])[2]);
      console.log('==============================');

      // Process Bets Data
      const betsRows = betsJson.values || [];
      const betsHeaders = betsRows[0] || [];
      const processedBets = betsRows.slice(1).map(row => {
        const bet = {};
        betsHeaders.forEach((header, idx) => {
          bet[header] = row[idx] || '';
        });
        // Column R is at index 17 (18th column, zero-indexed) - Confirmed checkbox
        const isConfirmed = row[17] === 'TRUE' || row[17] === true;
        
        // Extract values from correct columns
        // Column N (index 13) = Bet Amount
        // Column U (index 20) = PNL
        const betAmount = parseFloat(row[13]?.replace(/[$,]/g, '')) || 0;
        
        // Parse PNL - handle both negative numbers and parentheses format
        let pnlValue = 0;
        const pnlStr = row[20] || '';
        if (pnlStr) {
          // Remove $ and commas
          let cleaned = pnlStr.replace(/[$,]/g, '');
          // Check if it's in parentheses (negative)
          if (cleaned.includes('(') && cleaned.includes(')')) {
            cleaned = '-' + cleaned.replace(/[()]/g, '');
          }
          pnlValue = parseFloat(cleaned) || 0;
        }
        
        return {
          game: bet['Game Number'],
          fixture: bet['Fixture'],
          date: bet['FixtureDate'],
          market: bet['Market'],
          selection: bet['Selection'],
          handicap: bet['Handicap'] ? parseFloat(bet['Handicap']) : null,
          odds: parseFloat(bet['Odds']) || 0,
          margin: parseFloat(bet['Margin']?.replace('%', '')) || 0,
          betAmount: betAmount,
          outcome: bet['Outcome'] || '',
          pnl: pnlValue,
          confirmed: isConfirmed
        };
      }).filter(bet => bet.fixture && bet.confirmed); // Only confirmed bets

      // Process Daily PNL Data
      const dailyRows = dailyJson.values || [];
      const dailyHeaders = dailyRows[0] || [];
      
      // DEBUG - log headers and first row to console
      console.log('DailyPNL Headers:', dailyHeaders);
      console.log('DailyPNL First Row:', dailyRows[1]);
      
      const processedDaily = dailyRows.slice(1).map(row => {
        const day = {};
        // TRIM headers - sheet has spaces around names e.g. " Total Risk "
        dailyHeaders.forEach((header, idx) => {
          day[header.trim()] = row[idx] || '';
        });

        // Robust parser: handles '$ 16,330'  '$ (1,487)'  '$4,068'  plain numbers
        const parseNum = (str) => {
          if (!str && str !== 0) return 0;
          let s = String(str).trim();
          s = s.replace(/[$,\s]/g, '');
          if (s.startsWith('(') && s.endsWith(')')) {
            s = '-' + s.slice(1, -1);
          }
          const val = parseFloat(s);
          return isNaN(val) ? 0 : val;
        };

        return {
          date: day['Date'],
          numBets: parseInt(day['Num Bets']) || 0,
          totalRisk: parseNum(day['Total Risk']),
          totalPNL: parseNum(day['Total PNL']),
          cumPNL: parseNum(day['Cumulative PNL']),
          avgEdge: parseFloat((day['Average Edge'] || '').replace(/[%$,\s]/g, '')) || 0,
          roi: parseFloat((day['ROI (%)'] || '').replace(/[%$,\s]/g, '')) || 0,
          winRate: parseFloat((day['Win Rate'] || '').replace(/[%$,\s]/g, '')) || 0
        };
      }).filter(day => day.date && day.date !== ''); // Filter out empty rows

      // Process Summary Data
      const summaryRows = summaryJson.values || [];
      const summaryObj = {
        mtdPNL: parseFloat(summaryRows[1]?.[0]?.replace(/[$,]/g, '')) || 0,
        mtdWinRate: parseFloat(summaryRows[1]?.[1]?.replace(/[()%]/g, '')) || 0,
        mtdTotalBets: parseInt(summaryRows[1]?.[3]) || 0,
        mtdNotional: parseFloat(summaryRows[1]?.[4]?.replace(/[$,]/g, '')) || 0,
        avgEdge: parseFloat(summaryRows[1]?.[4]?.replace('%', '')) || 0, // E2 - Average Edge (index 4, column E)
        avgHold: parseFloat(summaryRows[1]?.[5]?.replace('%', '')) || 0, // F2 - Hold (index 5, column F)
        roi: parseFloat(summaryRows[1]?.[6]?.replace('%', '')) || 0, // G2 - ROI (index 6, column G)
        bankroll: parseFloat(summaryRows[1]?.[7]?.replace(/[$,]/g, '')) || 0, // H2 - Bankroll (index 7, column H)
        duration: parseInt(summaryRows[1]?.[8]) || 0, // I2 - Duration (index 8, column I)
        wlWeeks: summaryRows[1]?.[9] || '', // J2 - W/L Weeks (index 9, column J)
        avgTradesPerDay: parseFloat(summaryRows[9]?.[0]) || 0,
        avgTime: summaryRows[9]?.[1] || '', // B10 - Average Trade Time
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
    if (isAuthenticated) {
      fetchSheetData();
    }
  }, [isAuthenticated]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (isAuthenticated) {
      const refreshInterval = setInterval(() => {
        fetchSheetData();
      }, 60000); // 60 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [isAuthenticated]);

  // Filter data by date range
  const getFilteredData = (data, dateField = 'date') => {
    if (dateRange === 'all') return data;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    
    if (dateRange === 'today') {
      return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        return itemDateOnly.getTime() === today.getTime();
      });
    }
    
    if (dateRange === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        return itemDateOnly.getTime() === yesterday.getTime();
      });
    }
    
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
  
  // Add manually calculated cumPNL to filteredDaily for charts (since cumPNL column doesn't parse)
  let chartCumSum = 0;
  const filteredDailyWithCum = filteredDaily.map(d => {
    chartCumSum += d.totalPNL;
    return { ...d, cumPNL: chartCumSum };
  });
  
  // For risk calculations, always use ALL daily data regardless of date filter
  // Risk metrics are portfolio-level and should always reflect full history
  const riskDaily = dailyPNLData;

  // Calculate metrics dynamically from filtered bets data (so date filters work)
  const totalPNL = filteredBets.reduce((sum, bet) => sum + bet.pnl, 0);
  const totalTraded = filteredBets.reduce((sum, bet) => sum + bet.betAmount, 0);
  const wins = filteredBets.filter(bet => bet.outcome === 'Win').length;
  const losses = filteredBets.filter(bet => bet.outcome === 'Loss').length;
  const totalSettled = wins + losses;
  const winRate = totalSettled > 0 ? (wins / totalSettled) * 100 : 0;
  
  // Hold % = (PNL / Traded) * 100
  const holdPercentage = totalTraded > 0 ? (totalPNL / totalTraded) * 100 : 0;
  
  // Calculate trades per day from filtered data
  const uniqueDates = [...new Set(filteredBets.map(bet => bet.date).filter(d => d))];
  const tradesPerDay = uniqueDates.length > 0 ? filteredBets.length / uniqueDates.length : 0;

  // Open positions (only where outcome is specifically "Open")
  const openPositions = filteredBets.filter(bet => bet.outcome === 'Open');

  // ============================================================
  // RISK MODULE CALCULATIONS (% based, no absolute dollar values)
  // ============================================================

  // 1. MAX DRAWDOWN
  // Build cumPNL manually by summing totalPNL (we know this works - Sharpe uses it)
  let runningSum = 0;
  const cumPNLArr = riskDaily.map(d => {
    runningSum += d.totalPNL;
    return runningSum;
  });
  
  console.log('cumPNL sample (first 5):', cumPNLArr.slice(0, 5));
  console.log('cumPNL peak:', Math.max(...cumPNLArr));
  console.log('cumPNL latest:', cumPNLArr[cumPNLArr.length - 1]);
  
  // Find index of peak (highest cumPNL)
  const peakIndex = cumPNLArr.reduce((maxIdx, val, idx) => val > cumPNLArr[maxIdx] ? idx : maxIdx, 0);
  const peakValue = cumPNLArr[peakIndex] || 0;
  
  // Find the worst drawdown: for each point, look back to find the highest peak before it
  let maxDrawdownPct = 0;
  let runningPeak = cumPNLArr[0] || 0;
  
  cumPNLArr.forEach((val, i) => {
    if (val > runningPeak) runningPeak = val;
    if (runningPeak > 0) {
      const dd = ((val - runningPeak) / runningPeak) * 100;
      if (dd < maxDrawdownPct) maxDrawdownPct = dd;
    }
  });
  
  const maxDrawdown = Math.abs(maxDrawdownPct);
  
  console.log('Max DD calc - worst %:', maxDrawdown.toFixed(2));
  console.log('Max DD calc - running peak used:', runningPeak);

  // Current value vs peak for current drawdown
  const latestCumValue = cumPNLArr[cumPNLArr.length - 1] || 0;
  const currentDrawdownPct = peakValue > 0 ? Math.max(0, ((peakValue - latestCumValue) / peakValue) * 100) : 0;

  // Build drawdown series for chart
  let ddPeak = 0;
  let drawdownSeries = riskDaily.map((day, i) => {
    if (day.cumPNL > ddPeak) ddPeak = day.cumPNL;
    const dd = ddPeak > 0 ? ((day.cumPNL - ddPeak) / ddPeak) * 100 : 0;
    return { date: day.date || '', drawdown: parseFloat(Math.min(0, dd).toFixed(2)), cumPNL: day.cumPNL };
  });

  // 2. SHARPE RATIO
  // Using daily returns as % of daily traded amount - only exclude zero-risk days
  const dailyReturns = riskDaily
    .filter(d => d.totalRisk > 0)
    .map(d => (d.totalPNL / d.totalRisk) * 100);

  // DEBUG - log first 5 daily values to check parsing
  console.log('=== DAILY DATA CHECK ===');
  console.log('First 5 days totalPNL:', riskDaily.slice(0, 5).map(d => ({date: d.date, pnl: d.totalPNL, risk: d.totalRisk})));
  console.log('Built cumPNL peak:', Math.max(...(riskDaily.reduce((acc, d) => { const prev = acc.length > 0 ? acc[acc.length-1] : 0; acc.push(prev + d.totalPNL); return acc; }, []))));
  console.log('========================');
  const avgDailyReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const stdDev = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / (dailyReturns.length - 1))
    : 0;
  // Annualised Sharpe (using ~252 trading days)
  const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;

  // 3. VALUE AT RISK (VaR) - Historical simulation
  // Only use days where we had actual losses for VaR calculation
  const allSortedReturns = [...dailyReturns].sort((a, b) => a - b);
  
  // 95% VaR: worst 5% of all days
  const var95Index = Math.max(0, Math.floor(allSortedReturns.length * 0.05));
  // 99% VaR: worst 1% of all days  
  const var99Index = Math.max(0, Math.floor(allSortedReturns.length * 0.01));
  
  const var95 = allSortedReturns.length > 5 
    ? Math.abs(Math.min(0, allSortedReturns[var95Index])) : 0;
  const var99 = allSortedReturns.length > 10 
    ? Math.abs(Math.min(0, allSortedReturns[var99Index])) : 0;

  // Return distribution for histogram
  const sortedReturns = allSortedReturns;

  // Return distribution for histogram
  const returnBuckets = Array.from({ length: 10 }, (_, i) => {
    const min = -20 + i * 4;
    const max = min + 4;
    return {
      range: `${min}% to ${max}%`,
      count: dailyReturns.filter(r => r >= min && r < max).length,
      min, max
    };
  });

  // 4. KELLY CRITERION
  // f* = (bp - q) / b  where b = avg decimal odds - 1, p = win rate, q = 1 - p
  const p = winRate / 100; // win probability
  const q = 1 - p;
  const avgOddsForKelly = filteredBets.length > 0
    ? filteredBets.reduce((sum, bet) => sum + bet.odds, 0) / filteredBets.length : 2;
  const b = avgOddsForKelly - 1; // net odds
  const kellyCriterion = b > 0 ? ((b * p - q) / b) * 100 : 0;
  const halfKelly = kellyCriterion / 2;
  const quarterKelly = kellyCriterion / 4;
  const thirdKelly = kellyCriterion * 0.3; // 0.3 Kelly - your actual strategy

  // Actual avg bet size as % of total traded (from column N - Bet Amount)
  // Calculated as: avg single bet / total traded * 100 to get relative bet sizing %
  const avgBetAmount = filteredBets.length > 0
    ? filteredBets.reduce((sum, bet) => sum + bet.betAmount, 0) / filteredBets.length : 0;
  const totalAvgTraded = totalTraded > 0 ? totalTraded / filteredBets.length : 0;
  // Express actual avg bet as % of total bankroll proxy (avg daily risk)
  const avgDailyRisk = riskDaily.length > 0
    ? riskDaily.reduce((sum, d) => sum + d.totalRisk, 0) / filteredDaily.length : 0;
  const actualBetPct = avgDailyRisk > 0 ? (avgBetAmount / avgDailyRisk) * 100 : 0;

  // Risk rating (composite score)
  const riskScore = Math.min(100, Math.max(0,
    (maxDrawdown > 20 ? 40 : maxDrawdown * 2) +
    (sharpeRatio < 0 ? 30 : sharpeRatio < 1 ? 15 : 0) +
    (currentDrawdownPct > 10 ? 30 : currentDrawdownPct * 3)
  ));
  const riskLevel = riskScore < 25 ? { label: 'LOW', color: '#10b981' }
    : riskScore < 50 ? { label: 'MODERATE', color: '#F5A623' }
    : riskScore < 75 ? { label: 'ELEVATED', color: '#f97316' }
    : { label: 'HIGH', color: '#ef4444' };

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

  // Show password screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0f1419 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.8) 0%, rgba(15, 20, 25, 0.9) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          borderRadius: '16px',
          padding: '48px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '900', 
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5A623 50%, #C9A35C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              KEYSTONE+
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#94a3b8',
              fontWeight: '500',
              letterSpacing: '0.1em'
            }}>
              SPORTS TRADING DIVISION
            </div>
          </div>
          
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '11px',
                color: '#94a3b8',
                marginBottom: '8px',
                fontWeight: '500',
                letterSpacing: '0.05em'
              }}>
                ENTER PASSWORD
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 20, 25, 0.6)',
                  border: passwordError ? '1px solid #ef4444' : '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  color: '#e8e6e3',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none'
                }}
              />
              {passwordError && (
                <div style={{
                  color: '#ef4444',
                  fontSize: '11px',
                  marginTop: '8px'
                }}>
                  {passwordError}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #F5A623 100%)',
                color: '#0f1419',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.05em'
              }}
            >
              ACCESS DASHBOARD
            </button>
          </form>
        </div>
      </div>
    );
  }

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
          {['all', 'bets', 'daily', 'summary', 'risk'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: activeView === view 
                  ? view === 'risk' ? '1px solid #ef4444' : '1px solid #D4AF37'
                  : '1px solid rgba(148, 163, 184, 0.2)',
                background: activeView === view 
                  ? view === 'risk' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #D4AF37 0%, #F5A623 100%)'
                  : 'rgba(26, 31, 46, 0.6)',
                color: activeView === view ? '#fff' : '#e8e6e3',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {view === 'all' ? 'All Views' : view === 'daily' ? 'Daily P&L' : view === 'risk' ? '⚠ Risk' : view}
            </button>
          ))}
        </div>

        {/* Date Range Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All Time' },
            { value: '30d', label: '30 Days' },
            { value: '7d', label: '7 Days' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'today', label: 'Today' }
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
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>$ TRADED</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>${totalTraded.toLocaleString()}</div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>HOLD %</div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              color: holdPercentage >= 0 ? '#10b981' : '#ef4444',
              fontFamily: 'Inter, sans-serif'
            }}>
              {holdPercentage >= 0 ? '+' : ''}{holdPercentage.toFixed(2)}%
            </div>
          </div>
          
          <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>TRADES/DAY</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{tradesPerDay.toFixed(1)}</div>
          </div>
        </div>

        {/* Cumulative PNL Chart */}
        {(activeView === 'all' || activeView === 'daily') && filteredDailyWithCum.length > 0 && (
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
              <ComposedChart data={filteredDailyWithCum}>
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
            </div>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>AVERAGE TRADE TIME</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#e8e6e3', fontFamily: 'Inter, sans-serif' }}>{summaryData.avgTime}</div>
            </div>
            <div className="stat-card" style={{ padding: '24px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>AVERAGE ALPHA</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#D4AF37', fontFamily: 'Inter, sans-serif' }}>{summaryData.avgEdge.toFixed(2)}%</div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* RISK MODULE VIEW                                              */}
        {/* ============================================================ */}
        {activeView === 'risk' && (
          <div>
            {/* Risk Header */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                  Risk Management Module
                </h2>
                <div style={{
                  padding: '4px 16px',
                  borderRadius: '20px',
                  background: `${riskLevel.color}22`,
                  border: `1px solid ${riskLevel.color}`,
                  color: riskLevel.color,
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {riskLevel.label} RISK
                </div>
              </div>
              <p style={{ color: '#64748b', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                All metrics are % based • Calculated from {filteredBets.length} confirmed trades across {riskDaily.length} trading days
              </p>
            </div>

            {/* Risk Score Gauge */}
            <div className="card" style={{ borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#D4AF37', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                  Portfolio Risk Score
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                  Composite of Drawdown, Sharpe & VaR
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>0 — LOW</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>100 — HIGH</span>
                  </div>
                  <div style={{ height: '12px', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${riskScore}%`,
                      background: `linear-gradient(90deg, #10b981, #F5A623, #ef4444)`,
                      borderRadius: '6px',
                      transition: 'width 1s ease'
                    }} />
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    {[25, 50, 75].map(mark => (
                      <div key={mark} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
                        |
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div style={{ fontSize: '48px', fontWeight: '900', color: riskLevel.color, fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>
                    {riskScore.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '11px', color: riskLevel.color, fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>
                    {riskLevel.label}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Key Risk Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              
              {/* Max Drawdown Card */}
              <div className="card" style={{ borderRadius: '16px', padding: '28px', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em', marginBottom: '4px' }}>MAX DRAWDOWN</div>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>
                      -{maxDrawdown.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>PEAK TO TROUGH</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Current Drawdown</span>
                    <span style={{ fontSize: '11px', color: currentDrawdownPct > 5 ? '#ef4444' : '#10b981', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                      -{currentDrawdownPct.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Status</span>
                    <span style={{ fontSize: '11px', color: currentDrawdownPct === 0 ? '#10b981' : '#F5A623', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                      {currentDrawdownPct === 0 ? '✓ AT PEAK' : '↓ IN DRAWDOWN'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sharpe Ratio Card */}
              <div className="card" style={{ borderRadius: '16px', padding: '28px', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em', marginBottom: '4px' }}>SHARPE RATIO</div>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: sharpeRatio >= 2 ? '#10b981' : sharpeRatio >= 1 ? '#F5A623' : '#ef4444', fontFamily: 'Inter, sans-serif' }}>
                      {sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <div style={{ fontSize: '10px', color: '#D4AF37', fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>ANNUALISED</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Avg Daily Return</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>{avgDailyReturn.toFixed(2)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Daily Volatility</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>{stdDev.toFixed(2)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Rating</span>
                    <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600',
                      color: sharpeRatio >= 2 ? '#10b981' : sharpeRatio >= 1 ? '#F5A623' : '#ef4444' }}>
                      {sharpeRatio >= 3 ? '★ EXCEPTIONAL' : sharpeRatio >= 2 ? '✓ EXCELLENT' : sharpeRatio >= 1 ? '~ GOOD' : '⚠ POOR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* VaR Card */}
              <div className="card" style={{ borderRadius: '16px', padding: '28px', borderColor: 'rgba(249, 115, 22, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em', marginBottom: '4px' }}>VALUE AT RISK</div>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: '#f97316', fontFamily: 'Inter, sans-serif' }}>
                      -{var95.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                    <div style={{ fontSize: '10px', color: '#f97316', fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>95% CONFIDENCE</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>99% VaR (1-day)</span>
                    <span style={{ fontSize: '11px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>-{var99.toFixed(2)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Method</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>HISTORICAL SIM</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Sample Days</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>{dailyReturns.length}</span>
                  </div>
                </div>
              </div>

              {/* Kelly Criterion Card */}
              <div className="card" style={{ borderRadius: '16px', padding: '28px', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontWeight: '500', letterSpacing: '0.05em', marginBottom: '4px' }}>KELLY CRITERION</div>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: '#10b981', fontFamily: 'Inter, sans-serif' }}>
                      {kellyCriterion.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '10px', color: '#10b981', fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>FULL KELLY</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>0.3 Kelly (Your Strategy)</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>{thirdKelly.toFixed(2)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Half Kelly</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>{halfKelly.toFixed(2)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Avg Bet Size (Col N)</span>
                    <span style={{ fontSize: '11px', 
                      color: actualBetPct <= thirdKelly ? '#10b981' : actualBetPct <= kellyCriterion ? '#F5A623' : '#ef4444',
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                      ${avgBetAmount.toLocaleString(undefined, {maximumFractionDigits: 0})} {actualBetPct <= thirdKelly ? '✓' : actualBetPct <= kellyCriterion ? '~' : '⚠'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawdown Chart */}
            {drawdownSeries.length > 1 && (
              <div className="card" style={{ borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#ef4444', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                    Drawdown Profile
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                    % decline from rolling peak
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={drawdownSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.3)" tick={{ fill: '#94a3b8', fontSize: 10 }} style={{ fontFamily: 'JetBrains Mono, monospace' }} />
                    <YAxis stroke="rgba(148, 163, 184, 0.3)" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(15,20,25,0.95)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                      labelStyle={{ color: '#ef4444', fontWeight: '600' }}
                      formatter={(value) => [`${value.toFixed(2)}%`, 'Drawdown']}
                    />
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="rgba(239,68,68,0.15)" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Return Distribution */}
            {returnBuckets.some(b => b.count > 0) && (
              <div className="card" style={{ borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#D4AF37', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                    Daily Return Distribution
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                    % return per trading day
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={returnBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="range" stroke="rgba(148, 163, 184, 0.3)" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis stroke="rgba(148, 163, 184, 0.3)" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(15,20,25,0.95)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                      labelStyle={{ color: '#D4AF37', fontWeight: '600' }}
                      formatter={(value) => [value, 'Days']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}
                      fill="#D4AF37"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Risk Summary Table */}
            <div className="card" style={{ borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#D4AF37', fontFamily: 'Inter, sans-serif', marginBottom: '20px' }}>
                Risk Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, status: winRate >= 55 ? 'good' : winRate >= 50 ? 'ok' : 'warn' },
                  { label: 'Sharpe Ratio', value: sharpeRatio.toFixed(2), status: sharpeRatio >= 2 ? 'good' : sharpeRatio >= 1 ? 'ok' : 'warn' },
                  { label: 'Max Drawdown', value: `-${maxDrawdown.toFixed(2)}%`, status: maxDrawdown < 10 ? 'good' : maxDrawdown < 20 ? 'ok' : 'warn' },
                  { label: 'Current Drawdown', value: `-${currentDrawdownPct.toFixed(2)}%`, status: currentDrawdownPct < 5 ? 'good' : currentDrawdownPct < 15 ? 'ok' : 'warn' },
                  { label: '95% VaR (1-day)', value: `-${var95.toFixed(2)}%`, status: var95 < 5 ? 'good' : var95 < 10 ? 'ok' : 'warn' },
                  { label: '99% VaR (1-day)', value: `-${var99.toFixed(2)}%`, status: var99 < 10 ? 'good' : var99 < 20 ? 'ok' : 'warn' },
                  { label: 'Full Kelly', value: `${kellyCriterion.toFixed(2)}%`, status: 'ok' },
                  { label: '0.3 Kelly (Your Strategy)', value: `${thirdKelly.toFixed(2)}%`, status: 'good' },
                  { label: 'Half Kelly', value: `${halfKelly.toFixed(2)}%`, status: 'good' },
                  { label: 'Daily Volatility', value: `${stdDev.toFixed(2)}%`, status: stdDev < 5 ? 'good' : stdDev < 10 ? 'ok' : 'warn' },
                  { label: 'Avg Daily Return', value: `${avgDailyReturn.toFixed(2)}%`, status: avgDailyReturn > 0 ? 'good' : 'warn' },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: '8px',
                    background: 'rgba(26, 31, 46, 0.4)',
                    border: '1px solid rgba(148, 163, 184, 0.08)'
                  }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#e8e6e3', fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</span>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: item.status === 'good' ? '#10b981' : item.status === 'ok' ? '#F5A623' : '#ef4444'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
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
