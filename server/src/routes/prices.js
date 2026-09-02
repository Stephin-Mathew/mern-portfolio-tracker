import express from 'express';
import { getPricesForSymbols, fetchAndCachePrices } from '../services/priceService.js';
import { Holding } from '../models/Holding.js';
import { PriceOverride } from '../models/PriceOverride.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * @route   GET /api/prices
 * @desc    Get cached prices for user's portfolio symbols or passed query symbols (with user overrides applied)
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    let symbols = [];
    if (req.query.symbols) {
      // Client already sends the symbols — no DB query needed
      symbols = req.query.symbols.split(',').map((s) => s.trim().toUpperCase());
    } else {
      // Fallback: use distinct() instead of find().select() — returns only unique strings
      symbols = await Holding.distinct('symbol', { userId: req.user._id });
    }

    const priceMap = await getPricesForSymbols(symbols, req.user._id);
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

    await fetchAndCachePrices(symbols);
    const refreshedPriceMap = await getPricesForSymbols(symbols, req.user._id);

    res.json({ message: 'Price cache updated', prices: refreshedPriceMap });
  } catch (error) {
    console.error('Refresh Prices Error:', error);
    res.status(500).json({ message: 'Failed to refresh price data' });
  }
});

/**
 * @route   POST /api/prices/override
 * @desc    Set a user-scoped custom price or ticker mapping for a symbol
 * @access  Private
 */
router.post('/override', async (req, res) => {
  try {
    const { symbol, price, mappedSymbol, isLocked, notes } = req.body;

    if (!symbol || !symbol.trim()) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    const cleanMapped = mappedSymbol && mappedSymbol.trim() ? mappedSymbol.trim().toUpperCase() : null;

    let parsedPrice = null;
    if (price !== undefined && price !== null && price !== '') {
      parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'Price must be a valid positive number' });
      }
    }

    if (parsedPrice === null && !cleanMapped) {
      return res.status(400).json({ message: 'Please provide either a custom price or a mapped ticker symbol' });
    }

    const override = await PriceOverride.findOneAndUpdate(
      { userId: req.user._id, symbol: cleanSymbol },
      {
        price: cleanMapped ? null : parsedPrice,
        mappedSymbol: cleanMapped,
        isLocked: isLocked !== undefined ? !!isLocked : true,
        notes: notes || '',
      },
      { upsert: true, new: true }
    );

    // Fetch updated price quote for this symbol with override applied
    const priceMap = await getPricesForSymbols([cleanSymbol], req.user._id);

    res.json({
      message: cleanMapped
        ? `Asset ${cleanSymbol} mapped to ${cleanMapped}`
        : `Custom price for ${cleanSymbol} saved and locked`,
      override,
      price: priceMap[cleanSymbol],
      prices: priceMap,
    });
  } catch (error) {
    console.error('Price Override Error:', error);
    res.status(500).json({ message: error.message || 'Failed to save price override' });
  }
});

/**
 * @route   DELETE /api/prices/override/:symbol
 * @desc    Remove custom price override/mapping and revert to live market price
 * @access  Private
 */
router.delete('/override/:symbol', async (req, res) => {
  try {
    const cleanSymbol = req.params.symbol.trim().toUpperCase();

    await PriceOverride.deleteOne({ userId: req.user._id, symbol: cleanSymbol });

    // Fetch original live market price
    const priceMap = await getPricesForSymbols([cleanSymbol], req.user._id);

    res.json({
      message: `Price override for ${cleanSymbol} removed — reverted to live market price`,
      symbol: cleanSymbol,
      price: priceMap[cleanSymbol],
      prices: priceMap,
    });
  } catch (error) {
    console.error('Remove Price Override Error:', error);
    res.status(500).json({ message: error.message || 'Failed to remove price override' });
  }
});

export default router;
