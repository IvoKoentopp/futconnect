-- Enable RLS
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

-- Remove existing policies
DROP POLICY IF EXISTS "Enable read access for club members" ON public.club_settings;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.club_settings;

-- Policy for club_settings table
-- Club admins (full access)
CREATE POLICY "Enable full access for club admins" ON public.club_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = club_settings.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = club_settings.club_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = club_settings.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = club_settings.club_id
    )
  )
);

-- Regular members (read-only)
CREATE POLICY "Enable read access for club members" ON public.club_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = club_settings.club_id
  )
);

-- Create index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_club_settings_club_id 
ON public.club_settings (club_id);
