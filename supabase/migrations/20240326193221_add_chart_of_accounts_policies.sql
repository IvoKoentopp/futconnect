-- Enable RLS
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Remove all existing policies
DROP POLICY IF EXISTS "Enable read access for club members" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.chart_of_accounts;

-- Policy for club admins (full access)
CREATE POLICY "Enable full access for club admins" ON public.chart_of_accounts
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = chart_of_accounts.club_id
    AND club_admins.member_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = chart_of_accounts.club_id
    AND club_admins.member_id = auth.uid()
  )
);

-- Policy for regular members (read-only)
CREATE POLICY "Enable read access for club members" ON public.chart_of_accounts
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = chart_of_accounts.club_id
    AND members.id = auth.uid()
  )
);

-- Create index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_club_admins_member_club 
ON public.club_admins (member_id, club_id);

CREATE INDEX IF NOT EXISTS idx_members_id_club 
ON public.members (id, club_id);
