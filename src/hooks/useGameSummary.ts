
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type GameSummaryStats = {
  averageGoalsPerGame: number;
  averagePlayersPerGame: number;
  completionRate: number;
  isLoading: boolean;
  error: Error | null;
};

export const useGameSummary = (clubId: string | undefined): GameSummaryStats => {
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
        
        // Get current year
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).toISOString();
        
        // Fetch all games in the current year
        const { data: games, error: gamesError } = await supabase
          .from('games')
          .select('id, status')
          .eq('club_id', clubId)
          .gte('date', startOfYear);
        
        if (gamesError) throw gamesError;

        // Calculate completion rate
        // Only count completed and canceled games in the total (exclude scheduled games)
        const completedGames = games.filter(game => game.status === 'completed').length;
        const canceledGames = games.filter(game => game.status === 'canceled' || game.status === 'cancelled').length;
        
        // Total is now the sum of completed and canceled games, excluding scheduled
        const totalGames = completedGames + canceledGames;
        
        const calculatedCompletionRate = totalGames > 0 
          ? (completedGames / totalGames) * 100 
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
          ? totalGoals / gamesWithEventsCount 
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
          setAverageGoalsPerGame(parseFloat(calculatedAverageGoals.toFixed(1)));
          setAveragePlayersPerGame(0);
          setCompletionRate(parseFloat(calculatedCompletionRate.toFixed(1)));
          setIsLoading(false);
          return;
        }
        
        // Fetch members to exclude system members
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, status')
          .in('id', memberIds);
        
        if (membersError) throw membersError;
        
        // Filter out system members
        const regularMemberIds = members
          .filter(member => member.status !== 'Sistema')
          .map(member => member.id);
        
        // Group participants by game
        const participantsByGame: { [key: string]: number } = {};
        
        participants.forEach(participant => {
          if (regularMemberIds.includes(participant.member_id)) {
            if (!participantsByGame[participant.game_id]) {
              participantsByGame[participant.game_id] = 0;
            }
            participantsByGame[participant.game_id]++;
          }
        });
        
        // Calculate average players per game
        const gamesWithParticipants = Object.keys(participantsByGame).length;
        const totalParticipants = Object.values(participantsByGame).reduce((sum, count) => sum + count, 0);
        
        const calculatedAveragePlayers = gamesWithParticipants > 0 
          ? totalParticipants / gamesWithParticipants 
          : 0;
        
        setAverageGoalsPerGame(parseFloat(calculatedAverageGoals.toFixed(1)));
        setAveragePlayersPerGame(parseFloat(calculatedAveragePlayers.toFixed(1)));
        setCompletionRate(parseFloat(calculatedCompletionRate.toFixed(1)));
      } catch (err) {
        console.error('Error fetching game summary:', err);
        setError(err instanceof Error ? err : new Error('Error fetching game summary'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGameSummary();
  }, [clubId]);
  
  return { 
    averageGoalsPerGame, 
    averagePlayersPerGame, 
    completionRate,
    isLoading, 
    error 
  };
};
