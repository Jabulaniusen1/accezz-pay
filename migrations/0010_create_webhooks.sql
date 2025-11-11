CREATE TABLE public.webhooks (
    id SERIAL PRIMARY KEY,
    gateway TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature TEXT,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX webhooks_gateway_idx ON public.webhooks (gateway);
CREATE INDEX webhooks_processed_idx ON public.webhooks (processed);

