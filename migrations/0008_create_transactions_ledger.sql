CREATE TYPE ledger_status AS ENUM ('pending', 'settled', 'refunded', 'cancelled');

CREATE TABLE public.transactions_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    platform_fee_cents BIGINT NOT NULL DEFAULT 0,
    organizer_amount_cents BIGINT NOT NULL DEFAULT 0,
    gateway_fee_cents BIGINT NOT NULL DEFAULT 0,
    net_amount_cents BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    status ledger_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_ledger_order_id_idx ON public.transactions_ledger (order_id);

