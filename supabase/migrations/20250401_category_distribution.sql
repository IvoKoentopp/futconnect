-- Função para calcular a distribuição por categoria
CREATE OR REPLACE FUNCTION get_category_distribution(club_id UUID)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  percentage FLOAT,
  members JSON
) AS $$
WITH category_stats AS (
  SELECT 
    COALESCE(category, 'Não categorizado') as category,
    COUNT(*) as count,
    COUNT(*)::float / NULLIF(SUM(COUNT(*)) OVER (), 0) * 100 as percentage,
    json_agg(json_build_object(
      'id', id,
      'name', name,
      'nickname', nickname
    ) ORDER BY name) as members
  FROM members
  WHERE club_id = $1 
    AND status = 'Ativo' 
    AND status != 'Sistema'
  GROUP BY category
)
SELECT * FROM category_stats
ORDER BY count DESC;
$$ LANGUAGE SQL STABLE;
