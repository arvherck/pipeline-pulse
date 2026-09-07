CREATE TABLE public.opportunity_field_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id text NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_field_changes TO authenticated;
GRANT ALL ON public.opportunity_field_changes TO service_role;

ALTER TABLE public.opportunity_field_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage opportunity field changes"
ON public.opportunity_field_changes FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE INDEX opportunity_field_changes_lookup
ON public.opportunity_field_changes (opportunity_id, changed_at DESC);