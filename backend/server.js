// server.js - Fixed with env validation and proper CORS
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const Expense = require('./models/Expense');

// Validate required environment variables
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRE'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Validate JWT secret strength
if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  Warning: JWT_SECRET should be at least 32 characters long for security');
}

const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration - fixed for credentials: true
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ success: false, message: 'Request timeout' });
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/group', require('./routes/group'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/balances', require('./routes/balances'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'KhataNest API is running', timestamp: new Date() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// Cron job schedule from env or default midnight
const cronSchedule = process.env.CRON_SCHEDULE || '0 0 * * *';
cron.schedule(cronSchedule, async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 21);

    const result = await Expense.updateMany(
      {
        createdAt: { $lte: cutoffDate },
        descriptionCleared: false,
        description: { $ne: '' },
      },
      {
        $set: { description: '', descriptionCleared: true },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 Auto-cleared descriptions for ${result.modifiedCount} expenses (21-day rule)`);
    }
  } catch (error) {
    console.error('❌ Cron job error:', error.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KhataNest server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS enabled for: ${corsOptions.origin}`);
});

module.exports = app;