CREATE TYPE user_role AS ENUM ('superadmin', 'organizer_admin', 'organizer_staff');

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid UUID NOT NULL UNIQUE,
    organizer_id UUID REFERENCES public.organizers(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'organizer_staff',
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_supabase_uid_idx ON public.users (supabase_uid);
CREATE INDEX users_organizer_id_idx ON public.users (organizer_id);

