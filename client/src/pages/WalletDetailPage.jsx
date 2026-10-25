import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWallets } from '../context/WalletContext';
import { useCurrency } from '../context/CurrencyContext';
import { getWalletColor } from '../utils/assetColors';
import { HoldingsTable } from '../components/HoldingsTable';
import {
  ArrowLeft, Wallet, Plus, Edit2, Trash2,
  Coins, Landmark, CreditCard, Vault, Shield, IndianRupee,
} from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet,
  coins: Coins,
  shield: Shield,
  'credit-card': CreditCard,
  landmark: Landmark,
  vault: Vault,
  rupee: IndianRupee,
};

export const WalletDetailPage = ({
  holdings,
  prices,
  onUpdateHolding,
  onDeleteHolding,
  onEditClick,
  onOpenAddModalWithWallet,
  onOpenEditWallet,
  onDeleteWallet,
  onClearWalletHoldings,
  onUpdatePrice,
  onResetPrice,
  rowStatuses,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallets, deleteWallet, loading: walletsLoading } = useWallets();
  const { fmt } = useCurrency();

  const wallet = wallets.find((w) => w._id === id);
  const inrRate = Number(prices.INR?.price || prices.INR?.rate || 95.7);

  // ── Business logic UNCHANGED ─────────────────────────────────────
  const walletHoldings = holdings.filter(
    (h) => h.walletId && h.walletId.toString() === id
  );

  let totalValue = 0;
  let totalStockCost = 0;
  let cryptoVal = 0;
  let stockVal = 0;
  let mutualFundVal = 0;
  let cashVal = 0;
  let wallet24hPnL = 0;

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
      if (h.assetType === 'stock') stockVal += val;
      else mutualFundVal += val;
      const rawCost = qty * (Number(h.avgBuyPrice) || 0);
      const cost = isINR && inrRate > 0 ? rawCost / inrRate : rawCost;
      totalStockCost += cost;
      const start24 = ch24 !== 0 ? currentPrice / (1 + ch24 / 100) : currentPrice;
      wallet24hPnL += qty * (currentPrice - start24);
    } else if (h.assetType === 'cash') {
      cashVal += val;
    }
  });

  const startBasis = totalValue - wallet24hPnL;
  const pnlPercent = startBasis > 0 ? (wallet24hPnL / startBasis) * 100 : 0;
  const isPositive = wallet24hPnL >= 0;

  const handleDeleteWallet = async () => {
    if (!wallet) return;
    if (onDeleteWallet) {
      onDeleteWallet(wallet, walletHoldings.length);
    } else if (window.confirm(`Delete wallet "${wallet.name}"? All ${walletHoldings.length} assets will be deleted.`)) {
      await deleteWallet(wallet._id);
      navigate('/wallets');
    }
  };
  // ── End business logic ────────────────────────────────────────────

  if (walletsLoading) {
    return (
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card shimmer" style={{ height: 180 }} />
        <div className="card shimmer" style={{ height: 320 }} />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--negative-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Wallet size={24} color="var(--negative)" />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Wallet Not Found</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>This wallet does not exist or has been deleted.</p>
          <Link
            to="/wallets"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none' }}
          >
            <ArrowLeft size={14} />
            Back to Wallets
          </Link>
        </div>
      </div>
    );
  }

  const IconComp = ICON_MAP[wallet.icon] || Wallet;
  const accentColor = getWalletColor(wallet, wallets);

  return (
    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Breadcrumb + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Link
          to="/wallets"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <ArrowLeft size={14} />
          Wallets
        </Link>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onOpenEditWallet(wallet)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10,
              border: '1px solid var(--card-border)',
              background: 'var(--shell-bg)',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Edit2 size={12} />
            Edit
          </button>
          <button
            onClick={handleDeleteWallet}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10,
              border: '1px solid var(--negative-bg)',
              background: 'var(--negative-bg)',
              color: 'var(--negative)',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>

      {/* Wallet banner card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Accent bar */}
        <div style={{ height: 4, background: accentColor }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Icon + name row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${accentColor}22`,
                  border: `1px solid ${accentColor}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComp size={22} style={{ color: accentColor }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{wallet.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className="chip chip-neutral" style={{ fontSize: 10, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '.4px' }}>{wallet.type}</span>
                  {wallet.description && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wallet.description}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => onOpenAddModalWithWallet(wallet._id)}
              style={{ flexShrink: 0 }}
            >
              <Plus size={15} />
              Add Asset
            </button>
          </div>

          {/* Metrics grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid var(--divider-2)',
            }}
          >
            {/* Net Worth */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
                Net Worth
              </div>
              <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {fmt(totalValue)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Across {walletHoldings.length} asset{walletHoldings.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* 24h PnL */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
                24h Return
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', color: isPositive ? 'var(--positive)' : 'var(--negative)' }}>
                  {isPositive ? '+' : ''}{fmt(wallet24hPnL)}
                </div>
                <span className={`chip ${isPositive ? 'chip-positive' : 'chip-negative'}`} style={{ fontSize: 11 }}>
                  {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                {totalStockCost > 0 ? `Invested: ${fmt(totalStockCost)}` : 'Live market tracking'}
              </div>
            </div>

            {/* Asset breakdown */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
                Asset Types
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {cryptoVal > 0 && <span className="chip chip-neutral">{fmt(cryptoVal)} Crypto</span>}
                {stockVal > 0 && <span className="chip chip-neutral">{fmt(stockVal)} Stocks</span>}
                {mutualFundVal > 0 && <span className="chip chip-neutral">{fmt(mutualFundVal)} Funds</span>}
                {cashVal > 0 && <span className="chip chip-neutral">{fmt(cashVal)} Cash</span>}
                {totalValue === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No assets recorded</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
              Holdings
            </h2>
            <span className="chip chip-neutral">{walletHoldings.length}</span>
          </div>

          {walletHoldings.length > 0 && onClearWalletHoldings && (
            <button
              onClick={() => onClearWalletHoldings(wallet, walletHoldings.length)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 10,
                border: '1px solid var(--negative-bg)',
                background: 'var(--negative-bg)',
                color: 'var(--negative)',
                fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Trash2 size={12} />
              Clear All
            </button>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <HoldingsTable
            holdings={walletHoldings}
            prices={prices}
            onUpdateHolding={onUpdateHolding}
            onDeleteHolding={onDeleteHolding}
            onEditClick={onEditClick}
            onUpdatePrice={onUpdatePrice}
            onResetPrice={onResetPrice}
            rowStatuses={rowStatuses}
            walletType={wallet?.type}
            hideBuyPrice={wallet?.type === 'crypto'}
          />
        </div>
      </div>
    </div>
  );
};
