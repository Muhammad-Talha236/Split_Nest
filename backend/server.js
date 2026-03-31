// server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const Expense      = require('./models/Expense');

// Validate env
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRE'];
const missingEnv  = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`Ã¢ÂÅ’ Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();
connectDB();

// CORS
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" not allowed`));
  },
  credentials        : true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Timeout
app.use((req, res, next) => {
  req.setTimeout(30000, () =>
    res.status(408).json({ success: false, message: 'Request timeout' })
  );
  next();
});

// Logger
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Health
app.get('/', (_req, res) => res.json({ message: 'SplitNest API is running', status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'OK', timestamp: new Date() }));

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Routes Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/groups',  require('./routes/group'));

// Nested routes: expenses & payments under a group
const expenseRouter = require('./routes/expenses');
const paymentRouter = require('./routes/payments');
const balanceRouter = require('./routes/balances');

app.use('/api/groups/:groupId/expenses', expenseRouter);
app.use('/api/groups/:groupId/payments', paymentRouter);
app.use('/api/groups/:groupId/balances', balanceRouter);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

// Cron: auto-clear descriptions after 21 days
const cronSchedule = process.env.CRON_SCHEDULE || '0 0 * * *';
cron.schedule(cronSchedule, async () => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 21);
    const result = await Expense.updateMany(
      { createdAt: { $lte: cutoff }, descriptionCleared: false, description: { $ne: '' } },
      { $set: { description: '', descriptionCleared: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[cleanup] Auto-cleared ${result.modifiedCount} expense description(s)`);
    }
  } catch (err) {
    console.error('[cron] Error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] SplitNest running on port ${PORT}`);
  console.log(`[env] ${process.env.NODE_ENV || 'development'}`);
  console.log(`[cors] ${allowedOrigins.join(', ')}`);
});

module.exports = app;