import { supabase } from "@/integrations/supabase/client";
import { Game, GameParticipant, GameWithParticipants, GameEvent, GameEventWithMember } from "@/types/game";

export const gameService = {
  async fetchGames(clubId: string, year?: string): Promise<GameWithParticipants[]> {
    // Fetch games
    let query = supabase
      .from('games')
      .select('*')
      .eq('club_id', clubId);

    // Se um ano específico foi fornecido, filtra por ele
    if (year && year !== 'all') {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: games, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching games:', error);
      throw error;
    }

    // Fetch participants for all games
    const gameIds = games.map(game => game.id);
    const { data: participants, error: participantsError } = await supabase
      .from('game_participants')
      .select('*, members(id, nickname)')
      .in('game_id', gameIds);

    if (participantsError) {
      console.error('Error fetching game participants:', participantsError);
      throw participantsError;
    }

    // Combine games with participant data and ensure types match our definitions
    const gamesWithParticipants: GameWithParticipants[] = games.map(game => {
      const gameParticipants = participants.filter(p => p.game_id === game.id);
      
      // Ensure status is one of the expected string literals
      const status = validateGameStatus(game.status);
      
      // Get confirmed players with their nicknames
      const confirmedPlayers = gameParticipants
        .filter(p => p.status === 'confirmed')
        .map(p => ({
          id: p.member_id,
          nickname: p.members?.nickname || 'Unknown'
        }));
      
      return {
        ...game,
        status,
        participants: {
          confirmed: gameParticipants.filter(p => p.status === 'confirmed').length,
          declined: gameParticipants.filter(p => p.status === 'declined').length,
          unconfirmed: gameParticipants.filter(p => p.status === 'unconfirmed').length,
          confirmed_players: confirmedPlayers
        }
      } as GameWithParticipants;
    });

    return gamesWithParticipants;
  },

  async initializeGameParticipants(gameId: string, clubId: string): Promise<void> {
    try {
      // 1. Buscar todos os membros ativos do clube
      const { data: activeMembers, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('club_id', clubId)
        .in('status', ['Ativo', 'Sistema']);

      if (membersError) throw membersError;
      if (!activeMembers?.length) return;

      // 2. Criar registros de participação com status 'unconfirmed'
      const participantRecords = activeMembers.map(member => ({
        game_id: gameId,
        member_id: member.id,
        status: 'unconfirmed'
      }));

      const { error: insertError } = await supabase
        .from('game_participants')
        .insert(participantRecords);

      if (insertError) throw insertError;

    } catch (error) {
      console.error('Error initializing game participants:', error);
      // Não propagar o erro para não afetar a criação do jogo
    }
  },

  async createGame(gameData: any, clubId: string): Promise<Game> {
    // Instead of creating a new Date, use the date directly as provided
    // This avoids any timezone conversion issues
    const { data, error } = await supabase
      .from('games')
      .insert([{
        club_id: clubId,
        title: `Jogo em ${gameData.location}`,
        location: gameData.location,
        date: gameData.date, // Use the date string directly without conversion
        status: gameData.status,
        description: gameData.description,
        cancel_reason: gameData.cancelReason
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      throw error;
    }

    // Ensure status is one of the expected string literals
    const game = {
      ...data,
      status: validateGameStatus(data.status)
    } as Game;

    // Inicializar participantes após criar o jogo
    // Não aguardamos a conclusão para não atrasar a resposta
    this.initializeGameParticipants(game.id, clubId);

    return game;
  },

  async updateGame(gameId: string, gameData: any): Promise<Game> {
    // Use the date directly as provided without any timezone conversion
    const { data, error } = await supabase
      .from('games')
      .update({
        location: gameData.location,
        date: gameData.date, // Use the date string directly
        status: gameData.status,
        description: gameData.description,
        cancel_reason: gameData.cancelReason
      })
      .eq('id', gameId)
      .select()
      .single();

    if (error) {
      console.error('Error updating game:', error);
      throw error;
    }

    // Ensure status is one of the expected string literals
    const game = {
      ...data,
      status: validateGameStatus(data.status)
    } as Game;

    return game;
  },

  async deleteGame(gameId: string): Promise<void> {
    // Verificar o status do jogo antes de deletar
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('status')
      .eq('id', gameId)
      .single();

    if (fetchError) {
      console.error('Error fetching game:', fetchError);
      throw fetchError;
    }

    if (game.status !== 'scheduled') {
      throw new Error('Apenas jogos com status Agendado podem ser deletados.');
    }

    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  },

  async fetchParticipants(gameId: string): Promise<GameParticipant[]> {
    console.log('Fetching participants for game:', gameId);
    const { data, error } = await supabase
      .from('game_participants')
      .select('*, members(name, nickname)')
      .eq('game_id', gameId);

    if (error) {
      console.error('Error fetching game participants:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} participants for game ${gameId}`);
    
    // Transform data to match our GameParticipant type
    const participants: GameParticipant[] = data.map(item => {
      return {
        id: item.id,
        game_id: item.game_id,
        member_id: item.member_id,
        status: validateParticipantStatus(item.status),
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    });

    return participants;
  },
  
  async fetchEligibleMembers(clubId: string): Promise<any[]> {
    console.log('Fetching eligible members for club:', clubId);
    // Fetch members with status 'Ativo' or 'Sistema'
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('club_id', clubId)
      .in('status', ['Ativo', 'Sistema']);

    if (error) {
      console.error('Error fetching eligible members:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} eligible members for club ${clubId}`);
    return data;
  },

  async updateParticipantStatus(gameId: string, memberId: string, status: string): Promise<void> {
    // Validate status before sending to the database
    const validatedStatus = validateParticipantStatus(status);
    
    const { error } = await supabase
      .from('game_participants')
      .update({ status: validatedStatus })
      .match({ game_id: gameId, member_id: memberId });

    if (error) {
      console.error('Error updating participant status:', error);
      throw error;
    }
  },
  
  // Fixed methods for game events
  
  async fetchGameEvents(gameId: string): Promise<GameEventWithMember[]> {
    console.log('Fetching game events for game:', gameId);
    const { data, error } = await supabase
      .from('game_events')
      .select(`*, members(name, nickname)`)
      .eq('game_id', gameId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching game events:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} game events for game ${gameId}`);
    
    // Transform data to match our GameEventWithMember type
    const events: GameEventWithMember[] = data.map(item => {
      // Map database event_type to frontend event_type
      let eventType: 'goal' | 'own_goal' | 'save';
      if (item.event_type === 'own-goal') {
        eventType = 'own_goal'; // Convert from database format to frontend format
      } else {
        eventType = item.event_type as 'goal' | 'save';
      }

      return {
        id: item.id,
        game_id: item.game_id,
        member_id: item.member_id,
        event_type: eventType,
        team: item.team, // Store the original team value from database
        timestamp: item.timestamp,
        created_at: item.created_at,
        member: {
          name: item.members?.name,
          nickname: item.members?.nickname
        }
      };
    });
    
    return events;
  },
  
  async recordGameEvent(eventData: Partial<GameEvent>): Promise<GameEvent> {
    console.log('Recording game event:', eventData);
    
    // Ensure that event_type and team are provided
    if (!eventData.event_type || !eventData.team || !eventData.game_id || !eventData.member_id) {
      throw new Error('Event type, team_id, game_id, and member_id are required');
    }
    
    // Ensure event_type is a valid value
    const validEventTypes = ['goal', 'own_goal', 'save'];
    if (!validEventTypes.includes(eventData.event_type)) {
      console.error(`Invalid event type: ${eventData.event_type}. Valid types are: ${validEventTypes.join(', ')}`);
      throw new Error(`Invalid event type: ${eventData.event_type}`);
    }
    
    try {
      // Map frontend event_type to database format
      let dbEventType: string;
      if (eventData.event_type === 'own_goal') {
        dbEventType = 'own-goal'; // Use format expected by database
        console.log('Converting own_goal to own-goal for database compatibility');
      } else {
        dbEventType = eventData.event_type;
      }
      
      // Use the team directly - constraint has been removed
      console.log(`Using team value "${eventData.team}" directly`);
      
      // Create a properly typed event object
      const eventToRecord = {
        game_id: eventData.game_id,
        member_id: eventData.member_id,
        event_type: dbEventType,
        team: eventData.team, // Use the team as provided
        timestamp: new Date().toISOString()
      };
      
      // Log the exact object being sent to Supabase
      console.log('Sending to Supabase:', eventToRecord);
      
      const { data, error } = await supabase
        .from('game_events')
        .insert([eventToRecord])
        .select()
        .single();
      
      if (error) {
        console.error('Error recording game event:', error);
        throw error;
      }
      
      console.log('Game event recorded successfully:', data);
      
      // Convert back to frontend format for consistency
      let frontendEventType: 'goal' | 'own_goal' | 'save';
      if (data.event_type === 'own-goal') {
        frontendEventType = 'own_goal';
      } else {
        frontendEventType = data.event_type as 'goal' | 'save';
      }
      
      // Ensure the returned data matches our GameEvent type
      const event: GameEvent = {
        id: data.id,
        game_id: data.game_id,
        member_id: data.member_id,
        event_type: frontendEventType,
        team: data.team,
        timestamp: data.timestamp,
        created_at: data.created_at
      };
      
      return event;
    } catch (error) {
      console.error('Failed to record game event:', error);
      throw error;
    }
  },
  
  async deleteGameEvent(eventId: string): Promise<void> {
    console.log('Deleting game event:', eventId);
    
    const { error } = await supabase
      .from('game_events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      console.error('Error deleting game event:', error);
      throw error;
    }
    
    console.log('Game event deleted successfully');
  },
  
  async updateGameScore(gameId: string, homeScore: number, awayScore: number): Promise<Game> {
    console.log('Updating game score:', { gameId, homeScore, awayScore });
    
    const { data, error } = await supabase
      .from('games')
      .update({
        home_score: homeScore,
        away_score: awayScore
      })
      .eq('id', gameId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating game score:', error);
      throw error;
    }
    
    console.log('Game score updated:', data);
    
    // Ensure status is one of the expected string literals
    const game = {
      ...data,
      status: validateGameStatus(data.status)
    } as Game;
    
    return game;
  }
};

// Helper functions
function validateGameStatus(status: string): 'scheduled' | 'completed' | 'canceled' {
  if (status === 'scheduled' || status === 'completed' || status === 'canceled') {
    return status;
  }
  console.warn(`Invalid game status: ${status}, defaulting to 'scheduled'`);
  return 'scheduled';
}

function validateParticipantStatus(status: string): 'confirmed' | 'declined' | 'unconfirmed' {
  if (status === 'confirmed' || status === 'declined' || status === 'unconfirmed') {
    return status;
  }
  console.warn(`Invalid participant status: ${status}, defaulting to 'unconfirmed'`);
  return 'unconfirmed';
}
