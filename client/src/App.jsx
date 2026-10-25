import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { WalletProvider, useWallets } from './context/WalletContext';
import { CurrencyProvider } from './context/CurrencyContext';
import api, { waitForTokenProvider } from './api/axiosInstance';
import { IconRail, ExpandedSidebar } from './components/AppShell/IconRail';
import { TopBar, TabBar } from './components/AppShell/TopBar';
import { BottomTabBar } from './components/AppShell/BottomTabBar';
import { OverviewPage } from './pages/OverviewPage';
import { HoldingsPage } from './pages/HoldingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { WalletsPage } from './pages/WalletsPage';
import { WalletDetailPage } from './pages/WalletDetailPage';
import { CashWalletPage } from './pages/CashWalletPage';
import { HoldingFormModal } from './components/HoldingFormModal';
import { WalletFormModal } from './components/WalletFormModal';
import { ScreenshotUploadModal } from './components/ScreenshotUploadModal';
import { JsonExtractModal } from './components/JsonExtractModal';
import { ExtractionReviewModal } from './components/ExtractionReviewModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AuthModal } from './components/AuthModal';
import { LoadingScreen } from './components/LoadingScreen';
import { sortWalletsByValue } from './utils/walletUtils';

// Routes where the tab bar (Overview | Holdings | Wallets) is shown
const TAB_BAR_ROUTES = ['/', '/holdings', '/wallets'];

function AppContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { wallets, createWallet, updateWallet, deleteWallet, fetchWallets, loading: walletsLoading } = useWallets();
  const location = useLocation();
  const navigate = useNavigate();

  const [holdings, setHoldings] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  // Sidebar collapsed state (key reused from original)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('apex_sidebar_collapsed') === 'true';
    } catch (e) {
      return true; // default collapsed (icon rail only)
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('apex_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Detect active wallet from current URL (/wallets/:id)
  const walletPathMatch = location.pathname.match(/^\/wallets\/([a-f0-9]{24})$/i);
  const activeWalletId = walletPathMatch ? walletPathMatch[1] : '';
  const activeWallet = wallets.find((w) => w._id === activeWalletId);

  const sortedWallets = useMemo(() => sortWalletsByValue(wallets, holdings, prices), [wallets, holdings, prices]);

  // Tab Filtering ('all' | 'crypto' | 'stock' | 'cash')
  const [activeTab, setActiveTab] = useState('all');

  // Optimistic UI tracking per row ID
  const [rowStatuses, setRowStatuses] = useState({});

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isJsonExtractModalOpen, setIsJsonExtractModalOpen] = useState(false);
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

  // Fetch holdings & prices from API (logic unchanged)
  const fetchPortfolioData = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setHoldings([]);
      setPrices({});
      return;
    }
    setLoading(true);
    try {
      const holdingsRes = await api.get('/holdings');
      const fetchedHoldings = holdingsRes.data.holdings || [];
      const symbols = [...new Set([...fetchedHoldings.map((h) => h.symbol), 'BTC', 'HYPE', 'INR'])];
      let fetchedPrices = {};
      try {
        const pricesRes = await api.get(`/prices?symbols=${symbols.join(',')}`);
        fetchedPrices = pricesRes.data.prices || {};
      } catch (priceErr) {
        console.warn('Prices fetch warning:', priceErr.message);
      }
      setHoldings(fetchedHoldings);
      setPrices((prevPrices) => ({ ...prevPrices, ...fetchedPrices }));
    } catch (err) {
      console.warn('Portfolio data fetch warning:', err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Initial data load with retry (unchanged logic)
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setHoldings([]);
      setPrices({});
      setInitialDataLoaded(true);
      return;
    }
    let isMounted = true;
    const loadAllData = async (attempt = 1) => {
      try {
        await waitForTokenProvider();
        await Promise.all([fetchWallets(), fetchPortfolioData()]);
        if (isMounted) setInitialDataLoaded(true);
      } catch (err) {
        console.warn(`Initial data load attempt ${attempt} failed:`, err.message);
        if (attempt < 3 && isMounted) {
          const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
          await new Promise((r) => setTimeout(r, delay));
          if (isMounted) return loadAllData(attempt + 1);
        }
        if (isMounted) {
          console.warn('Max retries reached — showing dashboard with available data');
          setInitialDataLoaded(true);
        }
      }
    };
    loadAllData();
    return () => { isMounted = false; };
  }, [isAuthenticated, authLoading, fetchWallets, fetchPortfolioData]);

  useEffect(() => {
    if (isAuthenticated) setIsAuthModalOpen(false);
  }, [isAuthenticated]);

  // ── Action handlers (business logic UNCHANGED) ──────────────────────
  const handleRefreshPrices = async () => {
    if (!isAuthenticated) return;
    setRefreshingPrices(true);
    try {
      const res = await api.post('/prices/refresh');
      setPrices((prev) => ({ ...prev, ...(res.data.prices || {}) }));
      showToast('Price quotes updated live', 'success');
    } catch (err) {
      showToast('Failed to refresh prices', 'error');
    } finally {
      setRefreshingPrices(false);
    }
  };

  const handleUpdatePrice = async (symbol, overrideData) => {
    try {
      const res = await api.post('/prices/override', { symbol, ...overrideData });
      if (res.data.price) {
        setPrices((prev) => ({ ...prev, [symbol.toUpperCase()]: res.data.price }));
      }
      showToast(res.data.message || `Price updated for ${symbol}`, 'success');
      fetchPortfolioData().catch(() => {});
      fetchWallets().catch(() => {});
    } catch (err) {
      console.error('Failed to update price override:', err);
      showToast(err.response?.data?.message || 'Failed to update price', 'error');
      throw err;
    }
  };

  const handleResetPrice = async (symbol) => {
    try {
      const res = await api.delete(`/prices/override/${symbol}`);
      if (res.data.price) {
        setPrices((prev) => ({ ...prev, [symbol.toUpperCase()]: res.data.price }));
      }
      showToast(res.data.message || `Reset ${symbol} to live market price`, 'success');
      fetchPortfolioData().catch(() => {});
      fetchWallets().catch(() => {});
    } catch (err) {
      console.error('Failed to reset price override:', err);
      showToast(err.response?.data?.message || 'Failed to reset price', 'error');
      throw err;
    }
  };

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
    fetchPortfolioData().catch(() => {});
    fetchWallets().catch(() => {});
  };

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
        setRowStatuses((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
      }, 2500);
      if (updatedFields.symbol && updatedFields.symbol !== originalHolding.symbol) {
        fetchPortfolioData().catch(() => {});
      }
      fetchWallets().catch(() => {});
    } catch (err) {
      console.error('Optimistic edit failed, rolling back:', err);
      setHoldings((prev) => prev.map((h) => (h._id === id ? originalHolding : h)));
      setRowStatuses((prev) => ({ ...prev, [id]: 'error' }));
      showToast('Failed to save inline edit. Reverted to previous state.', 'error');
    }
  };

  const promptDeleteHolding = (holding) => {
    setDeleteTarget({ type: 'holding', id: holding._id, title: 'Delete Asset Holding', description: `${holding.quantity} ${holding.symbol}` });
    setIsDeleteModalOpen(true);
  };

  const promptClearWalletHoldings = (wallet, count) => {
    setDeleteTarget({ type: 'wallet_holdings', id: wallet._id, walletName: wallet.name, title: `Clear All Holdings in ${wallet.name}`, description: `Permanently delete all ${count} holding(s) belonging to ${wallet.name}.`, requireInputText: 'DELETE' });
    setIsDeleteModalOpen(true);
  };

  const promptDeleteWallet = (wallet, count = 0) => {
    setDeleteTarget({ type: 'wallet', id: wallet._id, title: `Delete Wallet "${wallet.name}"`, description: `Permanently delete wallet "${wallet.name}" and all ${count} associated asset(s).`, requireInputText: count > 0 ? 'DELETE' : '' });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'holding') {
      await api.delete(`/holdings/${deleteTarget.id}`);
      setHoldings((prev) => prev.filter((h) => h._id !== deleteTarget.id));
      showToast('Holding deleted from portfolio', 'success');
      fetchWallets().catch(() => {});
    } else if (deleteTarget.type === 'wallet_holdings') {
      const res = await api.delete(`/holdings/wallet/${deleteTarget.id}`);
      setHoldings((prev) => prev.filter((h) => !h.walletId || h.walletId.toString() !== deleteTarget.id.toString()));
      showToast(res.data.message || `All holdings cleared from ${deleteTarget.walletName}`, 'success');
      fetchWallets().catch(() => {});
      fetchPortfolioData().catch(() => {});
    } else if (deleteTarget.type === 'wallet') {
      await deleteWallet(deleteTarget.id);
      setHoldings((prev) => prev.filter((h) => !h.walletId || h.walletId.toString() !== deleteTarget.id.toString()));
      showToast('Wallet and all associated assets deleted successfully', 'success');
      fetchPortfolioData().catch(() => {});
      if (location.pathname === `/wallets/${deleteTarget.id}`) navigate('/wallets');
    }
  };

  const handleExtractedResults = (extractedItems, tier) => {
    setExtractedData(extractedItems);
    setExtractionTier(tier || 'gemini');
    setManualFallback(false);
    setExtractionRawText('');
    setIsReviewModalOpen(true);
  };

  const handleExtractionFailed = (rawText) => {
    setExtractedData([]);
    setExtractionTier('manual');
    setManualFallback(true);
    setExtractionRawText(rawText || '');
    setIsReviewModalOpen(true);
  };

  const handleBatchSaveSuccess = (newHoldings) => {
    setHoldings([...newHoldings, ...holdings]);
    showToast(`Successfully added ${newHoldings.length} holdings from screenshot extraction`, 'success');
    fetchPortfolioData().catch(() => {});
    fetchWallets().catch(() => {});
  };

  // Common modal openers (used by both rail and tab bar)
  const openAddHoldingModal = () => {
    setHoldingToEdit(null);
    setTargetWalletId(activeWalletId || '');
    setIsFormModalOpen(true);
  };

  const openAddWalletModal = () => {
    setWalletToEdit(null);
    setIsWalletModalOpen(true);
  };

  const openUploadModal = () => {
    setTargetWalletId(activeWalletId || '');
    setIsUploadModalOpen(true);
  };

  const openJsonExtractModal = () => {
    setTargetWalletId(activeWalletId || '');
    setIsJsonExtractModalOpen(true);
  };

  // ── Loading screen ──────────────────────────────────────────────────
  if (authLoading || (isAuthenticated && !initialDataLoaded)) {
    return <LoadingScreen />;
  }

  const isTabBarRoute = TAB_BAR_ROUTES.includes(location.pathname) || location.pathname === '/holdings';
  const showRail = isAuthenticated;

  return (
    <CurrencyProvider prices={prices}>
      {/* Page background handled by body in CSS */}
      <div style={{ minHeight: '100vh' }}>
        {/* Toast */}
        {toast && (
          <div
            className="animate-fadeIn"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 100,
              padding: '10px 16px',
              borderRadius: 12,
              border: `1px solid ${toast.type === 'success' ? 'var(--positive-bg)' : 'var(--negative-bg)'}`,
              background: 'var(--panel-bg)',
              color: toast.type === 'success' ? 'var(--positive)' : 'var(--negative)',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              maxWidth: 360,
            }}
          >
            {toast.message}
          </div>
        )}

        {/* App Shell */}
        <div className="app-shell">
          {/* Left: Icon Rail (≥1100px) + Expanded Sidebar (when not collapsed) */}
          {showRail && (
            <>
              <IconRail
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleCollapse={handleToggleSidebarCollapse}
                onOpenUploadModal={openUploadModal}
                onOpenAddModal={openAddHoldingModal}
                onOpenAddWalletModal={openAddWalletModal}
                onOpenJsonExtractModal={openJsonExtractModal}
                onRefreshPrices={handleRefreshPrices}
              />
              {!isSidebarCollapsed && (
                <ExpandedSidebar
                  onOpenAddWalletModal={openAddWalletModal}
                  holdings={holdings}
                  prices={prices}
                  wallets={sortedWallets}
                />
              )}
            </>
          )}

          {/* Right: Panel */}
          <div className="app-panel">
            {/* Top bar */}
            <TopBar
              activeWalletName={activeWallet?.name}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />

            {/* Tab bar (main routes only, authenticated) */}
            {isAuthenticated && isTabBarRoute && (
              <TabBar
                onOpenUploadModal={openUploadModal}
                onOpenJsonExtractModal={openJsonExtractModal}
                onOpenAddModal={openAddHoldingModal}
                onOpenAddWalletModal={openAddWalletModal}
                onRefreshPrices={handleRefreshPrices}
                refreshingPrices={refreshingPrices}
              />
            )}

            {/* Page content */}
            <div className="page-content" style={{ flex: 1, overflowY: 'auto' }}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <OverviewPage
                      isAuthenticated={isAuthenticated}
                      holdings={holdings}
                      prices={prices}
                      loading={loading}
                      onUpdateHolding={handleOptimisticUpdate}
                      onDeleteHolding={promptDeleteHolding}
                      onEditClick={(holding) => {
                        setHoldingToEdit(holding);
                        setTargetWalletId(holding.walletId || '');
                        setIsFormModalOpen(true);
                      }}
                      onUpdatePrice={handleUpdatePrice}
                      onResetPrice={handleResetPrice}
                      onOpenAuthModal={() => setIsAuthModalOpen(true)}
                      onOpenAddWalletModal={openAddWalletModal}
                      onRefreshPrices={handleRefreshPrices}
                      rowStatuses={rowStatuses}
                    />
                  }
                />

                <Route
                  path="/holdings"
                  element={
                    <HoldingsPage
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
                      onUpdatePrice={handleUpdatePrice}
                      onResetPrice={handleResetPrice}
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
                      onOpenAddWallet={openAddWalletModal}
                      onOpenEditWallet={(w) => { setWalletToEdit(w); setIsWalletModalOpen(true); }}
                      onDeleteWallet={promptDeleteWallet}
                    />
                  }
                />

                <Route
                  path="/wallets/:id"
                  element={(() => {
                    const detailWallet = wallets.find((w) => w._id === activeWalletId);
                    if (detailWallet?.type === 'cash') {
                      return (
                        <CashWalletPage
                          holdings={holdings}
                          onDeleteHolding={promptDeleteHolding}
                          onOpenEditWallet={(w) => { setWalletToEdit(w); setIsWalletModalOpen(true); }}
                          onDeleteWallet={promptDeleteWallet}
                          onClearWalletHoldings={promptClearWalletHoldings}
                          showToast={showToast}
                          onHoldingAdded={(h) => { setHoldings((prev) => [h, ...prev]); fetchPortfolioData().catch(() => {}); fetchWallets().catch(() => {}); }}
                          onHoldingUpdated={(h) => { setHoldings((prev) => prev.map((x) => x._id === h._id ? h : x)); fetchWallets().catch(() => {}); }}
                        />
                      );
                    }
                    return (
                      <WalletDetailPage
                        holdings={holdings}
                        prices={prices}
                        onUpdateHolding={handleOptimisticUpdate}
                        onDeleteHolding={promptDeleteHolding}
                        onEditClick={(holding) => { setHoldingToEdit(holding); setTargetWalletId(holding.walletId || ''); setIsFormModalOpen(true); }}
                        onOpenAddModalWithWallet={(wId) => { setHoldingToEdit(null); setTargetWalletId(wId); setIsFormModalOpen(true); }}
                        onOpenEditWallet={(w) => { setWalletToEdit(w); setIsWalletModalOpen(true); }}
                        onDeleteWallet={promptDeleteWallet}
                        onClearWalletHoldings={promptClearWalletHoldings}
                        onUpdatePrice={handleUpdatePrice}
                        onResetPrice={handleResetPrice}
                        rowStatuses={rowStatuses}
                      />
                    );
                  })()}
                />
              </Routes>
            </div>
          </div>
        </div>

        {/* Mobile bottom tab bar */}
        {isAuthenticated && (
          <BottomTabBar onOpenUploadModal={openUploadModal} />
        )}

        {/* Modals */}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

        <HoldingFormModal
          isOpen={isFormModalOpen}
          onClose={() => { setIsFormModalOpen(false); setHoldingToEdit(null); setTargetWalletId(''); }}
          onSave={handleSaveHolding}
          holdingToEdit={holdingToEdit}
          wallets={sortedWallets}
          targetWalletId={targetWalletId}
        />

        <WalletFormModal
          isOpen={isWalletModalOpen}
          onClose={() => { setIsWalletModalOpen(false); setWalletToEdit(null); }}
          onSave={handleSaveWallet}
          walletToEdit={walletToEdit}
        />

        <ScreenshotUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onExtracted={handleExtractedResults}
          onExtractionFailed={handleExtractionFailed}
        />

        <JsonExtractModal
          isOpen={isJsonExtractModalOpen}
          onClose={() => setIsJsonExtractModalOpen(false)}
          onExtracted={handleExtractedResults}
        />

        <ExtractionReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => { setIsReviewModalOpen(false); setTargetWalletId(''); }}
          extractedItems={extractedData}
          onSaveSuccess={handleBatchSaveSuccess}
          tier={extractionTier}
          manualFallback={manualFallback}
          rawText={extractionRawText}
          wallets={sortedWallets}
          targetWalletId={targetWalletId}
        />

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }}
          onConfirm={handleConfirmDelete}
          title={deleteTarget?.title}
          itemDescription={deleteTarget?.description}
          requireInputText={deleteTarget?.requireInputText || ''}
        />
      </div>
    </CurrencyProvider>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('UI Crash intercepted by ErrorBoundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--page-bg)' }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--negative)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 16, lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ padding: '0 16px', minHeight: 44, borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--shell-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </WalletProvider>
    </BrowserRouter>
  );
}
