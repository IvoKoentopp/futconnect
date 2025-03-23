
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCompletedGames = (clubId: string | undefined) => {
  const [gameCount, setGameCount] = useState<number>(0);
  const [gamesThisMonth, setGamesThisMonth] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get the first day of the current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Count all completed games
        const { count: totalCount, error: totalError } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', clubId)
          .eq('status', 'completed');
        
        if (totalError) throw totalError;
        
        // Count games completed this month
        const { count: monthCount, error: monthError } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', clubId)
          .eq('status', 'completed')
          .gte('date', firstDayOfMonth.toISOString());
        
        if (monthError) throw monthError;
        
        setGameCount(totalCount || 0);
        setGamesThisMonth(monthCount || 0);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch games'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, [clubId]);

  return { gameCount, gamesThisMonth, isLoading, error };
};
