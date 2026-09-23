import { PortfolioSnapshot } from '../models/PortfolioSnapshot.js';
import { Holding } from '../models/Holding.js';
import { getPricesForSymbols } from './priceService.js';

/**
 * Capture current snapshot for a user
 */
export const captureUserSnapshot = async (userId) => {
  try {
    const holdings = await Holding.find({ userId });
    if (!holdings || holdings.length === 0) {
      return null;
    }

    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    const prices = await getPricesForSymbols(symbols, userId);

    let totalValue = 0;
    let totalCost = 0;
    let cryptoVal = 0;
    let stockVal = 0;
    let cashVal = 0;

    holdings.forEach((h) => {
      let price = 0;
      if (h.assetType === 'cash') {
        price = 1;
      } else if (prices[h.symbol] !== undefined) {
        price = typeof prices[h.symbol] === 'object' ? prices[h.symbol].price : prices[h.symbol];
      } else {
        price = h.avgBuyPrice || 0;
      }

      const val = h.quantity * price;
      // Cost basis is strictly tracked for stocks
      const cost = h.assetType === 'stock' ? h.quantity * (h.avgBuyPrice || 0) : 0;

      totalValue += val;
      totalCost += cost;

      if (h.assetType === 'crypto') cryptoVal += val;
      else if (h.assetType === 'stock') stockVal += val;
      else if (h.assetType === 'cash') cashVal += val;
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if snapshot recorded today; update or create
    const existing = await PortfolioSnapshot.findOne({
      userId,
      timestamp: { $gte: todayStart },
    });

    if (existing) {
      existing.totalValue = totalValue;
      existing.totalCost = totalCost;
      existing.totalPnL = totalValue - totalCost;
      existing.breakdown = { crypto: cryptoVal, stock: stockVal, cash: cashVal };
      existing.timestamp = now;
      await existing.save();
      return existing;
    }

    const newSnapshot = await PortfolioSnapshot.create({
      userId,
      totalValue,
      totalCost,
      totalPnL: totalValue - totalCost,
      breakdown: { crypto: cryptoVal, stock: stockVal, cash: cashVal },
      timestamp: now,
    });

    return newSnapshot;
  } catch (error) {
    console.error('Error capturing portfolio snapshot:', error.message);
    return null;
  }
};

/**
 * Get portfolio history data formatted for chart rendering
 */
export const getPortfolioHistory = async (userId, timeframe = '30d') => {
  // Capture current snapshot first
  await captureUserSnapshot(userId);

  // Timeframe parameters map: { days, samplePoints }
  const timeframeConfig = {
    '24h': { days: 1, points: 24, label: '24 Hours' },
    '7d': { days: 7, points: 28, label: '7 Days' },
    '30d': { days: 30, points: 30, label: '30 Days' },
    '90d': { days: 90, points: 45, label: '90 Days' },
    '1y': { days: 365, points: 52, label: '1 Year' },
    all: { days: 730, points: 60, label: 'All Time' },
  };

  const config = timeframeConfig[timeframe] || timeframeConfig['30d'];
  const startDate = new Date(Date.now() - config.days * 24 * 60 * 60 * 1000);

  // Query actual snapshots stored in DB
  const dbSnapshots = await PortfolioSnapshot.find({
    userId,
    timestamp: { $gte: startDate },
  }).sort({ timestamp: 1 });

  // Calculate current actual portfolio total
  const holdings = await Holding.find({ userId });
  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const prices = await getPricesForSymbols(symbols, userId);

  let currentVal = 0;
  let currentCost = 0;
  let cryptoVal = 0;
  let stockVal = 0;
  let cashVal = 0;

  holdings.forEach((h) => {
    let p = 0;
    if (h.assetType === 'cash') p = 1;
    else if (prices[h.symbol] !== undefined) {
      p = typeof prices[h.symbol] === 'object' ? prices[h.symbol].price : prices[h.symbol];
    } else {
      p = h.avgBuyPrice || 0;
    }

    const v = h.quantity * p;
    const c = h.assetType === 'stock' ? h.quantity * (h.avgBuyPrice || 0) : 0;
    currentVal += v;
    currentCost += c;

    if (h.assetType === 'crypto') cryptoVal += v;
    else if (h.assetType === 'stock') stockVal += v;
    else if (h.assetType === 'cash') cashVal += v;
  });

  let dataPoints = [];

  if (dbSnapshots.length > 0) {
    // Use real DB snapshots only — no synthetic data
    dataPoints = dbSnapshots.map((s) => ({
      timestamp: s.timestamp,
      totalValue: s.totalValue,
      totalCost: s.totalCost,
      totalPnL: s.totalPnL,
      cryptoValue: s.breakdown?.crypto || 0,
      stockValue: s.breakdown?.stock || 0,
      cashValue: s.breakdown?.cash || 0,
    }));

    // Anchor latest point strictly to live holdings valuation
    const last = dataPoints[dataPoints.length - 1];
    last.totalValue = Number(currentVal.toFixed(2));
    last.totalCost = Number(currentCost.toFixed(2));
    last.totalPnL = Number((currentVal - currentCost).toFixed(2));
    last.cryptoValue = Number(cryptoVal.toFixed(2));
    last.stockValue = Number(stockVal.toFixed(2));
    last.cashValue = Number(cashVal.toFixed(2));
  } else {
    // No snapshots yet — show a single point at current value (portfolio just created)
    dataPoints = [
      {
        timestamp: new Date(),
        totalValue: Number(currentVal.toFixed(2)),
        totalCost: Number(currentCost.toFixed(2)),
        totalPnL: Number((currentVal - currentCost).toFixed(2)),
        cryptoValue: Number(cryptoVal.toFixed(2)),
        stockValue: Number(stockVal.toFixed(2)),
        cashValue: Number(cashVal.toFixed(2)),
      },
    ];
  }

  // Summary statistics
  const firstPoint = dataPoints[0] || { totalValue: currentVal, totalCost: currentCost };
  const lastPoint = dataPoints[dataPoints.length - 1] || { totalValue: currentVal, totalCost: currentCost };

  const startValue = firstPoint.totalValue;
  const endValue = Number(currentVal.toFixed(2));
  const changeAmount = endValue - startValue;
  const changePercent = startValue > 0 ? (changeAmount / startValue) * 100 : 0;

  const highestPoint = Math.max(...dataPoints.map((p) => p.totalValue), currentVal);
  const lowestPoint = Math.min(...dataPoints.map((p) => p.totalValue), currentVal);

  return {
    timeframe,
    label: config.label,
    dataPoints,
    summary: {
      currentValue: endValue,
      startValue: Number(startValue.toFixed(2)),
      changeAmount: Number(changeAmount.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      isPositive: changeAmount >= 0,
      highestValue: Number(highestPoint.toFixed(2)),
      lowestValue: Number(lowestPoint.toFixed(2)),
      totalCost: Number(currentCost.toFixed(2)),
      totalPnL: Number((currentVal - currentCost).toFixed(2)),
    },
  };
};

/**
 * Clear all portfolio history snapshots for a user.
 * Useful when test data has been removed and old snapshots show stale values
 * (e.g. chart shows -100% because old snapshots recorded a high value but current is $0).
 *
 * @param {ObjectId} userId
 * @returns {Promise<{deletedCount: number}>}
 */
export const clearPortfolioHistory = async (userId) => {
  const result = await PortfolioSnapshot.deleteMany({ userId });
  console.log(`[history] 🗑️ Cleared ${result.deletedCount} portfolio snapshot(s) for user ${userId}`);
  return { deletedCount: result.deletedCount };
};
