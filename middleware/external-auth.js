const axios = require('axios');

/**
 * Middleware to verify Google OAuth token from external applications
 * This allows external apps to authenticate using Google OAuth
 */
const verifyGoogleToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Include Google OAuth token in Authorization header as "Bearer <token>"'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Google's tokeninfo endpoint
    const tokenResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`, {
      timeout: 10000
    });

    const tokenInfo = tokenResponse.data;
    
    // Validate token info
    if (!tokenInfo || !tokenInfo.user_id || !tokenInfo.email) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token does not contain valid user information'
      });
    }

    // Check if token is expired
    if (tokenInfo.exp && Date.now() / 1000 > tokenInfo.exp) {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please refresh your Google OAuth token'
      });
    }

    // Add Google user info to request
    req.googleUser = {
      id: tokenInfo.user_id,
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email,
      picture: tokenInfo.picture,
      verified_email: tokenInfo.verified_email === 'true'
    };

    next();
  } catch (error) {
    console.error('Google token verification error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Google OAuth token is invalid or expired'
      });
    }
    
    return res.status(500).json({ 
      error: 'Token verification failed',
      message: 'Unable to verify Google OAuth token'
    });
  }
};

/**
 * Middleware to verify Google ID token (alternative method)
 * This can be used if external apps are using ID tokens instead of access tokens
 */
const verifyGoogleIdToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Include Google ID token in Authorization header as "Bearer <token>"'
      });
    }

    const idToken = authHeader.substring(7);
    
    // Verify ID token with Google's tokeninfo endpoint
    const tokenResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
      timeout: 10000
    });

    const tokenInfo = tokenResponse.data;
    
    // Validate token info
    if (!tokenInfo || !tokenInfo.sub || !tokenInfo.email) {
      return res.status(401).json({ 
        error: 'Invalid ID token',
        message: 'ID token does not contain valid user information'
      });
    }

    // Check if token is expired
    if (tokenInfo.exp && Date.now() / 1000 > tokenInfo.exp) {
      return res.status(401).json({ 
        error: 'ID token expired',
        message: 'Please refresh your Google ID token'
      });
    }

    // Add Google user info to request
    req.googleUser = {
      id: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email,
      picture: tokenInfo.picture,
      verified_email: tokenInfo.email_verified === 'true'
    };

    next();
  } catch (error) {
    console.error('Google ID token verification error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid ID token',
        message: 'Google ID token is invalid or expired'
      });
    }
    
    return res.status(500).json({ 
      error: 'ID token verification failed',
      message: 'Unable to verify Google ID token'
    });
  }
};

/**
 * Optional middleware for API key authentication (alternative to Google OAuth)
 * This can be used for server-to-server communication
 */
const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'No API key provided',
        message: 'Include API key in X-API-Key header'
      });
    }

    // In a real implementation, you would validate the API key against your database
    // For now, we'll use a simple environment variable check
    const validApiKeys = process.env.EXTERNAL_API_KEYS ? 
      process.env.EXTERNAL_API_KEYS.split(',') : [];

    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({ 
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    // Add API key info to request (you might want to look up the associated app/user)
    req.apiKey = apiKey;
    
    next();
  } catch (error) {
    console.error('API key verification error:', error.message);
    return res.status(500).json({ 
      error: 'API key verification failed',
      message: 'Unable to verify API key'
    });
  }
};

module.exports = {
  verifyGoogleToken,
  verifyGoogleIdToken,
  verifyApiKey
};
