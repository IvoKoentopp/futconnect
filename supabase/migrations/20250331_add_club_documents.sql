-- Create club_documents table
CREATE TABLE IF NOT EXISTS club_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('statute', 'anthem', 'invitation')),
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, type)
);

-- Add RLS policies
ALTER TABLE club_documents ENABLE ROW LEVEL SECURITY;

-- Allow club members to view documents
CREATE POLICY "Club members can view documents" ON club_documents
  FOR SELECT
  USING (club_id IN (
    SELECT club_id FROM club_members WHERE user_id = auth.uid()
  ));

-- Allow club admins to manage documents
CREATE POLICY "Club admins can manage documents" ON club_documents
  FOR ALL
  USING (club_id IN (
    SELECT club_id FROM club_admins WHERE user_id = auth.uid()
  ))
  WITH CHECK (club_id IN (
    SELECT club_id FROM club_admins WHERE user_id = auth.uid()
  ));

-- Create trigger to update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON club_documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
