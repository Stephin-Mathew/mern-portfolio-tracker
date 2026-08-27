import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useWallets } from '../context/WalletContext';
import {
  Wallet,
  LayoutDashboard,
  LineChart,
  Layers,
  Plus,
  LogOut,
  User,
  ChevronRight,
  Coins,
  Shield,
  CreditCard,
  Landmark,
  Vault,
  X,
  Sun,
  Moon,
} from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet,
  coins: Coins,
  shield: Shield,
  'credit-card': CreditCard,
  landmark: Landmark,
  vault: Vault,
};

export const Sidebar = ({ isOpen, onClose, onOpenAddWalletModal }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { wallets } = useWallets();
  const location = useLocation();

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Mobile Overlay backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 dark:bg-[#0d121f] bg-white border-r dark:border-slate-800/80 border-slate-200/90 flex flex-col justify-between transition-all duration-300 ease-in-out shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header / Brand */}
        <div className="p-5 border-b dark:border-slate-800/80 border-slate-200 flex items-center justify-between">
          <Link to="/" onClick={onClose} className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-heading font-extrabold text-lg dark:text-white text-slate-900">
                  Apex<span className="text-cyan-500 dark:text-cyan-400">Portfolio</span>
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Multi-Wallet AI
              </span>
            </div>
          </Link>

          {/* Close drawer button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Main Views */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Overview
            </span>

            <NavLink
              to="/"
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Dashboard</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                Main
              </span>
            </NavLink>

            <NavLink
              to="/analytics"
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <LineChart className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Analytics & Charts</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold">
                Chart Study
              </span>
            </NavLink>

            <NavLink
              to="/wallets"
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>All Wallets</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
                {wallets.length}
              </span>
            </NavLink>
          </div>

          {/* Wallets Quick Links Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Your Wallets
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAddWalletModal();
                }}
                className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            {wallets.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center border border-dashed dark:border-slate-800 border-slate-300">
                No wallets created yet
              </div>
            ) : (
              wallets.map((wallet) => {
                const IconComp = ICON_MAP[wallet.icon] || Wallet;
                const accentColor = wallet.color || '#06b6d4';
                const isActive = location.pathname === `/wallets/${wallet._id}`;

                return (
                  <Link
                    key={wallet._id}
                    to={`/wallets/${wallet._id}`}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'dark:bg-slate-800 bg-slate-100 dark:text-white text-slate-900 font-bold border dark:border-slate-700 border-slate-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate max-w-[150px]">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <IconComp
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: isActive ? accentColor : '#64748b' }}
                      />
                      <span className="truncate">{wallet.name}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-600'
                      }`}
                    />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* User Account / Footer */}
        <div className="p-4 border-t dark:border-slate-800/80 border-slate-200 dark:bg-slate-950/40 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5 truncate pr-2">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'User avatar'}
                  className="w-8 h-8 rounded-xl object-cover border border-cyan-500/30 ring-1 ring-cyan-500/20 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-bold dark:text-slate-200 text-slate-800 truncate">
                  {user?.fullName || user?.email || 'Authenticated User'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'Clerk Session'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Theme switcher pill */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-300 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-500 transition cursor-pointer shadow-xs"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch to Light Theme</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Switch to Dark Theme</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

