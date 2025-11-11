CREATE TYPE order_status AS ENUM ('pending', 'paid', 'refunded', 'cancelled');

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    total_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status order_status NOT NULL DEFAULT 'pending',
    buyer_name TEXT,
    buyer_email TEXT,
    buyer_phone TEXT,
    paystack_reference TEXT,
    redirect_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_product_id_idx ON public.orders (product_id);
CREATE INDEX orders_status_idx ON public.orders (status);
CREATE UNIQUE INDEX orders_paystack_reference_unique ON public.orders (paystack_reference) WHERE paystack_reference IS NOT NULL;

