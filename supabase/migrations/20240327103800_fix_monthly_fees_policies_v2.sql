-- Enable RLS
ALTER TABLE public.monthly_fees ENABLE ROW LEVEL SECURITY;

-- Remove existing policies
DROP POLICY IF EXISTS "Monthly fees are viewable by club members" ON public.monthly_fees;
DROP POLICY IF EXISTS "Monthly fees are insertable by club admins" ON public.monthly_fees;
DROP POLICY IF EXISTS "Monthly fees are updatable by club admins" ON public.monthly_fees;
DROP POLICY IF EXISTS "Monthly fees are deletable by club admins" ON public.monthly_fees;
DROP POLICY IF EXISTS "Enable read access for club members" ON public.monthly_fees;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.monthly_fees;
DROP POLICY IF EXISTS "Enable read own fees for members" ON public.monthly_fees;

-- Policy for club admins (full access)
CREATE POLICY "Enable full access for club admins" ON public.monthly_fees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fees.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = monthly_fees.club_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fees.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = monthly_fees.club_id
    )
  )
);

-- Policy for regular members (read-only)
CREATE POLICY "Enable read access for club members" ON public.monthly_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = monthly_fees.club_id
  )
);

-- Enable RLS for monthly_fee_settings
ALTER TABLE public.monthly_fee_settings ENABLE ROW LEVEL SECURITY;

-- Remove existing policies
DROP POLICY IF EXISTS "Enable read access for club members" ON public.monthly_fee_settings;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.monthly_fee_settings;

-- Policy for club admins (full access)
CREATE POLICY "Enable full access for club admins" ON public.monthly_fee_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fee_settings.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = monthly_fee_settings.club_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fee_settings.club_id
    AND club_admins.email IN (
      SELECT email FROM members WHERE club_id = monthly_fee_settings.club_id
    )
  )
);

-- Policy for regular members (read-only)
CREATE POLICY "Enable read access for club members" ON public.monthly_fee_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = monthly_fee_settings.club_id
  )
);

-- Create indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_monthly_fees_club_id 
ON public.monthly_fees (club_id);

CREATE INDEX IF NOT EXISTS idx_monthly_fee_settings_club_id 
ON public.monthly_fee_settings (club_id);
