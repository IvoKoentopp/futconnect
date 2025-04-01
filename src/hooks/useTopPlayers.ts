import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TopPlayer = {
  id: string;
  name: string;
  nickname: string | null;
  score: number;
  participationRate: number;
  membershipMonths: number;
  age: number;
};

export const useTopPlayers = (clubId: string | undefined, selectedYear: string = "all", limit: number = 5) => {
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
        // Definir o período de busca baseado no ano selecionado
        let startDate: string;
        let endDate: string;
        
        if (selectedYear === "all") {
          // Se for "all", usar o ano atual
          const currentYear = new Date().getFullYear();
          startDate = new Date(currentYear, 0, 1).toISOString();
          endDate = new Date(currentYear + 1, 0, 1).toISOString();
        } else {
          // Se for um ano específico, usar o período daquele ano
          startDate = new Date(parseInt(selectedYear), 0, 1).toISOString();
          endDate = new Date(parseInt(selectedYear) + 1, 0, 1).toISOString();
        }
        
        // Fetch all games in the selected period
        const { data: games, error: gamesError } = await supabase
          .from('games')
          .select('id, date')
          .eq('club_id', clubId)
          .gte('date', startDate)
          .lt('date', endDate)
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
          .select('id, name, nickname, birth_date, registration_date')
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
          
          // First convert participation rate to a fixed precision value (e.g., 85.7)
          const fixedParticipationRate = parseFloat(participationRate.toFixed(1));
          
          // Nova fórmula de cálculo da pontuação
          const participationValue = Math.round(fixedParticipationRate * 1000);
          const membershipValue = monthDiff * 10;
          const ageValue = age;
          
          // Pontuação final dividida por 1000
          const score = (participationValue + membershipValue + ageValue) / 1000;
          
          return {
            id: member.id,
            name: member.name,
            nickname: member.nickname,
            score: Number(score.toFixed(2)), // Formatando para 2 casas decimais
            participationRate: fixedParticipationRate,
            membershipMonths: monthDiff,
            age
          };
        });
        
        // Sort by score and limit to top N players
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
  }, [clubId, selectedYear, limit]);

  return { topPlayers, isLoading, error };
};
