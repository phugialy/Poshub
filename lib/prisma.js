const { PrismaClient } = require('@prisma/client');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Database');
const globalForPrisma = globalThis;

/**
 * Create Prisma client with retry logic and error handling
 */
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Connection pool settings for better reliability
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Add connection retry middleware
  client.$use(async (params, next) => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await next(params);
      } catch (error) {
        // Only retry on connection errors
        const isConnectionError = 
          error.code === 'P1001' || // Can't reach database server
          error.code === 'P1002' || // Database server timeout
          error.code === 'P1008' || // Operations timed out
          error.code === 'P1017' || // Server has closed the connection
          error.message?.includes('Connection') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('ETIMEDOUT');

        if (isConnectionError && attempt < maxRetries) {
          logger.warn(`Database connection attempt ${attempt} failed. Retrying in ${retryDelay}ms...`, {
            attempt,
            maxRetries,
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        // Re-throw if not a connection error or max retries reached
        throw error;
      }
    }
  });

  return client;
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 */
async function disconnectPrisma() {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connection');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connection');
  await disconnectPrisma();
  process.exit(0);
});

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    return false;
  }
}

module.exports = { 
  prisma, 
  disconnectPrisma,
  testDatabaseConnection
};
