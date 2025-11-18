const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Configuration
 * Different limits for different endpoint types
 */

/**
 * General API rate limit
 * Applied to most endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for successful requests from localhost in development
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1');
  }
});

/**
 * Authentication endpoints rate limit
 * Stricter to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login/register attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * Password reset rate limit
 * Very strict to prevent abuse
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Tracking endpoints rate limit
 * Moderate limit for tracking operations
 */
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 tracking requests per 15 minutes
  message: {
    error: 'Too many tracking requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * External API rate limit
 * For external applications using API keys
 */
const externalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (1 per second)
  message: {
    error: 'Rate limit exceeded for external API. Maximum 60 requests per minute.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use API key as identifier instead of IP
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  }
});

/**
 * File upload rate limit
 * If you add file upload functionality
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Too many upload attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  trackingLimiter,
  externalApiLimiter,
  uploadLimiter
};



