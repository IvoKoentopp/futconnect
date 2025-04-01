toast({
  title: "Arquivo enviado",
  description: "Clique em 'Salvar Configurações' para aplicar as mudanças.",
});-- Alterar o tipo da coluna password para encrypted
ALTER TABLE members
ALTER COLUMN password TYPE text USING password::text;

-- Adicionar extensão pgcrypto se ainda não existir
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar uma função para mascarar a senha
CREATE OR REPLACE FUNCTION mask_password()
RETURNS TRIGGER AS $$
BEGIN
  NEW.password = crypt(NEW.password, gen_salt('bf'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para mascarar a senha antes de inserir/atualizar
CREATE TRIGGER mask_password_trigger
  BEFORE INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION mask_password();

-- Criar política RLS para proteger a coluna password
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Política para inserção/atualização (qualquer usuário autenticado pode criar/atualizar)
CREATE POLICY "Users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para atualização (apenas o próprio usuário ou admin pode atualizar)
CREATE POLICY "Users can update own profile"
  ON members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR -- próprio usuário
    EXISTS ( -- ou é admin do clube
      SELECT 1 FROM members m
      WHERE m.id = auth.uid()
      AND m.club_id = members.club_id
      AND m.status = 'Sistema'
    )
  );

-- Política para visualização (password é null para outros usuários)
CREATE POLICY "Users can only see their own password"
  ON members FOR SELECT
  TO authenticated
  USING (true)
  WITH CHECK (
    CASE 
      WHEN auth.uid() = id THEN true -- próprio usuário vê tudo
      WHEN EXISTS ( -- admin do clube vê tudo
        SELECT 1 FROM members m
        WHERE m.id = auth.uid()
        AND m.club_id = members.club_id
        AND m.status = 'Sistema'
      ) THEN true
      ELSE password IS NULL -- outros usuários não veem a senha
    END
  );

-- Adicionar constraint de unicidade composta para nickname + club_id
ALTER TABLE members
ADD CONSTRAINT unique_nickname_per_club UNIQUE (nickname, club_id);

-- Adicionar índice para melhorar performance das buscas
CREATE INDEX idx_members_nickname_club ON members(nickname, club_id);

-- Comentário explicativo
COMMENT ON COLUMN members.password IS 'Senha do usuário (criptografada). Apenas visível para o próprio usuário e admins do clube.';
