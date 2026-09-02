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
 * Generate synthetic historical curve leading up to current value
 * if real database snapshots are sparse or fresh user
 */
const generateHistoricalDataPoints = (targetValue, targetCost, cryptoVal, stockVal, cashVal, days, pointCount) => {
  const points = [];
  const now = Date.now();
  const intervalMs = (days * 24 * 60 * 60 * 1000) / (pointCount - 1);

  // If targetValue is 0 (empty portfolio), return flat 0 points
  if (targetValue <= 0) {
    for (let i = pointCount - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs);
      points.push({
        timestamp,
        totalValue: 0,
        totalCost: 0,
        totalPnL: 0,
        cryptoValue: 0,
        stockValue: 0,
        cashValue: 0,
      });
    }
    return points;
  }

  // Deterministic seed waveform generation
  const baseValue = targetValue;
  const baseCost = targetCost > 0 ? targetCost : baseValue * 0.82;

  // Trend volatility multiplier based on timeframe
  const maxVariance = days <= 1 ? 0.015 : days <= 7 ? 0.04 : days <= 30 ? 0.09 : 0.18;

  for (let i = pointCount - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * intervalMs);
    const progress = (pointCount - 1 - i) / (pointCount - 1); // 0 at oldest, 1 at current (today)

    if (i === 0) {
      // Last point MUST match current real value exactly
      points.push({
        timestamp,
        totalValue: Number(targetValue.toFixed(2)),
        totalCost: Number(targetCost.toFixed(2)),
        totalPnL: Number((targetValue - targetCost).toFixed(2)),
        cryptoValue: Number(cryptoVal.toFixed(2)),
        stockValue: Number(stockVal.toFixed(2)),
        cashValue: Number(cashVal.toFixed(2)),
      });
    } else {
      // Curve simulation: combination of linear growth + sine market cycles + small noise
      const timeFactor = (pointCount - i) / pointCount;
      const cycle1 = Math.sin(timeFactor * Math.PI * 3) * (maxVariance * 0.4);
      const cycle2 = Math.cos(timeFactor * Math.PI * 5) * (maxVariance * 0.2);
      const noise = (Math.sin(i * 17) * 0.5 + Math.cos(i * 31) * 0.5) * (maxVariance * 0.2);

      const netDeltaFactor = 1 - (1 - progress) * (maxVariance * 0.8) + cycle1 + cycle2 + noise;
      const val = Math.max(0, baseValue * netDeltaFactor);
      const cost = Math.max(0, baseCost * (1 - (1 - progress) * 0.05));

      const ratioCrypto = baseValue > 0 ? cryptoVal / baseValue : 0.6;
      const ratioStock = baseValue > 0 ? stockVal / baseValue : 0.3;
      const ratioCash = baseValue > 0 ? cashVal / baseValue : 0.1;

      points.push({
        timestamp,
        totalValue: Number(val.toFixed(2)),
        totalCost: Number(cost.toFixed(2)),
        totalPnL: Number((val - cost).toFixed(2)),
        cryptoValue: Number((val * ratioCrypto).toFixed(2)),
        stockValue: Number((val * ratioStock).toFixed(2)),
        cashValue: Number((val * ratioCash).toFixed(2)),
      });
    }
  }

  return points;
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

  if (dbSnapshots.length >= config.points / 2) {
    // If sufficient DB snapshots exist, format DB snapshots
    dataPoints = dbSnapshots.map((s) => ({
      timestamp: s.timestamp,
      totalValue: s.totalValue,
      totalCost: s.totalCost,
      totalPnL: s.totalPnL,
      cryptoValue: s.breakdown?.crypto || 0,
      stockValue: s.breakdown?.stock || 0,
      cashValue: s.breakdown?.cash || 0,
    }));
  } else {
    // Fill/blend with synthetic historical curve for smooth visualization
    dataPoints = generateHistoricalDataPoints(
      currentVal,
      currentCost,
      cryptoVal,
      stockVal,
      cashVal,
      config.days,
      config.points
    );
  }

  // Summary statistics
  const firstPoint = dataPoints[0] || { totalValue: currentVal, totalCost: currentCost };
  const lastPoint = dataPoints[dataPoints.length - 1] || { totalValue: currentVal, totalCost: currentCost };

  const startValue = firstPoint.totalValue;
  const endValue = lastPoint.totalValue;
  const changeAmount = endValue - startValue;
  const changePercent = startValue > 0 ? (changeAmount / startValue) * 100 : 0;

  const highestPoint = Math.max(...dataPoints.map((p) => p.totalValue), currentVal);
  const lowestPoint = Math.min(...dataPoints.map((p) => p.totalValue), currentVal);

  return {
    timeframe,
    label: config.label,
    dataPoints,
    summary: {
      currentValue: Number(endValue.toFixed(2)),
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
