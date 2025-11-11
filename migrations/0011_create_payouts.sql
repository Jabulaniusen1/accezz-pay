CREATE TYPE payout_status AS ENUM ('scheduled', 'processing', 'paid', 'failed', 'cancelled');

CREATE TABLE public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    scheduled_at TIMESTAMPTZ,
    status payout_status NOT NULL DEFAULT 'scheduled',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payouts_organizer_id_idx ON public.payouts (organizer_id);
CREATE INDEX payouts_status_idx ON public.payouts (status);

