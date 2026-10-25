import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWallets } from '../context/WalletContext';
import { useCurrency } from '../context/CurrencyContext';
import { getWalletColor } from '../utils/assetColors';
import { Wallet, Plus, Edit2, Trash2, ChevronRight, Coins, Landmark, CreditCard, Vault, Shield, IndianRupee } from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet,
  coins: Coins,
  shield: Shield,
  'credit-card': CreditCard,
  landmark: Landmark,
  vault: Vault,
  rupee: IndianRupee,
};

export const WalletsPage = ({
  holdings,
  prices,
  onOpenAddWallet,
  onOpenEditWallet,
  onDeleteWallet,
}) => {
  const { wallets, deleteWallet, loading } = useWallets();
  const { fmt } = useCurrency();
  const inrRate = Number(prices.INR?.price || prices.INR?.rate || 95.7);

  // ── Business logic UNCHANGED ─────────────────────────────────────
  const calculateWalletStats = (walletId) => {
    let totalValue = 0;
    let totalCost = 0;
    let cryptoVal = 0;
    let stockVal = 0;
    let cashVal = 0;
    let wallet24hPnL = 0;

    const walletHoldings = holdings.filter(
      (h) => h.walletId && h.walletId.toString() === walletId.toString()
    );

    walletHoldings.forEach((h) => {
      let currentPrice = 0;
      let ch24 = 0;
      const entry = prices[h.symbol];

      const isINR =
        h.assetType === 'mutual_fund' ||
        h.currency === 'INR' ||
        entry?.currency === 'INR' ||
        (entry?.priceInr != null && entry.priceInr > 0) ||
        (entry?.navInr != null && entry.navInr > 0) ||
        h.symbol?.endsWith('.NS') ||
        h.symbol?.endsWith('.BO');

      if (h.assetType === 'cash') {
        currentPrice = 1;
      } else if (entry !== undefined) {
        if (typeof entry === 'object') {
          currentPrice = Number(entry.price || 0);
          ch24 = Number(entry.change24h || 0);
        } else {
          currentPrice = Number(entry) || 0;
        }
      } else {
        currentPrice = isINR && inrRate > 0 ? (Number(h.avgBuyPrice) || 0) / inrRate : (Number(h.avgBuyPrice) || 0);
      }

      const qty = Number(h.quantity) || 0;
      const val = qty * currentPrice;
      totalValue += val;

      if (h.assetType === 'crypto') {
        cryptoVal += val;
        const start24 = ch24 !== 0 ? currentPrice / (1 + ch24 / 100) : currentPrice;
        wallet24hPnL += qty * (currentPrice - start24);
      } else if (h.assetType === 'stock' || h.assetType === 'mutual_fund') {
        stockVal += val;
        const rawCost = qty * (Number(h.avgBuyPrice) || 0);
        const cost = isINR && inrRate > 0 ? rawCost / inrRate : rawCost;
        totalCost += cost;
        const start24 = ch24 !== 0 ? currentPrice / (1 + ch24 / 100) : currentPrice;
        wallet24hPnL += qty * (currentPrice - start24);
      } else if (h.assetType === 'cash') {
        cashVal += val;
      }
    });

    const startBasis = totalValue - wallet24hPnL;
    const pnlPct = startBasis > 0 ? (wallet24hPnL / startBasis) * 100 : 0;

    return {
      totalValue,
      totalCost,
      pnl: wallet24hPnL,
      pnlPct,
      count: walletHoldings.length,
      cryptoVal,
      stockVal,
      cashVal,
    };
  };

  const sortedWalletsWithStats = useMemo(() => {
    return wallets
      .map((wallet) => ({ wallet, stats: calculateWalletStats(wallet._id) }))
      .sort((a, b) => {
        const diff = (b.stats.totalValue || 0) - (a.stats.totalValue || 0);
        if (Math.abs(diff) > 0.0001) return diff;
        return (a.wallet.name || '').localeCompare(b.wallet.name || '');
      });
  }, [wallets, holdings, prices]);

  const handleDelete = async (wallet, count) => {
    if (onDeleteWallet) {
      onDeleteWallet(wallet, count);
    } else if (window.confirm(`Delete wallet "${wallet.name}"? All assets will be deleted.`)) {
      await deleteWallet(wallet._id);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card shimmer" style={{ height: 240 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: 'var(--text-primary)' }}>Wallets</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} · Manage accounts, view per-wallet metrics
          </p>
        </div>
        <button className="btn-primary" onClick={onOpenAddWallet}>
          <Plus size={15} />
          Add Wallet
        </button>
      </div>

      {/* Empty state */}
      {wallets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--neutral-chip-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Wallet size={24} color="var(--text-muted)" />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            No Wallets Yet
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, marginInline: 'auto' }}>
            Create wallets for Binance, MetaMask, Ledger, Robinhood, or any account to get started.
          </p>
          <button className="btn-primary" onClick={onOpenAddWallet} style={{ margin: '0 auto' }}>
            <Plus size={15} />
            Create First Wallet
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {sortedWalletsWithStats.map(({ wallet, stats }, idx) => {
            const IconComp = ICON_MAP[wallet.icon] || Wallet;
            const accentColor = getWalletColor(wallet, wallets);
            const isProfit = stats.pnl >= 0;

            const cryptoPct = stats.totalValue > 0 ? (stats.cryptoVal / stats.totalValue) * 100 : 0;
            const stockPct = stats.totalValue > 0 ? (stats.stockVal / stats.totalValue) * 100 : 0;
            const cashPct = stats.totalValue > 0 ? (stats.cashVal / stats.totalValue) * 100 : 0;

            return (
              <div
                key={wallet._id}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 0, overflow: 'hidden' }}
              >
                {/* Accent top bar */}
                <div style={{ height: 4, background: accentColor }} />

                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Row: icon + name + actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: `${accentColor}22`,
                          border: `1px solid ${accentColor}44`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={18} style={{ color: accentColor }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{wallet.name}</div>
                        <span className="chip chip-neutral" style={{ fontSize: 10, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                          {wallet.type}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => onOpenEditWallet(wallet)}
                        title="Edit wallet"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: '1px solid var(--card-border)',
                          background: 'var(--shell-bg)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-muted)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-border)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--shell-bg)'; }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(wallet, stats.count)}
                        title="Delete wallet"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: '1px solid var(--negative-bg)',
                          background: 'var(--negative-bg)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--negative)',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {wallet.description && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                      {wallet.description}
                    </p>
                  )}

                  {/* Valuation block */}
                  <div
                    style={{
                      background: 'var(--shell-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: 12,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      {wallet.type === 'cash' ? 'Total Cash Balance' : 'Total Valuation'}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                      {fmt(stats.totalValue)}
                    </div>
                    {stats.count > 0 && wallet.type !== 'cash' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Today's P&L</span>
                        <span style={{ fontWeight: 500, color: isProfit ? 'var(--positive)' : 'var(--negative)' }}>
                          {isProfit ? '+' : ''}{stats.pnlPct.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {wallet.type === 'cash' && stats.count > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {stats.count} cash entr{stats.count === 1 ? 'y' : 'ies'}
                      </div>
                    )}
                  </div>

                  {/* Asset mix bar */}
                  {stats.totalValue > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                        <span>Asset Mix</span>
                        <span style={{ fontWeight: 500 }}>{stats.count} assets</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--wallet-track, #EEEFF2)', display: 'flex' }}>
                        {cryptoPct > 0 && <div style={{ flex: cryptoPct, background: '#2DD4BF', minWidth: 2 }} title={`Crypto ${cryptoPct.toFixed(0)}%`} />}
                        {stockPct > 0 && <div style={{ flex: stockPct, background: '#818CF8', minWidth: 2 }} title={`Stocks ${stockPct.toFixed(0)}%`} />}
                        {cashPct > 0 && <div style={{ flex: cashPct, background: '#A3E635', minWidth: 2 }} title={`Cash ${cashPct.toFixed(0)}%`} />}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer link */}
                <Link
                  to={`/wallets/${wallet._id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderTop: '1px solid var(--divider-2)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    background: 'var(--shell-bg)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-border)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--shell-bg)'; }}
                >
                  <span>View wallet</span>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
