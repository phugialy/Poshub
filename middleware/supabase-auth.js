/**
 * Supabase Authentication Middleware
 * 
 * Verifies Supabase JWT tokens and syncs user data with local database
 */

const { getSupabaseAdmin } = require('../config/supabase');
const { prisma } = require('../lib/prisma');
const { createLogger } = require('../utils/logger');

const logger = createLogger('SupabaseAuth');

/**
 * Middleware to verify Supabase JWT token
 * Replaces the custom JWT verification
 * 
 * This middleware:
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies the token with Supabase
 * 3. Gets or creates user profile in local database
 * 4. Attaches user to request object
 */
const verifySupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Supabase Admin client
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Invalid Supabase token', { 
        error: error?.message,
        code: error?.status 
      });
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        details: error?.message
      });
    }

    logger.debug('Token verified', { userId: user.id, email: user.email });

    // Get or create user profile in our database
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: user.id }
    });

    // If user doesn't exist in our database, create them
    if (!userProfile) {
      logger.info('Creating new user profile', { userId: user.id, email: user.email });
      
      userProfile = await prisma.userProfile.create({
        data: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.user_metadata?.display_name || 
                   null,
          avatarUrl: user.user_metadata?.avatar_url || 
                    user.user_metadata?.picture || 
                    null
        }
      });
      
      logger.info('User profile created', { userId: user.id });
    } else {
      // Update user profile with latest info from Supabase
      const updatedData = {};
      
      // Only update if we have new data
      if (user.email !== userProfile.email) {
        updatedData.email = user.email;
      }
      
      const supabaseName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.user_metadata?.display_name;
      if (supabaseName && supabaseName !== userProfile.fullName) {
        updatedData.fullName = supabaseName;
      }
      
      const supabaseAvatar = user.user_metadata?.avatar_url || 
                            user.user_metadata?.picture;
      if (supabaseAvatar && supabaseAvatar !== userProfile.avatarUrl) {
        updatedData.avatarUrl = supabaseAvatar;
      }
      
      if (Object.keys(updatedData).length > 0) {
        logger.debug('Updating user profile', { userId: user.id, updates: updatedData });
        userProfile = await prisma.userProfile.update({
          where: { id: user.id },
          data: updatedData
        });
      }
    }

    // Add user to request object
    req.user = userProfile;
    req.supabaseUser = user; // Also include Supabase user object for reference
    
    next();
  } catch (error) {
    logger.exception(error, 'Token verification error');
    
    // Handle specific error types
    if (error.message.includes('not initialized')) {
      return res.status(500).json({ 
        error: 'Authentication service not configured',
        code: 'AUTH_NOT_CONFIGURED'
      });
    }
    
    return res.status(401).json({ 
      error: 'Token verification failed',
      code: 'VERIFICATION_FAILED',
      details: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Continues even if no token is provided
 * Useful for public endpoints that have optional user context
 */
const optionalSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabaseAdmin = getSupabaseAdmin();
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (!error && user) {
        const userProfile = await prisma.userProfile.findUnique({
          where: { id: user.id }
        });
        
        if (userProfile) {
          req.user = userProfile;
          req.supabaseUser = user;
          logger.debug('Optional auth: User authenticated', { userId: user.id });
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication - this is optional
    logger.debug('Optional auth: Continuing without authentication', { 
      error: error.message 
    });
    next();
  }
};

module.exports = {
  verifySupabaseToken,
  optionalSupabaseAuth
};

