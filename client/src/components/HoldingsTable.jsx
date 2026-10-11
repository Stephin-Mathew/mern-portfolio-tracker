import React, { useState, useMemo } from 'react';
import {
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Coins,
  TrendingUp,
  Wallet,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Layers,
  Clock,
  Lock,
  Link2,
} from 'lucide-react';
import { PriceEditModal } from './PriceEditModal';

export const HoldingsTable = ({
  holdings,
  prices,
  onUpdateHolding,
  onDeleteHolding,
  onEditClick,
  onUpdatePrice,
  onResetPrice,
  rowStatuses = {},
  walletType,
  hideBuyPrice: hideBuyPriceProp,
}) => {

  // Price Edit Modal state
  const [priceModalSymbol, setPriceModalSymbol] = useState(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  const handleOpenPriceModal = (sym) => {
    setPriceModalSymbol(sym);
    setIsPriceModalOpen(true);
  };

  // Crypto Timeframe Filter for Period PnL: '24h' (Yesterday), '7d' (Last Week), '30d'
  const [cryptoTimeframe, setCryptoTimeframe] = useState('24h');

  // Expanded symbols state: { [symbol]: boolean }
  const [expandedSymbols, setExpandedSymbols] = useState({});

  // Inline editing cell state: { holdingId, field }
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Column sorting state
  const [sortField, setSortField] = useState('totalValue');
  const [sortDirection, setSortDirection] = useState('desc');

  const toggleExpand = (symbol) => {
    setExpandedSymbols((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  // Determine if Buy Price column should be shown (e.g. hidden in crypto wallets or when no stocks exist)
  const showBuyPrice = useMemo(() => {
    if (hideBuyPriceProp !== undefined) {
      return !hideBuyPriceProp;
    }
    if (walletType === 'crypto') {
      return false;
    }
    return holdings.some((h) => h.assetType === 'stock' || h.assetType === 'mutual_fund');
  }, [hideBuyPriceProp, walletType, holdings]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      const isNumeric = ['quantity', 'avgBuyPrice', 'livePrice', 'totalValue', 'pnl'].includes(field);
      setSortDirection(isNumeric ? 'desc' : 'asc');
    }
  };

  // Helper to extract clean price, currency, and percentage changes
  const getPriceInfo = (symbol, assetType) => {
    if (assetType === 'cash') {
      return { price: 1, change24h: 0, change7d: 0, change30d: 0, currency: 'USD' };
    }
    const entry = prices[symbol];
    if (!entry) return { price: 0, change24h: 0, change7d: 0, change30d: 0, currency: null, priceInr: null, navInr: null };
    if (typeof entry === 'number') {
      return { price: entry, change24h: 0, change7d: 0, change30d: 0, currency: null, priceInr: null, navInr: null };
    }
    return {
      price: Number(entry.price || 0),
      priceInr: entry.priceInr !== undefined && entry.priceInr !== null ? Number(entry.priceInr) : null,
      navInr: entry.navInr !== undefined && entry.navInr !== null ? Number(entry.navInr) : null,
      currency: entry.currency || (entry.priceInr != null || entry.navInr != null ? 'INR' : null),
      change24h: Number(entry.change24h || 0),
      change7d: Number(entry.change7d || 0),
      change30d: Number(entry.change30d || 0),
      mappedSymbol: entry.mappedSymbol || null,
      isCustom: !!entry.isCustom,
    };
  };

  // Group holdings by Symbol for aggregated single-ticker overview
  const groupedHoldings = useMemo(() => {
    const map = {};

    holdings.forEach((h) => {
      const sym = (h.symbol || 'UNKNOWN').toUpperCase();
      if (!map[sym]) {
        map[sym] = {
          symbol: sym,
          assetType: h.assetType || 'crypto',
          items: [],
        };
      }
      map[sym].items.push(h);
    });

    const inrRate = Number(prices.INR?.price || prices.INR?.rate || 95.7);

    const groups = Object.values(map).map((group) => {
      const priceInfo = getPriceInfo(group.symbol, group.assetType);
      const isINR =
        group.assetType === 'mutual_fund' ||
        group.items.some((h) => h.currency === 'INR') ||
        priceInfo.currency === 'INR' ||
        (priceInfo.priceInr !== null && priceInfo.priceInr > 0) ||
        (priceInfo.navInr !== null && priceInfo.navInr > 0) ||
        group.symbol.endsWith('.NS') ||
        group.symbol.endsWith('.BO');

      const nativeLivePrice = isINR
        ? (priceInfo.priceInr ?? priceInfo.navInr ?? (priceInfo.price > 0 ? priceInfo.price * inrRate : 0))
        : priceInfo.price;
      const livePrice = nativeLivePrice > 0 ? nativeLivePrice : (group.items[0]?.avgBuyPrice || 0);

      let totalQuantity = 0;
      let totalStockCost = 0;

      group.items.forEach((h) => {
        const qty = Number(h.quantity) || 0;
        totalQuantity += qty;
        if (group.assetType === 'stock' || group.assetType === 'mutual_fund') {
          totalStockCost += qty * (Number(h.avgBuyPrice) || 0);
        }
      });

      const weightedAvgBuyPrice =
        (group.assetType === 'stock' || group.assetType === 'mutual_fund') && totalQuantity > 0
          ? totalStockCost / totalQuantity
          : null;
      const totalValue = totalQuantity * livePrice;

      // PnL Computation:
      let pnl = 0;
      let pnlPercent = 0;

      if (group.assetType === 'stock' || group.assetType === 'mutual_fund') {
        // Stock/MF PnL is based on Cost Basis vs Live Price
        pnl = totalValue - totalStockCost;
        pnlPercent = totalStockCost > 0 ? (pnl / totalStockCost) * 100 : 0;
      } else if (group.assetType === 'crypto') {
        // Crypto PnL is based on Timeframe Period Movement (Yesterday/24h, Last Week/7d, 30d)
        const changePct =
          cryptoTimeframe === '7d'
            ? priceInfo.change7d
            : cryptoTimeframe === '30d'
            ? priceInfo.change30d
            : priceInfo.change24h;

        const startPrice = livePrice / (1 + changePct / 100);
        pnl = totalQuantity * (livePrice - startPrice);
        pnlPercent = changePct;
      }

      return {
        ...group,
        isINR,
        totalQuantity,
        weightedAvgBuyPrice,
        livePrice,
        priceInfo,
        totalValue,
        totalCost: totalStockCost,
        pnl,
        pnlPercent,
      };
    });

    // Sort groups dynamically
    return groups.sort((a, b) => {
      if (!sortField) return 0;
      let valA = a[sortField];
      let valB = b[sortField];

      if (['symbol', 'assetType'].includes(sortField)) {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [holdings, prices, sortField, sortDirection, cryptoTimeframe]);

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 inline text-slate-500 opacity-0 group-hover:opacity-100 transition" />
      );
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1.5 inline text-cyan-600 dark:text-cyan-400 font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1.5 inline text-cyan-600 dark:text-cyan-400 font-bold" />
    );
  };

  const handleCellClick = (holding, field, currentValue) => {
    // avgBuyPrice is only editable for stocks and mutual funds
    if (field === 'avgBuyPrice' && holding.assetType !== 'stock' && holding.assetType !== 'mutual_fund') {
      return;
    }
    setEditingCell({ id: holding._id, field });
    setEditValue(currentValue !== undefined && currentValue !== null ? String(currentValue) : '');
  };

  const handleCellSave = async (holding, field) => {
    if (!editingCell) return;
    let newValue = editValue.trim();
    if (field === 'symbol') newValue = newValue.toUpperCase();

    setEditingCell(null);

    const originalValue = String(holding[field] || '');
    if (newValue !== originalValue) {
      onUpdateHolding(holding._id, { [field]: newValue });
    }
  };

  const handleKeyDown = (e, holding, field) => {
    if (e.key === 'Enter') {
      handleCellSave(holding, field);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const formatUSD = (num) => {
    const n = Number(num) || 0;
    if (n !== 0 && Math.abs(n) < 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      }).format(n);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const formatINR = (num) => {
    const n = Number(num) || 0;
    if (n !== 0 && Math.abs(n) < 0.01) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      }).format(n);
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  // Pick INR for mutual fund or INR stocks, USD for everything else
  const fmtCurrency = (num, assetTypeOrIsINR) => {
    if (typeof assetTypeOrIsINR === 'boolean') {
      return assetTypeOrIsINR ? formatINR(num) : formatUSD(num);
    }
    return (assetTypeOrIsINR === 'INR' || assetTypeOrIsINR === 'mutual_fund') ? formatINR(num) : formatUSD(num);
  };

  const formatQty = (num) => {
    const n = Number(num) || 0;
    if (n === 0) return '0';
    if (Math.abs(n) < 0.0001) return n.toFixed(8).replace(/\.?0+$/, '');
    if (Math.abs(n) < 1) return n.toFixed(6).replace(/\.?0+$/, '');
    if (Math.abs(n) < 1000) return n.toFixed(4).replace(/\.?0+$/, '');
    return n.toFixed(2).replace(/\.?0+$/, '');
  };

  const getAssetBadge = (type) => {
    switch (type) {
      case 'crypto':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Coins className="w-3 h-3 mr-1" />
            Crypto
          </span>
        );
      case 'stock':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-3 h-3 mr-1" />
            Stock
          </span>
        );
      case 'mutual_fund':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Layers className="w-3 h-3 mr-1" />
            MF
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-3 h-3 mr-1" />
            Cash
          </span>
        );
      default:
        return null;
    }
  };

  if (holdings.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center my-6 border dark:border-slate-800 border-slate-200">
        <div className="w-16 h-16 rounded-2xl dark:bg-slate-800/80 bg-slate-100 border dark:border-slate-700 border-slate-300 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Coins className="w-8 h-8 text-cyan-500 dark:text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-1 font-heading">No Holdings Found</h3>
        <p className="text-sm dark:text-slate-400 text-slate-600 max-w-md mx-auto mb-6">
          Your portfolio is empty in this category. Click <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Extract Screenshot</span> to auto-import via Gemini AI, or add holdings manually.
        </p>
      </div>
    );
  }

  const getTimeframeLabel = () => {
    if (cryptoTimeframe === '7d') return '7D (vs Last Week)';
    if (cryptoTimeframe === '30d') return '30D (vs Last Month)';
    return '24H (vs Yesterday)';
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border dark:border-slate-800 border-slate-200 shadow-xl my-6">
      {/* Table Header Bar with Crypto Timeframe Interval Selector */}
      <div className="px-4 py-3 border-b dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 dark:bg-slate-950/40 bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-300 text-slate-700">
            Portfolio Holdings
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 font-mono font-semibold">
            {groupedHoldings.length} assets
          </span>
        </div>

        {/* Crypto Timeframe Selector Pill */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Crypto P&L Basis:</span>
          </span>
          <div className="flex items-center dark:bg-slate-900 bg-slate-200/80 p-0.5 rounded-lg border dark:border-slate-800 border-slate-300">
            {[
              { id: '24h', label: '24H (Yesterday)' },
              { id: '7d', label: '7D (Last Week)' },
              { id: '30d', label: '30D' },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setCryptoTimeframe(tf.id)}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                  cryptoTimeframe === tf.id
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm dark:text-slate-300 text-slate-700">
          <thead className="dark:bg-slate-900/80 bg-slate-100 text-xs uppercase font-semibold dark:text-slate-400 text-slate-600 border-b dark:border-slate-800 border-slate-200 select-none">
            <tr>
              <th
                onClick={() => handleSort('symbol')}
                className="py-3.5 px-4 cursor-pointer dark:hover:text-white hover:text-slate-900 transition group"
              >
                <span>Asset / Symbol</span>
                {renderSortIndicator('symbol')}
              </th>

              <th
                onClick={() => handleSort('quantity')}
                className="py-3.5 px-4 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group"
              >
                <span>Total Quantity</span>
                {renderSortIndicator('quantity')}
              </th>
              {showBuyPrice && (
                <th
                  onClick={() => handleSort('avgBuyPrice')}
                  className="py-3.5 px-4 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group"
                >
                  <span>Buy Price (Stocks)</span>
                  {renderSortIndicator('avgBuyPrice')}
                </th>
              )}
              <th
                onClick={() => handleSort('livePrice')}
                className="py-3.5 px-4 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group"
              >
                <span>Live Price</span>
                {renderSortIndicator('livePrice')}
              </th>
              <th
                onClick={() => handleSort('totalValue')}
                className="py-3.5 px-4 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group"
              >
                <span>Total Value</span>
                {renderSortIndicator('totalValue')}
              </th>
              <th
                onClick={() => handleSort('pnl')}
                className="py-3.5 px-4 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group"
                title="Stocks: Gain/Loss vs Buy Price. Crypto: Return vs Period (Yesterday/Last Week)."
              >
                <span>P&L / Performance</span>
                {renderSortIndicator('pnl')}
              </th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800/60 divide-slate-200">
            {groupedHoldings.map((group) => {
              const hasMultiple = group.items.length > 1;
              const isExpanded = !!expandedSymbols[group.symbol];
              const isProfit = group.pnl >= 0;

              // Single item row
              if (!hasMultiple) {
                const h = group.items[0];
                const priceInfo = getPriceInfo(h.symbol, h.assetType);
                const inrRate = Number(prices.INR?.price || prices.INR?.rate || 95.7);
                const isINR =
                  h.assetType === 'mutual_fund' ||
                  h.currency === 'INR' ||
                  priceInfo.currency === 'INR' ||
                  (priceInfo.priceInr !== null && priceInfo.priceInr > 0) ||
                  (priceInfo.navInr !== null && priceInfo.navInr > 0) ||
                  h.symbol?.endsWith('.NS') ||
                  h.symbol?.endsWith('.BO');

                const nativePrice = isINR
                  ? (priceInfo.priceInr ?? priceInfo.navInr ?? (priceInfo.price > 0 ? priceInfo.price * inrRate : 0))
                  : priceInfo.price;

                const currentPrice =
                  h.assetType === 'cash'
                    ? 1
                    : nativePrice > 0
                    ? nativePrice
                    : (h.avgBuyPrice || 0);

                const val = h.quantity * currentPrice;
                let singlePnL = 0;
                let singlePnLPct = 0;

                if (h.assetType === 'stock' || h.assetType === 'mutual_fund') {
                  const cost = h.quantity * (h.avgBuyPrice || 0);
                  singlePnL = val - cost;
                  singlePnLPct = cost > 0 ? (singlePnL / cost) * 100 : 0;
                } else if (h.assetType === 'crypto') {
                  const changePct =
                    cryptoTimeframe === '7d'
                      ? priceInfo.change7d
                      : cryptoTimeframe === '30d'
                      ? priceInfo.change30d
                      : priceInfo.change24h;

                  const startPrice = currentPrice / (1 + changePct / 100);
                  singlePnL = h.quantity * (currentPrice - startPrice);
                  singlePnLPct = changePct;
                }

                const singleIsProfit = singlePnL >= 0;
                const rowStatus = rowStatuses[h._id];
                const schemeDisplayName = h.mfSchemeName || priceInfo.schemeName;

                return (
                  <tr key={h._id} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 transition group">
                    {/* Symbol / Name */}
                    <td className="py-4 px-4 font-medium dark:text-white text-slate-900">
                      <div className="flex items-center space-x-2">
                        {editingCell?.id === h._id && editingCell?.field === 'symbol' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(h, 'symbol')}
                            onKeyDown={(e) => handleKeyDown(e, h, 'symbol')}
                            autoFocus
                            className="w-20 px-2 py-1 rounded dark:bg-slate-900 bg-white border border-cyan-500 text-cyan-600 dark:text-cyan-300 font-bold uppercase text-xs shadow-xs"
                          />
                        ) : h.assetType === 'mutual_fund' && schemeDisplayName ? (
                          <div
                            onClick={() => handleCellClick(h, 'symbol', h.symbol)}
                            className="cursor-pointer group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition"
                            title="Click to edit symbol / scheme code"
                          >
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold font-heading text-sm dark:text-white text-slate-900 leading-snug">
                                {schemeDisplayName}
                              </span>
                              {getAssetBadge(h.assetType)}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">Code: {h.symbol}</span>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleCellClick(h, 'symbol', h.symbol)}
                            className="cursor-pointer group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition flex items-center space-x-1.5"
                            title="Click to edit symbol"
                          >
                            <span className="font-extrabold font-heading text-base">{h.symbol}</span>
                            {getAssetBadge(h.assetType)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-4 px-4 text-right font-mono dark:text-white text-slate-900">
                      {editingCell?.id === h._id && editingCell?.field === 'quantity' ? (
                        <input
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellSave(h, 'quantity')}
                          onKeyDown={(e) => handleKeyDown(e, h, 'quantity')}
                          autoFocus
                          className="w-24 px-2 py-1 rounded dark:bg-slate-900 bg-white border border-cyan-500 text-right text-cyan-600 dark:text-cyan-300 font-mono text-xs shadow-xs"
                        />
                      ) : (
                        <span
                          onClick={() => handleCellClick(h, 'quantity', h.quantity)}
                          className="cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition font-bold px-2 py-1 rounded dark:hover:bg-slate-800/60 hover:bg-slate-200/70"
                          title="Click to edit quantity"
                        >
                          {formatQty(h.quantity)}
                        </span>
                      )}
                    </td>

                    {/* Avg Buy Price (Stocks & Mutual Funds) */}
                    {showBuyPrice && (
                      <td className="py-4 px-4 text-right font-mono dark:text-slate-300 text-slate-700">
                        {(h.assetType === 'stock' || h.assetType === 'mutual_fund') ? (
                          editingCell?.id === h._id && editingCell?.field === 'avgBuyPrice' ? (
                            <input
                              type="number"
                              step="any"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellSave(h, 'avgBuyPrice')}
                              onKeyDown={(e) => handleKeyDown(e, h, 'avgBuyPrice')}
                              autoFocus
                              className="w-24 px-2 py-1 rounded dark:bg-slate-900 bg-white border border-cyan-500 text-right text-cyan-600 dark:text-cyan-300 font-mono text-xs shadow-xs"
                            />
                          ) : (
                            <span
                              onClick={() => handleCellClick(h, 'avgBuyPrice', h.avgBuyPrice)}
                              className="cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition px-2 py-1 rounded dark:hover:bg-slate-800/60 hover:bg-slate-200/70"
                              title={`Click to edit ${h.assetType === 'mutual_fund' ? 'purchase NAV' : 'stock buy price'}`}
                            >
                              {fmtCurrency(h.avgBuyPrice, isINR)}
                            </span>
                          )
                        ) : (
                          <span className="text-xs dark:text-slate-500 text-slate-400 italic">
                            {h.assetType === 'crypto' ? 'Airdrop / Live' : '—'}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Live Price */}
                    <td className="py-4 px-4 text-right font-mono font-medium dark:text-slate-200 text-slate-800">
                      {h.assetType === 'cash' ? (
                        '$1.00'
                      ) : (
                        <div
                          onClick={() => onUpdatePrice && handleOpenPriceModal(h.symbol)}
                          className={`inline-flex items-center justify-end space-x-1.5 rounded-lg px-2 py-1 transition cursor-pointer ${
                            onUpdatePrice ? 'hover:bg-cyan-500/10 hover:text-cyan-500 dark:hover:text-cyan-400 group/price' : ''
                          }`}
                          title={
                            priceInfo.mappedSymbol
                              ? `Mapped to ${priceInfo.mappedSymbol} live quote (Click to edit or unmap)`
                              : priceInfo.isCustom
                              ? `Custom locked price (won't auto-refresh). Click to edit or unlock.`
                              : `Click to edit price, lock price, or map ticker`
                          }
                        >
                          {priceInfo.mappedSymbol ? (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              <Link2 className="w-2.5 h-2.5 mr-0.5" />
                              <span>{priceInfo.mappedSymbol}</span>
                            </span>
                          ) : priceInfo.isCustom ? (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              <span>Locked</span>
                            </span>
                          ) : null}

                          <span>{fmtCurrency(currentPrice, isINR)}</span>
                          {onUpdatePrice && (
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/price:opacity-100 transition" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Total Value */}
                    <td className="py-4 px-4 text-right font-mono font-bold dark:text-white text-slate-900">
                      {fmtCurrency(val, isINR)}
                    </td>

                    {/* PnL & Performance */}
                    <td className="py-4 px-4 text-right font-mono">
                      {h.assetType === 'cash' ? (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-bold ${
                              singleIsProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {singleIsProfit ? '+' : ''}
                            {fmtCurrency(singlePnL, isINR)}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              singleIsProfit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'
                            }`}
                          >
                            {singleIsProfit ? '+' : ''}
                            {singlePnLPct.toFixed(2)}% {h.assetType === 'crypto' ? `(${cryptoTimeframe})` : 'total'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {rowStatus === 'saving' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse font-medium">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving
                        </span>
                      )}
                      {rowStatus === 'saved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          <CheckCircle className="w-3 h-3 mr-1" /> Saved
                        </span>
                      )}
                      {rowStatus === 'error' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                          <AlertCircle className="w-3 h-3 mr-1" /> Error
                        </span>
                      )}
                      {!rowStatus && <span className="text-slate-400 dark:text-slate-600 text-xs">•</span>}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onEditClick(h)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-500 dark:text-slate-400 dark:hover:text-white hover:text-slate-900 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteHolding(h)}
                          title="Delete Holding"
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              // Multiple entries of the SAME coin (split quantities)
              return (
                <React.Fragment key={group.symbol}>
                  {/* Aggregated Main Symbol Row */}
                  <tr
                    onClick={() => toggleExpand(group.symbol)}
                    className="hover:bg-cyan-500/10 transition cursor-pointer group dark:bg-slate-900/40 bg-slate-100/60 font-medium"
                  >
                    {/* Symbol & Expand Button */}
                    <td className="py-4 px-4 dark:text-white text-slate-900">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1 rounded-lg dark:bg-slate-800 bg-slate-200 dark:group-hover:bg-cyan-500/20 group-hover:bg-cyan-500/10 transition text-cyan-600 dark:text-cyan-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                        <span className="font-extrabold font-heading text-base dark:text-white text-slate-900">
                          {group.symbol}
                        </span>
                        {getAssetBadge(group.assetType)}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs">
                          {group.items.length} splits
                        </span>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-4 px-4 text-right font-mono font-extrabold dark:text-white text-slate-900 text-base">
                      {formatQty(group.totalQuantity)}
                    </td>

                    {/* Weighted Avg Buy Price (Stocks & Mutual Funds) */}
                    {showBuyPrice && (
                      <td className="py-4 px-4 text-right font-mono dark:text-slate-300 text-slate-700">
                        {(group.assetType === 'stock' || group.assetType === 'mutual_fund') && group.weightedAvgBuyPrice !== null ? (
                          fmtCurrency(group.weightedAvgBuyPrice, group.isINR)
                        ) : (
                          <span className="text-xs dark:text-slate-500 text-slate-400 italic">
                            {group.assetType === 'crypto' ? 'Airdrop / Live' : '—'}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Live Market Price */}
                    <td className="py-4 px-4 text-right font-mono font-medium dark:text-slate-200 text-slate-800">
                      {group.assetType === 'cash' ? (
                        '$1.00'
                      ) : (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdatePrice && handleOpenPriceModal(group.symbol);
                          }}
                          className={`inline-flex items-center justify-end space-x-1.5 rounded-lg px-2 py-1 transition cursor-pointer ${
                            onUpdatePrice ? 'hover:bg-cyan-500/20 hover:text-cyan-500 dark:hover:text-cyan-400 group/price' : ''
                          }`}
                          title={
                            group.priceInfo.mappedSymbol
                              ? `Mapped to ${group.priceInfo.mappedSymbol} live quote (Click to edit or unmap)`
                              : group.priceInfo.isCustom
                              ? `Custom locked price (won't auto-refresh). Click to edit or unlock.`
                              : `Click to edit price, lock price, or map ticker`
                          }
                        >
                          {group.priceInfo.mappedSymbol ? (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              <Link2 className="w-2.5 h-2.5 mr-0.5" />
                              <span>{group.priceInfo.mappedSymbol}</span>
                            </span>
                          ) : group.priceInfo.isCustom ? (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              <span>Locked</span>
                            </span>
                          ) : null}

                          <span>{fmtCurrency(group.livePrice, group.isINR)}</span>
                          {onUpdatePrice && (
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/price:opacity-100 transition" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Total Aggregated Value */}
                    <td className="py-4 px-4 text-right font-mono font-extrabold text-cyan-600 dark:text-cyan-300 text-base">
                      {fmtCurrency(group.totalValue, group.isINR)}
                    </td>

                    {/* Total Aggregated PnL */}
                    <td className="py-4 px-4 text-right font-mono">
                      {group.assetType === 'cash' ? (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-extrabold ${
                              isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {fmtCurrency(group.pnl, group.isINR)}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isProfit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {group.pnlPercent.toFixed(2)}% {group.assetType === 'crypto' ? `(${cryptoTimeframe})` : 'total'}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center text-xs text-slate-400 font-semibold"></td>

                    {/* Toggle chevron */}
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex transition-transform duration-200 text-cyan-500 dark:text-cyan-400 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Accordion Sub-Table Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={showBuyPrice ? 8 : 7} className="p-0 dark:bg-[#090d16] bg-slate-50 border-y dark:border-cyan-500/20 border-cyan-500/30">
                        <div className="p-4 pl-10 space-y-2">
                          <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
                            <Layers className="w-4 h-4" />
                            <span>Quantity Split Breakdown for {group.symbol} ({group.items.length} entries)</span>
                          </div>

                          <table className="w-full text-xs text-left dark:text-slate-300 text-slate-700 dark:bg-slate-900/80 bg-white rounded-xl overflow-hidden border dark:border-slate-800 border-slate-200 shadow-xs">
                            <thead className="dark:bg-slate-950 bg-slate-100 text-[10px] uppercase font-bold dark:text-slate-400 text-slate-600 border-b dark:border-slate-800 border-slate-200">
                              <tr>
                                <th className="p-2.5">Split Entry</th>
                                <th className="p-2.5 text-right">Quantity (% Share)</th>
                                {showBuyPrice && (group.assetType === 'stock' || group.assetType === 'mutual_fund') && (
                                  <th className="p-2.5 text-right">Buy Price</th>
                                )}
                                <th className="p-2.5 text-right">Value</th>
                                <th className="p-2.5 text-right">P&L ({getTimeframeLabel()})</th>
                                <th className="p-2.5 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800/80 divide-slate-200">
                              {group.items.map((subItem, index) => {
                                const subCurrentPrice =
                                  subItem.assetType === 'cash'
                                    ? 1
                                    : group.livePrice > 0
                                    ? group.livePrice
                                    : (subItem.avgBuyPrice || 0);

                                const subVal = subItem.quantity * subCurrentPrice;
                                let subPnL = 0;
                                let subPnLPct = 0;

                                if (subItem.assetType === 'stock' || subItem.assetType === 'mutual_fund') {
                                  const subCost = subItem.quantity * (subItem.avgBuyPrice || 0);
                                  subPnL = subVal - subCost;
                                  subPnLPct = subCost > 0 ? (subPnL / subCost) * 100 : 0;
                                } else if (subItem.assetType === 'crypto') {
                                  const changePct =
                                    cryptoTimeframe === '7d'
                                      ? group.priceInfo.change7d
                                      : cryptoTimeframe === '30d'
                                      ? group.priceInfo.change30d
                                      : group.priceInfo.change24h;

                                  const startPrice = subCurrentPrice / (1 + changePct / 100);
                                  subPnL = subItem.quantity * (subCurrentPrice - startPrice);
                                  subPnLPct = changePct;
                                }

                                const subIsProfit = subPnL >= 0;
                                const pctShare = group.totalQuantity > 0 ? ((subItem.quantity / group.totalQuantity) * 100).toFixed(1) : '0';

                                return (
                                  <tr key={subItem._id} className="dark:hover:bg-slate-800/60 hover:bg-slate-50 transition">
                                    {/* Split Entry Label */}
                                    <td className="p-2.5 font-semibold dark:text-white text-slate-900">
                                      <div className="flex items-center space-x-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-500/10 text-slate-600 dark:text-slate-300 border dark:border-slate-700 border-slate-300 font-mono">
                                          #{index + 1}
                                        </span>
                                        {subItem.notes && (
                                          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic font-normal truncate max-w-xs">
                                            {subItem.notes}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Individual Quantity with % Share */}
                                    <td className="p-2.5 text-right font-mono dark:text-white text-slate-900">
                                      {editingCell?.id === subItem._id && editingCell?.field === 'quantity' ? (
                                        <input
                                          type="number"
                                          step="any"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onBlur={() => handleCellSave(subItem, 'quantity')}
                                          onKeyDown={(e) => handleKeyDown(e, subItem, 'quantity')}
                                          autoFocus
                                          className="w-24 px-2 py-1 rounded dark:bg-slate-900 bg-white border border-cyan-500 text-right text-cyan-600 dark:text-cyan-300 font-mono text-xs shadow-xs"
                                        />
                                      ) : (
                                        <div
                                          onClick={() => handleCellClick(subItem, 'quantity', subItem.quantity)}
                                          className="inline-flex items-center space-x-1.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition"
                                          title="Click to edit split quantity"
                                        >
                                          <span className="font-bold">{formatQty(subItem.quantity)}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold">
                                            {pctShare}%
                                          </span>
                                        </div>
                                      )}
                                    </td>

                                    {/* Buy Price or Status */}
                                    {showBuyPrice && (group.assetType === 'stock' || group.assetType === 'mutual_fund') && (
                                      <td className="p-2.5 text-right font-mono dark:text-slate-300 text-slate-700">
                                        {editingCell?.id === subItem._id && editingCell?.field === 'avgBuyPrice' ? (
                                          <input
                                            type="number"
                                            step="any"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => handleCellSave(subItem, 'avgBuyPrice')}
                                            onKeyDown={(e) => handleKeyDown(e, subItem, 'avgBuyPrice')}
                                            autoFocus
                                            className="w-24 px-2 py-1 rounded dark:bg-slate-900 bg-white border border-cyan-500 text-right text-cyan-600 dark:text-cyan-300 font-mono text-xs shadow-xs"
                                          />
                                        ) : (
                                          <span
                                            onClick={() => handleCellClick(subItem, 'avgBuyPrice', subItem.avgBuyPrice)}
                                            className="cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition px-2 py-1 rounded dark:hover:bg-slate-800/60 hover:bg-slate-200/70"
                                            title="Click to edit buy price"
                                          >
                                            {fmtCurrency(subItem.avgBuyPrice, group.isINR)}
                                          </span>
                                        )}
                                      </td>
                                    )}

                                    {/* Value */}
                                    <td className="p-2.5 text-right font-mono font-bold dark:text-white text-slate-900">
                                      {fmtCurrency(subVal, group.isINR)}
                                    </td>

                                    {/* PnL */}
                                    <td className="p-2.5 text-right font-mono">
                                      <span
                                        className={`font-bold ${
                                          subIsProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`}
                                      >
                                        {subIsProfit ? '+' : ''}
                                        {fmtCurrency(subPnL, group.isINR)} ({subIsProfit ? '+' : ''}
                                        {subPnLPct.toFixed(1)}%)
                                      </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="p-2.5 text-center">
                                      <div className="flex items-center justify-center space-x-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditClick(subItem);
                                          }}
                                          title="Edit Split Entry"
                                          className="p-1 rounded dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-500 dark:text-slate-400 dark:hover:text-white hover:text-slate-900 transition cursor-pointer"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteHolding(subItem);
                                          }}
                                          title="Delete Split Entry"
                                          className="p-1 rounded hover:bg-red-500/20 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Price Override / Mapping Modal */}
      <PriceEditModal
        isOpen={isPriceModalOpen}
        onClose={() => {
          setIsPriceModalOpen(false);
          setPriceModalSymbol(null);
        }}
        symbol={priceModalSymbol}
        currentPriceInfo={
          priceModalSymbol
            ? (typeof prices[priceModalSymbol] === 'object' && prices[priceModalSymbol] !== null
                ? prices[priceModalSymbol]
                : { price: Number(prices[priceModalSymbol]) || 0 })
            : {}
        }
        onSavePrice={onUpdatePrice}
        onResetPrice={onResetPrice}
      />
    </div>
  );
};
