import { supabase } from '@/integrations/supabase/client';

interface Game {
  id: string;
  title: string;
  location: string;
  date: string;
  status: string;
}

export const shareParticipants = async (gameId: string) => {
  try {
    console.log('Iniciando compartilhamento de participantes para o jogo:', gameId);

    // Busca os detalhes do jogo
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('date, location, title, status')
      .eq('id', gameId)
      .single();

    if (gameError) {
      console.error('Erro ao buscar detalhes do jogo:', gameError);
      throw gameError;
    }

    const game = gameData as Game;
    console.log('Detalhes do jogo:', game);

    // Busca os participantes com detalhes
    const { data: participants, error: participantsError } = await supabase
      .from('game_participants')
      .select(`
        id,
        status,
        member_id,
        members (
          id,
          nickname,
          name
        )
      `)
      .eq('game_id', gameId);

    if (participantsError) {
      console.error('Erro ao buscar participantes:', participantsError);
      throw participantsError;
    }

    // Busca todos os membros ativos do clube
    const { data: allMembers, error: membersError } = await supabase
      .from('members')
      .select('id, nickname, name')
      .eq('status', 'active');

    if (membersError) {
      console.error('Erro ao buscar membros:', membersError);
      throw membersError;
    }

    console.log('Participantes encontrados:', participants);
    console.log('Todos os membros:', allMembers);

    // Cria um Set com os IDs dos membros que já responderam
    const respondedMemberIds = new Set(
      participants.map(p => p.member_id)
    );

    console.log('IDs dos membros que já responderam:', Array.from(respondedMemberIds));

    // Agrupa participantes por status
    const confirmedParticipants = participants
      .filter(p => p.status === 'confirmed')
      .map(p => p.members?.nickname || p.members?.name || 'Sem apelido');

    const declinedParticipants = participants
      .filter(p => p.status === 'declined')
      .map(p => p.members?.nickname || p.members?.name || 'Sem apelido');

    // Filtra membros pendentes (que não responderam ainda)
    const pendingParticipants = allMembers
      .filter(member => !respondedMemberIds.has(member.id))
      .map(member => member.nickname || member.name || 'Sem apelido');

    console.log('Confirmados:', confirmedParticipants);
    console.log('Recusados:', declinedParticipants);
    console.log('Pendentes:', pendingParticipants);

    // Formata a data
    const formattedDate = game.date
      ? new Date(game.date).toLocaleDateString('pt-BR')
      : 'Data não informada';

    const formattedTime = game.date
      ? new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';

    // Formata as listas
    const confirmedText = confirmedParticipants.length > 0
      ? `Confirmados (${confirmedParticipants.length}): ${confirmedParticipants.join(', ')}`
      : 'Nenhum jogador confirmado';

    const declinedText = declinedParticipants.length > 0
      ? `Não vão jogar (${declinedParticipants.length}): ${declinedParticipants.join(', ')}`
      : 'Nenhum jogador recusou';

    const pendingText = pendingParticipants.length > 0
      ? `Não informaram (${pendingParticipants.length}): ${pendingParticipants.join(', ')}`
      : 'Todos os jogadores informaram';

    // Cria a mensagem
    const message = encodeURIComponent(
      `📋 *${game.title || 'Jogo'} - ${formattedDate} às ${formattedTime}*\n` +
      `📍 *Local:* ${game.location}\n\n` +
      `${confirmedText}\n\n` +
      `${declinedText}\n\n` +
      `${pendingText}`
    );

    console.log('Mensagem formatada:', decodeURIComponent(message));

    // Abre o WhatsApp com a mensagem
    window.open(`https://wa.me/?text=${message}`, '_blank');

    console.log('WhatsApp aberto com sucesso');
  } catch (error) {
    console.error('Erro detalhado ao compartilhar participantes:', error);
    throw error;
  }
};
