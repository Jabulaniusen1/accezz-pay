ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_split_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_percentage_charge NUMERIC;

CREATE UNIQUE INDEX IF NOT EXISTS organizers_paystack_subaccount_code_idx
  ON public.organizers (paystack_subaccount_code)
  WHERE paystack_subaccount_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizers_paystack_split_code_idx
  ON public.organizers (paystack_split_code)
  WHERE paystack_split_code IS NOT NULL;

