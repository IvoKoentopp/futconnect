
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TopPlayer = {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  score: number;
  participationRate: number;
  membershipMonths: number;
  age: number;
};

export const useTopPlayers = (clubId: string | undefined, limit: number = 5) => {
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTopPlayers = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Get current year
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).toISOString();
        
        // Fetch all games in the current year
        const { data: games, error: gamesError } = await supabase
          .from('games')
          .select('id, date')
          .eq('club_id', clubId)
          .gte('date', startOfYear)
          .eq('status', 'completed');
        
        if (gamesError) throw gamesError;
        
        // Get all game participants
        const gameIds = games.map(game => game.id);
        
        if (gameIds.length === 0) {
          setTopPlayers([]);
          setIsLoading(false);
          return;
        }
        
        const { data: participants, error: participantsError } = await supabase
          .from('game_participants')
          .select('game_id, member_id, status')
          .in('game_id', gameIds)
          .eq('status', 'confirmed');
        
        if (participantsError) throw participantsError;
        
        // Get all active members
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, name, nickname, photo_url, birth_date, registration_date')
          .eq('club_id', clubId)
          .eq('status', 'Ativo');
        
        if (membersError) throw membersError;
        
        // Calculate participation rates and scores
        const playerStats = members.map(member => {
          // Count games where this member participated
          const memberParticipations = participants.filter(p => 
            p.member_id === member.id
          ).length;
          
          // Calculate participation rate
          const participationRate = games.length > 0 
            ? (memberParticipations / games.length) * 100 
            : 0;
          
          // Calculate age
          const birthDate = new Date(member.birth_date);
          const ageDiffMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageDiffMs);
          const age = Math.abs(ageDate.getUTCFullYear() - 1970);
          
          // Calculate membership duration in months
          const registrationDate = new Date(member.registration_date);
          const monthDiff = (new Date().getFullYear() - registrationDate.getFullYear()) * 12 + 
            (new Date().getMonth() - registrationDate.getMonth());
          
          // IMPORTANT: Calculate score using EXACTLY the same method as in MemberGamesHistory
          // First convert participation rate to a fixed precision value (e.g., 85.7)
          const fixedParticipationRate = parseFloat(participationRate.toFixed(1));
          
          // Then use integer arithmetic for the calculation to avoid floating point errors
          const participationValue = Math.round(fixedParticipationRate * 100000); // Exactly as shown in the formula
          const membershipValue = monthDiff * 10;
          const ageValue = age;
          const totalValue = participationValue + membershipValue + ageValue;
          
          // Final step: divide by 1000 and format as string, then convert back to number
          // This ensures EXACT match with MemberGamesHistory calculation
          const score = Number((totalValue / 1000).toFixed(2));
          
          return {
            id: member.id,
            name: member.name,
            nickname: member.nickname,
            photoUrl: member.photo_url,
            score: score,
            participationRate: fixedParticipationRate,
            membershipMonths: monthDiff,
            age: age
          };
        });
        
        // Sort by score and limit to specified number
        const sortedPlayers = playerStats
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        
        setTopPlayers(sortedPlayers);
      } catch (err) {
        console.error('Error fetching top players:', err);
        setError(err instanceof Error ? err : new Error('Error fetching top players'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopPlayers();
  }, [clubId, limit]);
  
  return { topPlayers, isLoading, error };
};
