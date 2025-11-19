# PostalHub Web App

Modern React application for PostalHub package tracking service.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run on `http://localhost:5173`

## Prerequisites

- Backend server running on `http://localhost:3000`
- Node.js 16+

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
```

## Features

- ✅ User authentication (Email/Password + Google OAuth)
- ✅ Dashboard with statistics
- ✅ Add/Edit/Delete tracking numbers
- ✅ Auto carrier detection
- ✅ Search and filter tracking items
- ✅ View tracking on carrier websites

## Project Structure

```
src/
├── components/      # React components
├── lib/            # Utilities (API client)
├── App.jsx         # Main app
└── main.jsx        # Entry point
```

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## API Integration

All API calls go through `src/lib/api.js` which handles:
- Authentication tokens
- Request/response formatting
- Error handling

