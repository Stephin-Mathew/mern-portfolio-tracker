import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dns from 'dns';

// Fix Windows Node.js querySrv ECONNREFUSED issues by using Google & Cloudflare public DNS for SRV lookup
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('Could not set custom DNS servers:', dnsErr.message);
}

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
      console.log('⚡ MONGODB_URI not provided. Starting MongoMemoryServer for instant local database...');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      console.log(`✅ In-Memory MongoDB running at: ${uri}`);
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Failed to connect to primary MONGODB_URI: ${error.message}`);
    console.log('🔄 Falling back to MongoMemoryServer...');
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      await mongoose.connect(uri);
      console.log(`✅ Fallback In-Memory MongoDB Connected successfully.`);
    } catch (fallbackErr) {
      console.error(`❌ Critical MongoDB connection error: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};
