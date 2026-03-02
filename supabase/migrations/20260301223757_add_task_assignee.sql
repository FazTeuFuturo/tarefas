-- Migration for adding assignee_id to tasks
ALTER TABLE public.tasks ADD COLUMN assignee_id UUID REFERENCES public.profiles(id);

-- Optional: Since RLS is currently "USING (true)" for local dev, 
-- we don't immediately need to update policies unless we want strict row filtering at db-level.
-- The UI/Hook will filter by assignee_id.
