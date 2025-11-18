# Frontend API Usage Guide

## Overview
This document lists the **exact API endpoints** that your frontend (`public/index.html` + `public/js/app.js`) expects to use.

---

## 🎯 APIs Actually Used by Your Frontend

### 1. Authentication Endpoints

#### **GET /api/auth/session**
**Used When:** Page loads, checking if user is logged in
**Authentication:** Bearer Token (JWT)
**Request:**
```javascript
GET /api/auth/session
Headers: {
  Authorization: Bearer <jwt_token>
}
```
**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://..."
  }
}
```
**Frontend Code:** Line 57 in app.js
**Status:** ✅ Working

---

#### **GET /api/auth/google-url**
**Used When:** User clicks "Sign in with Google" button
**Authentication:** None (public endpoint)
**Request:**
```javascript
GET /api/auth/google-url
```
**Expected Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```
**Frontend Code:** Line 144 in app.js
**Status:** ✅ Working

---

#### **GET /api/auth/google**
**Used When:** Alternative Google OAuth redirect method
**Authentication:** None (initiates OAuth flow)
**Request:**
```javascript
// Browser redirects to:
GET /api/auth/google
```
**Expected Response:** Redirect to Google OAuth, then callback returns JWT token
**Frontend Code:** Line 130 in app.js (signInWithGoogle function)
**Status:** ✅ Working

---

#### **POST /api/auth/logout**
**Used When:** User clicks logout button
**Authentication:** Bearer Token (JWT)
**Request:**
```javascript
POST /api/auth/logout
Headers: {
  Authorization: Bearer <jwt_token>
}
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```
**Frontend Code:** Line 193-204 in app.js
**Status:** ✅ Working

---

### 2. Tracking Endpoints

#### **POST /api/tracking/track**
**Used When:** User submits tracking form (adds new package)
**Authentication:** Bearer Token (JWT) - Required
**Request:**
```javascript
POST /api/tracking/track
Headers: {
  Authorization: Bearer <jwt_token>,
  Content-Type: application/json
}
Body: {
  "trackingNumber": "1234567890",
  "carrier": "USPS"
}
```
**Expected Response:**
```json
{
  "message": "Tracking request created successfully",
  "trackingId": "uuid-string",
  "status": "pending"
}
```
**Frontend Code:** Line 225-232 in app.js
**HTML Form:** Lines 73-97 in index.html
**Status:** ✅ Working

---

#### **GET /api/tracking/requests**
**Used When:** Loading dashboard, displaying user's packages
**Authentication:** Bearer Token (JWT) - Required
**Request:**
```javascript
GET /api/tracking/requests?page=1&limit=10
Headers: {
  Authorization: Bearer <jwt_token>
}
```
**Expected Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "trackingNumber": "1234567890",
      "status": "completed",
      "carrier": {
        "name": "USPS",
        "displayName": "United States Postal Service"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:31:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "hasMore": false
  }
}
```
**Frontend Code:** Line 282-286 in app.js
**Display Logic:** Lines 329-389 in app.js (updateTrackingList function)
**Status:** ✅ Working

---

### 3. User/Dashboard Endpoints

#### **GET /api/user/dashboard**
**Used When:** Loading dashboard statistics
**Authentication:** Bearer Token (JWT) - Required
**Request:**
```javascript
GET /api/user/dashboard
Headers: {
  Authorization: Bearer <jwt_token>
}
```
**Expected Response:**
```json
{
  "stats": {
    "total": 10,
    "pending": 2,
    "processing": 1,
    "completed": 7,
    "failed": 0
  },
  "carrierStats": {
    "USPS": 8,
    "UPS": 2
  },
  "trackingData": [...]
}
```
**Frontend Code:** Line 277-280 in app.js
**Display Logic:** Lines 321-326 in app.js (updateDashboardStats function)
**HTML Display:** Lines 101-154 in index.html (stat cards)
**Status:** ✅ Working

---

## 📊 Frontend Data Flow

### On Page Load:
```
1. Check localStorage for 'auth_token'
2. If token exists → GET /api/auth/session
3. If valid → Show dashboard
4. Load data:
   - GET /api/user/dashboard (stats)
   - GET /api/tracking/requests (package list)
```

### On Login:
```
1. User clicks "Sign in with Google"
2. GET /api/auth/google-url (popup method)
   OR redirect to GET /api/auth/google
3. Google OAuth flow completes
4. Callback receives JWT token
5. Store token in localStorage
6. Reload page → show dashboard
```

### On Add Tracking:
```
1. User fills form (tracking number + carrier)
2. POST /api/tracking/track
3. On success:
   - Reset form
   - Reload dashboard data
   - Show success notification
```

### On Logout:
```
1. User clicks logout
2. Clear localStorage.removeItem('auth_token')
3. Redirect to home page
4. Show login screen
```

---

## 🔑 Authentication Pattern

### Token Storage:
```javascript
// Store token after login
localStorage.setItem('auth_token', token);

// Retrieve token for requests
const token = localStorage.getItem('auth_token');

// Clear token on logout
localStorage.removeItem('auth_token');
```

### Making Authenticated Requests:
```javascript
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    'Content-Type': 'application/json'
  }
})
```

---

## 🎨 Frontend UI Elements

### HTML Elements Used:
- **Login Button:** `#login-btn`, `#login-content-btn` (lines 30, 56)
- **Logout Button:** `#logout-btn` (line 40)
- **Tracking Form:** `#tracking-form` (line 73)
- **Tracking List:** `#tracking-list` (line 162)
- **Stats Display:** `#stat-total`, `#stat-pending`, `#stat-processing`, `#stat-completed` (lines 111, 124, 137, 150)

### Form Inputs:
- **Tracking Number:** `input[name="trackingNumber"]` (line 76)
- **Carrier:** `select[name="carrier"]` with options: USPS, UPS, FedEx, DHL (lines 82-89)

---

## ✅ API Compatibility Summary

| Endpoint | Method | Auth | Frontend Uses | Backend Supports | Status |
|----------|--------|------|---------------|------------------|--------|
| `/api/auth/session` | GET | JWT | ✅ Yes | ✅ Yes | ✅ Working |
| `/api/auth/google-url` | GET | None | ✅ Yes | ✅ Yes | ✅ Working |
| `/api/auth/google` | GET | None | ✅ Yes | ✅ Yes | ✅ Working |
| `/api/auth/logout` | POST | JWT | ✅ Yes | ✅ Yes | ✅ Working |
| `/api/tracking/track` | POST | JWT | ✅ Yes | ✅ Yes | ✅ Working |
| `/api/tracking/requests` | GET | JWT | ✅ Yes | ✅ Yes | ✅ Working |
| `/api/user/dashboard` | GET | JWT | ✅ Yes | ✅ Yes | ✅ Working |

**Result:** 🎉 **100% Compatible** - All frontend requirements are met!

---

## 🚀 Quick Test Commands

### Test Authentication:
```bash
# Get Google OAuth URL
curl -X GET http://localhost:3000/api/auth/google-url

# Login (if using email/password)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Check session
curl -X GET http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Tracking:
```bash
# Add tracking
curl -X POST http://localhost:3000/api/tracking/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trackingNumber": "9400111206213859496247", "carrier": "USPS"}'

# Get tracking requests
curl -X GET http://localhost:3000/api/tracking/requests \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get dashboard
curl -X GET http://localhost:3000/api/user/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Notes

### Frontend Expectations:
1. **JSON Responses:** All endpoints must return JSON (frontend checks `content-type`)
2. **Bearer Token:** All authenticated requests use `Authorization: Bearer <token>` header
3. **Error Handling:** Frontend expects `{ error: "message" }` format for errors
4. **Success Messages:** Frontend looks for success indicators to show notifications

### Current Carriers in UI:
- USPS ✅ (implemented in backend)
- UPS ⏳ (UI ready, backend pending)
- FedEx ⏳ (UI ready, backend pending)
- DHL ⏳ (UI ready, backend pending)

### Token Lifecycle:
- **Access Token:** 1 hour expiry
- **Refresh Token:** 7 days expiry (available but not yet used by frontend)
- **Storage:** localStorage (browser)
- **Refresh Logic:** Not yet implemented in frontend (future enhancement)

---

## 🔒 Security Notes

✅ **All tracking endpoints require authentication**
✅ **User can only see their own data** (filtered by userId on backend)
✅ **Tokens verified on every request**
✅ **CORS protection enabled**
✅ **Rate limiting active** (100 req/15min)

---

## 📱 Frontend Features

### Currently Implemented:
- ✅ Google OAuth login with popup
- ✅ Session persistence (localStorage)
- ✅ Dashboard statistics display
- ✅ Add tracking packages
- ✅ View tracking list with status
- ✅ Responsive UI with Tailwind CSS
- ✅ Loading states and notifications
- ✅ Error handling with user feedback

### Ready for Enhancement:
- 🔄 Automatic token refresh
- 🔔 Real-time notifications
- 📊 Advanced filtering/search
- 📄 Detailed tracking view (clicking on package)
- 📧 Email notifications
- 🎨 Dark mode

---

## Summary

**Your frontend uses exactly 7 API endpoints:**

1. `GET /api/auth/session` - Check login status
2. `GET /api/auth/google-url` - Get OAuth URL
3. `GET /api/auth/google` - OAuth redirect
4. `POST /api/auth/logout` - Logout
5. `POST /api/tracking/track` - Add tracking
6. `GET /api/tracking/requests` - Get user's packages
7. `GET /api/user/dashboard` - Get statistics

**All 7 endpoints are fully implemented and working!** ✅


