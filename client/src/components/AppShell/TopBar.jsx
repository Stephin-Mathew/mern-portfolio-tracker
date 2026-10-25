import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useWallets } from '../../context/WalletContext';
import {
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Wallet as WalletIcon,
} from 'lucide-react';

/**
 * TopBar — 64px, sits at the top of the panel.
 * Left: page title. Right: user avatar + name + wallet count + chevron menu.
 */
export function TopBar({ activeWalletName, onOpenAuthModal }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { wallets } = useWallets();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Determine page title
  const getTitle = () => {
    if (activeWalletName) return activeWalletName;
    if (location.pathname === '/' || location.pathname === '/holdings' || location.pathname === '/wallets') {
      return 'Portfolio';
    }
    if (location.pathname === '/analytics') return 'Analytics';
    return 'Portfolio';
  };

  const initial = user?.firstName?.[0] || user?.fullName?.[0] || user?.email?.[0] || 'U';

  return (
    <div className="top-bar">
      {/* Left: title */}
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: 'var(--text-primary)' }}>
        {getTitle()}
      </h1>

      {/* Right: user section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isAuthenticated ? (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '4px 8px',
                borderRadius: 10,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--shell-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              aria-label="User menu"
              aria-expanded={menuOpen}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#E9ECFF',
                  color: '#3447C8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {initial.toUpperCase()}
              </div>

              {/* Name + wallet count */}
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {user?.firstName || user?.fullName?.split(' ')[0] || 'Account'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                </div>
              </div>

              <ChevronDown
                size={16}
                color="var(--text-muted)"
                style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                className="animate-fadeIn"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  zIndex: 60,
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  minWidth: 200,
                  overflow: 'hidden',
                }}
              >
                <NavLink
                  to="/wallets"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--divider-2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--shell-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <WalletIcon size={15} />
                  Manage wallets
                </NavLink>

                <button
                  onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--divider-2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--shell-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                  {isDark ? 'Switch to Light' : 'Switch to Dark'}
                </button>

                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--negative)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--shell-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="btn-primary"
            style={{ fontSize: 13 }}
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * TabBar — Overview | Holdings | Wallets tabs + currency segmented control + Import with AI button.
 * Shown only on the three main routes.
 */
export function TabBar({
  onOpenUploadModal,
  onOpenJsonExtractModal,
  onOpenAddModal,
  onOpenAddWalletModal,
  onRefreshPrices,
  refreshingPrices,
}) {
  const { currency, setCurrency, currencies } = useCurrency();
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
    <div className="tab-bar">
      {/* Tabs */}
      <div role="tablist" style={{ display: 'flex' }}>
        {[
          { to: '/', label: 'Overview', end: true },
          { to: '/holdings', label: 'Holdings', end: true },
          { to: '/wallets', label: 'Wallets', end: false },
        ].map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            role="tab"
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
            aria-current={undefined}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right: currency + import */}
      <div style={{ display: 'flex', gap: 10, padding: '8px 0', alignItems: 'center' }}>
        {/* Currency segmented control */}
        <div className="seg" role="group" aria-label="Display currency">
          {currencies.map((c) => (
            <button
              key={c}
              className={`seg-btn${currency === c ? ' active' : ''}`}
              aria-pressed={currency === c}
              onClick={() => setCurrency(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Import with AI */}
        <div style={{ position: 'relative' }} ref={importRef}>
          <button
            className="btn-primary"
            onClick={() => setImportOpen((p) => !p)}
            aria-expanded={importOpen}
            aria-label="Import with AI"
            style={{ gap: 8, fontSize: 14 }}
          >
            <Sparkles size={16} strokeWidth={1.8} />
            Import with AI
          </button>

          {importOpen && (
            <div
              className="animate-fadeIn"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                zIndex: 60,
                background: 'var(--panel-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                minWidth: 230,
                overflow: 'hidden',
              }}
            >
              {[
                {
                  label: 'Upload screenshot',
                  sub: 'AI extracts holdings with Gemini Vision',
                  action: () => { onOpenUploadModal(); setImportOpen(false); },
                },
                {
                  label: 'Paste JSON',
                  sub: 'Import structured JSON from your LLM',
                  action: () => { onOpenJsonExtractModal(); setImportOpen(false); },
                },
                {
                  label: 'Add holding manually',
                  sub: 'Enter holding details by hand',
                  action: () => { onOpenAddModal(); setImportOpen(false); },
                },
                {
                  label: 'Add wallet',
                  sub: 'Create a new portfolio wallet',
                  action: () => { onOpenAddWalletModal(); setImportOpen(false); },
                },
                {
                  label: 'Refresh prices',
                  sub: 'Update all live market prices',
                  action: () => { onRefreshPrices(); setImportOpen(false); },
                  disabled: refreshingPrices,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={item.disabled}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    borderBottom: '1px solid var(--divider-2)',
                    opacity: item.disabled ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--shell-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
