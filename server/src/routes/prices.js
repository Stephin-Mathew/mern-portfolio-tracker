import express from 'express';
import { getPricesForSymbols, fetchAndCachePrices } from '../services/priceService.js';
import { Holding } from '../models/Holding.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * @route   GET /api/prices
 * @desc    Get cached prices for user's portfolio symbols or passed query symbols
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    let symbols = [];
    if (req.query.symbols) {
      symbols = req.query.symbols.split(',').map((s) => s.trim().toUpperCase());
    } else {
      // Get all symbols present in user's portfolio
      const userHoldings = await Holding.find({ userId: req.user._id }).select('symbol');
      symbols = [...new Set(userHoldings.map((h) => h.symbol))];
    }

    const priceMap = await getPricesForSymbols(symbols);
    res.json({ prices: priceMap });
  } catch (error) {
    console.error('Fetch Prices Error:', error);
    res.status(500).json({ message: 'Failed to retrieve price data' });
  }
});

/**
 * @route   POST /api/prices/refresh
 * @desc    Manually trigger price cache refresh for user's portfolio symbols
 * @access  Private
 */
router.post('/refresh', async (req, res) => {
  try {
    const userHoldings = await Holding.find({ userId: req.user._id }).select('symbol');
    const symbols = [...new Set(userHoldings.map((h) => h.symbol))];

    const refreshedPrices = await fetchAndCachePrices(symbols);
    res.json({ message: 'Price cache updated', prices: refreshedPrices });
  } catch (error) {
    console.error('Refresh Prices Error:', error);
    res.status(500).json({ message: 'Failed to refresh price data' });
  }
});

export default router;
