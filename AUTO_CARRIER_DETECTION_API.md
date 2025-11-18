# Auto Carrier Detection API

## Overview
The tracking API now supports automatic carrier detection based on tracking number patterns. The frontend can send just a tracking number, and the backend will automatically determine the carrier.

## API Endpoint
`POST /api/tracking/add`

## Request Format

### Minimal Request (Auto-Detection)
```json
{
  "trackingNumber": "1Z1234567890123456"
}
```

### With Description (Auto-Detection)
```json
{
  "trackingNumber": "1Z1234567890123456",
  "description": "My package"
}
```

### Manual Carrier Override
```json
{
  "trackingNumber": "1Z1234567890123456",
  "brand": "UPS",
  "description": "My package"
}
```

## Supported Tracking Number Patterns

### UPS
- `1Z[0-9A-Z]{16}` - Standard UPS format (1Z followed by 16 alphanumeric)
- `[0-9]{10,}` - 10+ digit numbers

**Examples:**
- `1Z1234567890123456`
- `1234567890`

### FedEx
- `[0-9]{12}` - 12 digits
- `[0-9]{14}` - 14 digits

**Examples:**
- `123456789012`
- `12345678901234`

### USPS
- `[A-Z]{2}[0-9]{9}[A-Z]{2}` - 2 letters, 9 digits, 2 letters
- `[0-9]{4}\s[0-9]{4}\s[0-9]{4}\s[0-9]{4}` - 4 groups of 4 digits

**Examples:**
- `AB123456789CD`
- `1234 5678 9012 3456`

### DHL
- `[0-9]{10,11}` - 10-11 digits

**Examples:**
- `1234567890`
- `12345678901`

### Amazon
- `TBA[0-9]{10}` - TBA followed by 10 digits

**Examples:**
- `TBA1234567890`

## Response Format

### Success Response
```json
{
  "id": "tracking_request_uuid",
  "trackingNumber": "1Z1234567890123456",
  "brand": "ups",
  "description": "My package",
  "dateAdded": "2024-10-06T00:00:00.000Z"
}
```

### Error Responses

#### Auto-Detection Failed
```json
{
  "error": "Unable to detect carrier from tracking number. Please specify the carrier manually.",
  "trackingNumber": "UNKNOWN123"
}
```

#### Carrier Not Available
```json
{
  "error": "UPS tracking service is not available"
}
```

#### Validation Error
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "trackingNumber",
      "message": "Tracking number must be between 8 and 50 characters"
    }
  ]
}
```

## Frontend Implementation

### Simple Implementation (Auto-Detection)
```javascript
const addTracking = async (trackingNumber, description = '') => {
  const response = await fetch('/api/tracking/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      trackingNumber,
      description
    })
  });
  
  return await response.json();
};

// Usage
await addTracking('1Z1234567890123456', 'My UPS package');
await addTracking('123456789012', 'My FedEx package');
```

### With Manual Override
```javascript
const addTracking = async (trackingNumber, brand = null, description = '') => {
  const body = { trackingNumber, description };
  if (brand) body.brand = brand;
  
  const response = await fetch('/api/tracking/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  
  return await response.json();
};

// Usage
await addTracking('1Z1234567890123456'); // Auto-detect
await addTracking('UNKNOWN123', 'UPS'); // Manual override
```

## Benefits

1. **Simplified Frontend**: No need to implement carrier selection UI
2. **Better UX**: Users just paste tracking numbers
3. **Fallback Support**: Manual carrier override for edge cases
4. **Pattern Recognition**: Handles most common tracking number formats
5. **Extensible**: Easy to add new carriers and patterns

## Testing Examples

```bash
# UPS tracking number (auto-detected)
curl -X POST http://localhost:3000/api/tracking/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trackingNumber": "1Z1234567890123456"}'

# FedEx tracking number (auto-detected)
curl -X POST http://localhost:3000/api/tracking/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trackingNumber": "123456789012"}'

# Manual override
curl -X POST http://localhost:3000/api/tracking/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trackingNumber": "UNKNOWN123", "brand": "UPS"}'
```

## Database Setup

Make sure to run the seed command to populate carriers:

```bash
npm run db:seed
# or
npx prisma db seed
```

This will create carriers for USPS, UPS, FedEx, DHL, and Amazon.

