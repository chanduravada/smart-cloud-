-- Add shared_links table for file sharing with time limits and restrictions

CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_downloads INT DEFAULT NULL,         -- NULL = unlimited
  download_count INT NOT NULL DEFAULT 0,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shared_links_token   ON public.shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_file_id ON public.shared_links(file_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON public.shared_links(user_id);

-- RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own share links
DROP POLICY IF EXISTS "Owners can manage their share links" ON public.shared_links;
CREATE POLICY "Owners can manage their share links"
  ON public.shared_links
  USING (auth.uid() = user_id);

-- Anyone can read a valid (non-expired, not exhausted) share link by token
DROP POLICY IF EXISTS "Public can read valid share links" ON public.shared_links;
CREATE POLICY "Public can read valid share links"
  ON public.shared_links FOR SELECT
  USING (
    expires_at > now()
    AND (max_downloads IS NULL OR download_count < max_downloads)
  );
