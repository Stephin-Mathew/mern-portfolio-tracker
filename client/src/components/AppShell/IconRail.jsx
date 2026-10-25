import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWallets } from '../../context/WalletContext';
import { getWalletColor } from '../../utils/assetColors';
import {
  LayoutGrid,
  Wallet,
  BarChart2,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Plus,
  PanelLeft,
} from 'lucide-react';

// Logo tile: 40x40 dark square with rotated white square inside
function LogoTile() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'var(--btn-primary-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: 'var(--btn-primary-text)',
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
}

/** Icon rail — 64px wide, always visible on ≥1100px. */
export function IconRail({
  isSidebarCollapsed,
  onToggleCollapse,
  onOpenUploadModal,
  onOpenAddModal,
  onOpenAddWalletModal,
  onOpenJsonExtractModal,
  onRefreshPrices,
}) {
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const location = useLocation();

  const isOverview = location.pathname === '/';
  const isHoldings = location.pathname === '/holdings';
  const isWallets = location.pathname.startsWith('/wallets');
  const isAnalytics = location.pathname === '/analytics';

  // Import dropdown
  const [importOpen, setImportOpen] = useState(false);
  const importRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (importRef.current && !importRef.current.contains(e.target)) {
        setImportOpen(false);
      }
    };
    if (importOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [importOpen]);

  return (
    <nav
      className="icon-rail"
      aria-label="Main navigation"
      style={{ position: 'relative' }}
    >
      {/* Logo */}
      <Link to="/" aria-label="Home" style={{ marginBottom: 10 }}>
        <LogoTile />
      </Link>

      {/* Expand/collapse toggle */}
      <button
        className="rib"
        onClick={onToggleCollapse}
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PanelLeft size={20} strokeWidth={1.6} />
      </button>

      {/* Nav: Overview */}
      <NavLink
        to="/"
        end
        className={({ isActive }) => `rib${isActive ? ' active' : ''}`}
        title="Overview"
        aria-label="Overview"
        aria-current={isOverview ? 'page' : undefined}
      >
        <LayoutGrid size={20} strokeWidth={1.6} />
      </NavLink>

      {/* Nav: Wallets */}
      <NavLink
        to="/wallets"
        className={({ isActive }) => `rib${isActive || isWallets ? ' active' : ''}`}
        title="Wallets"
        aria-label="Wallets"
        aria-current={isWallets ? 'page' : undefined}
      >
        <Wallet size={20} strokeWidth={1.6} />
      </NavLink>

      {/* Nav: Analytics */}
      <NavLink
        to="/analytics"
        className={({ isActive }) => `rib${isActive ? ' active' : ''}`}
        title="Analytics"
        aria-label="Analytics"
        aria-current={isAnalytics ? 'page' : undefined}
      >
        <BarChart2 size={20} strokeWidth={1.6} />
      </NavLink>

      {/* Import with AI (opens dropdown) */}
      <div style={{ position: 'relative' }} ref={importRef}>
        <button
          className="rib"
          onClick={() => setImportOpen((p) => !p)}
          title="Import with AI"
          aria-label="Import with AI"
          aria-expanded={importOpen}
        >
          <Sparkles size={20} strokeWidth={1.6} />
        </button>

        {importOpen && (
          <div
            className="animate-fadeIn"
            style={{
              position: 'absolute',
              left: '52px',
              top: 0,
              zIndex: 60,
              background: 'var(--panel-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              minWidth: 220,
              overflow: 'hidden',
            }}
          >
            {[
              {
                label: 'Upload screenshot',
                sub: 'AI extracts holdings',
                action: () => { onOpenUploadModal(); setImportOpen(false); },
              },
              {
                label: 'Paste JSON',
                sub: 'Import from your LLM',
                action: () => { onOpenJsonExtractModal(); setImportOpen(false); },
              },
              {
                label: 'Add holding manually',
                sub: 'Enter details by hand',
                action: () => { onOpenAddModal(); setImportOpen(false); },
              },
              {
                label: 'Add wallet',
                sub: 'Create a new wallet',
                action: () => { onOpenAddWalletModal(); setImportOpen(false); },
              },
              {
                label: 'Refresh prices',
                sub: 'Update live market data',
                action: () => { onRefreshPrices(); setImportOpen(false); },
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderBottom: '1px solid var(--divider-2)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--shell-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        className="rib"
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun size={20} strokeWidth={1.6} /> : <Moon size={20} strokeWidth={1.6} />}
      </button>

      {/* Sign out */}
      <button
        className="rib"
        onClick={logout}
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut size={20} strokeWidth={1.6} />
      </button>
    </nav>
  );
}

/** Expanded sidebar — 240px, shows wallet quick-links. */
export function ExpandedSidebar({
  onClose,
  onOpenAddWalletModal,
  holdings,
  prices,
  wallets,
}) {
  const location = useLocation();

  return (
    <div
      className="expanded-sidebar"
      style={{
        background: 'var(--shell-bg)',
        borderRight: '1px solid var(--divider-1)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--divider-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text-caption)', fontWeight: 500 }}>
            Your Wallets
          </span>
          <button
            onClick={onOpenAddWalletModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            title="Add wallet"
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      </div>

      {/* Wallet links */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {wallets.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            No wallets yet
          </div>
        ) : (
          wallets.map((wallet, idx) => {
            const color = getWalletColor(wallet, wallets);
            const isActive = location.pathname === `/wallets/${wallet._id}`;
            return (
              <Link
                key={wallet._id}
                to={`/wallets/${wallet._id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  background: isActive ? 'var(--card-bg)' : 'transparent',
                  marginBottom: 2,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--card-bg)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {wallet.name}
                  </span>
                </div>
                {isActive && (
                  <ChevronRight size={12} color="var(--text-muted)" />
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
