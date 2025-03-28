-- Add sponsor_id foreign key relationship
ALTER TABLE members
ADD CONSTRAINT members_sponsor_id_fkey
FOREIGN KEY (sponsor_id)
REFERENCES members (id)
ON DELETE SET NULL;

-- Add comment to explain the relationship
COMMENT ON CONSTRAINT members_sponsor_id_fkey ON members IS 'Relacionamento entre sócio e seu padrinho';

-- Add index to improve query performance
CREATE INDEX idx_members_sponsor_id ON members(sponsor_id);
