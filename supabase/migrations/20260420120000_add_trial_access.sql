-- Add trial access columns
-- profiles.trial_expires_at: when null, the user has unlimited access (no trial)
-- invitations.trial_days: how many days of trial access to grant on acceptance

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 14;
