import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Share2 } from 'lucide-react';

interface MemberAbsence {
  memberId: string;
  nickname: string;
  consecutiveMisses: number;
  missedDates: string[];
}

const GameAbsenceAlerts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [generatedMessage, setGeneratedMessage] = useState('');

  const { data: absences, isLoading } = useQuery({
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryKey: ['absences'],
    queryFn: async () => {
      try {
        // 1. Buscar os últimos 10 jogos completados
        const { data: recentGames } = await supabase
          .from('games')
          .select('id, date')
          .eq('club_id', user.activeClub.id)
          .eq('status', 'completed')
          .order('date', { ascending: false })
          .limit(10);

        if (!recentGames?.length) return [];

        const lastGame = recentGames[0];

        // 2. Buscar todos os membros ativos do clube
        const { data: activeMembers } = await supabase
          .from('members')
          .select('id, nickname')
          .eq('club_id', user.activeClub.id)
          .eq('status', 'Ativo');

        if (!activeMembers?.length) return [];

        // 3. Buscar participantes confirmados do último jogo
        const { data: confirmedParticipants } = await supabase
          .from('game_participants')
          .select('member_id')
          .eq('game_id', lastGame.id)
          .eq('status', 'confirmed');

        // Criar um Set com os IDs dos membros confirmados para busca rápida
        const confirmedMemberIds = new Set(
          confirmedParticipants?.map(p => p.member_id) || []
        );

        // 4. Identificar membros ausentes (não confirmados)
        const lastGameAbsences = activeMembers.filter(
          member => !confirmedMemberIds.has(member.id)
        ).map(member => ({
          member_id: member.id,
          members: {
            nickname: member.nickname,
            status: 'Ativo'
          }
        }));

        if (!lastGameAbsences?.length) return [];

        // Filtrar apenas membros ativos
        const activeAbsences = lastGameAbsences.filter(
          absence => absence.members?.nickname && absence.members?.status === 'Ativo'
        );

        // 3. Para cada ausente do último jogo, buscar faltas consecutivas
        const absencesList: MemberAbsence[] = [];

        for (const absence of activeAbsences) {
          let consecutiveMisses = 1; // Começa com 1 (falta do último jogo)
          const missedDates = [new Date(lastGame.date).toLocaleDateString()]; // Começa com a data do último jogo

          // Buscar jogos anteriores até encontrar uma presença
          const { data: previousGames } = await supabase
            .from('games')
            .select(`
              id,
              date,
              game_participants!inner(status)
            `)
            .eq('club_id', user.activeClub.id)
            .eq('game_participants.member_id', absence.member_id)
            .lt('date', lastGame.date)
            .order('date', { ascending: false });

          if (previousGames) {
            for (const game of previousGames) {
              const { data: participation } = await supabase
                .from('game_participants')
                .select('status')
                .eq('game_id', game.id)
                .eq('member_id', absence.member_id)
                .eq('status', 'confirmed')
                .single();

              if (!participation) {
                consecutiveMisses++;
                missedDates.push(new Date(game.date).toLocaleDateString());
              } else {
                break; // Para de contar quando encontra uma presença
              }
            }
          }

          absencesList.push({
            memberId: absence.member_id,
            nickname: absence.members.nickname,
            consecutiveMisses,
            missedDates
          });
        }

        return absencesList.sort((a, b) => b.consecutiveMisses - a.consecutiveMisses);

      } catch (error) {
        console.error('Error fetching absences:', error);
        return [];
      }
    }
  });

  const generateWhatsAppMessage = () => {
    if (!absences?.length) {
      toast({
        title: "Sem Ausências",
        description: "Não há ausências para gerar alerta.",
        variant: "destructive"
      });
      return;
    }

    const intro = `Alerta de Ausências - ${user.activeClub.name}\n\nOlá pessoal! Notamos importantes ausências recentes:\n\n`;
    const messages = absences
      .map(member => 
        `${getAlertEmoji(member.consecutiveMisses)} ${member.nickname} - ${member.consecutiveMisses} ${member.consecutiveMisses === 1 ? 'jogo' : 'jogos'} sem participar`
      );
    const outro = "\n\nSentimos sua falta! Contamos com vocês nos próximos jogos! 😊⚽";
    
    setGeneratedMessage(`${intro}${messages.join('\n')}${outro}`);
    
    toast({
      title: "Mensagem Gerada!",
      description: "A mensagem foi gerada e está pronta para ser copiada.",
    });
  };

  const shareViaWhatsApp = () => {
    if (!generatedMessage) {
      toast({
        title: "Sem mensagem",
        description: "Gere a mensagem primeiro antes de compartilhar.",
        variant: "destructive"
      });
      return;
    }

    const message = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const getAlertEmoji = (misses: number) => {
    if (misses >= 4) return '🔴'; // Círculo vermelho
    if (misses >= 2) return '🟡'; // Círculo amarelo
    return '🟢'; // Círculo verde
  };

  const getAlertColor = (misses: number) => {
    if (misses >= 4) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (misses >= 2) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Alertas de Ausência</CardTitle>
          <Button
            onClick={generateWhatsAppMessage}
            disabled={!absences || absences.length === 0}
            variant="outline"
          >
            Gerar Alerta
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Lista de Ausências */}
            <div className="space-y-2">
              {absences?.map((member) => (
                <div
                  key={member.memberId}
                  className={`flex flex-col p-2 rounded ${getAlertColor(member.consecutiveMisses)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{member.nickname}</span>
                    <span>
                      {member.consecutiveMisses} {member.consecutiveMisses === 1 ? 'falta' : 'faltas'} consecutivas
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Datas: {member.missedDates.join(', ')}
                  </div>
                </div>
              ))}
              {(!absences || absences.length === 0) && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma ausência consecutiva encontrada.
                </p>
              )}
            </div>

            {generatedMessage && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Mensagem Gerada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="whitespace-pre-wrap p-4 bg-gray-100 dark:bg-gray-800 rounded">
                      {generatedMessage}
                    </div>
                    <Button onClick={shareViaWhatsApp} className="w-full">
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar no WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameAbsenceAlerts;
