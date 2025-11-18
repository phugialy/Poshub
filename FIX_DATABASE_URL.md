# Fix DATABASE_URL - URGENT

## The Problem

**Error:** `FATAL: Tenant or user not found`

**Cause:** Your `DATABASE_URL` in `.env` is still pointing to the wrong region or has wrong credentials.

**Impact:**
- ❌ Server can't connect to database
- ❌ Google OAuth fails (can't create/query users)
- ❌ All database operations fail

---

## Quick Fix

### Step 1: Get Correct Connection String

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard/project/uuvgdqxmptkvnwpztecv
   - Or: Dashboard → Select "PostalHubV2"

2. **Get Connection Strings**
   - Go to **Settings** → **Database**
   - Scroll to **Connection string** section
   - **Copy BOTH:**
     - **URI** (for `DATABASE_URL`) - Use the **pooler** connection
     - **Direct connection** (for `DIRECT_URL`)

### Step 2: Update `.env` File

**Your project details:**
- Project: PostalHubV2
- Region: **us-east-1** ✅
- Host: `db.uuvgdqxmptkvnwpztecv.supabase.co`

**Correct format:**

```env
# Connection Pooler (for queries) - MUST be us-east-1
DATABASE_URL=postgresql://postgres.uuvgdqxmptkvnwpztecv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct Connection (for migrations) - MUST be us-east-1
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.uuvgdqxmptkvnwpztecv.supabase.co:5432/postgres
```

**Key Points:**
- ✅ Use `aws-0-us-east-1` (NOT `aws-1-us-east-2`)
- ✅ Port `6543` for pooler, `5432` for direct
- ✅ Replace `[PASSWORD]` with your actual database password

### Step 3: Get Database Password

If you don't know your password:

1. Supabase Dashboard → Settings → Database
2. Click **"Reset database password"**
3. Copy the new password
4. Update both `DATABASE_URL` and `DIRECT_URL` in `.env`

### Step 4: Restart Server

After updating `.env`:

```bash
# Stop server (Ctrl+C)
# Then restart
npm run dev
```

**Expected output:**
```
✅ Environment configuration validated successfully
✅ Supabase Admin client initialized
✅ Supabase Public client initialized
✅ Database connection successful  ← Should see this!
✅ Server started
```

---

## Verification

After fixing, you should see:

```
[INFO] [Database] Database connection successful
```

Instead of:

```
[ERROR] [Database] Database connection failed {"error":"FATAL: Tenant or user not found"}
```

---

## Why This Happens

- **`DIRECT_URL`** - Used by Prisma migrations (`db:push`, `db:migrate`) ✅ Works
- **`DATABASE_URL`** - Used by your application for all queries ❌ Still wrong

Both need to be correct, but they can use different connection methods:
- `DATABASE_URL` = Pooler (better for queries, port 6543)
- `DIRECT_URL` = Direct (needed for migrations, port 5432)

---

## Common Mistakes

### ❌ Wrong Region:
```
aws-1-us-east-2  ← Wrong!
```

### ✅ Correct Region:
```
aws-0-us-east-1  ← Correct!
```

### ❌ Wrong Port:
```
:5432  ← Wrong for pooler!
```

### ✅ Correct Ports:
```
:6543  ← For pooler (DATABASE_URL)
:5432  ← For direct (DIRECT_URL)
```

---

## After Fixing

Once `DATABASE_URL` is correct:

1. ✅ Database connection will succeed
2. ✅ Google OAuth will work
3. ✅ Users can sign in
4. ✅ All API endpoints will function

---

**This is the root cause!** Fix `DATABASE_URL` and everything will work! 🚀

