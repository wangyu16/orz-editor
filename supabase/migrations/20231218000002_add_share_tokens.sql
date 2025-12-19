-- Add share_token and is_public to folders
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT NULL;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Add share_token and is_public to files
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT NULL;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Update RLS policies to allow public access to "is_public" items
-- We drop existing policies if they conflict, or just add new ones.
-- The previous migration added "Allow public access to shared folders" based on expiration.
-- We will replace/update that or add a new one.

DROP POLICY IF EXISTS "Allow public access to shared folders" ON public.folders;
CREATE POLICY "Allow public access to shared folders"
ON public.folders
FOR SELECT
USING (is_public = true OR (public_link_expired_at > now()));

DROP POLICY IF EXISTS "Allow public access to shared files" ON public.files;
CREATE POLICY "Allow public access to shared files"
ON public.files
FOR SELECT
USING (is_public = true OR (public_link_expired_at > now()));
