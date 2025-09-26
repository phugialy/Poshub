const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_key';

// Warn if using placeholder values
if (supabaseUrl.includes('placeholder') || supabaseServiceKey.includes('placeholder')) {
  console.warn('⚠️  WARNING: Using placeholder Supabase configuration.');
  console.warn('   Please create a .env file with your actual Supabase credentials.');
  console.warn('   Database operations will not work without proper configuration.');
}

// Admin client for server-side database operations only
// We use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = {
  supabase
};
