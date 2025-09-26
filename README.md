# PostalHub Backend

A comprehensive package tracking backend service that integrates with multiple carriers (USPS, UPS, FedEx, DHL) and provides a modern web interface for users to track their packages.

## Features

- 🔐 **Google OAuth Integration** with NextAuth.js
- 📦 **Multi-Carrier Support** (USPS, UPS, FedEx, DHL)
- 🏗️ **Modular Architecture** with carrier-specific workflows
- 🔒 **Secure API** with JWT authentication
- 📊 **Real-time Tracking** with async processing
- 🎨 **Modern UI** with responsive design
- 🗄️ **PostgreSQL Database** with Prisma ORM via Supabase

## Architecture

### Main Workflow
```
USER → Input Tracking + Brand → PROCESS → Background Processing
```

### Sub-Workflows (Per Carrier)
```
PROCESS → GET BRAND → CALL TRACKING API → SAVE DATA
```

## Quick Start

### Prerequisites

- Node.js 16+ 
- Supabase account (for database only)
- Google OAuth credentials
- USPS API credentials (for USPS tracking)

### 1. Clone and Install

```bash
git clone <your-repo>
cd PostalHub
npm install
```

### 2. Environment Setup

Copy the example environment file:
```bash
cp env.example .env
```

Update `.env` with your credentials:
```env
# Database Configuration (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# NextAuth.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Server Configuration
PORT=3000
NODE_ENV=development

# USPS API (required for USPS tracking)
USPS_USER_ID=your_usps_user_id
```

### 3. Database Setup

1. Create a new Supabase project
2. Get your database connection string from Settings > Database
3. Update your `.env` file with the `DATABASE_URL` and `DIRECT_URL`
4. Run Prisma migrations:
   ```bash
   npm run db:push
   ```
5. Seed the database with default carriers:
   ```bash
   npm run db:seed
   ```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 5. Start the Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Database Management

### Prisma Commands
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Run migrations (for production)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with default data
npm run db:seed
```

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user profile
- `POST /api/auth/refresh` - Refresh user session
- `POST /api/auth/logout` - Logout user

### Tracking
- `POST /api/tracking/track` - Add new tracking number
- `GET /api/tracking/requests` - Get user's tracking requests
- `GET /api/tracking/requests/:id` - Get specific tracking request
- `GET /api/tracking/carriers` - Get available carriers

### User Dashboard
- `GET /api/user/dashboard` - Get dashboard data and statistics
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/shipments` - Get all user shipments

## Carrier Integration

### Currently Supported
- **USPS** - Full implementation with XML API integration

### Planned Support
- **UPS** - REST API integration
- **FedEx** - REST API integration  
- **DHL** - REST API integration

### Adding New Carriers

1. Create a new carrier class extending `BaseCarrier`:
```javascript
// services/carrier/newcarrier.js
const BaseCarrier = require('./base-carrier');

class NewCarrier extends BaseCarrier {
  constructor(apiKey) {
    super('NewCarrier', apiKey);
  }

  async trackPackage(trackingNumber) {
    // Implement carrier-specific logic
  }
}
```

2. Register in `carrier-factory.js`:
```javascript
const NewCarrier = require('./newcarrier');

// In initializeCarriers()
if (process.env.NEW_CARRIER_API_KEY) {
  const newCarrier = new NewCarrier(process.env.NEW_CARRIER_API_KEY);
  this.carriers.set('NEWCARRIER', newCarrier);
}
```

## Database Schema

### Key Tables
- `user_profiles` - Extended user information
- `carriers` - Available shipping carriers
- `tracking_requests` - User tracking requests
- `shipments` - Tracking data and status

### Security
- Row Level Security (RLS) enabled
- Users can only access their own data
- Automatic user profile creation on signup

## Development

### Project Structure
```
├── config/           # Configuration files
├── database/         # Database schema and migrations
├── middleware/       # Express middleware
├── public/          # Static frontend files
├── routes/          # API route handlers
├── services/        # Business logic services
│   └── carrier/     # Carrier-specific implementations
└── server.js        # Main server file
```

### Adding Features
1. Follow the modular architecture
2. Implement proper error handling
3. Add validation for all inputs
4. Update database schema as needed
5. Test with multiple carriers

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
JWT_SECRET=your_strong_jwt_secret
```

### Recommended Setup
- Use PM2 for process management
- Set up reverse proxy with Nginx
- Enable HTTPS
- Configure proper CORS for your domain
- Set up monitoring and logging

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include validation for inputs
4. Test with multiple carriers
5. Update documentation

## License

MIT License - see LICENSE file for details.
