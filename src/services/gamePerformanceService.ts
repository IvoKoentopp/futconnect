import { supabase } from "@/integrations/supabase/client";

export interface TeamStats {
  id: string;
  name: string;
  color: string; 
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
  nickname?: string;
  games: number;
  goals: number;
  ownGoals: number;
  saves: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalAverage: number;
  winRate: string;
  position?: number;
}

export interface ParticipationRankingStats {
  id: string;
  name: string;
  nickname: string;
  points: number;
  games: number;
  membershipTime: number; // in days
  membershipYears: number; // anos com precisão de 3 casas decimais
  age: number; // in years
  position: number;
  participationRate: number; // taxa absoluta (todos os jogos)
  effectiveParticipationRate: number; // taxa efetiva (jogos após associação)
}

// Define an interface for the date filter
interface DateFilter {
  gte?: string;
  lte?: string;
}

export const gamePerformanceService = {
  async fetchTeamStats(clubId: string, year: number, month: number | 'all'): Promise<TeamStats[]> {
    try {
      // 1. Primeiro, buscar as configurações de times do clube
      const { data: teamConfigurations, error: configError } = await supabase
        .from('team_configurations')
        .select('*')
        .eq('club_id', clubId)
        .eq('is_active', true);

      if (configError) throw configError;

      // 2. Buscar todos os eventos do período
      let query = supabase
        .from('game_events')
        .select('*, games!inner(club_id)')
        .eq('games.club_id', clubId);

      // Aplicar filtro de data apenas se não for 'all'
      if (month !== 'all') {
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString();
        query = query
          .gte('games.created_at', startDate)
          .lt('games.created_at', endDate);
      }

      const { data: gameEvents, error: eventsError } = await query;

      if (eventsError) throw eventsError;

      // Limpar os dados para usar apenas os campos necessários
      const cleanedEvents = gameEvents.map(event => ({
        game_id: event.game_id,
        team: event.team,
        event_type: event.event_type
      }));

      // 3. Inicializar estatísticas
      const teams: Record<string, TeamStats> = {};
      teamConfigurations.forEach(config => {
        teams[config.team_name] = {
          id: config.id,
          name: config.team_name,
          color: config.team_color,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsScored: 0,
          goalsConceded: 0,
          totalGames: 0,
          points: 0,
          winRate: '0%'
        };
      });

      // 4. Agrupar eventos por jogo
      const gameEventsByGame = cleanedEvents.reduce((acc, event) => {
        if (!acc[event.game_id]) {
          acc[event.game_id] = [];
        }
        acc[event.game_id].push(event);
        return acc;
      }, {} as Record<string, typeof cleanedEvents>);

      // 5. Processar cada jogo
      Object.values(gameEventsByGame).forEach(eventsForGame => {
        // Pegar times únicos que participaram deste jogo
        const teamsInGame = [...new Set(eventsForGame.map(event => event.team))];
        
        // Calcular gols para cada time no jogo
        const gameGoals: Record<string, number> = {};
        teamsInGame.forEach(team => {
          gameGoals[team] = 0;
        });

        // Contar gols
        eventsForGame.forEach(event => {
          if (event.event_type === 'goal') {
            gameGoals[event.team] = (gameGoals[event.team] || 0) + 1;
          } else if (event.event_type === 'own-goal') {
            const otherTeams = teamsInGame.filter(t => t !== event.team);
            const goalValue = 1 / otherTeams.length;
            otherTeams.forEach(team => {
              gameGoals[team] = (gameGoals[team] || 0) + goalValue;
            });
          }
        });

        // Atualizar estatísticas para cada time
        teamsInGame.forEach(teamName => {
          if (!teams[teamName]) return;

          teams[teamName].totalGames++;
          const teamGoals = Math.round(gameGoals[teamName] || 0);
          teams[teamName].goalsScored += teamGoals;

          // Gols sofridos
          const goalsConceded = Object.entries(gameGoals)
            .filter(([team]) => team !== teamName)
            .reduce((sum, [, goals]) => sum + goals, 0);
          teams[teamName].goalsConceded += Math.round(goalsConceded);

          // Determinar resultado
          const maxOtherTeamGoals = Math.max(
            ...Object.entries(gameGoals)
              .filter(([team]) => team !== teamName)
              .map(([, goals]) => goals)
          );

          if (teamGoals > maxOtherTeamGoals) {
            teams[teamName].wins++;
            teams[teamName].points += 3;
          } else if (teamGoals === maxOtherTeamGoals) {
            teams[teamName].draws++;
            teams[teamName].points += 1;
          } else {
            teams[teamName].losses++;
          }
        });
      });

      // 6. Calcular win rate e retornar
      return Object.values(teams)
        .map(team => ({
          ...team,
          winRate: team.totalGames > 0 
            ? `${Math.round((team.wins / team.totalGames) * 100)}%`
            : '0%'
        }))
        .sort((a, b) => b.points - a.points);

    } catch (error) {
      console.error('Error in fetchTeamStats:', error);
      throw error;
    }
  },
  
  async fetchPlayerStats(clubId: string, year: string | number, month: string | number | 'all'): Promise<PlayerStats[]> {
    try {
      // 1. Primeiro buscar os eventos do período para identificar jogos com estatísticas
      let eventsQuery = supabase
        .from('game_events')
        .select('game_id, games!inner(club_id)')
        .eq('games.club_id', clubId)
        .not('event_type', 'is', null);

      // Aplicar filtro de data apenas se não for 'all'
      if (year !== 'all' && month !== 'all') {
        const startDate = new Date(
          typeof year === 'string' ? parseInt(year) : year,
          typeof month === 'string' ? parseInt(month) - 1 : month - 1,
          1
        ).toISOString();
        const endDate = new Date(
          typeof year === 'string' ? parseInt(year) : year,
          typeof month === 'string' ? parseInt(month) : month,
          0
        ).toISOString();

        eventsQuery = eventsQuery
          .gte('games.created_at', startDate)
          .lt('games.created_at', endDate);
      }

      const { data: gamesWithEvents, error: eventsError } = await eventsQuery;
      if (eventsError) {
        console.error('Error fetching games with events:', eventsError);
        throw eventsError;
      }

      // Se não houver jogos com eventos, retornar array vazio
      if (!gamesWithEvents || gamesWithEvents.length === 0) {
        console.log('No games with events found for the period');
        return [];
      }

      // Obter IDs únicos dos jogos que têm eventos
      const gameIdsWithEvents = [...new Set(gamesWithEvents.map(e => e.game_id))];
      console.log(`Found ${gameIdsWithEvents.length} games with events`);

      // 2. Buscar jogos que têm eventos e seus participantes
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select(`
          id,
          club_id,
          created_at,
          game_participants:game_participants(
            id,
            game_id,
            member_id,
            status,
            member:members(
              id,
              nickname,
              status,
              team:team_members(
                team
              )
            )
          )
        `)
        .eq('club_id', clubId)
        .in('id', gameIdsWithEvents);

      if (gamesError) {
        console.error('Error fetching games:', gamesError);
        throw gamesError;
      }

      // Se não houver jogos, retornar array vazio
      if (!games || games.length === 0) {
        console.log('No games found');
        return [];
      }

      console.log(`Found ${games.length} games with participants`);

      // 3. Buscar todos os eventos desses jogos
      const { data: gameEvents, error: fullEventsError } = await supabase
        .from('game_events')
        .select('*')
        .in('game_id', games.map(game => game.id));

      if (fullEventsError) {
        console.error('Error fetching full events:', fullEventsError);
        throw fullEventsError;
      }

      if (!gameEvents || gameEvents.length === 0) {
        console.log('No events found for games');
        return [];
      }

      console.log(`Found ${gameEvents.length} events`);

      // 4. Agrupar eventos por jogo
      const gameEventsByGame = gameEvents.reduce((acc, event) => {
        if (!acc[event.game_id]) {
          acc[event.game_id] = [];
        }
        acc[event.game_id].push(event);
        return acc;
      }, {} as Record<string, typeof gameEvents>);

      // 5. Inicializar estatísticas dos jogadores ativos
      const playerStats: Record<string, PlayerStats> = {};
      const activePlayerIds = new Set(
        games.flatMap(game => 
          game.game_participants
            ?.filter(participant => 
              participant.member?.status === 'Ativo' && 
              participant.status === 'confirmed'
            )
            .map(participant => participant.member_id) || []
        )
      );

      console.log(`Found ${activePlayerIds.size} active players`);

      // 6. Buscar todas as formações de times para os jogos
      const { data: allTeamFormations, error: formationsError } = await supabase
        .from('team_formations')
        .select('id, game_id')
        .in('game_id', games.map(game => game.id))
        .eq('is_active', true);
        
      if (formationsError) {
        console.error('Error fetching team formations:', formationsError);
        throw formationsError;
      }
      
      // Mapear formações por jogo para acesso rápido
      const formationsByGame = (allTeamFormations || []).reduce((acc, formation) => {
        acc[formation.game_id] = formation.id;
        return acc;
      }, {} as Record<string, string>);
      
      // 7. Buscar todos os membros de times para as formações encontradas
      const { data: allTeamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select('team_formation_id, member_id, team')
        .in('team_formation_id', (allTeamFormations || []).map(formation => formation.id));
        
      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError);
        throw teamMembersError;
      }
      
      // Mapear membros de time por formação e jogador para acesso rápido
      const teamMembersByFormationAndPlayer = (allTeamMembers || []).reduce((acc, member) => {
        const key = `${member.team_formation_id}_${member.member_id}`;
        acc[key] = member.team;
        return acc;
      }, {} as Record<string, string>);
      
      // 8. Processar cada jogo
      games.forEach(game => {
        if (!game.game_participants) return;
        
        const eventsForGame = gameEventsByGame[game.id] || [];
        // Se o jogo não tem eventos, pular
        if (eventsForGame.length === 0) return;

        const confirmedParticipants = game.game_participants
          .filter(participant => 
            participant.member?.status === 'Ativo' && 
            participant.status === 'confirmed'
          );

        // Processar participantes ativos e confirmados
        confirmedParticipants.forEach(participant => {
          if (!participant.member) return;

          // Inicializar estatísticas do jogador se necessário
          if (!playerStats[participant.member_id]) {
            playerStats[participant.member_id] = {
              id: participant.member_id,
              name: participant.member.nickname,
              games: 0,
              goals: 0,
              ownGoals: 0,
              saves: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              points: 0,
              goalAverage: 0,
              winRate: '0%'
            };
          }

          // Incrementar jogos (todos participantes recebem ponto por jogo)
          playerStats[participant.member_id].games++;

          // Processar eventos do jogador
          eventsForGame
            .filter(event => event.member_id === participant.member_id)
            .forEach(event => {
              if (event.event_type === 'goal') {
                playerStats[participant.member_id].goals++;
              } else if (event.event_type === 'own-goal') {
                playerStats[participant.member_id].ownGoals++;
              } else if (event.event_type === 'save') {
                playerStats[participant.member_id].saves++;
              }
            });

          // Determinar resultado usando o placar calculado
          // Buscar o time do jogador através da relação team_formations e team_members para este jogo específico
          let playerTeam: string | undefined;
          
          // Verificar se existe uma formação para este jogo
          const formationId = formationsByGame[game.id];
          if (formationId) {
            // Verificar se o jogador está atribuído a um time nesta formação
            const teamMemberKey = `${formationId}_${participant.member_id}`;
            playerTeam = teamMembersByFormationAndPlayer[teamMemberKey];
          }
          
          // Se não encontrou time específico para este jogo, usar o time padrão do membro (fallback)
          if (!playerTeam) {
            playerTeam = participant.member?.team?.[0]?.team;
          }
          
          if (!playerTeam) {
            console.warn(`No team found for player ${participant.member_id} in game ${game.id}`);
            return;
          }

          const gameGoals: Record<string, number> = {};
          const teamsInGame = [...new Set(game.game_participants
            .filter(p => p.member?.team?.[0]?.team) // Filtrar apenas participantes com time definido
            .map(p => p.member.team[0].team))];

          // Inicializar contagem de gols para todos os times
          teamsInGame.forEach(team => {
            gameGoals[team] = 0;
          });

          // Contar gols e gols contra
          eventsForGame.forEach(event => {
            if (!event.team) return;

            if (event.event_type === 'goal') {
              gameGoals[event.team] = (gameGoals[event.team] || 0) + 1;
            } else if (event.event_type === 'own-goal') {
              // Gol contra beneficia o(s) time(s) adversário(s)
              teamsInGame
                .filter(t => t !== event.team)
                .forEach(team => {
                  gameGoals[team] = (gameGoals[team] || 0) + 1;
                });
            }
          });

          const teamGoals = gameGoals[playerTeam] || 0;
          const maxOtherTeamGoals = Math.max(
            ...teamsInGame
              .filter(team => team !== playerTeam)
              .map(team => gameGoals[team] || 0)
          );

          if (teamGoals > maxOtherTeamGoals) {
            playerStats[participant.member_id].wins++;
          } else if (teamGoals === maxOtherTeamGoals) {
            playerStats[participant.member_id].draws++;
          } else {
            playerStats[participant.member_id].losses++;
          }
        });
      });

      console.log(`Processed ${Object.keys(playerStats).length} players with statistics`);

      // 7. Calcular pontuação e estatísticas finais
      return Object.values(playerStats)
        .map(player => {
          const points = 
            player.games * 1 +      // 1 ponto por participação
            player.goals * 1 +      // 1 ponto por gol
            player.ownGoals * -1 +  // -1 ponto por gol contra
            player.wins * 3 +       // 3 pontos por vitória
            player.draws * 1 +      // 1 ponto por empate
            player.saves * 0.20;    // 0.2 pontos por defesa

          return {
            ...player,
            points,
            goalAverage: player.games > 0 ? player.goals / player.games : 0,
            winRate: player.games > 0
              ? `${Math.round((player.wins / player.games) * 100)}%`
              : '0%'
          };
        })
        .sort((a, b) => b.points - a.points)
        .map((player, index) => ({
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
      let referenceDate: Date = new Date();
      
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
        .select('id, name, nickname, birth_date, registration_date')
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
        .select('id, date')
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
        // Calcular diretamente a diferença em dias entre a data atual e a data de registro
        const hoje = new Date();
        const dataRegistro = new Date(member.registration_date);
        const birthDate = new Date(member.birth_date);
        
        // Calcular a diferença em dias
        const diferencaEmDias = Math.floor((hoje.getTime() - dataRegistro.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calcular anos com precisão de 3 casas decimais (considerando anos bissextos)
        const membershipYears = diferencaEmDias / 365.25;
        
        // Armazenar o valor dos dias para compatibilidade
        const membershipTimeDays = diferencaEmDias;
        
        // Calculate age in years up to the reference date
        const ageInYears = Math.floor((referenceDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        
        participantStatsMap[member.id] = {
          id: member.id,
          name: member.name,
          nickname: member.nickname || member.name,
          points: 0,
          games: 0,
          membershipTime: membershipTimeDays > 0 ? membershipTimeDays : 0,
          membershipYears: membershipYears > 0 ? membershipYears : 0,
          age: ageInYears > 0 ? ageInYears : 0,
          position: 0,
          participationRate: 0,
          effectiveParticipationRate: 0
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
      
      // Calculate participation rates and final score for each member
      for (const memberId in participantStatsMap) {
        const member = participantStatsMap[memberId];
        const totalGames = allGames?.length || 0;
        
        // Find games that happened after member registration
        const gamesAfterRegistration = allGames?.filter(game => {
          const gameDate = new Date(game.date);
          const registrationDate = new Date(activeMembers.find(m => m.id === memberId)?.registration_date || '');
          return gameDate >= registrationDate;
        }) || [];
        
        // Calculate absolute participation rate (all games)
        const participationRate = totalGames > 0 
          ? (member.games / totalGames) * 100 
          : 0;
        
        // Calculate effective participation rate (only games after registration)
        const effectiveParticipationRate = gamesAfterRegistration.length > 0
          ? (member.games / gamesAfterRegistration.length) * 100
          : 0;
        
        // Fix participation rates to 1 decimal place
        const fixedParticipationRate = parseFloat(participationRate.toFixed(1));
        const fixedEffectiveParticipationRate = parseFloat(effectiveParticipationRate.toFixed(1));
        
        // Save both participation rates
        member.participationRate = fixedParticipationRate;
        member.effectiveParticipationRate = fixedEffectiveParticipationRate;
        
        // Obter a data de registro do membro
        const memberData = activeMembers.find(m => m.id === memberId)!;
        const registrationDate = new Date(memberData.registration_date);
        
        // Calcular o tempo de associação em anos
        const today = new Date();
        const diffInDays = Math.floor((today.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
        const yearsOfMembership = diffInDays / 365.25;
        
        // Log calculation components for debugging
        console.log('Calculation components:', {
          participationRate: fixedParticipationRate,
          participationValue: Math.round(fixedParticipationRate * 1000),
          yearsOfMembership: yearsOfMembership,
          membershipValue: Math.round(yearsOfMembership * 100),
          ageValue: member.age,
          totalValue: Math.round(fixedParticipationRate * 1000) + Math.round(yearsOfMembership * 100) + member.age,
          scoreValue: (Math.round(fixedParticipationRate * 1000) + Math.round(yearsOfMembership * 100) + member.age) / 1000
        });
        
        // Calculate score using formula:
        // (participationRate * 1000 + yearsOfMembership * 100 + age) / 1000
        // Usando o tempo de associação em anos com peso 100
        const participationValue = Math.round(fixedParticipationRate * 1000);
        const membershipValue = Math.round(yearsOfMembership * 100); // Tempo em anos * 100
        const ageValue = member.age;
        
        // Log para depuração (apenas para o Bruno)
        if (member.name.includes('Bruno')) {
          console.log('Dados do sócio Bruno:');
          console.log('Taxa de participação:', fixedParticipationRate);
          console.log('Valor da participação:', participationValue);
          console.log('Tempo de associação em anos:', yearsOfMembership.toFixed(3));
          console.log('Valor do tempo de associação:', membershipValue);
          console.log('Idade:', ageValue);
          console.log('Valor total:', participationValue + membershipValue + ageValue);
          console.log('Pontuação final:', (participationValue + membershipValue + ageValue) / 1000);
        }
        
        const totalValue = participationValue + membershipValue + ageValue;
        const scoreValue = totalValue / 1000;
        
        participantStatsMap[memberId].points = Number(scoreValue.toFixed(2));
      }
      
      // Sort participants by points (descending)
      const sortedParticipants = Object.values(participantStatsMap)
        .sort((a, b) => b.points - a.points)
        .map((participant, index) => ({
          ...participant,
          points: participant.points,
          position: index + 1
        }));
      
      return sortedParticipants;
    } catch (error) {
      console.error('Error in fetchParticipationRanking:', error);
      throw error;
    }
  }
};
