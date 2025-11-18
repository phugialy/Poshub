# Database Connection Error Fix

## Error Analysis

**Error:** `FATAL: Tenant or user not found`

**Status:** ❌ **NOT EXPECTED** - This needs to be fixed

**What's Working:**
- ✅ Environment configuration validated
- ✅ Supabase clients initialized
- ✅ Server started (but database operations will fail)

**What's Broken:**
- ❌ Database connection failed
- ❌ All database operations will fail until fixed

---

## Root Cause

The error "Tenant or user not found" typically means:

1. **Wrong database password** in `DATABASE_URL`
2. **Wrong database URL format**
3. **Missing or incorrect connection string**

Your Supabase project is **ACTIVE_HEALTHY**, so the issue is with your connection string.

---

## How to Fix

### Step 1: Get Correct Database Connection String

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your **PostalHubV2** project

2. **Get Connection String**
   - Go to **Settings** → **Database**
   - Scroll to **Connection string** section
   - Select **URI** tab (not Session mode)
   - Copy the connection string

3. **The format should be:**
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   
   OR for direct connection:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Step 2: Update Your `.env` File

**For your project (PostalHubV2), the connection should be:**

```env
# Connection Pooler (Recommended for production)
DATABASE_URL=postgresql://postgres.uuvgdqxmptkvnwpztecv:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct Connection (For migrations)
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.uuvgdqxmptkvnwpztecv.supabase.co:5432/postgres
```

**Important Notes:**
- Replace `[YOUR-PASSWORD]` with your actual database password
- The password is the one you set when creating the Supabase project
- If you forgot the password, you can reset it in Supabase Dashboard → Settings → Database → Database password

### Step 3: Verify Connection String Format

**Correct Format:**
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

**For Supabase:**
- User: `postgres` (or `postgres.[PROJECT-REF]` for pooler)
- Password: Your database password
- Host: `db.[PROJECT-REF].supabase.co` (direct) or `aws-0-[REGION].pooler.supabase.com` (pooler)
- Port: `5432` (direct) or `6543` (pooler)
- Database: `postgres`

### Step 4: Test Connection

After updating `.env`, restart your server:

```bash
npm run dev
```

You should see:
```
✅ Database connection successful
```

Instead of:
```
❌ Database connection failed
```

---

## Common Issues

### Issue 1: Wrong Password

**Symptom:** "Tenant or user not found"

**Solution:**
1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset database password"
3. Copy the new password
4. Update `DATABASE_URL` and `DIRECT_URL` in `.env`

### Issue 2: Wrong URL Format

**Symptom:** "Tenant or user not found"

**Solution:**
- Use the connection string from Supabase Dashboard
- Don't manually construct it
- Make sure you're using the correct format

### Issue 3: Using Pooler vs Direct Connection

**For Prisma:**
- `DATABASE_URL` - Use **pooler** connection (port 6543) for regular queries
- `DIRECT_URL` - Use **direct** connection (port 5432) for migrations

**Example:**
```env
# Pooler (for queries)
DATABASE_URL=postgresql://postgres.uuvgdqxmptkvnwpztecv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (for migrations)
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.uuvgdqxmptkvnwpztecv.supabase.co:5432/postgres
```

---

## Quick Fix Steps

1. **Get your database password:**
   - Supabase Dashboard → Settings → Database
   - If you don't know it, reset it

2. **Get connection strings:**
   - Settings → Database → Connection string
   - Copy both "URI" (for DATABASE_URL) and "Direct connection" (for DIRECT_URL)

3. **Update `.env`:**
   ```env
   DATABASE_URL=[paste URI connection string]
   DIRECT_URL=[paste direct connection string]
   ```

4. **Restart server:**
   ```bash
   npm run dev
   ```

5. **Verify:**
   - Should see: `✅ Database connection successful`
   - No more "Tenant or user not found" error

---

## Expected vs Actual

### ✅ Expected (After Fix):
```
[INFO] [Supabase] Supabase Admin client initialized
[INFO] [Supabase] Supabase Public client initialized
[INFO] [Database] Database connection successful
[INFO] [Server] Server started
```

### ❌ Current (Before Fix):
```
[INFO] [Supabase] Supabase Admin client initialized
[INFO] [Supabase] Supabase Public client initialized
[ERROR] [Database] Database connection failed {"error": "Tenant or user not found"}
[WARN] [Server] Database connection failed. Server will start but database operations may fail.
[INFO] [Server] Server started
```

---

## Verification

After fixing, test the connection:

```bash
# Test database connection
npm run db:studio
```

This should open Prisma Studio and show your database tables.

---

## Summary

**Status:** ❌ **NOT EXPECTED** - Needs fixing

**Action Required:**
1. Get correct database connection string from Supabase Dashboard
2. Update `DATABASE_URL` and `DIRECT_URL` in `.env`
3. Restart server
4. Verify connection succeeds

**Your Supabase Project:**
- Name: PostalHubV2
- Status: ACTIVE_HEALTHY ✅
- Host: db.uuvgdqxmptkvnwpztecv.supabase.co
- Region: us-east-1

The project is fine - you just need the correct connection string with the right password!

