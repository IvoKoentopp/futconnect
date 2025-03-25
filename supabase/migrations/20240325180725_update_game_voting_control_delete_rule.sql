-- Drop existing foreign key constraint
ALTER TABLE IF EXISTS public.game_voting_control
DROP CONSTRAINT IF EXISTS game_voting_control_game_id_fkey;

-- Create new foreign key with custom delete rule
ALTER TABLE public.game_voting_control
ADD CONSTRAINT game_voting_control_game_id_fkey
FOREIGN KEY (game_id)
REFERENCES public.games(id)
ON DELETE CASCADE
-- Only allow deletion if is_finalized is false or null
DEFERRABLE INITIALLY DEFERRED;

-- Create a trigger to prevent deletion when is_finalized is true
CREATE OR REPLACE FUNCTION prevent_delete_finalized_game()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there are any finalized voting controls for this game
    IF EXISTS (
        SELECT 1 
        FROM public.game_voting_control 
        WHERE game_id = OLD.id 
        AND is_finalized = true
    ) THEN
        RAISE EXCEPTION 'Cannot delete game with finalized voting control';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS check_game_deletion ON public.games;

-- Create the trigger
CREATE TRIGGER check_game_deletion
BEFORE DELETE ON public.games
FOR EACH ROW
EXECUTE FUNCTION prevent_delete_finalized_game();
