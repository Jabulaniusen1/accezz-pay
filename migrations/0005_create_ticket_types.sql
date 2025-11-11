CREATE TABLE public.ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    price_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    quantity_total INTEGER NOT NULL,
    quantity_available INTEGER NOT NULL,
    sales_start TIMESTAMPTZ,
    sales_end TIMESTAMPTZ,
    sales_limit_per_customer INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ticket_types_sku_unique UNIQUE (product_id, sku)
);

CREATE INDEX ticket_types_product_id_idx ON public.ticket_types (product_id);

