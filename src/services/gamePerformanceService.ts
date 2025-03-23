import { supabase } from "@/integrations/supabase/client";

export interface TeamStats {
  id: number;
  name: string;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  totalGames: number;
  points: number;
  winRate: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  games: number;
  goals: number;
  ownGoals: number;
  saves: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalAverage: number;
  position: number;
}

export interface ParticipationRankingStats {
  id: string;
  name: string;
  points: number;
  games: number;
  membershipTime: number; // in days
  age: number; // in years
  position: number;
  participationRate: number; // new field for participation rate
}

// Define an interface for the date filter
interface DateFilter {
  gte?: string;
  lte?: string;
}

export const gamePerformanceService = {
  async fetchTeamStats(clubId: string, year: string, month: string = "all"): Promise<TeamStats[]> {
    console.log('Fetching team statistics for club:', clubId, 'year:', year, 'month:', month);
    
    try {
      // Define date range based on year and month selection
      let dateFilter: DateFilter = {};
      
      if (year !== "all") {
        if (month !== "all") {
          // Get the date range for the selected month in the selected year
          const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          const startDate = `${year}-${month}-01`;
          const endDate = `${year}-${month}-${daysInMonth}`;
          
          dateFilter = {
            gte: startDate,
            lte: endDate
          };
        } else {
          // Get the date range for the selected year
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          
          dateFilter = {
            gte: startDate,
            lte: endDate
          };
        }
      }
      
      // First, fetch the game events to find games with events
      const { data: gameEventsData, error: gameEventsError } = await supabase
        .from('game_events')
        .select('game_id');
        
      if (gameEventsError) {
        console.error('Error fetching game events:', gameEventsError);
        throw gameEventsError;
      }
      
      if (!gameEventsData || gameEventsData.length === 0) {
        console.log('No game events found');
        return [];
      }
      
      // Extract game IDs from events
      const gameIdsWithEvents = [...new Set(gameEventsData.map(event => event.game_id))];
      
      // Fetch games that have at least one event
      let query = supabase
        .from('games')
        .select('id, title')
        .eq('club_id', clubId)
        .eq('status', 'completed')
        .in('id', gameIdsWithEvents);
        
      // Add date filter only if a specific year is selected
      if (year !== "all") {
        query = query.gte('date', dateFilter.gte).lte('date', dateFilter.lte);
      }
      
      const { data: gamesWithEvents, error: gamesError } = await query;
        
      if (gamesError) {
        console.error('Error fetching games with events:', gamesError);
        throw gamesError;
      }
      
      if (!gamesWithEvents || gamesWithEvents.length === 0) {
        console.log('No games with events found for the selected period');
        return [];
      }
      
      console.log(`Found ${gamesWithEvents.length} games with events`);
      
      // Get the game IDs
      const gameIds = gamesWithEvents.map(game => game.id);
      
      // Fetch all team formations for these games
      const { data: teamFormations, error: formationsError } = await supabase
        .from('team_formations')
        .select('id, game_id')
        .in('game_id', gameIds)
        .eq('is_active', true);
        
      if (formationsError) {
        console.error('Error fetching team formations:', formationsError);
        throw formationsError;
      }
      
      if (!teamFormations || teamFormations.length === 0) {
        console.log('No team formations found for games with events');
        return [];
      }
      
      const formationIds = teamFormations.map(formation => formation.id);
      
      // Get all team members for these formations
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('*, members(name)')
        .in('team_formation_id', formationIds);
        
      if (membersError) {
        console.error('Error fetching team members:', membersError);
        throw membersError;
      }
      
      // Get all game events for these games
      const { data: gameEvents, error: eventsError } = await supabase
        .from('game_events')
        .select('*')
        .in('game_id', gameIds);
        
      if (eventsError) {
        console.error('Error fetching game events:', eventsError);
        throw eventsError;
      }
      
      // Calculate team statistics
      // Group members by team (white/green)
      const teams: Record<string, any> = {
        'white': { name: 'Time Branco', wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0 },
        'green': { name: 'Time Verde', wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0 }
      };
      
      // Process each game to calculate team statistics
      for (const game of gamesWithEvents) {
        // Get events for this game
        const eventsForGame = gameEvents.filter(event => event.game_id === game.id);
        
        if (eventsForGame.length === 0) continue;
        
        // Calculate goals for each team
        let whiteGoals = 0;
        let greenGoals = 0;
        
        for (const event of eventsForGame) {
          if (event.event_type === 'goal') {
            if (event.team === 'white') whiteGoals++;
            else if (event.team === 'green') greenGoals++;
          } else if (event.event_type === 'own-goal') {
            // Own goal counts for the opposite team
            if (event.team === 'white') greenGoals++;
            else if (event.team === 'green') whiteGoals++;
          }
        }
        
        // Update team statistics
        teams['white'].goalsScored += whiteGoals;
        teams['white'].goalsConceded += greenGoals;
        teams['green'].goalsScored += greenGoals;
        teams['green'].goalsConceded += whiteGoals;
        
        // Update wins/draws/losses
        if (whiteGoals > greenGoals) {
          teams['white'].wins++;
          teams['green'].losses++;
        } else if (greenGoals > whiteGoals) {
          teams['green'].wins++;
          teams['white'].losses++;
        } else {
          teams['white'].draws++;
          teams['green'].draws++;
        }
      }
      
      // Convert to array and calculate derived statistics
      const teamStats: TeamStats[] = Object.keys(teams).map((teamKey, index) => {
        const team = teams[teamKey];
        const totalGames = team.wins + team.draws + team.losses;
        const points = (team.wins * 3) + team.draws;
        const winRate = totalGames > 0 ? ((team.wins / totalGames) * 100).toFixed(1) : "0.0";
        
        return {
          id: index + 1,
          name: team.name,
          wins: team.wins,
          draws: team.draws,
          losses: team.losses,
          goalsScored: team.goalsScored,
          goalsConceded: team.goalsConceded,
          totalGames,
          points,
          winRate: `${winRate}%`
        };
      });
      
      // Sort by points, then goals scored
      return teamStats.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.goalsScored - a.goalsScored;
      });
      
    } catch (error) {
      console.error('Error in fetchTeamStats:', error);
      throw error;
    }
  },
  
  async fetchPlayerStats(clubId: string, year: string, month: string = "all"): Promise<PlayerStats[]> {
    console.log('Fetching player statistics for club:', clubId, 'year:', year, 'month:', month);
    
    try {
      // Define date range based on year and month selection
      let dateFilter: DateFilter = {};
      
      if (year !== "all") {
        if (month !== "all") {
          // Get the date range for the selected month in the selected year
          const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          const startDate = `${year}-${month}-01`;
          const endDate = `${year}-${month}-${daysInMonth}`;
          
          dateFilter = {
            gte: startDate,
            lte: endDate
          };
        } else {
          // Get the date range for the selected year
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          
          dateFilter = {
            gte: startDate,
            lte: endDate
          };
        }
      }
      
      // First, fetch the game events to find games with events
      const { data: gameEventsData, error: gameEventsError } = await supabase
        .from('game_events')
        .select('game_id');
        
      if (gameEventsError) {
        console.error('Error fetching game events:', gameEventsError);
        throw gameEventsError;
      }
      
      if (!gameEventsData || gameEventsData.length === 0) {
        console.log('No game events found');
        return [];
      }
      
      // Extract game IDs from events
      const gameIdsWithEvents = [...new Set(gameEventsData.map(event => event.game_id))];
      
      // Fetch games that have events
      let query = supabase
        .from('games')
        .select('id, title')
        .eq('club_id', clubId)
        .eq('status', 'completed')
        .in('id', gameIdsWithEvents);
        
      // Add date filter only if a specific year is selected
      if (year !== "all") {
        query = query.gte('date', dateFilter.gte).lte('date', dateFilter.lte);
      }
      
      const { data: gamesWithEvents, error: gamesError } = await query;
        
      if (gamesError) {
        console.error('Error fetching games with events:', gamesError);
        throw gamesError;
      }
      
      if (!gamesWithEvents || gamesWithEvents.length === 0) {
        console.log('No games with events found for the selected period');
        return [];
      }
      
      // Get game IDs
      const gameIds = gamesWithEvents.map(game => game.id);
      
      // Fetch active team formations for these games
      const { data: teamFormations, error: formationsError } = await supabase
        .from('team_formations')
        .select('id, game_id')
        .in('game_id', gameIds)
        .eq('is_active', true);
      
      if (formationsError) {
        console.error('Error fetching team formations:', formationsError);
        throw formationsError;
      }
      
      // Map formations to games
      const formationsByGame: Record<string, any> = {};
      teamFormations.forEach(formation => {
        formationsByGame[formation.game_id] = formation.id;
      });
      
      // Fetch team members for these formations
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('*, members(id, name, nickname)')
        .in('team_formation_id', teamFormations.map(f => f.id));
      
      if (membersError) {
        console.error('Error fetching team members:', membersError);
        throw membersError;
      }
      
      // Fetch game events
      const { data: gameEvents, error: eventsError } = await supabase
        .from('game_events')
        .select('*')
        .in('game_id', gameIds);
      
      if (eventsError) {
        console.error('Error fetching game events:', eventsError);
        throw eventsError;
      }
      
      // Get active members for this club
      const { data: activeMembers, error: activeMembersError } = await supabase
        .from('members')
        .select('id')
        .eq('club_id', clubId)
        .eq('status', 'Ativo');
        
      if (activeMembersError) {
        console.error('Error fetching active members:', activeMembersError);
        throw activeMembersError;
      }
      
      // Create a set of active member IDs for quick lookup
      const activeMemberIds = new Set(activeMembers?.map(member => member.id) || []);
      
      // Create player statistics structure
      const playerStatsMap: Record<string, any> = {};
      
      // First, initialize player data from team members
      teamMembers.forEach(member => {
        const memberId = member.member_id;
        const memberName = member.members.nickname || member.members.name;
        
        if (!playerStatsMap[memberId]) {
          playerStatsMap[memberId] = {
            id: memberId,
            name: memberName,
            games: 0,
            goals: 0,
            ownGoals: 0,
            saves: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            goalAverage: 0,
            team: member.team // Track which team they played for
          };
        }
        
        // Count that they played in this game
        playerStatsMap[memberId].games++;
      });
      
      // Process game events for goals, own goals, and saves
      gameEvents.forEach(event => {
        const memberId = event.member_id;
        
        // Skip if player not found (shouldn't happen)
        if (!playerStatsMap[memberId]) return;
        
        // Count different event types
        if (event.event_type === 'goal') {
          playerStatsMap[memberId].goals++;
        } else if (event.event_type === 'own-goal') {
          playerStatsMap[memberId].ownGoals++;
        } else if (event.event_type === 'save') {
          playerStatsMap[memberId].saves++;
        }
      });
      
      // Process game results for each player's wins, draws, losses
      gamesWithEvents.forEach(game => {
        // Calculate game result based on events
        const eventsForGame = gameEvents.filter(e => e.game_id === game.id);
        let whiteGoals = 0;
        let greenGoals = 0;
        
        eventsForGame.forEach(event => {
          if (event.event_type === 'goal') {
            if (event.team === 'white') whiteGoals++;
            else if (event.team === 'green') greenGoals++;
          } else if (event.event_type === 'own-goal') {
            if (event.team === 'white') greenGoals++;
            else if (event.team === 'green') whiteGoals++;
          }
        });
        
        // Get formation for this game
        const formationId = formationsByGame[game.id];
        if (!formationId) return;
        
        // Find players in this game
        const playersInGame = teamMembers.filter(m => m.team_formation_id === formationId);
        
        playersInGame.forEach(player => {
          const playerId = player.member_id;
          if (!playerStatsMap[playerId]) return;
          
          // Update player's record based on game result
          if (player.team === 'white') {
            if (whiteGoals > greenGoals) {
              playerStatsMap[playerId].wins++;
            } else if (whiteGoals < greenGoals) {
              playerStatsMap[playerId].losses++;
            } else {
              playerStatsMap[playerId].draws++;
            }
          } else if (player.team === 'green') {
            if (greenGoals > whiteGoals) {
              playerStatsMap[playerId].wins++;
            } else if (greenGoals < whiteGoals) {
              playerStatsMap[playerId].losses++;
            } else {
              playerStatsMap[playerId].draws++;
            }
          }
        });
      });
      
      // Calculate points and other derived stats
      Object.values(playerStatsMap).forEach((player: any) => {
        // Points calculation:
        // Game = 1 point
        // Goal = 1 point
        // Own goal = -1 point
        // Win = 3 points
        // Draw = 1 point
        // Loss = 0 points
        // Save = 0.20 points
        
        player.points = 
          player.games * 1 + 
          player.goals * 1 + 
          player.ownGoals * -1 + 
          player.wins * 3 + 
          player.draws * 1 +
          player.saves * 0.20;
        
        // Calculate goal average
        player.goalAverage = player.games > 0 ? player.goals / player.games : 0;
      });
      
      // Filter to include only active players
      const activePlayerStats = Object.values(playerStatsMap)
        .filter((player: any) => activeMemberIds.has(player.id)) as PlayerStats[];
      
      // Sort active players by points, then games played, then goal average
      activePlayerStats.sort((a, b) => {
        // First tiebreaker: points
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        
        // Second tiebreaker: games played
        if (b.games !== a.games) {
          return b.games - a.games;
        }
        
        // Third tiebreaker: goal average
        return b.goalAverage - a.goalAverage;
      });
      
      // Add position
      return activePlayerStats.map((player, index) => ({
        ...player,
        position: index + 1
      }));
      
    } catch (error) {
      console.error('Error in fetchPlayerStats:', error);
      throw error;
    }
  },

  async fetchParticipationRanking(clubId: string, year: string = "all", month: string = "all"): Promise<ParticipationRankingStats[]> {
    console.log('Fetching participation ranking for club:', clubId, 'year:', year, 'month:', month);
    
    try {
      // Define date range based on year and month selection
      let dateFilter: DateFilter = {};
      
      // For calculating age and membership time, we need to use the end of the selected period
      let referenceDate: Date;
      
      if (year !== "all") {
        if (month !== "all") {
          // Get the date range for the selected month in the selected year
          const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          const startDate = `${year}-${month}-01`;
          const endDate = `${year}-${month}-${daysInMonth}`;
          
          dateFilter = {
            gte: startDate,
            lte: endDate
          };
          
          // Set reference date to the last day of the selected month/year
          referenceDate = new Date(parseInt(year), parseInt(month) - 1, daysInMonth);
        } else {
          // Get the date range for the selected year
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          
          dateFilter = {
            gte: startDate,
            lte: endDate
          };
          
          // Set reference date to the last day of the selected year
          referenceDate = new Date(parseInt(year), 11, 31);
        }
      } else {
        // If no specific date is selected, use current date
        referenceDate = new Date();
      }
      
      // Get active members for this club
      const { data: activeMembers, error: activeMembersError } = await supabase
        .from('members')
        .select('id, name, birth_date, registration_date')
        .eq('club_id', clubId)
        .eq('status', 'Ativo');
        
      if (activeMembersError) {
        console.error('Error fetching active members:', activeMembersError);
        throw activeMembersError;
      }
      
      if (!activeMembers || activeMembers.length === 0) {
        console.log('No active members found');
        return [];
      }
      
      // Fetch all games for the period
      let gamesQuery = supabase
        .from('games')
        .select('id')
        .eq('club_id', clubId)
        .eq('status', 'completed');
      
      // Add date filter only if a specific year is selected
      if (year !== "all") {
        gamesQuery = gamesQuery.gte('date', dateFilter.gte).lte('date', dateFilter.lte);
      }
      
      const { data: allGames, error: allGamesError } = await gamesQuery;
        
      if (allGamesError) {
        console.error('Error fetching games:', allGamesError);
        throw allGamesError;
      }
      
      // Create participant stats map
      const participantStatsMap: Record<string, ParticipationRankingStats> = {};
      
      // Initialize data for all active members
      activeMembers.forEach(member => {
        const registrationDate = new Date(member.registration_date);
        const birthDate = new Date(member.birth_date);
        
        // Calculate membership time in days up to the reference date
        const membershipTimeDays = Math.floor((referenceDate.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate age in years up to the reference date
        const ageInYears = Math.floor((referenceDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        
        participantStatsMap[member.id] = {
          id: member.id,
          name: member.name,
          points: 0,
          games: 0,
          membershipTime: membershipTimeDays > 0 ? membershipTimeDays : 0,
          age: ageInYears > 0 ? ageInYears : 0,
          position: 0,
          participationRate: 0
        };
      });
      
      // Fetch game participants to count game participation for the filtered period
      let gameIds = allGames?.map(game => game.id) || [];
      
      if (gameIds.length === 0) {
        // No games found for the period, return participants with zero games
        const sortedParticipants = Object.values(participantStatsMap)
          .map((participant, index) => ({
            ...participant,
            points: 0,
            position: index + 1
          }));
        
        return sortedParticipants;
      }
      
      const { data: gameParticipants, error: participantsError } = await supabase
        .from('game_participants')
        .select('member_id, game_id, status')
        .in('game_id', gameIds)
        .eq('status', 'confirmed');
      
      if (participantsError) {
        console.error('Error fetching game participants:', participantsError);
        throw participantsError;
      }
      
      // Count confirmed games for each member for the filtered period
      for (const memberId in participantStatsMap) {
        if (gameParticipants) {
          // Count confirmed game participations for this member
          const confirmedGames = gameParticipants.filter(
            p => p.member_id === memberId && p.status === 'confirmed'
          ).length;
          
          participantStatsMap[memberId].games = confirmedGames;
        }
      }
      
      // Calculate participation rate and final score for each member
      for (const memberId in participantStatsMap) {
        const member = participantStatsMap[memberId];
        const totalGames = allGames?.length || 0;
        
        // Calculate participation rate (matches the calculation in useMemberGames.ts)
        const participationRate = totalGames > 0 
          ? (member.games / totalGames) * 100 
          : 0;
        
        // Save the participation rate
        member.participationRate = participationRate;
        
        // Calculate months of membership up to the reference date
        const registrationDate = new Date(activeMembers.find(m => m.id === memberId)!.registration_date);
        const monthDiff = (referenceDate.getFullYear() - registrationDate.getFullYear()) * 12 + 
          (referenceDate.getMonth() - registrationDate.getMonth());
        
        // Log calculation components for debugging
        console.log('Calculation components:', {
          participationRate,
          participationValue: Math.round(participationRate * 100000),
          membershipValue: monthDiff * 10,
          ageValue: member.age,
          totalValue: Math.round(participationRate * 100000) + (monthDiff * 10) + member.age,
          scoreValue: (Math.round(participationRate * 100000) + (monthDiff * 10) + member.age) / 1000
        });
        
        // Calculate score using same formula as in useMemberGames.ts:
        // (participationRate * 100000 + monthDiff * 10 + age) / 1000
        const participationValue = Math.round(participationRate * 100000);
        const membershipValue = monthDiff * 10;
        const ageValue = member.age;
        
        const totalValue = participationValue + membershipValue + ageValue;
        const scoreValue = totalValue / 1000;
        
        participantStatsMap[memberId].points = Number(scoreValue.toFixed(2));
      }
      
      // Sort participants by points (descending)
      const sortedParticipants = Object.values(participantStatsMap)
        .sort((a, b) => b.points - a.points)
        .map((participant, index) => ({
          ...participant,
          position: index + 1
        }));
      
      return sortedParticipants;
    } catch (error) {
      console.error('Error in fetchParticipationRanking:', error);
      throw error;
    }
  }
};
