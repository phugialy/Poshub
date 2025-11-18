/**
 * Supabase Client Configuration
 * 
 * This module provides Supabase clients for both server-side and client-side operations.
 * 
 * - supabaseAdmin: Server-side client with service role (full access)
 * - supabasePublic: Public client for frontend SDK exports
 */

const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Supabase');

// Get Supabase configuration from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase Admin Client (Server-side only - uses service role)
// This has full access to the database and should NEVER be exposed to clients
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  logger.info('Supabase Admin client initialized');
} else {
  logger.warn('Supabase Admin client not initialized - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
}

// Public Supabase Client (for client-side SDK exports)
// This uses the anon key and respects Row Level Security (RLS)
let supabasePublic = null;

if (supabaseUrl && supabaseAnonKey) {
  supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
  logger.info('Supabase Public client initialized');
} else {
  logger.warn('Supabase Public client not initialized - SUPABASE_URL and SUPABASE_ANON_KEY required');
}

/**
 * Get Supabase Admin client
 * @returns {Object|null} Supabase admin client or null if not configured
 */
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return supabaseAdmin;
}

/**
 * Get Supabase Public client
 * @returns {Object|null} Supabase public client or null if not configured
 */
function getSupabasePublic() {
  if (!supabasePublic) {
    throw new Error('Supabase Public client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  return supabasePublic;
}

/**
 * Get Supabase configuration for client-side initialization
 * @returns {Object} Configuration object with URL and anon key
 */
function getSupabaseConfig() {
  return {
    supabaseUrl: supabaseUrl || null,
    supabaseAnonKey: supabaseAnonKey || null
  };
}

module.exports = {
  supabaseAdmin,
  supabasePublic,
  getSupabaseAdmin,
  getSupabasePublic,
  getSupabaseConfig
};
