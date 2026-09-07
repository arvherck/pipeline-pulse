CREATE TABLE public.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  metric text NOT NULL,
  scope_field text NOT NULL DEFAULT '',
  scope_value text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (taken_on, metric, scope_field, scope_value)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.snapshots TO authenticated;
GRANT ALL ON public.snapshots TO service_role;

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage snapshots"
ON public.snapshots FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER snapshots_updated_at
BEFORE UPDATE ON public.snapshots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.targets
  ADD COLUMN period_start date,
  ADD COLUMN period_end date,
  ADD COLUMN scope_field text,
  ADD COLUMN scope_value text;