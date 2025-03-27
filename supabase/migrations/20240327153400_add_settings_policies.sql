-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_configurations ENABLE ROW LEVEL SECURITY;

-- Remove existing policies
DROP POLICY IF EXISTS "Enable read access for club members" ON public.clubs;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.clubs;

DROP POLICY IF EXISTS "Enable read access for club members" ON public.team_configurations;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.team_configurations;

-- Policy for clubs table
-- Club admins (full access)
CREATE POLICY "Enable full access for club admins" ON public.clubs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = clubs.id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = clubs.id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = clubs.id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = clubs.id
    )
  )
);

-- Regular members (read-only)
CREATE POLICY "Enable read access for club members" ON public.clubs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = clubs.id
  )
);

-- Policy for team_configurations table
-- Club admins (full access)
CREATE POLICY "Enable full access for club admins" ON public.team_configurations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = team_configurations.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = team_configurations.club_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = team_configurations.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = team_configurations.club_id
    )
  )
);

-- Regular members (read-only)
CREATE POLICY "Enable read access for club members" ON public.team_configurations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = team_configurations.club_id
  )
);

-- Create indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_clubs_id 
ON public.clubs (id);

CREATE INDEX IF NOT EXISTS idx_team_configurations_club_id 
ON public.team_configurations (club_id);
