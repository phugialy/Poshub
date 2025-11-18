# PostalHub Architecture Proposal

## Current State Analysis

### What You Have:
- ✅ **Express.js Backend** (NOT Next.js - you're using Express)
- ✅ **Supabase PostgreSQL** via Prisma ORM (database only)
- ✅ **Custom JWT Auth** (not Supabase Auth yet)
- ✅ **Google OAuth** (manual implementation)
- ✅ **Tracking CRUD operations** (Add/Modify/Delete)
- ✅ **Auto carrier detection** from tracking numbers
- ✅ **Basic API structure** for tracking management

### What's Missing:
- ❌ **Supabase Auth integration** (you want this)
- ❌ **Multi-platform architecture** (Web/Extension/Mobile)
- ❌ **Unified API design** for all platforms
- ❌ **Tracking URL popup functionality**

---

## Recommended Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                       │
├──────────────┬──────────────┬───────────────────────────────┤
│   Web App    │  Extension   │    Mobile App (RN)            │
│  (React/Vue) │  (Chrome)    │   (React Native)               │
└──────┬───────┴──────┬───────┴───────────┬───────────────────┘
       │              │                    │
       └──────────────┼────────────────────┘
                     │
       ┌─────────────▼─────────────┐
       │   Express.js Backend API   │
       │   (RESTful JSON API)       │
       └─────────────┬─────────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │              │
┌──────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
│ Supabase    │ │Prisma  │ │  Carrier    │
│ Auth        │ │ORM     │ │  Services   │
│ (JWT)       │ │        │ │  (USPS/etc) │
└─────────────┘ └────────┘ └─────────────┘
       │
┌──────▼──────┐
│ Supabase    │
│ PostgreSQL  │
└─────────────┘
```

### Platform-Specific Considerations

#### 1. **Web Application**
- **Framework**: React/Vue/Next.js (frontend only)
- **Auth**: Supabase Auth SDK (browser)
- **API**: Direct HTTP calls to Express backend
- **Storage**: Browser localStorage/sessionStorage for tokens

#### 2. **Chrome Extension**
- **Type**: Manifest V3
- **Auth**: Supabase Auth SDK (works in extension context)
- **API**: Same Express backend, but handle CORS properly
- **Storage**: Chrome storage API (sync/local)
- **Special**: Content scripts for page interaction

#### 3. **React Native Mobile**
- **Framework**: React Native (Expo or bare)
- **Auth**: Supabase Auth SDK (React Native compatible)
- **API**: Same Express backend
- **Storage**: AsyncStorage or SecureStore
- **Platform**: iOS & Android from single codebase

---

## Implementation Strategy

### Phase 1: Migrate to Supabase Auth

**Why Supabase Auth?**
- ✅ Works seamlessly across all 3 platforms
- ✅ Built-in OAuth providers (Google, Apple, etc.)
- ✅ Secure token management
- ✅ Row Level Security (RLS) support
- ✅ Email/password, magic links, OAuth all supported

**Migration Steps:**

1. **Install Supabase Client**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create Supabase Auth Middleware**
   - Replace custom JWT verification with Supabase token verification
   - Use Supabase service role key for backend verification

3. **Update Auth Routes**
   - Keep existing endpoints but use Supabase Auth
   - Add Supabase Auth endpoints for client-side auth

4. **Update Database Schema**
   - Link Supabase Auth users to your UserProfile table
   - Use Supabase user ID as foreign key

### Phase 2: Unified API Design

**API Structure:**
```
/api/auth/*          - Authentication (Supabase Auth)
/api/tracking/*      - Tracking CRUD operations
/api/user/*          - User profile management
/api/carriers/*      - Carrier information
```

**Key Principles:**
- ✅ RESTful JSON API
- ✅ Consistent error responses
- ✅ Platform-agnostic (works for all 3)
- ✅ JWT tokens in Authorization header
- ✅ CORS configured for all platforms

### Phase 3: Platform-Specific Features

#### Web App
- Standard React/Vue app
- Supabase Auth UI components
- Direct API calls

#### Chrome Extension
- Background service worker
- Popup UI for quick access
- Content script for page interaction
- Storage sync across devices

#### React Native
- Native navigation
- Push notifications (future)
- Deep linking
- Native sharing

---

## Detailed Implementation Plan

### 1. Supabase Auth Integration

#### Backend Changes:

**New File: `middleware/supabase-auth.js`**
```javascript
// Verify Supabase JWT tokens
// Use Supabase service role for backend verification
```

**Update: `routes/auth.js`**
- Add Supabase Auth endpoints
- Keep existing endpoints for backward compatibility
- Add user sync between Supabase Auth and UserProfile

#### Database Changes:

**Update Prisma Schema:**
```prisma
model UserProfile {
  id         String   @id // Supabase Auth UUID
  email      String   @unique
  // ... rest of fields
}
```

**Migration Strategy:**
- Link existing users to Supabase Auth
- Create Supabase Auth users for existing accounts
- Use Supabase user ID as primary key

### 2. Tracking URL Popup Feature

**New Endpoint: `GET /api/tracking/:id/url`**
- Returns carrier tracking URL
- Format: `{carrierUrl}/{trackingNumber}`
- Example: `https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428493`

**Frontend Implementation:**
- Button triggers popup with tracking URL
- Works in Web, Extension, and Mobile
- Mobile: Opens in in-app browser or system browser

### 3. Multi-Platform API Client

**Create shared API client library:**
- Works in browser, extension, and React Native
- Handles authentication automatically
- Error handling and retry logic
- TypeScript support (optional)

---

## File Structure Recommendations

```
PostalHub/
├── backend/                    # Express.js backend
│   ├── config/
│   │   ├── supabase.js         # NEW: Supabase client
│   │   └── auth.js             # UPDATE: Supabase Auth config
│   ├── middleware/
│   │   ├── supabase-auth.js    # NEW: Supabase token verification
│   │   └── auth.js             # UPDATE: Use Supabase Auth
│   ├── routes/
│   │   ├── auth.js             # UPDATE: Supabase Auth endpoints
│   │   └── tracking.js         # UPDATE: Add URL endpoint
│   └── ...
│
├── web/                        # NEW: Web application
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.js     # Supabase client
│   │   ├── components/
│   │   └── pages/
│   └── package.json
│
├── extension/                  # NEW: Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── popup/
│   │   └── popup.html
│   ├── content/
│   │   └── content.js
│   └── lib/
│       └── supabase.js         # Supabase client
│
├── mobile/                     # NEW: React Native app
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.js     # Supabase client
│   │   ├── screens/
│   │   └── components/
│   └── package.json
│
└── shared/                     # NEW: Shared utilities
    ├── api-client.js           # Unified API client
    └── constants.js            # Shared constants
```

---

## Functional Requirements Implementation

### ✅ User Login
- **Supabase Auth** handles all login methods
- OAuth (Google, Apple, etc.)
- Email/password
- Magic links (optional)

### ✅ Add Tracking
- `POST /api/tracking/add`
- Auto-detect carrier if not provided
- Store in database with user association

### ✅ Modify Tracking
- `PUT /api/tracking/update`
- Update tracking number, carrier, or description
- Validate ownership

### ✅ Delete Tracking
- `DELETE /api/tracking/delete`
- Soft delete or hard delete
- Cascade to related shipment data

### ✅ Get Tracking URL
- `GET /api/tracking/:id/url`
- Returns carrier-specific tracking URL
- Frontend opens in popup/new tab

### ✅ Auto Carrier Detection
- Already implemented in `routes/tracking.js`
- Pattern matching for tracking numbers
- Can be enhanced with ML/AI later

---

## Migration Path

### Step 1: Set Up Supabase Auth (Week 1)
1. Create Supabase project (if not exists)
2. Enable Auth in Supabase dashboard
3. Configure OAuth providers
4. Install Supabase client in backend
5. Create auth middleware
6. Test auth flow

### Step 2: Update Backend (Week 1-2)
1. Migrate auth routes to Supabase
2. Update database schema
3. Migrate existing users
4. Add tracking URL endpoint
5. Update CORS for all platforms
6. Test all endpoints

### Step 3: Web App (Week 2-3)
1. Create React/Vue app
2. Integrate Supabase Auth
3. Build tracking UI
4. Implement popup functionality
5. Test end-to-end

### Step 4: Chrome Extension (Week 3-4)
1. Create extension structure
2. Integrate Supabase Auth
3. Build popup UI
4. Implement storage sync
5. Test in Chrome

### Step 5: React Native (Week 4-5)
1. Create React Native project
2. Integrate Supabase Auth
3. Build native UI
4. Test on iOS/Android
5. Deploy to app stores

---

## Security Considerations

1. **Supabase RLS Policies**
   - Users can only access their own tracking data
   - Backend uses service role for admin operations

2. **CORS Configuration**
   - Whitelist specific origins
   - Support extension origins
   - Mobile app origins

3. **Token Management**
   - Supabase handles token refresh
   - Secure storage on all platforms
   - Token expiration handling

4. **API Rate Limiting**
   - Already implemented
   - Platform-specific limits if needed

---

## Next Steps

1. **Review this proposal**
2. **Decide on frontend framework** (React/Vue/Next.js for web)
3. **Set up Supabase Auth** in your Supabase project
4. **Start with backend migration** (Phase 1)
5. **Build Web app first** (easiest to test)
6. **Then Extension** (similar to web)
7. **Finally Mobile** (most complex)

---

## Questions to Consider

1. **Web Framework**: React, Vue, or Next.js?
2. **Mobile**: Expo or bare React Native?
3. **Extension**: Manifest V2 or V3? (V3 recommended)
4. **Deployment**: Where will you host backend? (Vercel, Railway, etc.)
5. **Database**: Keep Supabase PostgreSQL or migrate?

---

## Recommended Tech Stack Summary

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend | Express.js | ✅ Already have it |
| Database | Supabase PostgreSQL | ✅ Already using it |
| Auth | Supabase Auth | ✅ Works for all platforms |
| ORM | Prisma | ✅ Already using it |
| Web | React + Vite | Modern, fast, simple |
| Extension | Manifest V3 | Latest standard |
| Mobile | React Native (Expo) | Easier deployment |

---

This architecture provides:
- ✅ Unified backend for all platforms
- ✅ Supabase Auth integration
- ✅ Scalable structure
- ✅ Clear separation of concerns
- ✅ Easy to maintain and extend

