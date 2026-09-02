import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import holdingsRoutes from './routes/holdings.js';
import walletsRoutes from './routes/wallets.js';
import pricesRoutes from './routes/prices.js';
import portfolioRoutes from './routes/portfolio.js';
import extractRoutes from './routes/extract.js';
import { initPriceCron } from './services/priceService.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parsing middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Clerk Auth middleware (populates req.auth with session/user info)
// clockSkewInMs: 60000 provides leeway for slight clock drift between client/server and Clerk auth servers
app.use(clerkMiddleware({ clockSkewInMs: 60000 }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/holdings', holdingsRoutes);
app.use('/api/wallets', walletsRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Root API endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Crypto & Stock Portfolio Tracker API',
    frontendUrl: 'http://localhost:3001',
    endpoints: ['/api/health', '/api/auth', '/api/holdings', '/api/prices', '/api/extract']
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'AI Crypto & Stock Portfolio Tracker API',
    timestamp: new Date(),
  });
});

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Express Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Start Express server after DB connection
const startServer = async () => {
  await connectDB();
  initPriceCron();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
