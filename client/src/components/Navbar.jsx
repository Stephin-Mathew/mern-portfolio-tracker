import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserButton } from '@clerk/clerk-react';
import {
  Sparkles,
  Plus,
  RefreshCw,
  LogOut,
  User,
  Wallet,
  ShieldCheck,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Braces,
} from 'lucide-react';

export const Navbar = ({
  onToggleSidebar,
  onOpenAddModal,
  onOpenUploadModal,
  onOpenJsonExtractModal,
  onOpenAuthModal,
  onOpenAddWalletModal,
  onRefreshPrices,
  refreshingPrices,
  activeWalletName,
}) => {
  const { user, logout, isAuthenticated, openSignIn } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  // Extract dropdown state
  const [isExtractDropdownOpen, setIsExtractDropdownOpen] = useState(false);
  const extractDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (extractDropdownRef.current && !extractDropdownRef.current.contains(e.target)) {
        setIsExtractDropdownOpen(false);
      }
    };
    if (isExtractDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExtractDropdownOpen]);

  const handleSignIn = () => {
    if (onOpenAuthModal) {
      onOpenAuthModal();
    } else {
      openSignIn();
    }
  };

  return (
    <header className="sticky top-0 z-30 glass-panel border-b dark:border-slate-800/80 border-slate-200/90 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Section: Sidebar Toggle & App Title / Active Wallet Indicator */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl dark:bg-slate-900/80 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 border dark:border-slate-800 border-slate-300 text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-sm"
              title="Toggle Sidebar Menu"
            >
              <Menu className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
            </button>
          )}

          <div className="flex items-center space-x-2">
            {!isAuthenticated && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <span className="font-heading font-extrabold text-lg dark:text-white text-slate-900">
                Apex<span className="text-cyan-500 dark:text-cyan-400">Portfolio</span>
              </span>
              {activeWalletName && (
                <span className="hidden sm:inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  {activeWalletName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl dark:bg-slate-800/80 bg-slate-100 dark:hover:bg-slate-700/80 hover:bg-slate-200 border dark:border-slate-700/80 border-slate-300 text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-sm hover:scale-105"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-spin-once" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {isAuthenticated && (
            <>
              {/* Refresh Price Button */}
              <button
                onClick={onRefreshPrices}
                disabled={refreshingPrices}
                title="Refresh market prices"
                className="p-2 rounded-xl dark:bg-slate-800/80 bg-slate-100 dark:hover:bg-slate-700/80 hover:bg-slate-200 border dark:border-slate-700/80 border-slate-300 text-slate-700 dark:text-slate-300 dark:hover:text-white hover:text-slate-900 transition cursor-pointer disabled:opacity-50 shadow-sm hover:scale-105"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshingPrices ? 'animate-spin text-cyan-500 dark:text-cyan-400' : ''
                  }`}
                />
              </button>

              {/* Add Wallet Button */}
              {onOpenAddWalletModal && (
                <button
                  onClick={onOpenAddWalletModal}
                  className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 text-cyan-600 dark:text-cyan-400 font-semibold text-xs transition cursor-pointer shadow-sm hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span>Wallet</span>
                </button>
              )}

              {/* Extract Screenshot Dropdown */}
              <div className="relative" ref={extractDropdownRef}>
                <div className="flex items-center">
                  {/* Primary Button — opens AI Extract directly */}
                  <button
                    onClick={() => {
                      onOpenUploadModal();
                      setIsExtractDropdownOpen(false);
                    }}
                    className="flex items-center space-x-2 pl-3.5 pr-2 py-2 rounded-l-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.03] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse-slow text-cyan-100" />
                    <span className="hidden xs:inline">AI Extract</span>
                    <span className="xs:hidden">AI</span>
                  </button>
                  {/* Chevron Toggle */}
                  <button
                    onClick={() => setIsExtractDropdownOpen((prev) => !prev)}
                    className="flex items-center px-1.5 py-2 rounded-r-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-l border-white/20 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExtractDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {isExtractDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-200 shadow-2xl dark:shadow-slate-950/60 overflow-hidden z-50 animate-fadeIn">
                    <button
                      onClick={() => {
                        onOpenUploadModal();
                        setIsExtractDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-semibold dark:text-slate-200 text-slate-800 dark:hover:bg-slate-800 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">AI Extract</p>
                        <p className="text-[10px] dark:text-slate-500 text-slate-400 font-normal">Upload screenshot, auto-extract with AI</p>
                      </div>
                    </button>
                    <div className="dark:border-slate-800 border-slate-100 border-t" />
                    <button
                      onClick={() => {
                        onOpenJsonExtractModal();
                        setIsExtractDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-semibold dark:text-slate-200 text-slate-800 dark:hover:bg-slate-800 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0">
                        <Braces className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">JSON Extract</p>
                        <p className="text-[10px] dark:text-slate-500 text-slate-400 font-normal">Paste JSON from your own LLM</p>
                      </div>
                    </button>
                  </div>
                )}{/* end dropdown menu */}
              </div>{/* end dropdown wrapper */}

              {/* Add Holding Button */}
              <button
                onClick={onOpenAddModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 text-slate-800 dark:text-slate-200 dark:hover:text-white hover:text-slate-950 font-semibold text-xs sm:text-sm transition cursor-pointer shadow-sm hover:scale-102"
              >
                <Plus className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span className="hidden sm:inline">Add Holding</span>
              </button>
            </>
          )}

          {/* User Account / Auth Button */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 pl-2 border-l dark:border-slate-800 border-slate-300">
              <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl dark:bg-slate-900/60 bg-slate-100 border dark:border-slate-800 border-slate-300 text-xs dark:text-slate-300 text-slate-700 shadow-sm">
                <User className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span className="max-w-[120px] truncate">{user?.email || user?.fullName}</span>
              </div>
              <div className="flex items-center justify-center">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox:
                        'w-8 h-8 rounded-xl border dark:border-slate-700 border-slate-300 ring-2 ring-cyan-500/20 shadow-md',
                      userButtonPopoverCard:
                        'dark:bg-[#0d121f] bg-white border dark:border-slate-800 border-slate-200 shadow-2xl rounded-2xl',
                    },
                  }}
                />
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 transition cursor-pointer shadow-sm hover:scale-105"
              >
                <LogOut className="w-4 h-4 text-xs" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm transition shadow-lg shadow-cyan-500/25 cursor-pointer hover:scale-105"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


