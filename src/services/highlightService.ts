import { supabase } from "@/integrations/supabase/client";

export interface GameHighlight {
  id: string;
  game_id: string;
  member_id: string | null;
  votes_count: number;
  is_winner: boolean;
  created_at: string;
  updated_at: string;
  member?: {
    name: string;
    nickname: string | null;
    photo_url: string | null;
    birth_date?: string | null;
  };
  game?: {
    date: string;
    location: string;
    club_id: string;
  };
}

export interface HighlightVote {
  id: string;
  game_id: string;
  voter_id: string;
  voted_for: string;
  created_at: string;
}

export const highlightService = {
  // Buscar todos os highlights de vários jogos de uma vez (em lote)
  async getHighlightsForGames(gameIds: string[]): Promise<GameHighlight[]> {
    if (!gameIds.length) return [];
    const { data, error } = await supabase
      .from('game_highlights')
      .select(`
        *,
        member:member_id (
          name,
          nickname,
          photo_url,
          birth_date
        ),
        game:game_id (
          date,
          location,
          club_id
        )
      `)
      .in('game_id', gameIds);
    if (error) throw error;
    return data || [];
  },
  // Inicializar os destaques para um jogo
  async initializeHighlights(gameId: string, participantIds: string[]): Promise<void> {
    console.log("Initializing highlights for game", gameId, "with participants", participantIds);
    
    if (!gameId || !participantIds.length) return;
    
    // Verificar se já existem registros para esse jogo
    const { data: existingHighlights } = await supabase
      .from('game_highlights')
      .select('id')
      .eq('game_id', gameId);
      
    if (existingHighlights && existingHighlights.length > 0) {
      console.log("Highlights already initialized for this game");
      return;
    }
    
    // Criar um registro para cada participante
    const highlightsToInsert = participantIds.map(memberId => ({
      game_id: gameId,
      member_id: memberId,
      votes_count: 0,
      is_winner: false
    }));
    
    const { error } = await supabase
      .from('game_highlights')
      .insert(highlightsToInsert);
      
    if (error) {
      console.error("Error initializing highlights:", error);
      throw error;
    }
    
    console.log("Highlights initialized successfully");
  },
  
  // Buscar os destaques de um jogo
  async getGameHighlights(gameId: string): Promise<GameHighlight[]> {
    console.log("Fetching highlights for game", gameId);
    
    const { data, error } = await supabase
      .from('game_highlights')
      .select(`
        id,
        game_id,
        member_id,
        votes_count,
        is_winner,
        created_at,
        updated_at,
        member:member_id (
          name,
          nickname,
          photo_url,
          birth_date
        ),
        game:games!inner(
          date,
          location,
          club_id
        )
      `)
      .eq('game_id', gameId)
      .order('votes_count', { ascending: false });
      
    if (error) {
      console.error("Error fetching game highlights:", error);
      throw error;
    }
    
    return (data || []) as GameHighlight[];
  },
  
  // Verificar se um membro já votou em um jogo
  async hasVoted(gameId: string, voterId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('game_highlight_votes')
      .select('id')
      .eq('game_id', gameId)
      .eq('voter_id', voterId);
      
    if (error) {
      console.error("Error checking if member has voted:", error);
      throw error;
    }
    
    return data && data.length > 0;
  },
  
  // Verificar se a votação foi finalizada
  async isVotingFinalized(gameId: string): Promise<boolean> {
    // Verificar se existe uma entrada específica na tabela game_voting_control
    // indicando que a votação foi finalizada manualmente
    const { data: controlData, error: controlError } = await supabase
      .from('game_voting_control')
      .select('is_finalized')
      .eq('game_id', gameId)
      .single();
      
    if (controlError && controlError.code !== 'PGRST116') { // Ignore "not found" errors
      console.error("Error checking voting control:", controlError);
      throw controlError;
    }
    
    // Se encontrar um registro de controle e is_finalized for true, a votação está finalizada
    if (controlData && controlData.is_finalized) {
      return true;
    }
    
    // Verificar se existe um vencedor definitivo
    const { data: winnerData, error: winnerError } = await supabase
      .from('game_highlights')
      .select('is_winner')
      .eq('game_id', gameId)
      .eq('is_winner', true);
      
    if (winnerError) {
      console.error("Error checking if voting is finalized:", winnerError);
      throw winnerError;
    }
    
    // Agora, apenas considerar finalizada se existir um vencedor E houver um controle indicando que
    // a votação foi finalizada manualmente
    return winnerData && winnerData.length > 0 && controlData && controlData.is_finalized;
  },
  
  // Registrar um voto
  async voteForMember(gameId: string, voterId: string, votedForId: string): Promise<void> {
    console.log("Registering vote:", { gameId, voterId, votedForId });
    
    // Verificar se a votação já foi finalizada
    const votingFinalized = await this.isVotingFinalized(gameId);
    if (votingFinalized) {
      throw new Error("A votação já foi finalizada");
    }
    
    // Verificar se o votante já votou
    const hasAlreadyVoted = await this.hasVoted(gameId, voterId);
    if (hasAlreadyVoted) {
      throw new Error("Você já votou nesta partida");
    }
    
    // Registrar o voto sem atualizar is_winner automaticamente
    const { error: voteError } = await supabase.from('game_highlight_votes').insert({
      game_id: gameId,
      voter_id: voterId,
      voted_for: votedForId
    });
    
    if (voteError) {
      console.error("Error registering vote:", voteError);
      throw voteError;
    }
    
    // Obter o registro de destaque do jogador votado
    const { data: highlights, error: getError } = await supabase
      .from('game_highlights')
      .select('id, votes_count')
      .eq('game_id', gameId)
      .eq('member_id', votedForId)
      .single();
      
    if (getError) {
      console.error("Error getting highlight record:", getError);
      throw getError;
    }
    
    // Incrementar a contagem de votos do jogador votado
    const newVoteCount = (highlights.votes_count || 0) + 1;
    const { error: updateError } = await supabase
      .from('game_highlights')
      .update({
        votes_count: newVoteCount
      })
      .eq('game_id', gameId)
      .eq('member_id', votedForId);
    
    if (updateError) {
      console.error("Error updating vote count:", updateError);
      throw updateError;
    }
    
    console.log("Vote registered successfully");
  },
  
  // Buscar o vencedor de um jogo
  async getWinner(gameId: string): Promise<GameHighlight | null> {
    try {
      // Primeiro, buscar todos os destaques do jogo
      const { data: highlights, error } = await supabase
        .from('game_highlights')
        .select(`
          *,
          member:member_id (
            name,
            nickname,
            photo_url,
            birth_date
          ),
          game:game_id (
            date,
            location,
            club_id
          )
        `)
        .eq('game_id', gameId)
        .order('votes_count', { ascending: false });

      if (error) throw error;

      if (!highlights || highlights.length === 0) {
        return null;
      }

      // Verificar se já existe um vencedor marcado
      const savedWinner = highlights.find(h => h.is_winner === true);
      if (savedWinner) {
        return savedWinner;
      }

      // Se não houver vencedor marcado, determinar com base nos votos e idade
      const topVoteCount = Math.max(...highlights.map(h => h.votes_count || 0));
      
      // Se não houver votos, não há vencedor
      if (topVoteCount === 0) {
        return null;
      }

      // Filtrar jogadores com a maior quantidade de votos
      const topPlayers = highlights.filter(h => h.votes_count === topVoteCount);
      
      // Se houver apenas um jogador com o maior número de votos, ele é o vencedor
      if (topPlayers.length === 1) {
        return topPlayers[0];
      }

      // Em caso de empate, ordenar por idade (mais velho primeiro)
      return [...topPlayers].sort((a, b) => {
        if (!a.member?.birth_date) return 1;
        if (!b.member?.birth_date) return -1;
        
        const dateA = new Date(a.member.birth_date).getTime();
        const dateB = new Date(b.member.birth_date).getTime();
        
        return dateA - dateB;
      })[0];
    } catch (error) {
      console.error('Error getting game winner:', error);
      return null;
    }
  },
  
  // Finalizar a votação de um jogo e definir o vencedor
  async finalizeVoting(gameId: string): Promise<void> {
    try {
      // Primeiro buscar o vencedor
      const winner = await this.getWinner(gameId);
      
      if (!winner) {
        throw new Error('Não foi possível determinar um vencedor para este jogo.');
      }

      // 0. Verificar se existe um registro de controle
      const { data: existingControl } = await supabase
        .from('game_voting_control')
        .select('id')
        .eq('game_id', gameId)
        .single();

      // 1. Criar ou atualizar o registro de controle
      console.log('Atualizando game_voting_control para game_id:', gameId);
      let controlResult;
      
      if (existingControl) {
        // Atualizar registro existente
        controlResult = await supabase
          .from('game_voting_control')
          .update({
            is_finalized: true,
            finalized_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('game_id', gameId)
          .select()
          .single();
      } else {
        // Criar novo registro
        controlResult = await supabase
          .from('game_voting_control')
          .insert({
            game_id: gameId,
            is_finalized: true,
            finalized_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      if (controlResult.error) {
        console.error('Error updating voting control:', controlResult.error);
        throw controlResult.error;
      }

      console.log('Resultado da atualização:', controlResult.data);

      // 2. Depois marcar o vencedor
      const { error: updateError } = await supabase
        .from('game_highlights')
        .update({ is_winner: true })
        .eq('id', winner.id);

      if (updateError) {
        console.error('Error updating winner:', updateError);
        throw updateError;
      }

      // 3. Verificar se as atualizações foram bem sucedidas
      console.log('Verificando atualização do game_voting_control');
      const { data: verifyControl, error: verifyError } = await supabase
        .from('game_voting_control')
        .select('*')
        .eq('game_id', gameId)
        .single();

      console.log('Resultado da verificação:', verifyControl);

      if (verifyError) {
        console.error('Erro ao verificar controle:', verifyError);
        throw verifyError;
      }

      if (!verifyControl || verifyControl.is_finalized !== true) {
        console.error('Estado atual do controle:', verifyControl);
        throw new Error('Falha ao persistir o status de finalização da votação.');
      }

      const { data: verifyWinner } = await supabase
        .from('game_highlights')
        .select('is_winner')
        .eq('id', winner.id)
        .single();

      if (!verifyWinner?.is_winner) {
        throw new Error('Falha ao persistir o vencedor da votação.');
      }

    } catch (error) {
      console.error('Error finalizing voting:', error);
      throw error;
    }
  },
  
  // Buscar todos os votos de um jogo
  async getVotes(gameId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('game_highlight_votes')
      .select(`
        *,
        voter:voter_id (
          name,
          nickname
        ),
        voted_for_member:voted_for (
          name,
          nickname
        )
      `)
      .eq('game_id', gameId);
      
    if (error) {
      console.error("Error fetching votes:", error);
      throw error;
    }
    
    return data || [];
  },
  
  // Excluir a votação de um jogo
  async deleteVoting(gameId: string): Promise<void> {
    if (!gameId) throw new Error("ID do jogo é obrigatório");

    // Excluir o controle de votação primeiro
    const { error: controlError } = await supabase
      .from('game_voting_control')
      .delete()
      .eq('game_id', gameId);

    if (controlError && controlError.code !== 'PGRST116') {
      console.error("Erro ao excluir controle de votação:", controlError);
      throw controlError;
    }

    // Excluir os votos
    const { error: votesError } = await supabase
      .from('game_highlight_votes')
      .delete()
      .eq('game_id', gameId);

    if (votesError) {
      console.error("Erro ao excluir votos:", votesError);
      throw votesError;
    }

    // Por fim, excluir os destaques
    const { error: highlightsError } = await supabase
      .from('game_highlights')
      .delete()
      .eq('game_id', gameId);

    if (highlightsError) {
      console.error("Erro ao excluir destaques:", highlightsError);
      throw highlightsError;
    }
  },
  
  // Reabrir a votação de um jogo
  async reopenVoting(gameId: string): Promise<void> {
    if (!gameId) throw new Error("ID do jogo é obrigatório");

    // Excluir o controle de votação primeiro para "desbloquear" a votação
    const { error: controlError } = await supabase
      .from('game_voting_control')
      .delete()
      .eq('game_id', gameId);

    if (controlError && controlError.code !== 'PGRST116') {
      console.error("Erro ao excluir controle de votação:", controlError);
      throw controlError;
    }

    // Excluir os votos existentes
    const { error: votesError } = await supabase
      .from('game_highlight_votes')
      .delete()
      .eq('game_id', gameId);

    if (votesError) {
      console.error("Erro ao excluir votos:", votesError);
      throw votesError;
    }

    // Excluir os destaques existentes
    const { error: highlightsError } = await supabase
      .from('game_highlights')
      .delete()
      .eq('game_id', gameId);

    if (highlightsError) {
      console.error("Erro ao excluir destaques:", highlightsError);
      throw highlightsError;
    }

    // Buscar participantes confirmados do jogo
    const { data: participants, error: participantsError } = await supabase
      .from('game_participants')
      .select('member_id')
      .eq('game_id', gameId)
      .eq('status', 'confirmed');

    if (participantsError) {
      console.error("Erro ao buscar participantes:", participantsError);
      throw participantsError;
    }

    // Reinicializar os destaques com os participantes atuais
    const participantIds = participants.map(p => p.member_id);
    await this.initializeHighlights(gameId, participantIds);
  },
};
