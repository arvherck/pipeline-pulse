ALTER TABLE public.lanes ADD COLUMN IF NOT EXISTS stage_value text;
CREATE UNIQUE INDEX IF NOT EXISTS lanes_stage_value_key ON public.lanes (stage_value);
ALTER TABLE public.opportunity_status ALTER COLUMN lane_id DROP NOT NULL;