
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Game } from '@/types/game';

export interface MemberGameParticipation {
  game: Game;
  status: 'confirmed' | 'declined' | 'unconfirmed';
}

export interface MemberScoreDetails {
  participationRate: number;
  membershipMonths: number;
  age: number;
  score: number;
  totalGames: number;
  confirmedGames: number;
  // Added fields for statistics cards
  goals: number;
  ownGoals: number;
  saves: number;
  wins: number;
  draws: number;
  losses: number;
}

export const useMemberGames = (memberId: string | undefined) => {
  const [games, setGames] = useState<MemberGameParticipation[]>([]);
  const [scoreDetails, setScoreDetails] = useState<MemberScoreDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMemberGames = async () => {
      if (!memberId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch member details for age and registration date
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('name, birth_date, registration_date')
          .eq('id', memberId)
          .single();
          
        if (memberError) throw memberError;
        
        // Get current year
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).toISOString();
        
        // Fetch all games the member participated in
        const { data, error } = await supabase
          .from('game_participants')
          .select(`
            status,
            games(*)
          `)
          .eq('member_id', memberId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Transform the data to match the MemberGameParticipation type
        const transformedData: MemberGameParticipation[] = data.map(participation => {
          // Validate the status
          const status = validateParticipantStatus(participation.status);
          
          return {
            game: participation.games as Game,
            status
          };
        });
        
        // Calculate all games for the current year
        const { data: allGames, error: allGamesError } = await supabase
          .from('games')
          .select('id')
          .eq('status', 'completed')
          .gte('date', startOfYear);
          
        if (allGamesError) throw allGamesError;
        
        // Fetch game events for this member to calculate stats
        const { data: gameEvents, error: eventsError } = await supabase
          .from('game_events')
          .select('event_type, team, game_id')
          .eq('member_id', memberId);
          
        if (eventsError) throw eventsError;
        
        // Fetch team formations for games this member participated in
        const completedGameIds = transformedData
          .filter(g => g.game.status === 'completed')
          .map(g => g.game.id);
          
        const { data: teamFormations, error: formationsError } = await supabase
          .from('team_members')
          .select('team, team_formation_id, team_formations(game_id)')
          .eq('member_id', memberId)
          .in('team_formations.game_id', completedGameIds);
          
        if (formationsError) throw formationsError;
        
        // Get game results for win/loss/draw calculation
        const gameResults = new Map();
        
        for (const formation of teamFormations) {
          const gameId = formation.team_formations?.game_id;
          if (!gameId) continue;
          
          // Get events for this game
          const { data: gameEventsData, error: gameEventsError } = await supabase
            .from('game_events')
            .select('event_type, team')
            .eq('game_id', gameId);
            
          if (gameEventsError) throw gameEventsError;
          
          // Calculate scores
          let whiteGoals = 0;
          let greenGoals = 0;
          
          gameEventsData.forEach(event => {
            if (event.event_type === 'goal') {
              if (event.team === 'white') whiteGoals++;
              else if (event.team === 'green') greenGoals++;
            } else if (event.event_type === 'own-goal') {
              if (event.team === 'white') greenGoals++;
              else if (event.team === 'green') whiteGoals++;
            }
          });
          
          // Store result and player's team
          gameResults.set(gameId, {
            whiteGoals,
            greenGoals,
            playerTeam: formation.team
          });
        }
        
        // Calculate statistics
        let goals = 0;
        let ownGoals = 0;
        let saves = 0;
        let wins = 0;
        let draws = 0;
        let losses = 0;
        
        // Count goals, own goals, and saves
        gameEvents.forEach(event => {
          if (event.event_type === 'goal') goals++;
          else if (event.event_type === 'own-goal') ownGoals++;
          else if (event.event_type === 'save') saves++;
        });
        
        // Calculate wins, draws, and losses
        gameResults.forEach((result, gameId) => {
          const { whiteGoals, greenGoals, playerTeam } = result;
          
          if (playerTeam === 'white') {
            if (whiteGoals > greenGoals) wins++;
            else if (whiteGoals < greenGoals) losses++;
            else draws++;
          } else if (playerTeam === 'green') {
            if (greenGoals > whiteGoals) wins++;
            else if (greenGoals < whiteGoals) losses++;
            else draws++;
          }
        });
        
        // Calculate score details
        if (memberData) {
          // Calculate age
          const birthDate = new Date(memberData.birth_date);
          const ageDiffMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageDiffMs);
          const age = Math.abs(ageDate.getUTCFullYear() - 1970);
          
          // Calculate membership duration in months
          const registrationDate = new Date(memberData.registration_date);
          const monthDiff = (new Date().getFullYear() - registrationDate.getFullYear()) * 12 + 
            (new Date().getMonth() - registrationDate.getMonth());
          
          // Count games this year where this member participated
          const confirmedGames = transformedData.filter(g => 
            g.game.status === 'completed' && 
            new Date(g.game.date) >= new Date(startOfYear) &&
            g.status === 'confirmed'
          ).length;
          
          // Calculate participation rate
          const totalGames = allGames.length;
          const participationRate = totalGames > 0 
            ? (confirmedGames / totalGames) * 100 
            : 0;
          
          // Use exact integer arithmetic to avoid floating point errors
          const participationValue = Math.round(participationRate * 100000); // Use Math.round to exactly match the calculation
          const membershipValue = monthDiff * 10;
          const ageValue = age;
          
          // Calculate using integers, then divide by 1000 only at the end
          const totalValue = participationValue + membershipValue + ageValue;
          const scoreValue = totalValue / 1000;
          
          console.log("Calculation components:", {
            participationRate,
            participationValue,
            membershipValue,
            ageValue,
            totalValue,
            scoreValue
          });
          
          // Set score details
          setScoreDetails({
            participationRate: parseFloat(participationRate.toFixed(1)),
            membershipMonths: monthDiff,
            age,
            score: Number((totalValue / 1000).toFixed(2)),
            totalGames,
            confirmedGames,
            goals,
            ownGoals,
            saves,
            wins,
            draws,
            losses
          });
        }
        
        setGames(transformedData);
      } catch (err) {
        console.error('Error fetching member games:', err);
        setError(err instanceof Error ? err : new Error('Error fetching member games'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMemberGames();
  }, [memberId]);
  
  // Helper function to validate participant status
  const validateParticipantStatus = (status: string): 'confirmed' | 'declined' | 'unconfirmed' => {
    const validStatuses = ['confirmed', 'declined', 'unconfirmed'];
    return validStatuses.includes(status) 
      ? (status as 'confirmed' | 'declined' | 'unconfirmed')
      : 'unconfirmed'; // Default to unconfirmed if invalid status
  };
  
  return { games, scoreDetails, isLoading, error };
};
