-- Remover registros duplicados antes de adicionar a constraint
DO $$
DECLARE
    duplicate_record RECORD;
BEGIN
    -- Encontrar e tratar registros com apelidos duplicados no mesmo clube
    FOR duplicate_record IN
        SELECT m.id, m.nickname, m.club_id
        FROM members m
        INNER JOIN (
            SELECT nickname, club_id, COUNT(*)
            FROM members
            WHERE nickname IS NOT NULL
            GROUP BY nickname, club_id
            HAVING COUNT(*) > 1
        ) dupes ON m.nickname = dupes.nickname AND m.club_id = dupes.club_id
        ORDER BY m.club_id, m.nickname, m.registration_date DESC
    LOOP
        -- Atualizar o apelido adicionando um sufixo numérico
        UPDATE members
        SET nickname = nickname || '_' || NOW()::timestamp(0)
        WHERE id = duplicate_record.id;
    END LOOP;
END $$;

-- Adicionar constraint de unicidade composta para nickname + club_id
ALTER TABLE members
ADD CONSTRAINT unique_nickname_per_club UNIQUE (nickname, club_id);

-- Adicionar índice para melhorar performance das buscas
CREATE INDEX IF NOT EXISTS idx_members_nickname_club ON members(nickname, club_id);

-- Adicionar comentário explicativo
COMMENT ON CONSTRAINT unique_nickname_per_club ON members IS 'Garante que cada apelido seja único dentro de um mesmo clube';
