# PostalHub Quick Start Guide

## Current Status Summary

### ✅ What You Have
- Express.js backend (NOT Next.js)
- Supabase PostgreSQL database (via Prisma)
- Custom JWT authentication
- Tracking CRUD operations
- Auto carrier detection
- USPS carrier integration

### ❌ What Needs to Change
- Migrate from custom JWT to **Supabase Auth**
- Add tracking URL popup feature
- Structure for multi-platform support (Web/Extension/Mobile)

---

## Architecture Decision Tree

```
┌─────────────────────────────────────────┐
│         CLIENT APPLICATIONS             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │   Web    │  │Extension │  │Mobile│ │
│  │  (React) │  │ (Chrome) │  │ (RN) │ │
│  └────┬─────┘  └────┬─────┘  └──┬───┘ │
│       │             │            │     │
│       └─────────────┼────────────┘     │
│                     │                  │
│              ┌──────▼──────┐           │
│              │  Express API │           │
│              │  (Backend)  │           │
│              └──────┬──────┘           │
│                     │                  │
│       ┌─────────────┼─────────────┐    │
│       │             │             │    │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼──┐ │
│  │Supabase │  │ Prisma  │  │Carrier│ │
│  │  Auth   │  │   ORM   │  │Services│ │
│  └─────────┘  └─────────┘  └───────┘ │
│       │                              │
│  ┌────▼──────────────┐               │
│  │ Supabase          │               │
│  │ PostgreSQL        │               │
│  └───────────────────┘               │
└─────────────────────────────────────┘
```

---

## Implementation Priority

### 🔴 Phase 1: Critical (Do First)
1. **Supabase Auth Integration**
   - Install `@supabase/supabase-js`
   - Create Supabase config
   - Create auth middleware
   - Update auth routes
   - Test authentication flow

2. **Tracking URL Feature**
   - Create carrier URL service
   - Add `/api/tracking/:id/url` endpoint
   - Test with all carriers

### 🟡 Phase 2: Important (Do Next)
3. **Update CORS**
   - Allow all platform origins
   - Test from different clients

4. **Database Migration**
   - Link Supabase Auth users
   - Migrate existing users
   - Test user sync

### 🟢 Phase 3: Frontend (Do Last)
5. **Web App**
   - Create React/Vue app
   - Integrate Supabase Auth
   - Build tracking UI
   - Implement popup feature

6. **Chrome Extension**
   - Create extension structure
   - Integrate Supabase Auth
   - Build popup UI

7. **React Native Mobile**
   - Create RN project
   - Integrate Supabase Auth
   - Build native UI

---

## Key Files to Create/Update

### Backend Files

#### New Files:
- `middleware/supabase-auth.js` - Supabase token verification
- `services/carrier/carrier-urls.js` - Tracking URL generator

#### Update Files:
- `config/supabase.js` - Add Supabase client
- `routes/auth.js` - Add Supabase Auth endpoints
- `routes/tracking.js` - Use Supabase Auth, add URL endpoint
- `server.js` - Update CORS configuration
- `env.example` - Add Supabase environment variables

### Frontend Files (Future)

#### Web App:
- `web/src/lib/supabase.js` - Supabase client
- `web/src/lib/api.js` - API client
- `web/src/components/TrackingList.jsx` - Tracking UI
- `web/src/components/TrackingPopup.jsx` - URL popup

#### Extension:
- `extension/background.js` - Service worker
- `extension/popup/popup.html` - Extension UI
- `extension/lib/supabase.js` - Supabase client

#### Mobile:
- `mobile/src/lib/supabase.js` - Supabase client
- `mobile/src/screens/TrackingScreen.js` - Tracking UI

---

## Environment Variables Needed

```env
# Supabase (NEW - Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (Existing)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Auth (Keep for now, will migrate)
NEXTAUTH_SECRET=your_secret

# OAuth (Keep)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

## API Endpoints Summary

### Authentication (Supabase Auth)
```
GET  /api/auth/supabase/config     - Get Supabase config for client
GET  /api/auth/session            - Get current session
POST /api/auth/supabase/refresh   - Refresh session
```

### Tracking
```
GET    /api/tracking/user         - Get all user trackings
POST   /api/tracking/add          - Add new tracking
PUT    /api/tracking/update       - Update tracking
DELETE /api/tracking/delete       - Delete tracking
GET    /api/tracking/:id/url      - Get tracking URL (NEW)
GET    /api/tracking/carriers     - Get available carriers
```

### User
```
GET /api/user/profile            - Get user profile
PUT /api/user/profile            - Update user profile
```

---

## Supabase Setup Steps

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Wait for database to initialize

2. **Enable Authentication**
   - Go to Authentication > Providers
   - Enable Google OAuth (if using)
   - Configure OAuth credentials

3. **Get API Keys**
   - Go to Settings > API
   - Copy:
     - Project URL → `SUPABASE_URL`
     - anon/public key → `SUPABASE_ANON_KEY`
     - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

4. **Configure Database**
   - Your existing Prisma schema should work
   - Just ensure UserProfile.id uses Supabase Auth UUID

---

## Testing Commands

```bash
# Test database connection
npm run db:studio

# Test server
npm run dev

# Test Supabase connection (create test script)
node scripts/test-supabase.js
```

---

## Common Questions

### Q: Do I need to keep NextAuth?
**A:** No, you can remove it after migrating to Supabase Auth. The `NEXTAUTH_SECRET` name is misleading - it's just a JWT secret.

### Q: Can I use both auth systems during migration?
**A:** Yes, you can support both temporarily. Update routes to check both token types.

### Q: What about existing users?
**A:** You'll need to:
1. Create Supabase Auth accounts for existing users
2. Link Supabase user IDs to existing UserProfile records
3. Or migrate users to use Supabase Auth on next login

### Q: Do I need separate backend for each platform?
**A:** No! One Express backend serves all platforms. They just use different frontend code.

### Q: Can I use Next.js for the web app?
**A:** Yes, but it's optional. You can use:
- Next.js (full-stack framework)
- React + Vite (simpler, recommended)
- Vue + Vite
- Plain HTML/JS

---

## Recommended Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend | Express.js | ✅ You already have it |
| Database | Supabase PostgreSQL | ✅ You already have it |
| ORM | Prisma | ✅ You already have it |
| Auth | Supabase Auth | ✅ Works for all platforms |
| Web | React + Vite | Modern, fast, simple |
| Extension | Manifest V3 | Latest standard |
| Mobile | React Native (Expo) | Easier deployment |

---

## Next Actions

1. **Read** `ARCHITECTURE_PROPOSAL.md` for full details
2. **Follow** `IMPLEMENTATION_GUIDE.md` step-by-step
3. **Start with** Phase 1 (Supabase Auth)
4. **Test thoroughly** before moving to Phase 2
5. **Build frontend** after backend is stable

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Prisma Docs**: https://www.prisma.io/docs
- **Express.js**: https://expressjs.com
- **React Native**: https://reactnative.dev

---

## Quick Reference: File Locations

```
PostalHub/
├── config/
│   ├── supabase.js          ← UPDATE: Add Supabase client
│   └── env.js               ← Already exists
│
├── middleware/
│   ├── supabase-auth.js     ← NEW: Supabase auth middleware
│   └── auth.js              ← Can deprecate later
│
├── routes/
│   ├── auth.js              ← UPDATE: Add Supabase endpoints
│   └── tracking.js          ← UPDATE: Add URL endpoint
│
├── services/
│   └── carrier/
│       ├── carrier-urls.js  ← NEW: URL generator
│       └── ...
│
└── server.js                ← UPDATE: CORS config
```

---

Start with **Phase 1** in `IMPLEMENTATION_GUIDE.md` and work through it step by step!

