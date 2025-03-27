-- Enable RLS for monthly_fees
ALTER TABLE public.monthly_fees ENABLE ROW LEVEL SECURITY;

-- Remove existing policies from monthly_fees
DROP POLICY IF EXISTS "Enable read access for club members" ON public.monthly_fees;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.monthly_fees;
DROP POLICY IF EXISTS "Enable read own fees for members" ON public.monthly_fees;

-- Policy for club admins (full access to monthly_fees)
CREATE POLICY "Enable full access for club admins" ON public.monthly_fees
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fees.club_id
    AND club_admins.email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fees.club_id
    AND club_admins.email = auth.jwt() ->> 'email'
  )
);

-- Policy for members (can view all fees from their club)
CREATE POLICY "Enable read access for club members" ON public.monthly_fees
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = monthly_fees.club_id
    AND members.email = auth.jwt() ->> 'email'
  )
);

-- Enable RLS for monthly_fee_settings
ALTER TABLE public.monthly_fee_settings ENABLE ROW LEVEL SECURITY;

-- Remove existing policies from monthly_fee_settings
DROP POLICY IF EXISTS "Enable read access for club members" ON public.monthly_fee_settings;
DROP POLICY IF EXISTS "Enable full access for club admins" ON public.monthly_fee_settings;

-- Policy for club admins (full access to monthly_fee_settings)
CREATE POLICY "Enable full access for club admins" ON public.monthly_fee_settings
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fee_settings.club_id
    AND club_admins.email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = monthly_fee_settings.club_id
    AND club_admins.email = auth.jwt() ->> 'email'
  )
);

-- Policy for members (read-only access to monthly_fee_settings)
CREATE POLICY "Enable read access for club members" ON public.monthly_fee_settings
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.club_id = monthly_fee_settings.club_id
    AND members.email = auth.jwt() ->> 'email'
  )
);

-- Create indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_monthly_fees_club 
ON public.monthly_fees (club_id);

CREATE INDEX IF NOT EXISTS idx_monthly_fee_settings_club 
ON public.monthly_fee_settings (club_id);
