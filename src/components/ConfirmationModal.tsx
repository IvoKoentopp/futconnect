import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, UserCheck, UserX, User, Share2, ShieldAlert } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import TeamFormationModal from './TeamFormationModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface Member {
  id: string;
  nickname: string;
  status: 'confirmed' | 'declined' | 'unconfirmed';
}

interface Game {
  id: string;
  title: string;
  location: string;
  date: string;
  status: string;
  club_id: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  userId: string;
  gameStatus: string;
  onConfirmation?: () => void;
  gameDate?: string;
}

export const handleShareParticipants = async (gameId: string) => {
  try {
    console.log('Iniciando compartilhamento de participantes para o jogo:', gameId);

    // Busca detalhes do jogo
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('date, location, title, status, club_id')
      .eq('id', gameId)
      .single();

    if (gameError) {
      console.error('Erro ao buscar detalhes do jogo:', gameError);
      throw gameError;
    }

    const game = gameData as Game;
    console.log('Detalhes do jogo:', game);

    // Busca todos os membros ativos do clube
    const { data: allMembers, error: membersError } = await supabase
      .from('members')
      .select('id, nickname, name')
      .eq('club_id', game.club_id)
      .in('status', ['Ativo', 'Sistema']);

    if (membersError) {
      console.error('Erro ao buscar membros:', membersError);
      throw membersError;
    }

    console.log('Membros ativos encontrados:', allMembers);

    // Busca os participantes do jogo
    const { data: participants, error: participantsError } = await supabase
      .from('game_participants')
      .select('member_id, status, members(nickname, name)')
      .eq('game_id', gameId);

    if (participantsError) {
      console.error('Erro ao buscar participantes:', participantsError);
      throw participantsError;
    }

    console.log('Participantes encontrados:', participants);

    // Cria um Map dos participantes para fácil acesso
    const participantsMap = new Map(
      participants.map(p => [p.member_id, p])
    );

    // Filtra os membros por status
    const confirmedParticipants = participants
      .filter(p => p.status === 'confirmed')
      .map(p => p.members?.nickname || p.members?.name || 'Sem apelido');

    const declinedParticipants = participants
      .filter(p => p.status === 'declined')
      .map(p => p.members?.nickname || p.members?.name || 'Sem apelido');

    // Identifica os membros pendentes (que não responderam)
    const pendingParticipants = allMembers
      .filter(member => !participantsMap.has(member.id))
      .map(member => member.nickname || member.name || 'Sem apelido');

    console.log('Confirmados:', confirmedParticipants);
    console.log('Recusados:', declinedParticipants);
    console.log('Pendentes:', pendingParticipants);

    const formattedDate = game.date
      ? new Date(game.date).toLocaleDateString('pt-BR')
      : 'Data não informada';

    const formattedTime = game.date
      ? new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';

    const confirmedText = confirmedParticipants.length > 0
      ? `Confirmados (${confirmedParticipants.length}): ${confirmedParticipants.join(', ')}`
      : 'Nenhum jogador confirmado';

    const declinedText = declinedParticipants.length > 0
      ? `Não vão jogar (${declinedParticipants.length}): ${declinedParticipants.join(', ')}`
      : 'Nenhum jogador recusou';

    const pendingText = pendingParticipants.length > 0
      ? `Não informaram (${pendingParticipants.length}): ${pendingParticipants.join(', ')}`
      : 'Todos os jogadores informaram';

    const message = encodeURIComponent(
      `📋 *${game.title || 'Jogo'} - ${formattedDate} às ${formattedTime}*\n` +
      `📍 *Local:* ${game.location}\n\n` +
      `${confirmedText}\n\n` +
      `${declinedText}\n\n` +
      `${pendingText}`
    );

    console.log('Mensagem formatada:', decodeURIComponent(message));

    window.open(`https://wa.me/?text=${message}`, '_blank');

    console.log('WhatsApp aberto com sucesso');
  } catch (error) {
    console.error('Erro detalhado ao compartilhar participantes:', error);
    throw error;
  }
};

const ConfirmationModal = ({ isOpen, onClose, gameId, userId, gameStatus, onConfirmation, gameDate }: ConfirmationModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamFormation, setShowTeamFormation] = useState(false);
  const [gameTitle, setGameTitle] = useState<string>('');
  const [gameLocation, setGameLocation] = useState<string>('');
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'confirmed' | 'declined' | 'unconfirmed'>('confirmed');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const confirmed = members.filter(m => m.status === 'confirmed');
  const declined = members.filter(m => m.status === 'declined');
  const unconfirmed = members.filter(m => m.status === 'unconfirmed');

  const canUpdateParticipation = gameStatus === 'Agendado';

  const handleConfirm = async (memberId: string) => {
    if (!canUpdateParticipation) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Só é possível confirmar presença em jogos agendados.",
      });
      return;
    }

    setIsConfirming(true);
    try {
      console.log('Iniciando confirmação para o jogo:', gameId);

      const { data: existingEntry, error: checkError } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', gameId)
        .eq('member_id', memberId)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar participação existente:', checkError);
        throw checkError;
      }

      console.log('Participação existente:', existingEntry);

      if (existingEntry) {
        const { error: updateError } = await supabase
          .from('game_participants')
          .update({ status: 'confirmed' })
          .eq('id', existingEntry.id);

        if (updateError) {
          console.error('Erro ao atualizar participação:', updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('game_participants')
          .insert({
            game_id: gameId,
            member_id: memberId,
            status: 'confirmed'
          });

        if (insertError) {
          console.error('Erro ao criar participação:', insertError);
          throw insertError;
        }
      }

      toast({
        title: "Confirmação registrada",
        description: "O jogador foi adicionado à lista de confirmados",
      });

      // Atualiza o estado e notifica o componente pai
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, status: 'confirmed' } : m
      ));
      onConfirmation?.();

    } catch (error: any) {
      console.error('Erro detalhado ao confirmar participação:', error);
      toast({
        variant: "destructive",
        title: "Erro ao confirmar participação",
        description: error.message || "Não foi possível confirmar a participação",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDecline = async (memberId: string) => {
    if (!canUpdateParticipation) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Só é possível recusar presença em jogos agendados.",
      });
      return;
    }

    setIsDeclining(true);
    try {
      console.log('Iniciando recusa para o jogo:', gameId);

      // 1. Primeiro encontra a formação de time ativa
      const { data: teamFormations, error: teamFormationsError } = await supabase
        .from('team_formations')
        .select('id')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .limit(1);

      if (teamFormationsError) {
        console.error('Erro ao buscar formação de time:', teamFormationsError);
        throw teamFormationsError;
      }

      // 2. Se houver uma formação ativa, remove o jogador dela
      if (teamFormations && teamFormations.length > 0) {
        const teamFormationId = teamFormations[0].id;
        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_formation_id', teamFormationId)
          .eq('member_id', memberId);

        if (deleteError) {
          console.error('Erro ao remover jogador do time:', deleteError);
          throw deleteError;
        }
      }

      // 3. Atualiza o status do participante
      const { data: existingParticipation, error: checkError } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', gameId)
        .eq('member_id', memberId)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar participação existente:', checkError);
        throw checkError;
      }

      console.log('Participação existente:', existingParticipation);

      if (existingParticipation) {
        const { error: updateError } = await supabase
          .from('game_participants')
          .update({ status: 'declined' })
          .eq('id', existingParticipation.id);

        if (updateError) {
          console.error('Erro ao atualizar participação:', updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('game_participants')
          .insert({
            game_id: gameId,
            member_id: memberId,
            status: 'declined'
          });

        if (insertError) {
          console.error('Erro ao criar participação:', insertError);
          throw insertError;
        }
      }

      toast({
        title: "Ausência registrada",
        description: "O jogador foi removido do time e adicionado à lista de ausentes",
      });

      // Atualiza o estado e notifica o componente pai
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, status: 'declined' } : m
      ));
      onConfirmation?.();

    } catch (error: any) {
      console.error('Erro detalhado ao recusar participação:', error);
      toast({
        variant: "destructive",
        title: "Erro ao recusar participação",
        description: error.message || "Não foi possível recusar a participação",
      });
    } finally {
      setIsDeclining(false);
    }
  };

  const handleFormTeams = () => {
    if (confirmed.length < 2) {
      toast({
        title: "Jogadores insuficientes",
        description: "É necessário ter pelo menos 2 jogadores confirmados para formar times",
        variant: "destructive"
      });
      return;
    }

    setShowTeamFormation(true);
  };

  const handleShareList = async () => {
    try {
      const confirmedNames = confirmed.map(m => m.nickname).join(', ');
      const declinedNames = declined.map(m => m.nickname).join(', ');
      
      const confirmedText = confirmed.length > 0 
        ? `Confirmados (${confirmed.length}): ${confirmedNames}` 
        : 'Nenhum jogador confirmado';
      
      const declinedText = declined.length > 0 
        ? `Não vão jogar (${declined.length}): ${declinedNames}` 
        : 'Nenhum jogador recusou';
      
      const unconfirmedText = unconfirmed.length > 0 
        ? `Não informaram (${unconfirmed.length}): ${unconfirmed.map(m => m.nickname).join(', ')}` 
        : 'Todos os jogadores informaram';
      
      const formattedDate = gameDate 
        ? new Date(gameDate).toLocaleDateString('pt-BR') 
        : 'Data não informada';
      
      const message = encodeURIComponent(
        `Participantes - ${formattedDate}\n\n${confirmedText}\n\n${declinedText}\n\n${unconfirmedText}`
      );
      
      window.open(`https://wa.me/?text=${message}`, '_blank');
    } catch (error) {
      console.error('Error sharing list:', error);
      toast({
        title: "Erro ao compartilhar lista",
        description: "Não foi possível compartilhar a lista de participantes",
        variant: "destructive"
      });
    }
  };



  const formattedDate = gameDate 
    ? (() => {
        const [year, month, day] = gameDate.split('T')[0].split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
      })()
    : 'Data não especificada';

  const handleCloseTeamFormation = () => {
    setShowTeamFormation(false);
  };

  const renderPlayerCard = (member: Member, actionButton: React.ReactNode) => (
    <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm mb-2">
      <span className="truncate max-w-[160px]">{member.nickname}</span>
      {actionButton}
    </div>
  );

  useEffect(() => {
    if (!isOpen || !gameId || !user?.activeClub?.id) return;
    
    const loadGameData = async () => {
      try {
        const { data: game, error } = await supabase
          .from('games')
          .select('title, location')
          .eq('id', gameId)
          .single();

        if (error) throw error;

        setGameTitle(game.title || '');
        setGameLocation(game.location || '');
      } catch (error) {
        console.error('Error loading game data:', error);
      }
    };

    const fetchMembers = async () => {
      setLoading(true);
      try {
        console.log('Fetching participants for game:', gameId);
        
        // Buscar apenas os participantes do jogo com informações do membro
        const { data: participantsData, error: participantsError } = await supabase
          .from('game_participants')
          .select(`
            id,
            member_id,
            status,
            members (id, nickname)
          `)
          .eq('game_id', gameId);
        
        if (participantsError) throw participantsError;
        console.log('Fetched participants:', participantsData?.length);
        
        // Transformar os dados para o formato esperado pelo componente
        const formattedMembers = participantsData?.map(participant => ({
          id: participant.member_id,
          nickname: participant.members?.nickname || participant.member_id,
          status: participant.status as 'confirmed' | 'declined' | 'unconfirmed'
        })) || [];
        
        console.log('Formatted members:', formattedMembers.length);
        console.log('Confirmed members:', formattedMembers.filter(m => m.status === 'confirmed').length);
        
        setMembers(formattedMembers);
      } catch (error: any) {
        console.error('Error loading members:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar membros",
          description: error.message || "Não foi possível carregar os membros do clube",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadGameData();
    fetchMembers();
  }, [isOpen, gameId, user?.activeClub?.id, toast]);

  return (
    <>
      <Dialog open={isOpen && !showTeamFormation} onOpenChange={onClose}>
        <DialogContent className={isMobile ? "w-[95vw] max-w-full p-4" : "max-w-3xl"}>
          <DialogHeader>
            <DialogTitle className={`text-xl flex ${isMobile ? "flex-col gap-2" : "items-center justify-between"}`}>
              <span className="truncate">{isMobile ? "Participantes" : `Participantes - ${formattedDate}`}</span>
              {isMobile && <span className="text-sm text-muted-foreground">{formattedDate}</span>}
              <div className={`flex gap-2 ${isMobile ? "flex-wrap mt-2" : ""} mr-8`}>
                <Button 
                  variant="action"
                  onClick={handleFormTeams}
                  className={isMobile ? "text-sm px-2 h-8 flex-1" : ""}
                >
                  <UserCheck className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
                  {isMobile ? "Times" : "Formar Times"}
                </Button>
                <Button 
                  variant="share"
                  onClick={handleShareList}
                  className={isMobile ? "text-sm px-2 h-8 flex-1" : ""}
                >
                  <Share2 className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
                  {isMobile ? "Compartilhar" : "Compartilhar Lista"}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futconnect-600"></div>
            </div>
          ) : (
            <>
              {isMobile ? (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex border-b">
                    <div 
                      className={`flex-1 text-center py-2 border-b-2 ${
                        activeTab === 'confirmed' 
                          ? 'border-futconnect-600 font-medium text-futconnect-600' 
                          : 'border-transparent text-muted-foreground'
                      } cursor-pointer`}
                      onClick={() => setActiveTab('confirmed')}
                    >
                      <div className="flex items-center justify-center">
                        <UserCheck className="h-4 w-4 mr-1" />
                        <span>Confirmados ({confirmed.length})</span>
                      </div>
                    </div>
                    <div 
                      className={`flex-1 text-center py-2 border-b-2 ${
                        activeTab === 'declined' 
                          ? 'border-futconnect-600 font-medium text-futconnect-600' 
                          : 'border-transparent text-muted-foreground'
                      } cursor-pointer`}
                      onClick={() => setActiveTab('declined')}
                    >
                      <div className="flex items-center justify-center">
                        <UserX className="h-4 w-4 mr-1" />
                        <span>Recusados ({declined.length})</span>
                      </div>
                    </div>
                    <div 
                      className={`flex-1 text-center py-2 border-b-2 ${
                        activeTab === 'unconfirmed' 
                          ? 'border-futconnect-600 font-medium text-futconnect-600' 
                          : 'border-transparent text-muted-foreground'
                      } cursor-pointer`}
                      onClick={() => setActiveTab('unconfirmed')}
                    >
                      <div className="flex items-center justify-center">
                        <User className="h-4 w-4 mr-1" />
                        <span>Pendentes ({unconfirmed.length})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="min-h-[300px] max-h-[50vh] overflow-y-auto p-1">
                    {activeTab === 'confirmed' && (
                      <>
                        {confirmed.length > 0 ? (
                          <div className="space-y-1">
                            {confirmed.map(member => 
                              renderPlayerCard(member, 
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-1 h-8 w-8 text-accent-foreground hover:bg-accent/10"
                                  onClick={() => handleDecline(member.id)}
                                  disabled={!canUpdateParticipation}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-muted-foreground italic p-4 text-center">
                            Nenhum jogador confirmado
                          </div>
                        )}
                      </>
                    )}
                    
                    {activeTab === 'declined' && (
                      <>
                        {declined.length > 0 ? (
                          <div className="space-y-1">
                            {declined.map(member => 
                              renderPlayerCard(member, 
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-1 h-8 w-8 text-futconnect-600 hover:bg-futconnect-50"
                                  onClick={() => handleConfirm(member.id)}
                                  disabled={!canUpdateParticipation}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-muted-foreground italic p-4 text-center">
                            Nenhum jogador recusou
                          </div>
                        )}
                      </>
                    )}
                    
                    {activeTab === 'unconfirmed' && (
                      <>
                        {unconfirmed.length > 0 ? (
                          <div className="space-y-1">
                            {unconfirmed.map(member => 
                              renderPlayerCard(member, 
                                <div className="flex space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-1 h-8 w-8 text-futconnect-600 hover:bg-futconnect-50"
                                    onClick={() => handleConfirm(member.id)}
                                    disabled={!canUpdateParticipation}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-1 h-8 w-8 text-accent-foreground hover:bg-accent/10"
                                    onClick={() => handleDecline(member.id)}
                                    disabled={!canUpdateParticipation}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-muted-foreground italic p-4 text-center">
                            Todos os jogadores responderam
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-futconnect-50 rounded-md p-4 border border-futconnect-200">
                    <div className="flex items-center mb-4 text-futconnect-700 font-medium">
                      <UserCheck className="mr-2 h-5 w-5" />
                      Vão Jogar ({confirmed.length})
                    </div>
                    <div className="space-y-2 min-h-[400px] max-h-[400px] overflow-y-auto">
                      {confirmed.length > 0 ? (
                        confirmed.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
                            <span>{member.nickname}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-accent-foreground hover:text-accent-foreground hover:bg-accent/10 p-1 h-8 w-8"
                              onClick={() => handleDecline(member.id)}
                              disabled={!canUpdateParticipation}
                              title="Mudar para não vai jogar"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground italic p-2">
                          Nenhum jogador confirmado
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-accent/20 rounded-md p-4 border border-accent/30">
                    <div className="flex items-center mb-4 text-accent-foreground font-medium">
                      <UserX className="mr-2 h-5 w-5" />
                      Não Vão Jogar ({declined.length})
                    </div>
                    <div className="space-y-2 min-h-[400px] max-h-[400px] overflow-y-auto">
                      {declined.length > 0 ? (
                        declined.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
                            <span>{member.nickname}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-futconnect-600 hover:text-futconnect-700 hover:bg-futconnect-50 p-1 h-8 w-8"
                              onClick={() => handleConfirm(member.id)}
                              disabled={!canUpdateParticipation}
                              title="Mudar para vai jogar"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground italic p-2">
                          Nenhum jogador recusou
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded-md p-4 border border-border">
                    <div className="flex items-center mb-4 text-muted-foreground font-medium">
                      <User className="mr-2 h-5 w-5" />
                      Sem Resposta ({unconfirmed.length})
                    </div>
                    <div className="space-y-2 min-h-[400px] max-h-[400px] overflow-y-auto">
                      {unconfirmed.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm"
                        >
                          <span>{member.nickname}</span>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-futconnect-600 hover:text-futconnect-700 hover:bg-futconnect-50 p-1 h-8 w-8"
                              onClick={() => handleConfirm(member.id)}
                              disabled={!canUpdateParticipation}
                              title="Confirmar presença"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-accent-foreground hover:text-accent-foreground hover:bg-accent/10 p-1 h-8 w-8"
                              onClick={() => handleDecline(member.id)}
                              disabled={!canUpdateParticipation}
                              title="Confirmar ausência"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {unconfirmed.length === 0 && (
                        <div className="text-muted-foreground italic p-2">
                          Todos os jogadores responderam
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {showTeamFormation && (
        <TeamFormationModal
          isOpen={showTeamFormation}
          onClose={handleCloseTeamFormation}
          gameId={gameId}
          gameData={{
            title: gameTitle,
            location: gameLocation,
            date: gameDate || new Date().toISOString(),
            status: gameStatus
          }}
          confirmedPlayers={confirmed}
        />
      )}
    </>
  );
};

export default ConfirmationModal;
