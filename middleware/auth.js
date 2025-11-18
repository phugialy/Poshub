const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const { getConfig } = require('../config/env');

const config = getConfig();

/**
 * Middleware to verify NextAuth.js JWT token
 */
const verifyNextAuthToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token from NextAuth.js
    const decoded = jwt.verify(token, config.NEXTAUTH_SECRET);
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database using the decoded user ID
    const user = await prisma.userProfile.findUnique({
      where: { id: decoded.sub }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

/**
 * Middleware to check if user is authenticated (optional)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.NEXTAUTH_SECRET);
      
      if (decoded && decoded.sub) {
        const user = await prisma.userProfile.findUnique({
          where: { id: decoded.sub }
        });
        
        if (user) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  verifyNextAuthToken,
  optionalAuth
};
