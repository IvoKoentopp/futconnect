import { supabase } from '@/integrations/supabase/client';

export const participationService = {
  async getGameParticipationStats(gameId: string) {
    try {
      // Busca todos os participantes com seus status e informações de membro
      const { data: participants, error } = await supabase
        .from('game_participants')
        .select('status, members(id, status)')
        .eq('game_id', gameId);

      if (error) throw error;

      // Filtra participantes excluindo membros com status "Sistema"
      const filteredParticipants = participants.filter(p => p.members?.status !== 'Sistema');

      // Conta confirmados e recusados
      const stats = filteredParticipants.reduce((acc, p) => {
        if (p.status === 'confirmed') acc.confirmed++;
        else if (p.status === 'declined') acc.declined++;
        return acc;
      }, { confirmed: 0, declined: 0 });

      return stats;
    } catch (error) {
      console.error('Error getting participation stats:', error);
      return { confirmed: 0, declined: 0 };
    }
  }
};
