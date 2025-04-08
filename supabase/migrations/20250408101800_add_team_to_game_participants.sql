-- Add team column to game_participants table
ALTER TABLE game_participants ADD COLUMN team text;

-- Update existing game_participants with team info from game_events
WITH participant_teams AS (
  SELECT DISTINCT ON (game_id, member_id) 
    game_id,
    member_id,
    team
  FROM game_events
  WHERE team IS NOT NULL
  ORDER BY game_id, member_id, created_at DESC
)
UPDATE game_participants gp
SET team = pt.team
FROM participant_teams pt
WHERE gp.game_id = pt.game_id 
AND gp.member_id = pt.member_id;
