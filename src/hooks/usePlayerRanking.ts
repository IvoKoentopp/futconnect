import { useState, useEffect } from 'react';
import { gamePerformanceService } from '@/services/gamePerformanceService';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerRanking {
  id: string;
  name: string;
  nickname: string | null;
  score: number;
  position: number;
  gamesPlayed: number;
}

export const usePlayerRanking = (clubId: string | undefined, selectedYear: string = "all") => {
  const [topPlayers, setTopPlayers] = useState<PlayerRanking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTopPlayers = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch player stats from the game performance service
        const playerStats = await gamePerformanceService.fetchPlayerStats(clubId, selectedYear, 'all');
        
        // Get member IDs to fetch their nicknames
        const memberIds = playerStats.map(player => player.id);
        
        // Fetch member data from Supabase to get nicknames
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, nickname')
          .in('id', memberIds);
          
        if (membersError) {
          console.error('Error fetching member data:', membersError);
          throw membersError;
        }
        
        // Create a lookup map for member data
        const memberMap = new Map();
        members?.forEach(member => {
          memberMap.set(member.id, {
            nickname: member.nickname
          });
        });
        
        // Transform and limit to top 5 players
        const transformedData = playerStats
          .slice(0, 5)
          .map(player => {
            const memberData = memberMap.get(player.id) || { nickname: null };
            
            return {
              id: player.id,
              name: player.name,
              nickname: memberData.nickname,
              score: player.points,
              position: player.position || 0,
              gamesPlayed: player.games
            };
          });
        
        setTopPlayers(transformedData);
      } catch (err) {
        console.error('Error fetching player ranking:', err);
        setError(err instanceof Error ? err : new Error('Error fetching player ranking'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopPlayers();
  }, [clubId, selectedYear]);

  return { topPlayers, isLoading, error };
};
