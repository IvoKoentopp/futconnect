import { useState, useEffect } from 'react';
import { gamePerformanceService } from '@/services/gamePerformanceService';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerRanking {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  score: number;
  position: number;
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
        
        // Get member IDs to fetch their photos
        const memberIds = playerStats.map(player => player.id);
        
        // Fetch member data from Supabase to get photos
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, photo_url, nickname')
          .in('id', memberIds);
          
        if (membersError) {
          console.error('Error fetching member data:', membersError);
          throw membersError;
        }
        
        // Create a lookup map for member data
        const memberMap = new Map();
        members?.forEach(member => {
          memberMap.set(member.id, {
            photoUrl: member.photo_url,
            nickname: member.nickname
          });
        });
        
        // Transform and limit to top 5 players with photos
        const transformedData = playerStats
          .slice(0, 5)
          .map(player => {
            const memberData = memberMap.get(player.id) || { photoUrl: null, nickname: null };
            
            return {
              id: player.id,
              name: player.name,
              nickname: memberData.nickname,
              photoUrl: memberData.photoUrl,
              score: player.points,
              position: player.position
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
