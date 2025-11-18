# PostalHub Implementation Guide

## Step-by-Step Implementation

This guide provides concrete code examples and steps to implement the architecture proposal.

---

## Phase 1: Supabase Auth Integration

### Step 1.1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

### Step 1.2: Create Supabase Configuration

**File: `config/supabase.js`** (UPDATE existing file)

```javascript
const { createClient } = require('@supabase/supabase-js');
const { getConfig } = require('./env');

const config = getConfig();

// Supabase client for server-side operations (uses service role)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Public Supabase client (for client-side operations)
// This will be used by frontend applications
const supabasePublic = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )
  : null;

module.exports = {
  supabaseAdmin,  // Backend use only
  supabasePublic  // For frontend SDK exports
};
```

### Step 1.3: Update Environment Variables

**File: `env.example`** (UPDATE)

```env
# ========================================
# REQUIRED: Supabase Configuration
# ========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ========================================
# REQUIRED: Database Configuration
# ========================================
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# ... rest of existing config ...
```

### Step 1.4: Create Supabase Auth Middleware

**File: `middleware/supabase-auth.js`** (NEW)

```javascript
const { supabaseAdmin } = require('../config/supabase');
const { prisma } = require('../lib/prisma');
const { createLogger } = require('../utils/logger');

const logger = createLogger('SupabaseAuth');

/**
 * Middleware to verify Supabase JWT token
 * Replaces the custom JWT verification
 */
const verifySupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Invalid Supabase token', { error: error?.message });
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Get or create user profile in our database
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: user.id }
    });

    // If user doesn't exist in our database, create them
    if (!userProfile) {
      userProfile = await prisma.userProfile.create({
        data: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        }
      });
      logger.info('Created new user profile', { userId: user.id });
    } else {
      // Update user profile with latest info from Supabase
      userProfile = await prisma.userProfile.update({
        where: { id: user.id },
        data: {
          email: user.email,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || userProfile.fullName,
          avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || userProfile.avatarUrl
        }
      });
    }

    // Add user to request object
    req.user = userProfile;
    req.supabaseUser = user; // Also include Supabase user object
    
    next();
  } catch (error) {
    logger.exception(error, 'Token verification error');
    return res.status(401).json({ 
      error: 'Token verification failed',
      code: 'VERIFICATION_FAILED'
    });
  }
};

/**
 * Optional authentication middleware
 * Continues even if no token is provided
 */
const optionalSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (!error && user) {
        const userProfile = await prisma.userProfile.findUnique({
          where: { id: user.id }
        });
        
        if (userProfile) {
          req.user = userProfile;
          req.supabaseUser = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  verifySupabaseToken,
  optionalSupabaseAuth
};
```

### Step 1.5: Update Auth Routes

**File: `routes/auth.js`** (UPDATE - Add Supabase Auth endpoints)

Add these new routes to your existing `routes/auth.js`:

```javascript
const { supabaseAdmin } = require('../config/supabase');
const { verifySupabaseToken } = require('../middleware/supabase-auth');

// ... existing code ...

/**
 * GET /api/auth/supabase/config
 * Get Supabase configuration for client-side
 * This allows frontend to initialize Supabase client
 */
router.get('/supabase/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

/**
 * GET /api/auth/session
 * Get current session (Supabase Auth version)
 */
router.get('/session', verifySupabaseToken, async (req, res) => {
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
 * POST /api/auth/supabase/refresh
 * Refresh Supabase session
 * Frontend should handle this automatically, but this is a fallback
 */
router.post('/supabase/refresh', verifySupabaseToken, async (req, res) => {
  try {
    // Supabase handles refresh automatically on client side
    // This endpoint just validates the current token
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.fullName,
        image: req.user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Step 1.6: Update Tracking Routes to Use Supabase Auth

**File: `routes/tracking.js`** (UPDATE)

Replace `verifyNextAuthToken` with `verifySupabaseToken`:

```javascript
// Change this:
const { verifyNextAuthToken } = require('../middleware/auth');

// To this:
const { verifySupabaseToken } = require('../middleware/supabase-auth');

// Then replace all instances of verifyNextAuthToken with verifySupabaseToken
```

### Step 1.7: Update Database Schema

**File: `prisma/schema.prisma`** (UPDATE)

Ensure UserProfile uses Supabase Auth UUID:

```prisma
model UserProfile {
  id         String   @id // Supabase Auth UUID
  email      String   @unique
  fullName   String?  @map("full_name")
  avatarUrl  String?  @map("avatar_url")
  password   String?  // Can be removed if using only Supabase Auth
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  trackingRequests TrackingRequest[]

  @@map("user_profiles")
}
```

Run migration:
```bash
npm run db:push
```

---

## Phase 2: Add Tracking URL Feature

### Step 2.1: Create Carrier URL Service

**File: `services/carrier/carrier-urls.js`** (NEW)

```javascript
/**
 * Carrier Tracking URL Generator
 * Generates tracking URLs for different carriers
 */

const carrierUrls = {
  USPS: (trackingNumber) => {
    // Remove spaces and format
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanNumber}`;
  },
  
  UPS: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.ups.com/track?tracknum=${cleanNumber}`;
  },
  
  FedEx: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.fedex.com/fedextrack/?trknbr=${cleanNumber}`;
  },
  
  DHL: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.dhl.com/en/express/tracking.html?AWB=${cleanNumber}`;
  },
  
  Amazon: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.amazon.com/progress-tracker/package/${cleanNumber}`;
  }
};

/**
 * Get tracking URL for a carrier and tracking number
 * @param {string} carrierName - Name of the carrier
 * @param {string} trackingNumber - Tracking number
 * @returns {string|null} - Tracking URL or null if carrier not supported
 */
function getTrackingUrl(carrierName, trackingNumber) {
  if (!carrierName || !trackingNumber) {
    return null;
  }

  const normalizedCarrier = carrierName.toUpperCase();
  const urlGenerator = carrierUrls[normalizedCarrier];
  
  if (!urlGenerator) {
    return null;
  }

  return urlGenerator(trackingNumber);
}

module.exports = {
  getTrackingUrl,
  carrierUrls
};
```

### Step 2.2: Add Tracking URL Endpoint

**File: `routes/tracking.js`** (UPDATE - Add new endpoint)

Add this endpoint to your existing tracking routes:

```javascript
const { getTrackingUrl } = require('../services/carrier/carrier-urls');

/**
 * GET /api/tracking/:id/url
 * Get tracking URL for a specific tracking request
 * Opens carrier's tracking page
 */
router.get('/:id/url', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get tracking request
    const request = await prisma.trackingRequest.findFirst({
      where: {
        id: id,
        userId: userId
      },
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ 
        error: 'Tracking request not found' 
      });
    }

    // Generate tracking URL
    const trackingUrl = getTrackingUrl(
      request.carrier.name,
      request.trackingNumber
    );

    if (!trackingUrl) {
      return res.status(400).json({ 
        error: `Tracking URL not available for carrier: ${request.carrier.name}` 
      });
    }

    res.json({
      url: trackingUrl,
      trackingNumber: request.trackingNumber,
      carrier: request.carrier.name,
      carrierDisplayName: request.carrier.displayName
    });

  } catch (error) {
    console.error('Get tracking URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Phase 3: Update CORS for All Platforms

### Step 3.1: Update CORS Configuration

**File: `server.js`** (UPDATE)

```javascript
// Update CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Web app
      config.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://localhost:8080',
      
      // Chrome Extension (manifest V3)
      'chrome-extension://*',
      
      // Development
      ...(config.NODE_ENV === 'development' 
        ? ['http://localhost:*', 'http://127.0.0.1:*'] 
        : [])
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Handle wildcard patterns
        const pattern = allowed.replace('*', '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return origin === allowed;
    });
    
    if (isAllowed || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Phase 4: Frontend Integration Examples

### Web App - Supabase Client Setup

**File: `web/src/lib/supabase.js`** (NEW - for web app)

```javascript
import { createClient } from '@supabase/supabase-js';

// Get config from backend or environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helpers
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};
```

### Web App - API Client

**File: `web/src/lib/api.js`** (NEW)

```javascript
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Tracking API methods
export const trackingApi = {
  // Get all user trackings
  getAll: () => apiRequest('/tracking/user'),
  
  // Add tracking
  add: (trackingNumber, brand, description) => 
    apiRequest('/tracking/add', {
      method: 'POST',
      body: JSON.stringify({ trackingNumber, brand, description })
    }),
  
  // Update tracking
  update: (id, data) =>
    apiRequest('/tracking/update', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    }),
  
  // Delete tracking
  delete: (id) =>
    apiRequest('/tracking/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    }),
  
  // Get tracking URL
  getUrl: (id) => apiRequest(`/tracking/${id}/url`)
};
```

### Web App - Open Tracking URL Example

```javascript
import { trackingApi } from './lib/api';

async function openTrackingUrl(trackingId) {
  try {
    const { url } = await trackingApi.getUrl(trackingId);
    
    // Open in new window/popup
    const popup = window.open(
      url,
      'tracking',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      // Fallback if popup blocked
      window.location.href = url;
    }
  } catch (error) {
    console.error('Failed to open tracking URL:', error);
    alert('Failed to open tracking page');
  }
}
```

---

## Testing Checklist

### Backend Testing

- [ ] Supabase Auth token verification works
- [ ] User profile sync works (create/update)
- [ ] Tracking CRUD operations work with Supabase Auth
- [ ] Tracking URL generation works for all carriers
- [ ] CORS allows all platforms
- [ ] Error handling works correctly

### Frontend Testing (Web)

- [ ] Supabase Auth login works
- [ ] Session persists across page reloads
- [ ] API calls include auth token
- [ ] Tracking operations work
- [ ] Tracking URL popup opens correctly

---

## Migration Checklist

### Before Migration

- [ ] Backup database
- [ ] Document current user IDs
- [ ] Test Supabase Auth setup
- [ ] Prepare migration script for existing users

### During Migration

- [ ] Install Supabase dependencies
- [ ] Update environment variables
- [ ] Update middleware
- [ ] Update routes
- [ ] Test authentication flow
- [ ] Migrate existing users to Supabase Auth

### After Migration

- [ ] Test all endpoints
- [ ] Verify user data integrity
- [ ] Update frontend applications
- [ ] Monitor for errors
- [ ] Update documentation

---

## Next Steps

1. **Set up Supabase project** (if not done)
   - Enable Auth
   - Configure OAuth providers
   - Get API keys

2. **Follow Phase 1** (Supabase Auth integration)
   - Test thoroughly before moving on

3. **Follow Phase 2** (Tracking URL feature)
   - Test with different carriers

4. **Update frontend** (when ready)
   - Start with web app
   - Then extension
   - Finally mobile

---

## Troubleshooting

### Common Issues

**Issue: "Invalid token" errors**
- Check SUPABASE_SERVICE_ROLE_KEY is correct
- Verify token is being sent in Authorization header
- Check token hasn't expired

**Issue: "User not found" after login**
- Check user sync logic in middleware
- Verify Supabase user ID matches database

**Issue: CORS errors**
- Check allowed origins in server.js
- Verify credentials: true is set
- Check browser console for specific error

**Issue: Tracking URL not generating**
- Verify carrier name matches exactly
- Check tracking number format
- Test URL generator directly

---

This guide provides the concrete steps to implement the architecture. Start with Phase 1 and test thoroughly before proceeding.

