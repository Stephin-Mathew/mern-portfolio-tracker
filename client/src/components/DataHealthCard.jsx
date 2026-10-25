import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../api/axiosInstance';

function DataNote({ caption, message }) {
  return (
    <div className="data-note">
      <div className="text-caption">{caption}</div>
      <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
        {message}
      </div>
    </div>
  );
}

export function DataHealthCard({ prices = {}, onRefreshPrices }) {
  const [historyAge, setHistoryAge] = useState(null); // age of newest snapshot in minutes
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  const [minutesAgo, setMinutesAgo] = useState(null);

  useEffect(() => {
    const fetchHistoryAge = async () => {
      try {
        const res = await api.get('/portfolio/history?timeframe=24h');
        const points = res.data?.dataPoints || [];
        if (points.length > 0) {
          const newest = new Date(points[points.length - 1].timestamp).getTime();
          const ageMs = Date.now() - newest;
          setHistoryAge(Math.round(ageMs / 60000)); // in minutes
        }
      } catch {
        // silently ignore
      }
    };
    fetchHistoryAge();
  }, [lastRefreshed]);

  // Compute "Updated X min ago"
  useEffect(() => {
    const tick = () => setMinutesAgo(Math.round((Date.now() - lastRefreshed) / 60000));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [lastRefreshed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshPrices();
      setLastRefreshed(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  // Build notes from actual data
  const notes = [];

  // Prices · Fixed
  const fixedCount = Object.values(prices).filter(
    (p) => p && typeof p === 'object' && p.isCustom && !p.mappedSymbol
  ).length;
  if (fixedCount > 0) {
    notes.push({
      caption: 'Prices · Fixed',
      message: `${fixedCount} price${fixedCount !== 1 ? 's are' : ' is'} fixed to screenshot values and will not move with the market.`,
    });
  }

  // Prices · Mapped
  const mappedCount = Object.values(prices).filter(
    (p) => p && typeof p === 'object' && p.mappedSymbol
  ).length;
  if (mappedCount > 0) {
    notes.push({
      caption: 'Prices · Mapped',
      message: `${mappedCount} symbol${mappedCount !== 1 ? 's use' : ' uses'} a price mapped to another ticker instead of its own.`,
    });
  }

  // Prices · Stale (>10 min)
  const staleSymbols = Object.entries(prices)
    .filter(([, p]) => {
      if (!p || typeof p !== 'object' || !p.updatedAt) return false;
      const age = (Date.now() - new Date(p.updatedAt).getTime()) / 60000;
      return age > 10;
    })
    .map(([sym]) => sym);
  if (staleSymbols.length > 0) {
    notes.push({
      caption: 'Prices · Stale',
      message: `${staleSymbols.length} price${staleSymbols.length !== 1 ? 's' : ''} (${staleSymbols.slice(0, 3).join(', ')}${staleSymbols.length > 3 ? '…' : ''}) ${staleSymbols.length !== 1 ? 'are' : 'is'} older than 10 minutes.`,
    });
  }

  // History · Hourly (show age of newest snapshot)
  if (historyAge !== null) {
    notes.push({
      caption: 'History · Hourly',
      message: `Last snapshot saved ${historyAge} minute${historyAge !== 1 ? 's' : ''} ago.`,
    });
  }

  // All healthy
  if (notes.length === 0) {
    notes.push({ caption: 'Status', message: 'All data looks healthy.' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, flexShrink: 0 }}>
        <h2 className="card-title">Data Health</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 0',
          }}
          title="Refresh prices"
        >
          <RefreshCw
            size={12}
            style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
          />
          Updated {minutesAgo ?? 0} min ago
        </button>
      </div>

      {/* Notes list */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          paddingRight: 6,
          marginRight: -6,
          marginTop: 2,
        }}
      >
        {notes.map((note, i) => (
          <DataNote key={i} caption={note.caption} message={note.message} />
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
