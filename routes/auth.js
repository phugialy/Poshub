const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/prisma');
const { verifyNextAuthToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/auth/google/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&` +
    `access_type=offline&` +
    `prompt=select_account`;
  
  res.redirect(googleAuthUrl);
});

/**
 * GET /api/auth/google-url
 * Get Google OAuth URL for popup (alternative method)
 */
router.get('/google-url', (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/auth/google/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&` +
    `access_type=offline&` +
    `prompt=select_account`;
  
  res.json({ authUrl: googleAuthUrl });
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.NEXTAUTH_URL + '/api/auth/google/callback'
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const googleUser = userResponse.data;

    // Check if user exists in database
    let user = await prisma.userProfile.findUnique({
      where: { email: googleUser.email }
    });

    if (!user) {
      // Create new user
      user = await prisma.userProfile.create({
        data: {
          id: googleUser.id,
          email: googleUser.email,
          fullName: googleUser.name,
          avatarUrl: googleUser.picture,
        }
      });
    } else {
      // Update existing user
      user = await prisma.userProfile.update({
        where: { id: user.id },
        data: {
          fullName: googleUser.name,
          avatarUrl: googleUser.picture,
        }
      });
    }

    // Create JWT access token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        name: user.fullName 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Create refresh token
    const refreshToken = jwt.sign(
      { 
        sub: user.id,
        type: 'refresh' 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // For popup OAuth, redirect to a page that closes the popup and sends token to parent
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
      </head>
      <body>
        <script>
          // Send token to parent window and close popup
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'GOOGLE_AUTH_SUCCESS', 
              token: '${accessToken}',
              refreshToken: '${refreshToken}',
              expiresIn: 3600
            }, '*');
            window.close();
          } else {
            // Fallback: redirect to main page with token
            window.location.href = '${process.env.NEXTAUTH_URL}/?token=${accessToken}';
          }
        </script>
        <p>Authentication successful! This window should close automatically.</p>
      </body>
      </html>
    `;
    
    res.send(redirectHtml);

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/session
 * Get current session info
 */
router.get('/session', verifyNextAuthToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.fullName,
        image: req.user.avatarUrl,
      }
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * GET /api/auth/user
 * Get current authenticated user profile
 */
router.get('/user', verifyNextAuthToken, async (req, res) => {
  try {
    // User data is already available from middleware
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.fullName,
        avatar_url: req.user.avatarUrl,
        created_at: req.user.createdAt,
        updated_at: req.user.updatedAt
      }
    });
  } catch (error) {
    console.error('Auth route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh user session
 */
router.post('/refresh', verifyNextAuthToken, async (req, res) => {
  try {
    // Create new access token
    const accessToken = jwt.sign(
      { 
        sub: req.user.id,
        email: req.user.email,
        name: req.user.fullName 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Create new refresh token
    const refreshToken = jwt.sign(
      { 
        sub: req.user.id,
        type: 'refresh' 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.fullName,
        image: req.user.avatarUrl
      },
      accessToken,
      refreshToken,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await prisma.userProfile.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Create JWT access token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        name: user.fullName 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Create refresh token
    const refreshToken = jwt.sign(
      { 
        sub: user.id,
        type: 'refresh' 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName
      },
      accessToken,
      refreshToken,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.userProfile.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.userProfile.create({
      data: {
        id: `user_${Date.now()}`, // Generate unique ID
        email,
        fullName: name,
        password: hashedPassword
      }
    });

    // Create JWT access token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        name: user.fullName 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Create refresh token
    const refreshToken = jwt.sign(
      { 
        sub: user.id,
        type: 'refresh' 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName
      },
      accessToken,
      refreshToken,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', verifyNextAuthToken, async (req, res) => {
  try {
    // With JWT, logout is handled client-side by removing the token
    res.json({ 
      success: true,
      message: 'Logout successful' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;