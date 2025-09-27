# PostalHub External API Documentation

## Overview

PostalHub provides an external API that allows other applications to submit package tracking requests using Google OAuth authentication. This enables third-party apps to integrate with our tracking services.

## Base URL

```
http://localhost:3000/api/external
```

## Authentication

### Google OAuth Token

All external API requests require a valid Google OAuth access token in the Authorization header:

```
Authorization: Bearer <google_oauth_access_token>
```

### How to Get Google OAuth Token

External apps need to implement Google OAuth flow to get an access token:

1. **Redirect users to Google OAuth**:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_GOOGLE_CLIENT_ID&
     redirect_uri=YOUR_REDIRECT_URI&
     response_type=code&
     scope=https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile&
     access_type=offline
   ```

2. **Exchange code for access token**:
   ```javascript
   const response = await fetch('https://oauth2.googleapis.com/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams({
       client_id: 'YOUR_GOOGLE_CLIENT_ID',
       client_secret: 'YOUR_GOOGLE_CLIENT_SECRET',
       code: authorizationCode,
       grant_type: 'authorization_code',
       redirect_uri: 'YOUR_REDIRECT_URI'
     })
   });
   
   const { access_token } = await response.json();
   ```

3. **Use access token in API requests**:
   ```javascript
   const apiResponse = await fetch('http://localhost:3000/api/external/track', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${access_token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       trackingNumber: '1234567890',
       carrier: 'USPS'
     })
   });
   ```

## API Endpoints

### 1. Submit Tracking Request

**POST** `/api/external/track`

Submit a new package tracking request.

#### Request Body

```json
{
  "trackingNumber": "string (required, 8-50 characters)",
  "carrier": "string (optional, one of: USPS, UPS, FedEx, DHL)",
  "userId": "string (optional, custom user ID)",
  "metadata": {
    "orderId": "string (optional)",
    "customerName": "string (optional)",
    "notes": "string (optional)"
  },
  "callbackUrl": "string (optional, URL for status updates)",
  "appName": "string (optional, name of external app)"
}
```

**Note**: The `carrier` field is now **optional**. If not provided, the tracking request will be created with status `awaiting_carrier` and you can add the carrier later using the PUT endpoint.

#### Example Request (with carrier)

```bash
curl -X POST http://localhost:3000/api/external/track \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "9400111206213859496247",
    "carrier": "USPS",
    "metadata": {
      "orderId": "ORDER-12345",
      "customerName": "John Doe"
    },
    "callbackUrl": "https://yourapp.com/webhooks/tracking",
    "appName": "My E-commerce App"
  }'
```

#### Example Request (without carrier)

```bash
curl -X POST http://localhost:3000/api/external/track \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "9400111206213859496247",
    "metadata": {
      "orderId": "ORDER-12345",
      "customerName": "John Doe"
    },
    "appName": "My E-commerce App"
  }'
```

#### Response (with carrier)

```json
{
  "success": true,
  "message": "Tracking request created successfully",
  "trackingId": "uuid-string",
  "status": "pending",
  "hasCarrier": true,
  "estimatedProcessingTime": "30-60 seconds",
  "nextSteps": ["Check status via GET /track/:id/status"]
}
```

#### Response (without carrier)

```json
{
  "success": true,
  "message": "Tracking request created successfully. Carrier not specified - use PUT /track/:id/carrier to add carrier and start processing.",
  "trackingId": "uuid-string",
  "status": "awaiting_carrier",
  "hasCarrier": false,
  "estimatedProcessingTime": "N/A - carrier required",
  "nextSteps": [
    "Add carrier via PUT /track/:id/carrier",
    "Then check status via GET /track/:id/status"
  ]
}
```

### 2. Update Carrier

**PUT** `/api/external/track/{trackingId}/carrier`

Update the carrier for an existing tracking request. Use this when you initially submitted a tracking request without a carrier.

#### Request Body

```json
{
  "carrier": "string (required, one of: USPS, UPS, FedEx, DHL)"
}
```

#### Example Request

```bash
curl -X PUT http://localhost:3000/api/external/track/TRACKING_ID/carrier \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier": "USPS"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Carrier updated successfully",
  "trackingId": "uuid-string",
  "carrier": "United States Postal Service",
  "status": "pending",
  "estimatedProcessingTime": "30-60 seconds"
}
```

### 3. Get Tracking Status

**GET** `/api/external/status/{trackingId}`

Get the current status of a tracking request.

#### Example Request

```bash
curl -X GET http://localhost:3000/api/external/status/TRACKING_ID \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN"
```

#### Response

```json
{
  "trackingId": "uuid-string",
  "trackingNumber": "9400111206213859496247",
  "carrier": "United States Postal Service",
  "status": "completed",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:31:00Z",
  "shipment": {
    "trackingNumber": "9400111206213859496247",
    "carrier": "USPS",
    "currentStatus": "Delivered",
    "currentLocation": "New York, NY",
    "expectedDeliveryDate": "2024-01-16",
    "shippedDate": "2024-01-14"
  }
}
```

### 3. Get User's Tracking Requests

**GET** `/api/external/user/trackings`

Get all tracking requests for the authenticated user.

#### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (pending, processing, completed, failed)

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/external/user/trackings?page=1&limit=10&status=completed" \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN"
```

#### Response

```json
{
  "trackings": [
    {
      "id": "uuid-string",
      "trackingNumber": "9400111206213859496247",
      "carrier": {
        "name": "USPS",
        "displayName": "United States Postal Service"
      },
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z",
      "shipment": {
        "currentStatus": "Delivered",
        "currentLocation": "New York, NY",
        "expectedDeliveryDate": "2024-01-16"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "hasMore": true
  }
}
```

### 4. Dashboard Overview

**GET** `/api/external/dashboard/overview`

Get comprehensive dashboard overview with key metrics and statistics.

#### Example Request

```bash
curl -X GET http://localhost:3000/api/external/dashboard/overview \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN"
```

#### Response

```json
{
  "overview": {
    "totalTrackings": 150,
    "completedTrackings": 120,
    "pendingTrackings": 15,
    "processingTrackings": 10,
    "awaitingCarrierTrackings": 3,
    "failedTrackings": 2,
    "successRate": 80
  },
  "carrierBreakdown": [
    {
      "carrierId": "uuid",
      "carrierName": "USPS",
      "displayName": "United States Postal Service",
      "count": 100
    }
  ],
  "recentActivity": [
    {
      "id": "uuid",
      "trackingNumber": "9400111206213859496247",
      "carrier": "United States Postal Service",
      "status": "completed",
      "currentStatus": "Delivered",
      "currentLocation": "New York, NY",
      "expectedDeliveryDate": "2024-01-16",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:31:00Z"
    }
  ],
  "lastUpdated": "2024-01-15T12:00:00Z"
}
```

### 5. Get All Trackings (Dashboard)

**GET** `/api/external/dashboard/trackings`

Get all trackings with advanced filtering, sorting, and pagination for dashboard management.

#### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (pending, processing, completed, failed, awaiting_carrier)
- `carrier` (optional): Filter by carrier name (USPS, UPS, FedEx, DHL)
- `search` (optional): Search in tracking numbers, order IDs, or customer names
- `sortBy` (optional): Sort field (createdAt, updatedAt, trackingNumber, status)
- `sortOrder` (optional): Sort direction (asc, desc)
- `startDate` (optional): Filter from date (ISO format)
- `endDate` (optional): Filter to date (ISO format)
- `includeShipment` (optional): Include shipment details (true/false, default: true)

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/external/dashboard/trackings?page=1&limit=20&status=completed&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN"
```

#### Response

```json
{
  "trackings": [
    {
      "id": "uuid",
      "trackingNumber": "9400111206213859496247",
      "carrier": "United States Postal Service",
      "carrierName": "USPS",
      "status": "completed",
      "metadata": {
        "orderId": "ORDER-12345",
        "customerName": "John Doe"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:31:00Z",
      "shipment": {
        "trackingNumber": "9400111206213859496247",
        "carrier": "USPS",
        "currentStatus": "Delivered",
        "currentLocation": "New York, NY",
        "expectedDeliveryDate": "2024-01-16",
        "shippedDate": "2024-01-14"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "status": "completed",
    "carrier": null,
    "search": null,
    "startDate": null,
    "endDate": null,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

### 6. Get Analytics Data

**GET** `/api/external/dashboard/analytics`

Get analytics data for charts and insights.

#### Query Parameters

- `period` (optional): Time period (7d, 30d, 90d, default: 30d)

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/external/dashboard/analytics?period=30d" \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN"
```

#### Response

```json
{
  "period": "30d",
  "dateRange": {
    "startDate": "2023-12-16T00:00:00Z",
    "endDate": "2024-01-15T00:00:00Z"
  },
  "dailyTrackings": [
    {
      "date": "2024-01-15",
      "count": 5,
      "status": "completed"
    }
  ],
  "carrierPerformance": [
    {
      "carrier_name": "United States Postal Service",
      "carrier_code": "USPS",
      "total_trackings": 100,
      "successful_trackings": 85,
      "failed_trackings": 5,
      "success_rate": 85.0
    }
  ],
  "statusDistribution": [
    {
      "status": "completed",
      "count": 120
    }
  ],
  "deliveryPerformance": [
    {
      "delivery_status": "On Time",
      "count": 100
    }
  ],
  "generatedAt": "2024-01-15T12:00:00Z"
}
```

### 7. Get Bulk Status

**GET** `/api/external/dashboard/bulk-status`

Get status for multiple tracking IDs at once.

#### Query Parameters

- `ids` (required): Comma-separated tracking IDs (max 100)

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/external/dashboard/bulk-status?ids=id1,id2,id3" \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN"
```

#### Response

```json
{
  "trackings": {
    "id1": {
      "id": "id1",
      "trackingNumber": "9400111206213859496247",
      "carrier": "United States Postal Service",
      "status": "completed",
      "currentStatus": "Delivered",
      "currentLocation": "New York, NY",
      "expectedDeliveryDate": "2024-01-16",
      "updatedAt": "2024-01-15T10:31:00Z"
    }
  },
  "notFound": ["id3"],
  "found": 2,
  "total": 3,
  "generatedAt": "2024-01-15T12:00:00Z"
}
```

### 8. Export Tracking Data

**GET** `/api/external/dashboard/export`

Export tracking data in JSON or CSV format.

#### Query Parameters

- `format` (optional): Export format (json, csv, default: json)
- `status` (optional): Filter by status
- `carrier` (optional): Filter by carrier
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/external/dashboard/export?format=csv&status=completed" \
  -H "Authorization: Bearer YOUR_GOOGLE_ACCESS_TOKEN"
```

#### Response (CSV)

```csv
"id","trackingNumber","carrier","status","currentStatus","currentLocation","expectedDeliveryDate","createdAt"
"uuid","9400111206213859496247","United States Postal Service","completed","Delivered","New York, NY","2024-01-16","2024-01-15T10:30:00Z"
```

#### Response (JSON)

```json
{
  "data": [
    {
      "id": "uuid",
      "trackingNumber": "9400111206213859496247",
      "carrier": "United States Postal Service",
      "status": "completed",
      "currentStatus": "Delivered",
      "currentLocation": "New York, NY",
      "expectedDeliveryDate": "2024-01-16",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "metadata": {
    "total": 1,
    "exportedAt": "2024-01-15T12:00:00Z",
    "filters": {
      "status": "completed",
      "carrier": null,
      "startDate": null,
      "endDate": null
    }
  }
}
```

### 9. Get Available Carriers

**GET** `/api/external/carriers`

Get list of available carriers and their status.

#### Example Request

```bash
curl -X GET http://localhost:3000/api/external/carriers
```

#### Response

```json
{
  "carriers": [
    {
      "name": "USPS",
      "available": true,
      "configured": true
    },
    {
      "name": "UPS",
      "available": false,
      "configured": false
    },
    {
      "name": "FedEx",
      "available": false,
      "configured": false
    },
    {
      "name": "DHL",
      "available": false,
      "configured": false
    }
  ],
  "message": "Use these carrier names when submitting tracking requests"
}
```

## Webhook Callbacks

If you provide a `callbackUrl` when submitting a tracking request, PostalHub will send HTTP POST notifications when the status changes.

### Callback Request

**POST** `{callbackUrl}`

```json
{
  "trackingId": "uuid-string",
  "trackingNumber": "9400111206213859496247",
  "status": "completed",
  "carrier": "USPS",
  "shipment": {
    "currentStatus": "Delivered",
    "currentLocation": "New York, NY",
    "expectedDeliveryDate": "2024-01-16"
  },
  "timestamp": "2024-01-15T10:31:00Z"
}
```

### Callback Headers

```
Content-Type: application/json
User-Agent: PostalHub-External-API/1.0
```

## Error Responses

### 400 Bad Request

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

### 401 Unauthorized

```json
{
  "error": "No token provided",
  "message": "Include Google OAuth token in Authorization header as \"Bearer <token>\""
}
```

### 409 Conflict

```json
{
  "error": "Tracking number already exists for this user",
  "trackingId": "uuid-string",
  "status": "pending"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Failed to process tracking request"
}
```

## Rate Limiting

The API has rate limiting enabled:
- **100 requests per 15 minutes** per IP address
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

## Status Codes

- `pending`: Request received, waiting to be processed
- `processing`: Currently fetching tracking data from carrier
- `completed`: Tracking data successfully retrieved
- `failed`: Unable to retrieve tracking data

## Integration Examples

### JavaScript/Node.js

```javascript
class PostalHubClient {
  constructor(googleAccessToken) {
    this.token = googleAccessToken;
    this.baseUrl = 'http://localhost:3000/api/external';
  }

  async trackPackage(trackingNumber, carrier, options = {}) {
    const response = await fetch(`${this.baseUrl}/track`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trackingNumber,
        carrier,
        ...options
      })
    });

    return await response.json();
  }

  async getStatus(trackingId) {
    const response = await fetch(`${this.baseUrl}/status/${trackingId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return await response.json();
  }
}

// Usage
const client = new PostalHubClient('your-google-access-token');
const result = await client.trackPackage('9400111206213859496247', 'USPS', {
  callbackUrl: 'https://yourapp.com/webhook',
  appName: 'My App'
});
```

### Python

```python
import requests

class PostalHubClient:
    def __init__(self, google_access_token):
        self.token = google_access_token
        self.base_url = 'http://localhost:3000/api/external'
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def track_package(self, tracking_number, carrier, **options):
        response = requests.post(
            f'{self.base_url}/track',
            headers=self.headers,
            json={
                'trackingNumber': tracking_number,
                'carrier': carrier,
                **options
            }
        )
        return response.json()

    def get_status(self, tracking_id):
        response = requests.get(
            f'{self.base_url}/status/{tracking_id}',
            headers=self.headers
        )
        return response.json()

# Usage
client = PostalHubClient('your-google-access-token')
result = client.track_package('9400111206213859496247', 'USPS', 
                             callbackUrl='https://yourapp.com/webhook',
                             appName='My App')
```

## Support

For API support or questions, please contact the PostalHub team.
