import mongoose from 'mongoose';

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    totalValue: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPnL: {
      type: Number,
      default: 0,
    },
    breakdown: {
      crypto: { type: Number, default: 0 },
      stock: { type: Number, default: 0 },
      cash: { type: Number, default: 0 },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user history sorted by date
portfolioSnapshotSchema.index({ userId: 1, timestamp: -1 });

export const PortfolioSnapshot = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);
