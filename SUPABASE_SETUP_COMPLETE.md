# Supabase Auth Integration - Setup Complete ✅

## What Has Been Done

### ✅ 1. Installed Dependencies
- `@supabase/supabase-js` package installed

### ✅ 2. Updated Configuration Files
- **`config/supabase.js`** - Created Supabase client configuration with:
  - Admin client (server-side, service role)
  - Public client (for frontend SDK)
  - Helper functions for getting clients and config

- **`env.example`** - Added Supabase environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

- **`config/env.js`** - Updated to validate Supabase environment variables

### ✅ 3. Created Supabase Auth Middleware
- **`middleware/supabase-auth.js`** - New middleware with:
  - `verifySupabaseToken` - Verifies Supabase JWT tokens
  - `optionalSupabaseAuth` - Optional authentication for public endpoints
  - Automatic user profile sync with database

### ✅ 4. Updated Auth Routes
- **`routes/auth.js`** - Added new Supabase Auth endpoints:
  - `GET /api/auth/supabase/config` - Get Supabase config for client initialization
  - `GET /api/auth/session` - Get session (supports both Supabase and NextAuth)
  - `POST /api/auth/supabase/refresh` - Refresh session validation
  - `GET /api/auth/supabase/user` - Get user profile (Supabase Auth)

---

## What You Need to Do Next

### Step 1: Get Your Supabase API Keys

Your Supabase project is: **PostalHubV2** (ID: `uuvgdqxmptkvnwpztecv`)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your **PostalHubV2** project

2. **Get the API Keys**
   - Go to **Settings** → **API**
   - You'll find:
     - **Project URL**: `https://uuvgdqxmptkvnwpztecv.supabase.co`
     - **anon/public key**: Copy this for `SUPABASE_ANON_KEY`
     - **service_role key**: Copy this for `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

3. **Enable Authentication Providers** (if using OAuth)
   - Go to **Authentication** → **Providers**
   - Enable **Google** (or other providers you want)
   - Configure OAuth credentials

### Step 2: Update Your `.env` File

Create or update your `.env` file with:

```env
# Supabase Configuration
SUPABASE_URL=https://uuvgdqxmptkvnwpztecv.supabase.co
SUPABASE_ANON_KEY=your_anon_key_from_dashboard
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_dashboard

# Your existing database config
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.uuvgdqxmptkvnwpztecv.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.uuvgdqxmptkvnwpztecv.supabase.co:5432/postgres

# Your existing config...
NEXTAUTH_SECRET=your_existing_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Step 3: Test the Setup

1. **Start your server:**
   ```bash
   npm run dev
   ```

2. **Test Supabase config endpoint:**
   ```bash
   curl http://localhost:3000/api/auth/supabase/config
   ```
   
   Should return:
   ```json
   {
     "supabaseUrl": "https://uuvgdqxmptkvnwpztecv.supabase.co",
     "supabaseAnonKey": "your_anon_key"
   }
   ```

3. **Check server logs** - You should see:
   ```
   ✅ Supabase Admin client initialized
   ✅ Supabase Public client initialized
   ```

### Step 4: Verify Database Connection

Make sure your database is accessible:

```bash
npm run db:studio
```

This should open Prisma Studio and show your tables.

---

## How to Use Supabase Auth

### For Frontend Applications

1. **Get Supabase config from backend:**
   ```javascript
   const response = await fetch('http://localhost:3000/api/auth/supabase/config');
   const { supabaseUrl, supabaseAnonKey } = await response.json();
   ```

2. **Initialize Supabase client:**
   ```javascript
   import { createClient } from '@supabase/supabase-js';
   
   const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. **Sign in with Google:**
   ```javascript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`
     }
   });
   ```

4. **Get session:**
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   ```

5. **Make authenticated API calls:**
   ```javascript
   const response = await fetch('http://localhost:3000/api/tracking/user', {
     headers: {
       'Authorization': `Bearer ${session.access_token}`
     }
   });
   ```

### For Backend API Calls

All protected routes now support Supabase Auth tokens:

```javascript
// Example: Get user's trackings
fetch('http://localhost:3000/api/tracking/user', {
  headers: {
    'Authorization': `Bearer ${supabaseSession.access_token}`
  }
})
```

---

## API Endpoints Summary

### Supabase Auth Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/auth/supabase/config` | Get Supabase config for client |
| GET | `/api/auth/session` | Get current session (Supabase or NextAuth) |
| POST | `/api/auth/supabase/refresh` | Validate token (refresh handled by SDK) |
| GET | `/api/auth/supabase/user` | Get user profile (Supabase Auth) |

### Existing Endpoints (Still Work)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/auth/user` | Get user profile (NextAuth) |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/google` | Google OAuth (legacy) |

---

## Migration Path

### Current State
- ✅ Supabase Auth infrastructure is ready
- ✅ Both Supabase Auth and NextAuth are supported
- ⏳ Frontend needs to be updated to use Supabase Auth

### Next Steps
1. **Update frontend** to use Supabase Auth SDK
2. **Test authentication flow** end-to-end
3. **Gradually migrate** existing users to Supabase Auth
4. **Deprecate NextAuth** once migration is complete

---

## Troubleshooting

### Error: "Supabase Admin client not initialized"
- **Solution**: Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`

### Error: "Invalid or expired token"
- **Solution**: Make sure you're using a valid Supabase session token
- **Check**: Token should come from `supabase.auth.getSession()`

### Error: "User not found"
- **Solution**: The middleware automatically creates user profiles, but check:
  - Database connection is working
  - User table exists
  - Prisma schema is up to date

### Database Connection Issues
- **Solution**: 
  1. Check if Supabase project is active (not paused)
  2. Verify `DATABASE_URL` is correct
  3. Test connection with `npm run db:studio`

---

## Project Status

Your Supabase project: **PostalHubV2**
- **Status**: COMING_UP (may need to be restored if paused)
- **Region**: us-east-1
- **Database Host**: db.uuvgdqxmptkvnwpztecv.supabase.co

If the project is paused, you may need to:
1. Go to Supabase Dashboard
2. Restore/Activate the project
3. Wait for it to start up

---

## Next Steps

1. ✅ **Get Supabase API keys** from dashboard
2. ✅ **Update `.env` file** with keys
3. ✅ **Test the setup** with the endpoints above
4. ⏭️ **Update frontend** to use Supabase Auth (next phase)
5. ⏭️ **Add tracking URL feature** (next phase)

---

## Files Changed

- ✅ `package.json` - Added @supabase/supabase-js
- ✅ `config/supabase.js` - Complete rewrite
- ✅ `config/env.js` - Added Supabase validation
- ✅ `env.example` - Added Supabase variables
- ✅ `middleware/supabase-auth.js` - New file
- ✅ `routes/auth.js` - Added Supabase endpoints

All files are ready! Just add your Supabase API keys to `.env` and you're good to go! 🚀

