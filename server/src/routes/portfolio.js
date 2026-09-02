import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getPortfolioHistory, captureUserSnapshot, clearPortfolioHistory } from '../services/historyService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * @route   GET /api/portfolio/history
 * @desc    Get historical portfolio values across multiple timeframes
 * @access  Private
 */
router.get('/history', async (req, res) => {
  try {
    const timeframe = (req.query.timeframe || '30d').toLowerCase();
    const historyData = await getPortfolioHistory(req.user._id, timeframe);
    res.json(historyData);
  } catch (error) {
    console.error('Fetch Portfolio History Error:', error);
    res.status(500).json({ message: 'Failed to retrieve portfolio historical data' });
  }
});

/**
 * @route   POST /api/portfolio/snapshot
 * @desc    Manually record a portfolio valuation snapshot
 * @access  Private
 */
router.post('/snapshot', async (req, res) => {
  try {
    const snapshot = await captureUserSnapshot(req.user._id);
    res.json({ message: 'Snapshot recorded', snapshot });
  } catch (error) {
    console.error('Capture Snapshot Error:', error);
    res.status(500).json({ message: 'Failed to record portfolio snapshot' });
  }
});

/**
 * @route   DELETE /api/portfolio/history
 * @desc    Delete all portfolio history snapshots for the current user.
 *          Useful when test data has been removed and old snapshots show stale values.
 * @access  Private
 */
router.delete('/history', async (req, res) => {
  try {
    const result = await clearPortfolioHistory(req.user._id);
    res.json({
      message: 'Portfolio history cleared successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Clear Portfolio History Error:', error);
    res.status(500).json({ message: 'Failed to clear portfolio history' });
  }
});

export default router;
