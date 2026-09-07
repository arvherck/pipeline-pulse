CREATE TABLE public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at timestamp with time zone NOT NULL DEFAULT now(),
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_runs TO authenticated;
GRANT ALL ON public.import_runs TO service_role;

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage import runs"
ON public.import_runs FOR ALL TO authenticated
USING (true) WITH CHECK (true);