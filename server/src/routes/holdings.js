import express from 'express';
import { Holding } from '../models/Holding.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All holding routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/holdings
 * @desc    Get all holdings for current authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const holdings = await Holding.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ holdings });
  } catch (error) {
    console.error('Fetch Holdings Error:', error);
    res.status(500).json({ message: 'Failed to fetch portfolio holdings' });
  }
});

/**
 * @route   POST /api/holdings
 * @desc    Create a new holding manually
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { assetType, symbol, quantity, avgBuyPrice, walletId, walletOrAccount, chain, notes } = req.body;

    if (!symbol || quantity === undefined || quantity < 0) {
      return res.status(400).json({ message: 'Valid symbol and non-negative quantity are required' });
    }

    const holdingType = assetType || 'crypto';
    const parsedBuyPrice = holdingType === 'stock'
      ? (avgBuyPrice !== undefined && avgBuyPrice !== null && avgBuyPrice !== '' ? Number(avgBuyPrice) : 0)
      : null;

    const holding = await Holding.create({
      userId: req.user._id,
      assetType: holdingType,
      symbol: symbol.trim().toUpperCase(),
      quantity: Number(quantity),
      avgBuyPrice: parsedBuyPrice,
      walletId: walletId || null,
      walletOrAccount: walletOrAccount ? walletOrAccount.trim() : '',
      chain: chain ? chain.trim() : '',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({ message: 'Holding created successfully', holding });
  } catch (error) {
    console.error('Create Holding Error:', error);
    res.status(500).json({ message: 'Failed to create holding' });
  }
});

/**
 * @route   POST /api/holdings/batch
 * @desc    Create multiple holdings at once (used by Gemini AI extraction review step)
 * @access  Private
 */
router.post('/batch', async (req, res) => {
  try {
    const { holdings, defaultWalletId } = req.body;

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({ message: 'Holdings array is required' });
    }

    const newHoldingsData = holdings.map((item) => {
      const hType = item.assetType || 'crypto';
      const buyPrice = hType === 'stock'
        ? (item.avgBuyPrice !== undefined && item.avgBuyPrice !== null && item.avgBuyPrice !== '' ? Number(item.avgBuyPrice) : 0)
        : null;

      return {
        userId: req.user._id,
        assetType: hType,
        symbol: (item.symbol || 'UNKNOWN').trim().toUpperCase(),
        quantity: Number(item.quantity) || 0,
        avgBuyPrice: buyPrice,
        walletId: item.walletId || defaultWalletId || null,
        walletOrAccount: item.walletOrAccount ? item.walletOrAccount.trim() : 'AI Extraction',
        chain: item.chain ? item.chain.trim() : '',
        notes: item.notes ? item.notes.trim() : 'Imported via Screenshot AI Extraction',
      };
    });

    const createdHoldings = await Holding.insertMany(newHoldingsData);
    res.status(201).json({
      message: `Successfully added ${createdHoldings.length} holdings to portfolio`,
      holdings: createdHoldings,
    });
  } catch (error) {
    console.error('Batch Create Holdings Error:', error);
    res.status(500).json({ message: 'Failed to batch import holdings' });
  }
});

/**
 * @route   PATCH /api/holdings/:id
 * @desc    Update a holding (used for inline table cell editing)
 * @access  Private
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Sanitize updates
    if (updates.symbol) updates.symbol = updates.symbol.trim().toUpperCase();
    if (updates.quantity !== undefined) updates.quantity = Number(updates.quantity);
    if (updates.avgBuyPrice !== undefined) updates.avgBuyPrice = Number(updates.avgBuyPrice);

    // Verify ownership before updating
    const holding = await Holding.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!holding) {
      return res.status(404).json({ message: 'Holding not found or unauthorized' });
    }

    res.json({ message: 'Holding updated', holding });
  } catch (error) {
    console.error('Update Holding Error:', error);
    res.status(500).json({ message: 'Failed to update holding' });
  }
});

/**
 * @route   DELETE /api/holdings/wallet/:walletId
 * @desc    Remove all holdings belonging to a specific wallet
 * @access  Private
 */
router.delete('/wallet/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;
    const result = await Holding.deleteMany({ walletId, userId: req.user._id });
    res.json({
      message: `Successfully cleared ${result.deletedCount} holding(s) from wallet`,
      deletedCount: result.deletedCount,
      walletId,
    });
  } catch (error) {
    console.error('Delete Wallet Holdings Error:', error);
    res.status(500).json({ message: 'Failed to clear wallet holdings' });
  }
});

/**
 * @route   DELETE /api/holdings/:id
 * @desc    Remove a holding
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const holding = await Holding.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!holding) {
      return res.status(404).json({ message: 'Holding not found or unauthorized' });
    }

    res.json({ message: 'Holding deleted successfully', id });
  } catch (error) {
    console.error('Delete Holding Error:', error);
    res.status(500).json({ message: 'Failed to delete holding' });
  }
});

export default router;

