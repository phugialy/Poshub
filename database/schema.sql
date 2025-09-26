-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (NextAuth.js users)
CREATE TABLE public.user_profiles (
    id TEXT PRIMARY KEY, -- NextAuth.js user ID (usually a string)
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Carriers table
CREATE TABLE public.carriers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- 'USPS', 'UPS', 'FedEx', 'DHL'
    display_name TEXT NOT NULL, -- 'United States Postal Service'
    api_endpoint TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracking requests table
CREATE TABLE public.tracking_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    tracking_number TEXT NOT NULL,
    carrier_id UUID REFERENCES public.carriers(id) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipment data table
CREATE TABLE public.shipments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tracking_request_id UUID REFERENCES public.tracking_requests(id) ON DELETE CASCADE NOT NULL,
    tracking_number TEXT NOT NULL,
    carrier TEXT NOT NULL,
    expected_delivery_date DATE,
    current_status TEXT,
    current_location TEXT,
    shipped_date DATE,
    raw_data JSONB, -- Store full API response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tracking_requests_user_id ON public.tracking_requests(user_id);
CREATE INDEX idx_tracking_requests_tracking_number ON public.tracking_requests(tracking_number);
CREATE INDEX idx_shipments_tracking_request_id ON public.shipments(tracking_request_id);
CREATE INDEX idx_shipments_tracking_number ON public.shipments(tracking_number);

-- Row Level Security (RLS) policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Note: With NextAuth.js, we handle authorization at the application level
-- rather than using RLS policies, since we don't have auth.uid() function
-- The application middleware verifies JWT tokens and ensures users only access their own data

-- Disable RLS for now (authorization handled in application layer)
-- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tracking_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.shipments DISABLE ROW LEVEL SECURITY;

-- Note: User profile creation is now handled by NextAuth.js callbacks
-- in the application layer rather than database triggers

-- Insert default carriers
INSERT INTO public.carriers (name, display_name, api_endpoint) VALUES
('USPS', 'United States Postal Service', 'https://secure.shippingapis.com/shippingapi.dll'),
('UPS', 'United Parcel Service', 'https://onlinetools.ups.com/api'),
('FedEx', 'FedEx Corporation', 'https://apis.fedex.com'),
('DHL', 'DHL International', 'https://api-eu.dhl.com');
