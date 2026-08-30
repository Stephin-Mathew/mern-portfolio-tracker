import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchWallets = useCallback(async () => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setWallets([]);
      setUnassignedCount(0);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/wallets');
      setWallets(res.data.wallets || []);
      setUnassignedCount(res.data.unassignedCount || 0);
    } catch (err) {
      console.warn('Fetch wallets error:', err.message);
      // Don't silently swallow — re-throw so callers can handle retry
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // NOTE: No auto-fetch useEffect here. App.jsx is the single orchestrator
  // that calls fetchWallets() at the right time after token is ready.
  // This prevents the race condition where WalletContext and App.jsx both
  // fire competing fetch requests on login.

  const createWallet = async (walletData) => {
    const res = await api.post('/wallets', walletData);
    const newWallet = res.data.wallet;
    setWallets((prev) => [newWallet, ...prev]);
    return newWallet;
  };

  const updateWallet = async (id, updates) => {
    const res = await api.patch(`/wallets/${id}`, updates);
    const updated = res.data.wallet;
    setWallets((prev) => prev.map((w) => (w._id === id ? { ...w, ...updated } : w)));
    return updated;
  };

  const deleteWallet = async (id) => {
    await api.delete(`/wallets/${id}`);
    setWallets((prev) => prev.filter((w) => w._id !== id));
    fetchWallets();
  };

  return (
    <WalletContext.Provider
      value={{
        wallets,
        unassignedCount,
        loading,
        fetchWallets,
        createWallet,
        updateWallet,
        deleteWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallets() {
  return useContext(WalletContext);
}
