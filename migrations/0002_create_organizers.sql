CREATE TABLE public.organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    branding JSONB DEFAULT '{}',
    kyc_status TEXT NOT NULL DEFAULT 'pending',
    business_reg_number TEXT,
    tax_id TEXT,
    contact_person TEXT,
    phone TEXT,
    country TEXT,
    payout_schedule TEXT NOT NULL DEFAULT 'manual',
    bank_details JSONB DEFAULT '{}',
    webhook_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX organizers_email_idx ON public.organizers (email);
CREATE INDEX organizers_kyc_status_idx ON public.organizers (kyc_status);

