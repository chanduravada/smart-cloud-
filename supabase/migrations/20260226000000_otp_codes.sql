-- Add OTP codes table for custom 4-digit OTP verification
-- This replaces Supabase's magic link with our own OTP system

CREATE TABLE public.otp_codes (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,               -- 4-digit numeric code
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by email
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);

-- Only the service role (edge functions) can read/write this table
-- No RLS policy for users — edge function uses service role key
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Auto-delete expired codes after they're used or after 1 hour (optional cleanup)
-- (Handled by the edge function; table stays lean)
