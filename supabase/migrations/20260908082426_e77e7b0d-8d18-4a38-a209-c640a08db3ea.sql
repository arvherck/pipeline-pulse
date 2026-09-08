ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.actions SET status = CASE WHEN done THEN 'Done' ELSE 'Open' END;