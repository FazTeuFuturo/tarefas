ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS timer_status text DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS timer_remaining_seconds integer,
ADD COLUMN IF NOT EXISTS timer_updated_at timestamp with time zone;
