CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  account_name TEXT,
  category TEXT,
  region TEXT,
  owner TEXT,
  deal_value NUMERIC,
  weighted_value NUMERIC,
  probability NUMERIC,
  quality_score NUMERIC,
  close_date DATE,
  stage TEXT,
  fiscal_period TEXT,
  segment TEXT,
  contract_start DATE,
  contract_end DATE,
  last_stage_change DATE,
  age_days INTEGER,
  stage_duration_days INTEGER,
  status_notes TEXT,
  comment TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage opportunities" ON public.opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.picklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (field_name, value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.picklists TO authenticated;
GRANT ALL ON public.picklists TO service_role;
ALTER TABLE public.picklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage picklists" ON public.picklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.field_labels (
  field_name TEXT PRIMARY KEY,
  display_label TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_labels TO authenticated;
GRANT ALL ON public.field_labels TO service_role;
ALTER TABLE public.field_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage field labels" ON public.field_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER field_labels_updated_at BEFORE UPDATE ON public.field_labels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#64748b',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lanes TO authenticated;
GRANT ALL ON public.lanes TO service_role;
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage lanes" ON public.lanes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.opportunity_status (
  opportunity_id TEXT PRIMARY KEY REFERENCES public.opportunities(id) ON DELETE CASCADE,
  lane_id UUID REFERENCES public.lanes(id) ON DELETE SET NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_status TO authenticated;
GRANT ALL ON public.opportunity_status TO service_role;
ALTER TABLE public.opportunity_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage opportunity status" ON public.opportunity_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER opportunity_status_updated_at BEFORE UPDATE ON public.opportunity_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  owner TEXT,
  due_date DATE,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage actions" ON public.actions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX actions_opportunity_id_idx ON public.actions(opportunity_id);

CREATE TABLE public.targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  metric TEXT NOT NULL DEFAULT 'deal_value',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.targets TO authenticated;
GRANT ALL ON public.targets TO service_role;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage targets" ON public.targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.lanes (label, position, color, is_default) VALUES
  ('To do', 0, '#64748b', true),
  ('In progress', 1, '#2563eb', false),
  ('Waiting', 2, '#a16207', false),
  ('Blocked', 3, '#b91c1c', false),
  ('Done', 4, '#15803d', false);

INSERT INTO public.field_labels (field_name, display_label) VALUES
  ('name', 'Opportunity'),
  ('account_name', 'Client'),
  ('category', 'Category'),
  ('region', 'Region'),
  ('owner', 'Owner'),
  ('deal_value', 'Deal Value'),
  ('weighted_value', 'Weighted Value'),
  ('probability', 'Probability %'),
  ('quality_score', 'Quality Score'),
  ('close_date', 'Close Date'),
  ('stage', 'Stage'),
  ('fiscal_period', 'Fiscal Period'),
  ('segment', 'Segment'),
  ('contract_start', 'Contract Start'),
  ('contract_end', 'Contract End'),
  ('last_stage_change', 'Last Stage Change'),
  ('age_days', 'Age (days)'),
  ('stage_duration_days', 'Days in Stage'),
  ('status_notes', 'Status Notes'),
  ('comment', 'Comment'),
  ('is_open', 'Open');