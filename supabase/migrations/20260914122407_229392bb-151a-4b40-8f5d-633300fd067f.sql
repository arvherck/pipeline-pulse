CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  fiscal_year_start_month integer NOT NULL DEFAULT 9 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage app settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.app_settings (id, fiscal_year_start_month) VALUES (true, 9);

CREATE TABLE public.revenue_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id text NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_plan TO authenticated;
GRANT ALL ON public.revenue_plan TO service_role;
ALTER TABLE public.revenue_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage revenue plan" ON public.revenue_plan FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER revenue_plan_updated_at BEFORE UPDATE ON public.revenue_plan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.targets ADD COLUMN kind text NOT NULL DEFAULT 'legacy';
ALTER TABLE public.targets ADD COLUMN fiscal_year integer;