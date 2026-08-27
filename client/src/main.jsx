import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key in client/.env');
}

function ClerkWithTheme({ children }) {
  const { isDark } = useTheme();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
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
          card: isDark
            ? 'bg-[#0d121f] border border-slate-800 shadow-2xl rounded-2xl'
            : 'bg-white border border-slate-200 shadow-xl rounded-2xl',
          formButtonPrimary:
            'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer',
          footerActionLink: isDark
            ? 'text-cyan-400 hover:text-cyan-300 font-semibold'
            : 'text-cyan-600 hover:text-cyan-700 font-semibold',
          modalBackdrop: isDark
            ? 'bg-slate-950/80 backdrop-blur-md'
            : 'bg-slate-900/40 backdrop-blur-md',
          headerTitle: isDark ? 'text-white font-heading font-bold' : 'text-slate-900 font-heading font-bold',
          headerSubtitle: isDark ? 'text-slate-400' : 'text-slate-600',
          socialButtonsBlockButton: isDark
            ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700',
          formFieldLabel: isDark ? 'text-slate-300 font-semibold text-xs' : 'text-slate-700 font-semibold text-xs',
          formFieldInput: isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
          dividerText: isDark ? 'text-slate-500' : 'text-slate-400',
          dividerLine: isDark ? 'bg-slate-800' : 'bg-slate-200',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClerkWithTheme>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ClerkWithTheme>
    </ThemeProvider>
  </React.StrictMode>
);


