import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { useTheme } from '../context/ThemeContext';

export const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const clerkAppearance = {
    baseTheme: isDark ? dark : undefined,
    variables: {
      colorPrimary: '#06b6d4',
      colorText: isDark ? '#f8fafc' : '#0f172a',
      colorTextSecondary: isDark ? '#94a3b8' : '#64748b',
      colorBackground: isDark ? '#0d121f' : '#ffffff',
      colorInputBackground: isDark ? '#131b2e' : '#f8fafc',
      colorInputText: isDark ? '#f8fafc' : '#0f172a',
      borderRadius: '0.75rem',
    },
    elements: {
      rootBox: 'w-full',
      card: isDark
        ? 'bg-[#0d121f] border border-slate-800 shadow-2xl rounded-2xl p-6 w-full'
        : 'bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 w-full',
      headerTitle: isDark
        ? 'text-xl font-extrabold text-white font-heading'
        : 'text-xl font-extrabold text-slate-900 font-heading',
      headerSubtitle: isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500',
      socialButtonsBlockButton: isDark
        ? 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs rounded-xl py-2.5 transition'
        : 'bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium text-xs rounded-xl py-2.5 transition',
      socialButtonsBlockButtonText: isDark ? 'text-slate-200 font-medium' : 'text-slate-700 font-medium',
      dividerLine: isDark ? 'bg-slate-800' : 'bg-slate-200',
      dividerText: isDark ? 'text-slate-500 text-xs font-semibold' : 'text-slate-400 text-xs font-semibold',
      formFieldLabel: isDark
        ? 'text-xs font-semibold text-slate-300 uppercase tracking-wider'
        : 'text-xs font-semibold text-slate-700 uppercase tracking-wider',
      formFieldInput: isDark
        ? 'bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
        : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20',
      formButtonPrimary:
        'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl py-3 shadow-lg shadow-cyan-500/20 transition cursor-pointer',
      footerActionLink: isDark
        ? 'text-cyan-400 hover:text-cyan-300 font-semibold text-xs'
        : 'text-cyan-600 hover:text-cyan-700 font-semibold text-xs',
      identityPreview: isDark
        ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-xl'
        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-xl',
      identityPreviewText: isDark ? 'text-slate-200' : 'text-slate-800',
      identityPreviewEditButton: isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl transition cursor-pointer hover:scale-110"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Clerk Sign In / Sign Up Component */}
        <div className="w-full flex flex-col items-center justify-center">
          {isLogin ? (
            <SignIn routing="hash" appearance={clerkAppearance} />
          ) : (
            <SignUp routing="hash" appearance={clerkAppearance} />
          )}
        </div>

        {/* Toggle Mode Footer */}
        <div className="mt-4 flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{isLogin ? 'Need a new account?' : 'Already have an account?'}</span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer ml-1"
          >
            {isLogin ? 'Switch to Sign Up' : 'Switch to Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};


