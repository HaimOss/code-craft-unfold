ALTER TABLE public.checklist_items ADD COLUMN due_date date DEFAULT NULL;
ALTER TABLE public.checklist_items ADD COLUMN assignee text DEFAULT NULL;