import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { WalletProvider, useWallets } from './context/WalletContext';
import api from './api/axiosInstance';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { WalletsPage } from './pages/WalletsPage';
import { WalletDetailPage } from './pages/WalletDetailPage';
import { HoldingFormModal } from './components/HoldingFormModal';
import { WalletFormModal } from './components/WalletFormModal';
import { ScreenshotUploadModal } from './components/ScreenshotUploadModal';
import { ExtractionReviewModal } from './components/ExtractionReviewModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AuthModal } from './components/AuthModal';

function AppContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { wallets, createWallet, updateWallet, fetchWallets } = useWallets();
  const location = useLocation();

  const [holdings, setHoldings] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Detect active wallet from current URL (/wallets/:id)
  const walletPathMatch = location.pathname.match(/^\/wallets\/([a-f0-9]{24})$/i);
  const activeWalletId = walletPathMatch ? walletPathMatch[1] : '';
  const activeWallet = wallets.find((w) => w._id === activeWalletId);

  // Tab Filtering ('all' | 'crypto' | 'stock' | 'cash')
  const [activeTab, setActiveTab] = useState('all');

  // Optimistic UI tracking per row ID
  const [rowStatuses, setRowStatuses] = useState({});

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [holdingToEdit, setHoldingToEdit] = useState(null);
  const [walletToEdit, setWalletToEdit] = useState(null);
  const [targetWalletId, setTargetWalletId] = useState('');
  const [extractedData, setExtractedData] = useState([]);
  const [extractionTier, setExtractionTier] = useState(null);
  const [extractionRawText, setExtractionRawText] = useState('');
  const [manualFallback, setManualFallback] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch holdings & prices from API
  const fetchPortfolioData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const holdingsRes = await api.get('/holdings');
      const fetchedHoldings = holdingsRes.data.holdings || [];
      setHoldings(fetchedHoldings);

      // Fetch live market quotes for symbols present in user's portfolio
      const symbols = [...new Set(fetchedHoldings.map((h) => h.symbol))];
      if (symbols.length > 0) {
        const pricesRes = await api.get(`/prices?symbols=${symbols.join(',')}`);
        setPrices(pricesRes.data.prices || {});
      }
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  // Automatically close auth modal upon successful sign-in
  useEffect(() => {
    if (isAuthenticated) {
      setIsAuthModalOpen(false);
    }
  }, [isAuthenticated]);

  // Refresh Prices Handler
  const handleRefreshPrices = async () => {
    if (!isAuthenticated) return;
    setRefreshingPrices(true);
    try {
      const res = await api.post('/prices/refresh');
      setPrices(res.data.prices || {});
      showToast('Price quotes updated live', 'success');
    } catch (err) {
      showToast('Failed to refresh prices', 'error');
    } finally {
      setRefreshingPrices(false);
    }
  };

  // Save Holding (Manual Form)
  const handleSaveHolding = async (formData) => {
    if (holdingToEdit) {
      const res = await api.patch(`/holdings/${holdingToEdit._id}`, formData);
      setHoldings(holdings.map((h) => (h._id === holdingToEdit._id ? res.data.holding : h)));
      showToast('Holding updated successfully', 'success');
    } else {
      const res = await api.post('/holdings', formData);
      setHoldings([res.data.holding, ...holdings]);
      showToast('Holding added to portfolio', 'success');
    }
    fetchPortfolioData();
    fetchWallets();
  };

  // Save Wallet Form (Create or Update)
  const handleSaveWallet = async (walletData) => {
    if (walletToEdit) {
      await updateWallet(walletToEdit._id, walletData);
      showToast('Wallet updated successfully', 'success');
    } else {
      await createWallet(walletData);
      showToast('New wallet created', 'success');
    }
    fetchWallets();
  };

  // Optimistic UI updates
  const handleOptimisticUpdate = async (id, updatedFields) => {
    const originalHolding = holdings.find((h) => h._id === id);
    if (!originalHolding) return;

    const optimisticallyUpdatedHolding = { ...originalHolding, ...updatedFields };
    setHoldings((prev) => prev.map((h) => (h._id === id ? optimisticallyUpdatedHolding : h)));
    setRowStatuses((prev) => ({ ...prev, [id]: 'saving' }));

    try {
      const res = await api.patch(`/holdings/${id}`, updatedFields);
      setHoldings((prev) => prev.map((h) => (h._id === id ? res.data.holding : h)));
      setRowStatuses((prev) => ({ ...prev, [id]: 'saved' }));

      setTimeout(() => {
        setRowStatuses((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }, 2500);

      if (updatedFields.symbol && updatedFields.symbol !== originalHolding.symbol) {
        fetchPortfolioData();
      }
      fetchWallets();
    } catch (err) {
      console.error('Optimistic edit failed, rolling back:', err);
      setHoldings((prev) => prev.map((h) => (h._id === id ? originalHolding : h)));
      setRowStatuses((prev) => ({ ...prev, [id]: 'error' }));
      showToast('Failed to save inline edit. Reverted to previous state.', 'error');
    }
  };

  // Trigger Custom Delete Modal for a Holding
  const promptDeleteHolding = (holding) => {
    const desc = `${holding.quantity} ${holding.symbol}${
      holding.chain ? ' on ' + holding.chain : ''
    }${holding.walletOrAccount ? ' (' + holding.walletOrAccount + ')' : ''}`;

    setDeleteTarget({
      type: 'holding',
      id: holding._id,
      title: 'Delete Asset Holding',
      description: desc,
    });
    setIsDeleteModalOpen(true);
  };

  // Prompt Clear All Holdings for Wallet
  const promptClearWalletHoldings = (wallet, count) => {
    setDeleteTarget({
      type: 'wallet_holdings',
      id: wallet._id,
      walletName: wallet.name,
      title: `Clear All Holdings in ${wallet.name}`,
      description: `Permanently delete all ${count} holding(s) belonging to ${wallet.name}.`,
      requireInputText: 'DELETE',
    });
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'holding') {
      await api.delete(`/holdings/${deleteTarget.id}`);
      setHoldings((prev) => prev.filter((h) => h._id !== deleteTarget.id));
      showToast('Holding deleted from portfolio', 'success');
      fetchWallets();
    } else if (deleteTarget.type === 'wallet_holdings') {
      const res = await api.delete(`/holdings/wallet/${deleteTarget.id}`);
      setHoldings((prev) =>
        prev.filter((h) => !h.walletId || h.walletId.toString() !== deleteTarget.id.toString())
      );
      showToast(res.data.message || `All holdings cleared from ${deleteTarget.walletName}`, 'success');
      fetchWallets();
      fetchPortfolioData();
    }
  };

  // Triggered when any extraction tier succeeds (Tier 1 or 2)
  const handleExtractedResults = (extractedItems, tier) => {
    setExtractedData(extractedItems);
    setExtractionTier(tier || 'gemini');
    setManualFallback(false);
    setExtractionRawText('');
    setIsReviewModalOpen(true);
  };

  // Triggered when all extraction tiers fail — manual fallback (Tier 3)
  const handleExtractionFailed = (rawText, message) => {
    setExtractedData([]);
    setExtractionTier('manual');
    setManualFallback(true);
    setExtractionRawText(rawText || '');
    setIsReviewModalOpen(true);
  };

  const handleBatchSaveSuccess = (newHoldings) => {
    setHoldings([...newHoldings, ...holdings]);
    showToast(`Successfully added ${newHoldings.length} holdings from screenshot extraction`, 'success');
    fetchPortfolioData();
    fetchWallets();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 transition-colors duration-300">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/20" />
          <span className="text-sm font-semibold tracking-wide">Initializing Portfolio Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#0b0f19] bg-[#f8fafc] dark:text-slate-100 text-slate-900 flex flex-col selection:bg-cyan-500 selection:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Subtle Ambient Glow Background Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-blue-500/10 dark:bg-blue-500/10 blur-3xl" />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center space-x-2 animate-bounce ${
            toast.type === 'success'
              ? 'dark:bg-slate-900 bg-white dark:border-emerald-500/40 border-emerald-500/60 dark:text-emerald-400 text-emerald-600 shadow-emerald-500/10'
              : 'dark:bg-slate-900 bg-white dark:border-rose-500/40 border-rose-500/60 dark:text-rose-400 text-rose-600 shadow-rose-500/10'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenAddWalletModal={() => {
          setWalletToEdit(null);
          setIsWalletModalOpen(true);
        }}
      />

      {/* Main Layout Container */}
      <div className={`${isAuthenticated ? 'lg:pl-64' : ''} flex-1 flex flex-col transition-all duration-300`}>
        {/* Top Navbar Header */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenAddModal={() => {
            setHoldingToEdit(null);
            setTargetWalletId(activeWalletId || '');
            setIsFormModalOpen(true);
          }}
          onOpenAddWalletModal={() => {
            setWalletToEdit(null);
            setIsWalletModalOpen(true);
          }}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onRefreshPrices={handleRefreshPrices}
          refreshingPrices={refreshingPrices}
          activeWalletName={activeWallet?.name}
        />

        {/* Main View Router */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  isAuthenticated={isAuthenticated}
                  holdings={holdings}
                  prices={prices}
                  loading={loading}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onUpdateHolding={handleOptimisticUpdate}
                  onDeleteHolding={promptDeleteHolding}
                  onEditClick={(holding) => {
                    setHoldingToEdit(holding);
                    setTargetWalletId(holding.walletId || '');
                    setIsFormModalOpen(true);
                  }}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  onOpenAddWalletModal={() => {
                    setWalletToEdit(null);
                    setIsWalletModalOpen(true);
                  }}
                  rowStatuses={rowStatuses}
                />
              }
            />

            <Route
              path="/analytics"
              element={<AnalyticsPage holdings={holdings} prices={prices} />}
            />

            <Route
              path="/wallets"
              element={
                <WalletsPage
                  holdings={holdings}
                  prices={prices}
                  onOpenAddWallet={() => {
                    setWalletToEdit(null);
                    setIsWalletModalOpen(true);
                  }}
                  onOpenEditWallet={(w) => {
                    setWalletToEdit(w);
                    setIsWalletModalOpen(true);
                  }}
                />
              }
            />

            <Route
              path="/wallets/:id"
              element={
                <WalletDetailPage
                  holdings={holdings}
                  prices={prices}
                  onUpdateHolding={handleOptimisticUpdate}
                  onDeleteHolding={promptDeleteHolding}
                  onEditClick={(holding) => {
                    setHoldingToEdit(holding);
                    setTargetWalletId(holding.walletId || '');
                    setIsFormModalOpen(true);
                  }}
                  onOpenAddModalWithWallet={(wId) => {
                    setHoldingToEdit(null);
                    setTargetWalletId(wId);
                    setIsFormModalOpen(true);
                  }}
                  onOpenEditWallet={(w) => {
                    setWalletToEdit(w);
                    setIsWalletModalOpen(true);
                  }}
                  onClearWalletHoldings={promptClearWalletHoldings}
                  rowStatuses={rowStatuses}
                />
              }
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t dark:border-slate-800/80 border-slate-200 py-6 mt-12 dark:bg-slate-950/60 bg-white/70 backdrop-blur-md text-center text-xs dark:text-slate-500 text-slate-500">
          <p>ApexPortfolio • Multi-Wallet Engine with Google Gemini Vision AI & Real-time Market Analytics</p>
        </footer>
      </div>

      {/* Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <HoldingFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setHoldingToEdit(null);
          setTargetWalletId('');
        }}
        onSave={handleSaveHolding}
        holdingToEdit={holdingToEdit}
        defaultWalletId={targetWalletId}
      />

      <WalletFormModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setWalletToEdit(null);
        }}
        onSave={handleSaveWallet}
        walletToEdit={walletToEdit}
      />

      <ScreenshotUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onExtracted={handleExtractedResults}
        onExtractionFailed={handleExtractionFailed}
      />

      <ExtractionReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        extractedItems={extractedData}
        defaultWalletId={activeWalletId}
        onSaveSuccess={handleBatchSaveSuccess}
        tier={extractionTier}
        manualFallback={manualFallback}
        rawText={extractionRawText}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.title}
        itemDescription={deleteTarget?.description}
        requireInputText={deleteTarget?.requireInputText || ''}
      />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </BrowserRouter>
  );
}
