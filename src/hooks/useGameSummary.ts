import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type GameSummaryStats = {
  averageGoalsPerGame: number;
  averagePlayersPerGame: number;
  completionRate: number;
  isLoading: boolean;
  error: Error | null;
};

export const useGameSummary = (clubId: string | undefined, selectedYear: string = "all"): GameSummaryStats => {
  const [averageGoalsPerGame, setAverageGoalsPerGame] = useState<number>(0);
  const [averagePlayersPerGame, setAveragePlayersPerGame] = useState<number>(0);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGameSummary = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
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
          .select('id, status')
          .eq('club_id', clubId)
          .gte('date', startDate)
          .lt('date', endDate);
        
        if (gamesError) throw gamesError;

        // Calculate completion rate
        // Only count completed and canceled games in the total (exclude scheduled games)
        const completedGames = games.filter(game => game.status === 'completed').length;
        const canceledGames = games.filter(game => game.status === 'canceled' || game.status === 'cancelled').length;
        
        // Total is now the sum of completed and canceled games, excluding scheduled
        const totalGames = completedGames + canceledGames;
        
        const calculatedCompletionRate = totalGames > 0 
          ? Number((completedGames / totalGames * 100).toFixed(2))
          : 0;
        
        // Get completed game IDs for further calculations
        const completedGameIds = games
          .filter(game => game.status === 'completed')
          .map(game => game.id);
        
        if (completedGameIds.length === 0) {
          setAverageGoalsPerGame(0);
          setAveragePlayersPerGame(0);
          setCompletionRate(calculatedCompletionRate);
          setIsLoading(false);
          return;
        }
        
        // Fetch goal events for completed games
        const { data: goalEvents, error: goalEventsError } = await supabase
          .from('game_events')
          .select('game_id, event_type')
          .in('game_id', completedGameIds)
          .in('event_type', ['goal', 'own-goal']);
        
        if (goalEventsError) throw goalEventsError;
        
        // Count total goals
        const totalGoals = goalEvents.length;
        
        // Get unique game IDs from game_events to count games with statistics
        const gamesWithEvents = [...new Set(goalEvents.map(event => event.game_id))];
        const gamesWithEventsCount = gamesWithEvents.length;
        
        // Calculate average goals per game using games with events count
        const calculatedAverageGoals = gamesWithEventsCount > 0 
          ? Number((totalGoals / gamesWithEventsCount).toFixed(2))
          : 0;
        
        // Fetch participants for completed games
        const { data: participants, error: participantsError } = await supabase
          .from('game_participants')
          .select('game_id, status, member_id')
          .in('game_id', completedGameIds)
          .eq('status', 'confirmed');
        
        if (participantsError) throw participantsError;
        
        // Get member IDs to filter out system members
        const memberIds = [...new Set(participants.map(p => p.member_id))];
        
        if (memberIds.length === 0) {
          setAverageGoalsPerGame(calculatedAverageGoals);
          setAveragePlayersPerGame(0);
          setCompletionRate(calculatedCompletionRate);
          setIsLoading(false);
          return;
        }
        
        // Get real members (exclude system members)
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id')
          .in('id', memberIds)
          .eq('club_id', clubId);
        
        if (membersError) throw membersError;
        
        // Create a set of real member IDs for filtering
        const realMemberIds = new Set(members.map(m => m.id));
        
        // Group participants by game
        const participantsByGame = participants.reduce<Record<string, number>>((acc, curr) => {
          if (realMemberIds.has(curr.member_id)) {
            acc[curr.game_id] = (acc[curr.game_id] || 0) + 1;
          }
          return acc;
        }, {});
        
        // Calculate total players and games with players
        const gamesWithPlayers = Object.keys(participantsByGame).length;
        const totalPlayers = Object.values(participantsByGame).reduce((sum, count) => sum + count, 0);
        
        // Calculate average players per game
        const calculatedAveragePlayers = gamesWithPlayers > 0 
          ? Number((totalPlayers / gamesWithPlayers).toFixed(2))
          : 0;
        
        // Update state with calculated values
        setAverageGoalsPerGame(calculatedAverageGoals);
        setAveragePlayersPerGame(calculatedAveragePlayers);
        setCompletionRate(calculatedCompletionRate);
      } catch (err) {
        console.error('Error fetching game summary:', err);
        setError(err instanceof Error ? err : new Error('Error fetching game summary'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameSummary();
  }, [clubId, selectedYear]);

  return {
    averageGoalsPerGame,
    averagePlayersPerGame,
    completionRate,
    isLoading,
    error
  };
};
