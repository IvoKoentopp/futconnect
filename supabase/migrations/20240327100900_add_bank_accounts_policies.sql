-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Remove all existing policies
DROP POLICY IF EXISTS "Enable read access for club members" ON public.bank_accounts;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.bank_accounts;

-- Policy for club admins (full access)
CREATE POLICY "Enable full access for club admins" ON public.bank_accounts
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = bank_accounts.club_id
    AND club_admins.email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = bank_accounts.club_id
    AND club_admins.email = auth.jwt() ->> 'email'
  )
);

-- Policy for regular members (read-only)
CREATE POLICY "Enable read access for club members" ON public.bank_accounts
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = bank_accounts.club_id
    AND members.email = auth.jwt() ->> 'email'
  )
);

-- Create index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_club_admins_email_club 
ON public.club_admins (email, club_id);

CREATE INDEX IF NOT EXISTS idx_members_email_club 
ON public.members (email, club_id);
