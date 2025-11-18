# Package.json and Environment Requirements Analysis

## Current Dependencies Status

### ✅ Required Dependencies (All Present)

| Package | Version | Status | Used For |
|---------|---------|--------|----------|
| `express` | ^4.18.2 | ✅ Required | Core server framework |
| `@prisma/client` | ^5.7.1 | ✅ Required | Database ORM client |
| `prisma` | ^5.7.1 | ✅ Required | Database ORM |
| `@supabase/supabase-js` | ^2.81.1 | ✅ Required | Supabase Auth |
| `jsonwebtoken` | ^9.0.2 | ✅ Required | Custom JWT tokens |
| `bcryptjs` | ^2.4.3 | ✅ Required | Password hashing |
| `axios` | ^1.6.2 | ✅ Required | HTTP requests (OAuth, APIs) |
| `cors` | ^2.8.5 | ✅ Required | CORS middleware |
| `helmet` | ^7.1.0 | ✅ Required | Security headers |
| `morgan` | ^1.10.0 | ✅ Required | HTTP logging |
| `dotenv` | ^16.3.1 | ✅ Required | Environment variables |
| `express-rate-limit` | ^7.1.5 | ✅ Required | Rate limiting |
| `express-validator` | ^7.0.1 | ✅ Required | Input validation |

### ⚠️ Potentially Unused Dependencies

| Package | Version | Status | Reason |
|---------|---------|--------|--------|
| `express-session` | ^1.17.3 | ⚠️ Unused | Not using session-based auth (using JWT) |
| `connect-sqlite3` | ^0.9.13 | ⚠️ Unused | Not using SQLite sessions |

### ✅ Dev Dependencies (All Present)

| Package | Version | Status |
|---------|---------|--------|
| `nodemon` | ^3.0.2 | ✅ Required |
| `jest` | ^29.7.0 | ✅ Required |

---

## Environment Variables Analysis

### ✅ Required Environment Variables

Based on `config/env.js`, these are **REQUIRED**:

1. **Database:**
   - `DATABASE_URL` - PostgreSQL connection string
   - `DIRECT_URL` - Direct PostgreSQL connection (for migrations)

2. **Authentication:**
   - `NEXTAUTH_SECRET` - JWT secret (for custom JWT tokens)
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_ANON_KEY` - Supabase public anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

3. **OAuth (Google):**
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

4. **Server:**
   - `NODE_ENV` - Environment (development/production)

### ⚠️ Optional Environment Variables

These are **OPTIONAL** but recommended:

- `PORT` - Server port (defaults to 3000)
- `FRONTEND_URL` - Frontend URL for CORS (defaults to http://localhost:3000)
- `USPS_USER_ID` - USPS API key (optional, only if using USPS tracking)
- `UPS_ACCESS_KEY` - UPS API key (optional)
- `FEDEX_API_KEY` - FedEx API key (optional)
- `DHL_API_KEY` - DHL API key (optional)
- `EXTERNAL_API_KEYS` - External API keys (optional)

---

## Issues Found

### 1. Unused Packages

**`express-session` and `connect-sqlite3`** are installed but not used:
- You're using JWT tokens, not session-based auth
- These can be safely removed

### 2. Environment Variable Requirements

The `config/env.js` makes **all** these required:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**But** you might want to make some optional:
- Google OAuth could be optional if you only use Supabase Auth
- Supabase keys are required if using Supabase Auth

---

## Recommendations

### 1. Remove Unused Packages

```bash
npm uninstall express-session connect-sqlite3
```

### 2. Make Some Environment Variables Optional

Update `config/env.js` to make Google OAuth optional if not using it.

### 3. Update Environment Validation

Consider making Supabase variables optional if you want to support both auth methods during migration.

---

## Corrected package.json

After cleanup, your dependencies should be:

```json
{
  "dependencies": {
    "@prisma/client": "^5.7.1",
    "@supabase/supabase-js": "^2.81.1",
    "axios": "^1.6.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "prisma": "^5.7.1"
  }
}
```

---

## Environment Variables Summary

### Minimum Required (for basic functionality):

```env
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_SECRET=...  # For custom JWT
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NODE_ENV=development
```

### Optional (but recommended):

```env
PORT=3000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...  # Only if using Google OAuth
GOOGLE_CLIENT_SECRET=...  # Only if using Google OAuth
USPS_USER_ID=...  # Only if using USPS tracking
```

---

## Action Items

1. ✅ Verify all required packages are installed
2. ⚠️ Remove unused packages (`express-session`, `connect-sqlite3`)
3. ⚠️ Update environment validation to make some vars optional
4. ✅ Ensure all required env vars are documented

