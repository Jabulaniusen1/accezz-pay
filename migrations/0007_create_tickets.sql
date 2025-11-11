CREATE TYPE ticket_status AS ENUM ('unused', 'used', 'cancelled');

CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
    ticket_code TEXT NOT NULL,
    qr_url TEXT,
    status ticket_status NOT NULL DEFAULT 'unused',
    attendee_name TEXT,
    attendee_email TEXT,
    attendee_phone TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ticket_code)
);

CREATE INDEX tickets_order_id_idx ON public.tickets (order_id);
CREATE INDEX tickets_ticket_type_id_idx ON public.tickets (ticket_type_id);

