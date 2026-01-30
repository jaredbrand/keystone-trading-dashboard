import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function TradingDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Parse the trading data
  const trades = [
    { game: 505, sport: "NBA", fixture: "CLE @ NYK", date: "22-October-2025", market: "Handicap", selection: "CLE", handicap: -2.5, odds: 2.09, margin: 14.21, betAmount: 3910, outcome: "Loss", pnl: -3910 },
    { game: 524, sport: "NBA", fixture: "SAS @ DAL", date: "22-October-2025", market: "Handicap", selection: "DAL", handicap: -3, odds: 1.97, margin: 9.44, betAmount: 2921, outcome: "Loss", pnl: -2921 },
    { game: 513, sport: "NBA", fixture: "PHI @ BOS", date: "22-October-2025", market: "Moneyline", selection: "PHI", handicap: null, odds: 2.69, margin: 16.96, betAmount: 3010, outcome: "Win", pnl: 5087 },
    { game: 513, sport: "NBA", fixture: "PHI @ BOS", date: "22-October-2025", market: "Handicap", selection: "PHI", handicap: 5.5, odds: 1.925, margin: 9.38, betAmount: 3041, outcome: "Win", pnl: 2813 },
    { game: 522, sport: "NBA", fixture: "LAC @ UTA", date: "22-October-2025", market: "Handicap", selection: "UTA", handicap: 9.5, odds: 1.87, margin: 10.00, betAmount: 3448, outcome: "Win", pnl: 3000 },
    { game: 531, sport: "NBA", fixture: "DEN @ GSW", date: "23-October-2025", market: "Total", selection: "Under", handicap: 232.5, odds: 2.04, margin: 5.15, betAmount: 1487, outcome: "Loss", pnl: -1487 },
    { game: 535, sport: "NBA", fixture: "CLE @ BKN", date: "24-October-2025", market: "First Half Total", selection: "Over", handicap: 111.5, odds: 2.01, margin: 5.79, betAmount: 1720, outcome: "Win", pnl: 1737 },
    { game: 539, sport: "NBA", fixture: "MIL @ TOR", date: "24-October-2025", market: "Handicap", selection: "MIL", handicap: -2.5, odds: 2.41, margin: 12.09, betAmount: 2573, outcome: "Win", pnl: 3628 },
    { game: 534, sport: "NBA", fixture: "ATL @ ORL", date: "24-October-2025", market: "Handicap", selection: "ORL", handicap: -5.5, odds: 1.89, margin: 8.00, betAmount: 2697, outcome: "Loss", pnl: -2697 },
    { game: 548, sport: "NBA", fixture: "WAS @ DAL", date: "24-October-2025", market: "Total", selection: "Under", handicap: 227.5, odds: 2.04, margin: 9.09, betAmount: 2622, outcome: "Win", pnl: 2727 },
    { game: 552, sport: "NBA", fixture: "MIN @ LAL", date: "24-October-2025", market: "Total", selection: "Over", handicap: 225.5, odds: 1.9, margin: 6.15, betAmount: 2048, outcome: "Win", pnl: 1844 },
    { game: 546, sport: "NBA", fixture: "SAS @ NOP", date: "24-October-2025", market: "First Half Total", selection: "Over", handicap: 119.5, odds: 2.02, margin: 9.78, betAmount: 2877, outcome: "Loss", pnl: -2877 },
    { game: 558, sport: "NBA", fixture: "CHI @ ORL", date: "25-October-2025", market: "Total", selection: "Over", handicap: 233, odds: 1.96, margin: 8.29, betAmount: 2590, outcome: "Loss", pnl: -2590 },
    { game: 562, sport: "NBA", fixture: "CHO @ PHI", date: "25-October-2025", market: "Handicap", selection: "PHI", handicap: -4.5, odds: 1.89, margin: 12.50, betAmount: 4213, outcome: "Loss", pnl: -4213 },
    { game: 565, sport: "NBA", fixture: "PHO @ DEN", date: "25-October-2025", market: "Total", selection: "Under", handicap: 233.5, odds: 1.99, margin: 6.99, betAmount: 2118, outcome: "Loss", pnl: -2118 },
    { game: 559, sport: "NBA", fixture: "OKC @ ATL", date: "25-October-2025", market: "Handicap", selection: "OKC", handicap: -7.5, odds: 1.87, margin: 7.47, betAmount: 2576, outcome: "Win", pnl: 2241 },
    { game: 559, sport: "NBA", fixture: "OKC @ ATL", date: "25-October-2025", market: "Total", selection: "Under", handicap: 237.5, odds: 1.99, margin: 11.17, betAmount: 3386, outcome: "Win", pnl: 3352 },
    { game: 511, sport: "NBA", fixture: "IND @ MIN", date: "26-October-2025", market: "Total", selection: "Under", handicap: 227.5, odds: 1.98, margin: 10.00, betAmount: 3061, outcome: "Win", pnl: 3000 },
    { game: 517, sport: "NBA", fixture: "POR @ LAC", date: "26-October-2025", market: "First Half Total", selection: "Over", handicap: 113.5, odds: 1.85, margin: 8.19, betAmount: 2890, outcome: "Win", pnl: 2456 },
    { game: 525, sport: "NBA", fixture: "BKN @ HOU", date: "27-October-2025", market: "Total", selection: "Over", handicap: 225, odds: 1.99, margin: 9.94, betAmount: 3014, outcome: "Win", pnl: 2983 }
  ];

  // Calculate cumulative P&L over time
  let cumulativePnL = 0;
  const pnlOverTime = trades.map((trade, idx) => {
    cumulativePnL += trade.pnl;
    return {
      trade: idx + 1,
      pnl: cumulativePnL,
      date: trade.date
    };
  });

  // Calculate stats
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.outcome === "Win").length;
  const losses = trades.filter(t => t.outcome === "Loss").length;
  const winRate = ((wins / totalTrades) * 100).toFixed(1);
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalRisked = trades.reduce((sum, t) => sum + t.betAmount, 0);
  const roi = ((totalPnL / totalRisked) * 100).toFixed(2);
  const avgBetSize = (totalRisked / totalTrades).toFixed(0);
  const avgWin = (trades.filter(t => t.outcome === "Win").reduce((sum, t) => sum + t.pnl, 0) / wins).toFixed(0);
  const avgLoss = Math.abs(trades.filter(t => t.outcome === "Loss").reduce((sum, t) => sum + t.pnl, 0) / losses).toFixed(0);

  // Performance by market type
  const marketTypes = ["Handicap", "Total", "Moneyline", "First Half Total"];
  const marketPerformance = marketTypes.map(market => {
    const marketTrades = trades.filter(t => t.market === market);
    const marketPnL = marketTrades.reduce((sum, t) => sum + t.pnl, 0);
    const marketWins = marketTrades.filter(t => t.outcome === "Win").length;
    const marketTotal = marketTrades.length;
    return {
      market,
      pnl: marketPnL,
      winRate: marketTotal > 0 ? ((marketWins / marketTotal) * 100).toFixed(1) : 0,
      trades: marketTotal
    };
  }).filter(m => m.trades > 0);

  // Win/Loss distribution
  const winLossData = [
    { name: 'Wins', value: wins, color: '#00ff88' },
    { name: 'Losses', value: losses, color: '#ff3366' }
  ];

  // Recent trades (last 5)
  const recentTrades = trades.slice(-5).reverse();

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
        
        .glow-box {
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3), 0 0 40px rgba(0, 255, 136, 0.2);
        }
        
        .glow-red {
          box-shadow: 0 0 20px rgba(255, 51, 102, 0.3), 0 0 40px rgba(255, 51, 102, 0.2);
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
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
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
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(100vh);
          }
        }
        
        .grid-bg {
          background-image: 
            linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      {/* Background effects */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-30" />
      <div className="scan-line pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-[#00ff88]/20 bg-[#0a0e1a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter glow" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
              QUANTUM CAPITAL
            </h1>
            <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              SPORTS TRADING DIVISION
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold glow" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-8 py-8">
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card rounded-xl p-6">
            <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>TOTAL P&L</div>
            <div className={`text-4xl font-black ${totalPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
              ${totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {totalTrades} TOTAL TRADES
            </div>
          </div>

          <div className="stat-card rounded-xl p-6">
            <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>WIN RATE</div>
            <div className="text-4xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {winRate}%
            </div>
            <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {wins}W / {losses}L
            </div>
          </div>

          <div className="stat-card rounded-xl p-6">
            <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>ROI</div>
            <div className={`text-4xl font-black ${roi >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {roi >= 0 ? '+' : ''}{roi}%
            </div>
            <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              ${totalRisked.toLocaleString()} RISKED
            </div>
          </div>

          <div className="stat-card rounded-xl p-6">
            <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>AVG BET SIZE</div>
            <div className="text-4xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              ${avgBetSize}
            </div>
            <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              AVG WIN: ${avgWin} / LOSS: ${avgLoss}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* P&L Over Time */}
          <div className="lg:col-span-2 card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                CUMULATIVE P&L
              </h2>
              <div className="pulse w-3 h-3 rounded-full bg-[#00ff88]" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pnlOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="trade" 
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                  label={{ value: 'Trade #', position: 'insideBottom', offset: -5, fill: '#666' }}
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
                  formatter={(value) => [`$${value.toLocaleString()}`, 'P&L']}
                />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#00ff88" 
                  strokeWidth={3}
                  dot={{ fill: '#00ff88', r: 4 }}
                  activeDot={{ r: 6, fill: '#00ff88', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss Distribution */}
          <div className="card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
                WIN/LOSS
              </h2>
              <div className="pulse w-3 h-3 rounded-full bg-[#00ff88]" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(10, 14, 26, 0.95)', 
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00ff88]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{wins}</div>
                <div className="text-xs text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>WINS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#ff3366]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{losses}</div>
                <div className="text-xs text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>LOSSES</div>
              </div>
            </div>
          </div>
        </div>

        {/* Market Performance */}
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
                formatter={(value, name) => {
                  if (name === 'pnl') return [`$${value.toLocaleString()}`, 'P&L'];
                  if (name === 'winRate') return [`${value}%`, 'Win Rate'];
                  if (name === 'trades') return [value, 'Trades'];
                }}
              />
              <Bar dataKey="pnl" fill="#00ff88" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Trades */}
        <div className="card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff88' }}>
              RECENT TRADES
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
                      <span>MARGIN: {trade.margin}%</span>
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

      </main>

      {/* Footer */}
      <footer className="border-t border-[#00ff88]/20 mt-12 py-6">
        <div className="max-w-[1800px] mx-auto px-8 text-center">
          <p className="text-xs text-gray-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            QUANTUM CAPITAL SPORTS TRADING DIVISION • REAL-TIME ANALYTICS ENGINE v2.1
          </p>
          <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Data Updated: {currentTime.toLocaleString()}
          </p>
        </div>
      </footer>
    </div>
  );
}
