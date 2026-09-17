-- Two separate workspaces: 'production' and 'test'.
ALTER TABLE public.opportunities ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.actions ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.opportunity_status ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.lanes ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.picklists ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.field_labels ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.targets ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.revenue_plan ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.snapshots ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.import_runs ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.opportunity_field_changes ADD COLUMN workspace text NOT NULL DEFAULT 'production';
ALTER TABLE public.app_settings ADD COLUMN active_workspace text NOT NULL DEFAULT 'production';

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.actions ADD CONSTRAINT actions_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.opportunity_status ADD CONSTRAINT opportunity_status_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.lanes ADD CONSTRAINT lanes_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.picklists ADD CONSTRAINT picklists_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.field_labels ADD CONSTRAINT field_labels_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.targets ADD CONSTRAINT targets_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.revenue_plan ADD CONSTRAINT revenue_plan_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.snapshots ADD CONSTRAINT snapshots_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.import_runs ADD CONSTRAINT import_runs_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.opportunity_field_changes ADD CONSTRAINT opportunity_field_changes_workspace_check CHECK (workspace IN ('production','test'));
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_active_workspace_check CHECK (active_workspace IN ('production','test'));

-- Everything that exists today is sample/test data.
UPDATE public.opportunities SET workspace = 'test';
UPDATE public.actions SET workspace = 'test';
UPDATE public.opportunity_status SET workspace = 'test';
UPDATE public.lanes SET workspace = 'test';
UPDATE public.picklists SET workspace = 'test';
UPDATE public.field_labels SET workspace = 'test';
UPDATE public.targets SET workspace = 'test';
UPDATE public.revenue_plan SET workspace = 'test';
UPDATE public.snapshots SET workspace = 'test';
UPDATE public.import_runs SET workspace = 'test';
UPDATE public.opportunity_field_changes SET workspace = 'test';

-- Uniqueness is per workspace from now on.
ALTER TABLE public.field_labels DROP CONSTRAINT field_labels_pkey;
ALTER TABLE public.field_labels ADD CONSTRAINT field_labels_pkey PRIMARY KEY (workspace, field_name);
ALTER TABLE public.picklists DROP CONSTRAINT picklists_field_name_value_key;
ALTER TABLE public.picklists ADD CONSTRAINT picklists_workspace_field_name_value_key UNIQUE (workspace, field_name, value);
ALTER TABLE public.revenue_plan DROP CONSTRAINT revenue_plan_opportunity_id_period_month_key;
ALTER TABLE public.revenue_plan ADD CONSTRAINT revenue_plan_workspace_opportunity_id_period_month_key UNIQUE (workspace, opportunity_id, period_month);
ALTER TABLE public.snapshots DROP CONSTRAINT snapshots_taken_on_metric_scope_field_scope_value_key;
ALTER TABLE public.snapshots ADD CONSTRAINT snapshots_workspace_taken_on_metric_scope_key UNIQUE (workspace, taken_on, metric, scope_field, scope_value);

CREATE INDEX IF NOT EXISTS opportunities_workspace_idx ON public.opportunities (workspace);
CREATE INDEX IF NOT EXISTS actions_workspace_idx ON public.actions (workspace);
CREATE INDEX IF NOT EXISTS opportunity_status_workspace_idx ON public.opportunity_status (workspace);
CREATE INDEX IF NOT EXISTS revenue_plan_workspace_idx ON public.revenue_plan (workspace);
CREATE INDEX IF NOT EXISTS snapshots_workspace_idx ON public.snapshots (workspace);
CREATE INDEX IF NOT EXISTS opportunity_field_changes_workspace_idx ON public.opportunity_field_changes (workspace);

-- Give the (now empty) production workspace the same setup rows.
INSERT INTO public.lanes (label, position, color, is_default, stage_value, workspace)
SELECT label, position, color, is_default, NULL, 'production' FROM public.lanes WHERE workspace = 'test';
INSERT INTO public.field_labels (field_name, display_label, workspace)
SELECT field_name, display_label, 'production' FROM public.field_labels WHERE workspace = 'test';
INSERT INTO public.picklists (field_name, value, label, position, workspace)
SELECT field_name, value, label, position, 'production' FROM public.picklists WHERE workspace = 'test';
