-- Add departure_date column to members table
ALTER TABLE members
ADD COLUMN departure_date timestamp with time zone DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN members.departure_date IS 'Data em que o sócio saiu do clube (ficou inativo). NULL significa que o sócio ainda está ativo.';
