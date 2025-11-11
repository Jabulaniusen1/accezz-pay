CREATE TYPE payment_status AS ENUM ('initialized', 'pending', 'paid', 'failed', 'refunded', 'cancelled');

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL,
    gateway_reference TEXT,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'initialized',
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_gateway_reference_unique UNIQUE (gateway, gateway_reference)
);

CREATE INDEX payments_order_id_idx ON public.payments (order_id);
CREATE INDEX payments_status_idx ON public.payments (status);

