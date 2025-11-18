/**
 * Structured Logging Utility
 * Provides consistent logging format across the application
 * 
 * For production, consider using Winston or Pino for advanced features
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m'
};

class Logger {
  constructor(module = 'App') {
    this.module = module;
    this.logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');
  }

  /**
   * Format log message with metadata
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      ...meta
    };

    // In production, output JSON for log aggregation
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(logEntry);
    }

    // In development, output human-readable format
    const color = LOG_COLORS[level] || '';
    const reset = LOG_COLORS.RESET;
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    
    return `${color}[${timestamp}] [${level}] [${this.module}]${reset} ${message}${metaStr}`;
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Log error
   */
  error(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
    }
  }

  /**
   * Log warning
   */
  warn(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
    }
  }

  /**
   * Log info
   */
  info(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
    }
  }

  /**
   * Log debug
   */
  debug(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }

  /**
   * Log HTTP request
   */
  http(req, meta = {}) {
    const message = `${req.method} ${req.path}`;
    const logMeta = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...meta
    };
    this.info(message, logMeta);
  }

  /**
   * Log database operation
   */
  db(operation, table, meta = {}) {
    const message = `Database ${operation} on ${table}`;
    this.debug(message, { operation, table, ...meta });
  }

  /**
   * Log authentication event
   */
  auth(event, meta = {}) {
    const message = `Auth event: ${event}`;
    this.info(message, { event, ...meta });
  }

  /**
   * Log error with stack trace
   */
  exception(error, message = 'Exception occurred', meta = {}) {
    const errorMeta = {
      error: error.message,
      stack: error.stack,
      code: error.code,
      ...meta
    };
    this.error(message, errorMeta);
  }
}

/**
 * Create logger instance for a module
 */
function createLogger(module) {
  return new Logger(module);
}

/**
 * Default logger instance
 */
const defaultLogger = new Logger('App');

module.exports = {
  Logger,
  createLogger,
  logger: defaultLogger
};



