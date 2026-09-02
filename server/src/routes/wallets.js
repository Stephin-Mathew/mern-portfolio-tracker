import express from 'express';
import { Wallet } from '../models/Wallet.js';
import { Holding } from '../models/Holding.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All wallet routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/wallets
 * @desc    Get all wallets for current authenticated user with summary stats
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    // Fetch wallets and compute per-wallet stats using MongoDB aggregation
    // This is much faster than fetching all holdings and filtering in JS
    const [wallets, holdingStats] = await Promise.all([
      Wallet.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Holding.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: '$walletId',
            holdingCount: { $sum: 1 },
            cryptoCount: {
              $sum: { $cond: [{ $eq: ['$assetType', 'crypto'] }, 1, 0] },
            },
            stockCount: {
              $sum: { $cond: [{ $eq: ['$assetType', 'stock'] }, 1, 0] },
            },
            cashCount: {
              $sum: { $cond: [{ $eq: ['$assetType', 'cash'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    // Build a lookup map from the aggregation results
    const statsMap = {};
    let unassignedCount = 0;
    holdingStats.forEach((stat) => {
      if (stat._id === null) {
        unassignedCount = stat.holdingCount;
      } else {
        statsMap[stat._id.toString()] = stat;
      }
    });

    // Enrich wallets with stats
    const enrichedWallets = wallets.map((wallet) => {
      const stat = statsMap[wallet._id.toString()] || {};
      return {
        ...wallet,
        holdingCount: stat.holdingCount || 0,
        cryptoCount: stat.cryptoCount || 0,
        stockCount: stat.stockCount || 0,
        cashCount: stat.cashCount || 0,
      };
    });

    res.json({
      wallets: enrichedWallets,
      unassignedCount,
    });
  } catch (error) {
    console.error('Fetch Wallets Error:', error);
    res.status(500).json({ message: 'Failed to fetch user wallets' });
  }
});

/**
 * @route   POST /api/wallets
 * @desc    Create a new wallet
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { name, type, description, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Wallet name is required' });
    }

    const wallet = await Wallet.create({
      userId: req.user._id,
      name: name.trim(),
      type: type || 'crypto',
      description: description ? description.trim() : '',
      color: color || '#06b6d4',
      icon: icon || 'wallet',
    });

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet: {
        ...wallet.toObject(),
        holdingCount: 0,
        cryptoCount: 0,
        stockCount: 0,
        cashCount: 0,
      },
    });
  } catch (error) {
    console.error('Create Wallet Error:', error);
    res.status(500).json({ message: 'Failed to create wallet' });
  }
});

/**
 * @route   GET /api/wallets/:id
 * @desc    Get single wallet details and its holdings
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const wallet = await Wallet.findOne({ _id: id, userId: req.user._id }).lean();
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const holdings = await Holding.find({ userId: req.user._id, walletId: id }).sort({ createdAt: -1 });

    res.json({
      wallet,
      holdings,
    });
  } catch (error) {
    console.error('Fetch Wallet Details Error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet details' });
  }
});

/**
 * @route   PATCH /api/wallets/:id
 * @desc    Update a wallet
 * @access  Private
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, description, color, icon } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description.trim();
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;

    const wallet = await Wallet.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found or unauthorized' });
    }

    res.json({ message: 'Wallet updated successfully', wallet });
  } catch (error) {
    console.error('Update Wallet Error:', error);
    res.status(500).json({ message: 'Failed to update wallet' });
  }
});

/**
 * @route   DELETE /api/wallets/:id
 * @desc    Delete a wallet and all its associated holdings
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const wallet = await Wallet.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found or unauthorized' });
    }

    // Delete all holdings associated with this wallet
    const deleteResult = await Holding.deleteMany({
      userId: req.user._id,
      walletId: id,
    });

    res.json({
      message: 'Wallet and all associated assets deleted successfully',
      id,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('Delete Wallet Error:', error);
    res.status(500).json({ message: 'Failed to delete wallet' });
  }
});

export default router;
