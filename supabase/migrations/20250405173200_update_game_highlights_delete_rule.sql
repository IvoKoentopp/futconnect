-- Drop existing foreign key constraint
ALTER TABLE IF EXISTS public.game_highlights
DROP CONSTRAINT IF EXISTS game_highlights_game_id_fkey;

-- Create new foreign key with ON DELETE CASCADE
ALTER TABLE public.game_highlights
ADD CONSTRAINT game_highlights_game_id_fkey
FOREIGN KEY (game_id)
REFERENCES public.games(id)
ON DELETE CASCADE;
