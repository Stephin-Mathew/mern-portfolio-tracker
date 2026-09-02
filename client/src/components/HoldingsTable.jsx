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
  Network,
  Clock,
  Lock,
  Link2,
} from 'lucide-react';
import { useWallets } from '../context/WalletContext';
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
}) => {
  const { wallets } = useWallets();

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      const isNumeric = ['quantity', 'avgBuyPrice', 'livePrice', 'totalValue', 'pnl'].includes(field);
      setSortDirection(isNumeric ? 'desc' : 'asc');
    }
  };

  // Helper to extract clean price and percentage changes
  const getPriceInfo = (symbol, assetType) => {
    if (assetType === 'cash') {
      return { price: 1, change24h: 0, change7d: 0, change30d: 0 };
    }
    const entry = prices[symbol];
    if (!entry) return { price: 0, change24h: 0, change7d: 0, change30d: 0 };
    if (typeof entry === 'number') {
      return { price: entry, change24h: 0, change7d: 0, change30d: 0 };
    }
    return {
      price: Number(entry.price || 0),
      change24h: Number(entry.change24h || 0),
      change7d: Number(entry.change7d || 0),
      change30d: Number(entry.change30d || 0),
    };
  };

  // Group holdings by Symbol for aggregated multi-chain overview
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

    const groups = Object.values(map).map((group) => {
      const priceInfo = getPriceInfo(group.symbol, group.assetType);
      const livePrice = priceInfo.price > 0 ? priceInfo.price : (group.items[0]?.avgBuyPrice || 0);

      let totalQuantity = 0;
      let totalStockCost = 0;

      group.items.forEach((h) => {
        const qty = Number(h.quantity) || 0;
        totalQuantity += qty;
        if (group.assetType === 'stock') {
          totalStockCost += qty * (Number(h.avgBuyPrice) || 0);
        }
      });

      const weightedAvgBuyPrice =
        group.assetType === 'stock' && totalQuantity > 0 ? totalStockCost / totalQuantity : null;
      const totalValue = totalQuantity * livePrice;

      // PnL Computation:
      let pnl = 0;
      let pnlPercent = 0;

      if (group.assetType === 'stock') {
        // Stock PnL is based on Cost Basis vs Live Price
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
    // avgBuyPrice is only editable for stocks
    if (field === 'avgBuyPrice' && holding.assetType !== 'stock') {
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
              <th
                onClick={() => handleSort('avgBuyPrice')}
                className="py-3.5 px-4 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group"
              >
                <span>Buy Price (Stocks)</span>
                {renderSortIndicator('avgBuyPrice')}
              </th>
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
                const currentPrice =
                  h.assetType === 'cash'
                    ? 1
                    : priceInfo.price > 0
                    ? priceInfo.price
                    : (h.avgBuyPrice || 0);

                const val = h.quantity * currentPrice;
                let singlePnL = 0;
                let singlePnLPct = 0;

                if (h.assetType === 'stock') {
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

                return (
                  <tr key={h._id} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 transition group">
                    {/* Symbol */}
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

                    {/* Avg Buy Price (Stocks Only) */}
                    <td className="py-4 px-4 text-right font-mono dark:text-slate-300 text-slate-700">
                      {h.assetType === 'stock' ? (
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
                            title="Click to edit stock buy price"
                          >
                            {formatUSD(h.avgBuyPrice)}
                          </span>
                        )
                      ) : (
                        <span className="text-xs dark:text-slate-500 text-slate-400 italic">
                          {h.assetType === 'crypto' ? 'Airdrop / Live' : '—'}
                        </span>
                      )}
                    </td>

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

                          <span>{formatUSD(currentPrice)}</span>
                          {onUpdatePrice && (
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/price:opacity-100 transition" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Total Value */}
                    <td className="py-4 px-4 text-right font-mono font-bold dark:text-white text-slate-900">
                      {formatUSD(val)}
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
                            {formatUSD(singlePnL)}
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

              // Multiple entries of the SAME coin across chains/wallets
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
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-4 px-4 text-right font-mono font-extrabold dark:text-white text-slate-900 text-base">
                      {formatQty(group.totalQuantity)}
                    </td>

                    {/* Weighted Avg Buy Price (Stocks Only) */}
                    <td className="py-4 px-4 text-right font-mono dark:text-slate-300 text-slate-700">
                      {group.assetType === 'stock' && group.weightedAvgBuyPrice !== null ? (
                        formatUSD(group.weightedAvgBuyPrice)
                      ) : (
                        <span className="text-xs dark:text-slate-500 text-slate-400 italic">
                          {group.assetType === 'crypto' ? 'Airdrop / Live' : '—'}
                        </span>
                      )}
                    </td>

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

                          <span>{formatUSD(group.livePrice)}</span>
                          {onUpdatePrice && (
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/price:opacity-100 transition" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Total Aggregated Value */}
                    <td className="py-4 px-4 text-right font-mono font-extrabold text-cyan-600 dark:text-cyan-300 text-base">
                      {formatUSD(group.totalValue)}
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
                            {formatUSD(group.pnl)}
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
                      <td colSpan={8} className="p-0 dark:bg-[#090d16] bg-slate-50 border-y dark:border-cyan-500/20 border-cyan-500/30">
                        <div className="p-4 pl-10 space-y-2">
                          <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
                            <Network className="w-4 h-4" />
                            <span>Chain & Wallet Breakdown for {group.symbol}</span>
                          </div>

                          <table className="w-full text-xs text-left dark:text-slate-300 text-slate-700 dark:bg-slate-900/80 bg-white rounded-xl overflow-hidden border dark:border-slate-800 border-slate-200 shadow-xs">
                            <thead className="dark:bg-slate-950 bg-slate-100 text-[10px] uppercase font-bold dark:text-slate-400 text-slate-600 border-b dark:border-slate-800 border-slate-200">
                              <tr>
                                <th className="p-2.5">Chain / Network</th>
                                <th className="p-2.5">Wallet / Account Tag</th>
                                <th className="p-2.5 text-right">Quantity</th>
                                <th className="p-2.5 text-right">{group.assetType === 'stock' ? 'Buy Price' : 'Price Status'}</th>
                                <th className="p-2.5 text-right">Value</th>
                                <th className="p-2.5 text-right">P&L ({getTimeframeLabel()})</th>
                                <th className="p-2.5 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800/80 divide-slate-200">
                              {group.items.map((subItem) => {
                                const subCurrentPrice =
                                  subItem.assetType === 'cash'
                                    ? 1
                                    : group.priceInfo.price > 0
                                    ? group.priceInfo.price
                                    : (subItem.avgBuyPrice || 0);

                                const subVal = subItem.quantity * subCurrentPrice;
                                let subPnL = 0;
                                let subPnLPct = 0;

                                if (subItem.assetType === 'stock') {
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
                                const subLinkedWallet = wallets.find(
                                  (w) => w._id === subItem.walletId
                                );

                                return (
                                  <tr key={subItem._id} className="dark:hover:bg-slate-800/60 hover:bg-slate-50 transition">
                                    {/* Chain Name */}
                                    <td className="p-2.5 font-semibold dark:text-white text-slate-900">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                                        <Network className="w-3 h-3 mr-1 text-indigo-500 dark:text-indigo-400" />
                                        {subItem.chain || 'Mainnet / Default'}
                                      </span>
                                    </td>

                                    {/* Wallet / Account Tag */}
                                    <td className="p-2.5">
                                      {subLinkedWallet ? (
                                        <span
                                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold border shadow-xs"
                                          style={{
                                            backgroundColor: `${
                                              subLinkedWallet.color || '#06b6d4'
                                            }15`,
                                            borderColor: `${
                                              subLinkedWallet.color || '#06b6d4'
                                            }35`,
                                            color: subLinkedWallet.color || '#06b6d4',
                                          }}
                                        >
                                          <span
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                              backgroundColor: subLinkedWallet.color || '#06b6d4',
                                            }}
                                          />
                                          <span>{subLinkedWallet.name}</span>
                                        </span>
                                      ) : (
                                        <span className="dark:text-slate-400 text-slate-500">
                                          {subItem.walletOrAccount || '—'}
                                        </span>
                                      )}
                                    </td>

                                    {/* Individual Quantity */}
                                    <td className="p-2.5 text-right font-mono font-bold dark:text-white text-slate-900">
                                      {formatQty(subItem.quantity)}
                                    </td>

                                    {/* Buy Price or Status */}
                                    <td className="p-2.5 text-right font-mono dark:text-slate-300 text-slate-700">
                                      {subItem.assetType === 'stock' ? (
                                        formatUSD(subItem.avgBuyPrice)
                                      ) : (
                                        <span className="text-xs dark:text-slate-500 text-slate-400 italic">Live Tracking</span>
                                      )}
                                    </td>

                                    {/* Value */}
                                    <td className="p-2.5 text-right font-mono font-bold dark:text-white text-slate-900">
                                      {formatUSD(subVal)}
                                    </td>

                                    {/* PnL */}
                                    <td className="p-2.5 text-right font-mono">
                                      <span
                                        className={`font-bold ${
                                          subIsProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`}
                                      >
                                        {subIsProfit ? '+' : ''}
                                        {formatUSD(subPnL)} ({subIsProfit ? '+' : ''}
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
                                          title="Edit Chain Entry"
                                          className="p-1 rounded dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-500 dark:text-slate-400 dark:hover:text-white hover:text-slate-900 transition cursor-pointer"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteHolding(subItem);
                                          }}
                                          title="Delete Chain Entry"
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
        currentPriceInfo={priceModalSymbol ? prices[priceModalSymbol] || {} : {}}
        onSavePrice={onUpdatePrice}
        onResetPrice={onResetPrice}
      />
    </div>
  );
};
