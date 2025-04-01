CREATE OR REPLACE FUNCTION get_age_distribution(club_id UUID)
RETURNS TABLE (
  age_range TEXT,
  count BIGINT,
  percentage FLOAT,
  order_num INT,
  members JSON,
  average_age FLOAT
) AS $$
WITH member_ages AS (
  SELECT 
    CASE 
      WHEN date_part('year', age(birth_date)) <= 20 THEN 'Até 20 anos'
      WHEN date_part('year', age(birth_date)) <= 30 THEN '20-30 anos'
      WHEN date_part('year', age(birth_date)) <= 40 THEN '30-40 anos'
      WHEN date_part('year', age(birth_date)) <= 50 THEN '40-50 anos'
      WHEN date_part('year', age(birth_date)) <= 60 THEN '50-60 anos'
      ELSE '60+ anos'
    END as age_range,
    CASE 
      WHEN date_part('year', age(birth_date)) <= 20 THEN 1
      WHEN date_part('year', age(birth_date)) <= 30 THEN 2
      WHEN date_part('year', age(birth_date)) <= 40 THEN 3
      WHEN date_part('year', age(birth_date)) <= 50 THEN 4
      WHEN date_part('year', age(birth_date)) <= 60 THEN 5
      ELSE 6
    END as order_num,
    id,
    name,
    nickname,
    date_part('year', age(birth_date)) as age
  FROM members
  WHERE club_id = $1 
    AND status = 'Ativo' 
    AND status != 'Sistema'
    AND birth_date IS NOT NULL
),
age_stats AS (
  SELECT 
    age_range,
    order_num,
    COUNT(*) as count,
    COUNT(*)::float / NULLIF(SUM(COUNT(*)) OVER (), 0) * 100 as percentage,
    json_agg(json_build_object(
      'id', id,
      'name', name,
      'nickname', nickname
    ) ORDER BY name) as members,
    AVG(age) as average_age
  FROM member_ages
  GROUP BY age_range, order_num
)
SELECT 
  age_range,
  count,
  percentage,
  order_num,
  members,
  ROUND(average_age::numeric, 1) as average_age
FROM age_stats
ORDER BY order_num;
$$ LANGUAGE SQL;
