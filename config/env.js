/**
 * Environment Configuration and Validation
 * This module validates required environment variables at startup
 * to prevent runtime failures due to missing configuration
 */

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Validate and return required environment variables
 * Throws ConfigError if any required variables are missing
 */
function validateEnv() {
  const errors = [];
  
  // Required variables
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
    // Supabase Auth configuration
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  // Check for missing required variables
  Object.keys(required).forEach(key => {
    if (!required[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });

  // Validate NEXTAUTH_SECRET strength in production
  if (required.NEXTAUTH_SECRET) {
    if (required.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters long');
    }
    if (required.NEXTAUTH_SECRET.includes('your_') || required.NEXTAUTH_SECRET.includes('placeholder')) {
      errors.push('NEXTAUTH_SECRET appears to be a placeholder value');
    }
  }

  // OAuth configuration (optional - only needed if using Google OAuth)
  // Note: Supabase Auth can handle OAuth, so Google OAuth is optional
  const oauth = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
  };

  // OAuth is optional - only warn if partially configured
  const hasOAuthConfig = oauth.GOOGLE_CLIENT_ID || oauth.GOOGLE_CLIENT_SECRET;
  if (hasOAuthConfig && (!oauth.GOOGLE_CLIENT_ID || !oauth.GOOGLE_CLIENT_SECRET)) {
    errors.push('Google OAuth partially configured. Provide both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or remove both.');
  }

  // Optional but recommended in production
  if (required.NODE_ENV === 'production') {
    if (!process.env.FRONTEND_URL) {
      console.warn('⚠️  WARNING: FRONTEND_URL not set. CORS may not work correctly.');
    }
  }

  // If there are errors, throw with all of them
  if (errors.length > 0) {
    const errorMessage = [
      '❌ Configuration Error - Missing or invalid environment variables:',
      '',
      ...errors.map(err => `  - ${err}`),
      '',
      '📝 Please check your .env file and ensure all required variables are set.',
      '   See env.example for reference.',
      ''
    ].join('\n');
    
    throw new ConfigError(errorMessage);
  }

  return {
    ...required,
    ...oauth,
    // Server config
    PORT: process.env.PORT || 3000,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // Optional carrier API keys
    USPS_USER_ID: process.env.USPS_USER_ID,
    UPS_ACCESS_KEY: process.env.UPS_ACCESS_KEY,
    FEDEX_API_KEY: process.env.FEDEX_API_KEY,
    DHL_API_KEY: process.env.DHL_API_KEY,
    
    // External API keys (comma-separated list)
    EXTERNAL_API_KEYS: process.env.EXTERNAL_API_KEYS
  };
}

/**
 * Singleton config object
 * Initialized on first require
 */
let config = null;

function getConfig() {
  if (!config) {
    try {
      config = validateEnv();
      // Use console.log here since logger isn't available yet during config init
      console.log('✅ Environment configuration validated successfully');
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(error.message);
        process.exit(1);
      }
      throw error;
    }
  }
  return config;
}

module.exports = {
  getConfig,
  ConfigError
};

