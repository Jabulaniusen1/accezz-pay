CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    venue JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX products_organizer_id_idx ON public.products (organizer_id);
CREATE INDEX products_start_at_idx ON public.products (start_at);

