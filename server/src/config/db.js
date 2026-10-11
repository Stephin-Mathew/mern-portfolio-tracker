import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows Node.js querySrv ECONNREFUSED issues by using Google & Cloudflare public DNS for SRV lookup
const configureDns = () => {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (dnsErr) {
    console.warn('Could not set custom DNS servers:', dnsErr.message);
  }
};

configureDns();

let mongoMemoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('⚡ MONGODB_URI not provided. Starting MongoMemoryServer for instant local database...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`✅ In-Memory MongoDB running at: ${memUri}`);
    return conn;
  }

  // Connect to primary MongoDB Atlas with retries
  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      configureDns();
      console.log(`⏳ Connecting to MongoDB Atlas (attempt ${attempt}/${MAX_RETRIES})...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt}/${MAX_RETRIES} to connect to primary MongoDB failed: ${error.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, 1200));
      } else {
        console.error(`❌ Failed to connect to primary MongoDB after ${MAX_RETRIES} attempts.`);
        throw error;
      }
    }
  }
};

