
-- Create shared_items table
CREATE TABLE public.shared_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  share_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  item_type text NOT NULL CHECK (item_type IN ('trip', 'event')),
  item_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- Owner can manage their shared items
CREATE POLICY "Users can insert own shared items"
  ON public.shared_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own shared items"
  ON public.shared_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared items"
  ON public.shared_items FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can read by share_token (for import page)
CREATE POLICY "Anyone can view shared items by token"
  ON public.shared_items FOR SELECT
  USING (true);

-- Validation trigger for expires_at
CREATE OR REPLACE FUNCTION public.validate_shared_item_expires_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_shared_item_expires_at_trigger
  BEFORE INSERT OR UPDATE ON public.shared_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shared_item_expires_at();
