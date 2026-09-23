import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
const PriceCache = mongoose.model('PriceCache', new mongoose.Schema({ symbol: String }));
const docs = await PriceCache.find({}).select('symbol');
const symbols = docs.map(d => d.symbol).sort();
console.log('All symbols in PriceCache:', symbols);
await mongoose.disconnect();
