import React, { useState, useEffect } from 'react';
import { Sparkles, Wallet, TrendingUp, ShieldCheck, Activity } from 'lucide-react';

export const LoadingScreen = ({ message = 'Synchronizing your multi-wallet portfolio...' }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { label: 'Connecting to secure portfolio vault...', icon: ShieldCheck },
    { label: 'Loading wallets & connected accounts...', icon: Wallet },
    { label: 'Aggregating token holdings & balances...', icon: Sparkles },
    { label: 'Fetching live market quotes & 24h metrics...', icon: TrendingUp },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = steps[stepIndex].icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center dark:bg-[#0b0f19] bg-slate-50 transition-colors duration-500 overflow-hidden select-none">
      {/* Dynamic Ambient Background Glow Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* Main Glass Card Container */}
      <div className="glass-card relative z-10 max-w-md w-full mx-4 p-8 rounded-3xl border dark:border-slate-800/80 border-slate-200 shadow-2xl flex flex-col items-center text-center space-y-6 animate-fadeIn">
        {/* Animated Cyber Core Icon */}
        <div className="relative">
          {/* Outer Rotating Glow Ring */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[2px] animate-spin-slow shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full dark:bg-slate-950 bg-white rounded-3xl flex items-center justify-center" />
          </div>

          {/* Center Pulsing Icon */}
          <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
            <CurrentIcon className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-bounce" />
          </div>
        </div>

        {/* Branding & Status Text */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[11px] font-bold uppercase tracking-wider">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>Multi-Wallet AI Engine</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold dark:text-white text-slate-900 font-heading tracking-tight">
            Loading Your Portfolio
          </h2>

          <p className="text-xs dark:text-slate-400 text-slate-600 max-w-xs mx-auto transition-all duration-300 min-h-[32px]">
            {steps[stepIndex].label}
          </p>
        </div>

        {/* Stepped Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-2 w-full dark:bg-slate-800 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out shadow-md shadow-cyan-500/30"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-semibold dark:text-slate-500 text-slate-400 px-1">
            <span>Synchronizing</span>
            <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
