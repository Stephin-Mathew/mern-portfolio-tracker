import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const PortfolioSnapshot = mongoose.model(
  'PortfolioSnapshot',
  new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, timestamp: Date, totalValue: Number }, { strict: false })
);

// Show what's in there
const all = await PortfolioSnapshot.find({}).sort({ timestamp: 1 }).select('userId timestamp totalValue');
console.log(`Found ${all.length} snapshots:`);
all.forEach(s => console.log(`  ${s.timestamp?.toISOString().slice(0,10)} - $${s.totalValue?.toFixed(2)} (user: ${s.userId})`));

// Delete all snapshots so the chart starts fresh from today
const result = await PortfolioSnapshot.deleteMany({});
console.log(`\n✅ Deleted ${result.deletedCount} stale snapshots. Chart will now build from real data going forward.`);

await mongoose.disconnect();
