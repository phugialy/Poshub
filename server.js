const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Logger
const { createLogger } = require('./utils/logger');
const logger = createLogger('Server');

// Validate environment configuration before starting
const { getConfig } = require('./config/env');
const config = getConfig();

// Rate limiting configuration
const { apiLimiter } = require('./config/rate-limit');

// Remove NextAuth.js - using custom JWT auth instead
const authRoutes = require('./routes/auth');
const trackingRoutes = require('./routes/tracking');
const userRoutes = require('./routes/user');
const externalRoutes = require('./routes/external');
const dashboardRoutes = require('./routes/dashboard');

// Initialize Prisma client
const { testDatabaseConnection } = require('./lib/prisma');

const app = express();
const PORT = config.PORT;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.NODE_ENV === 'production' 
    ? [config.FRONTEND_URL] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Global rate limiting
app.use(apiLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Application routes
app.use('/api/auth', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/user', userRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/external/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'PostalHub Backend'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.exception(err, 'Request error', {
    path: req.path,
    method: req.method,
    status: err.status || 500
  });
  res.status(err.status || 500).json({
    error: config.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Only start server if not in Vercel environment
if (config.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // Test database connection before starting server
  testDatabaseConnection().then(isConnected => {
    if (!isConnected) {
      logger.warn('Database connection failed. Server will start but database operations may fail.');
    }
    
    app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        environment: config.NODE_ENV,
        nodeVersion: process.version
      });
    });
  }).catch(error => {
    logger.exception(error, 'Failed to start server');
    process.exit(1);
  });
} else {
  // In production (Vercel), test connection but don't block
  testDatabaseConnection();
  logger.info('Running in serverless mode (Vercel)');
}

module.exports = app;
