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

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameDate?: string;
  gameStatus?: string;
}

const ConfirmationModal = ({ isOpen, onClose, gameId, gameDate, gameStatus }: ConfirmationModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamFormation, setShowTeamFormation] = useState(false);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'confirmed' | 'declined' | 'unconfirmed'>('confirmed');
  
  const confirmed = members.filter(m => m.status === 'confirmed');
  const declined = members.filter(m => m.status === 'declined');
  const unconfirmed = members.filter(m => m.status === 'unconfirmed');

  // Verifica se o jogo está agendado
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

    try {
      // Check if there's already an entry for this member in this game
      const { data: existingEntry } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', gameId)
        .eq('member_id', memberId)
        .single();
      
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('game_participants')
          .update({ status: 'confirmed' })
          .eq('game_id', gameId)
          .eq('member_id', memberId);
        
        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('game_participants')
          .insert([
            { 
              game_id: gameId, 
              member_id: memberId, 
              status: 'confirmed' 
            }
          ]);
        
        if (error) throw error;
      }
      
      // Update local state
      setMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, status: 'confirmed' } 
            : member
        )
      );
      
      toast({
        title: "Confirmação registrada",
        description: "O jogador foi adicionado à lista de confirmados",
      });
    } catch (error: any) {
      console.error('Error confirming participation:', error);
      toast({
        variant: "destructive",
        title: "Erro ao confirmar participação",
        description: error.message || "Não foi possível confirmar a participação",
      });
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

    try {
      // Check if there's already an entry for this member in this game
      const { data: existingEntry } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', gameId)
        .eq('member_id', memberId)
        .single();
      
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('game_participants')
          .update({ status: 'declined' })
          .eq('game_id', gameId)
          .eq('member_id', memberId);
        
        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('game_participants')
          .insert([
            { 
              game_id: gameId, 
              member_id: memberId, 
              status: 'declined' 
            }
          ]);
        
        if (error) throw error;
      }
      
      // Update local state
      setMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, status: 'declined' } 
            : member
        )
      );
      
      toast({
        title: "Recusa registrada",
        description: "O jogador foi adicionado à lista de ausentes",
      });
    } catch (error: any) {
      console.error('Error declining participation:', error);
      toast({
        variant: "destructive",
        title: "Erro ao recusar participação",
        description: error.message || "Não foi possível recusar a participação",
      });
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
    
    console.log('Opening team formation with confirmed players:', confirmed.length);
    console.log('Confirmed players:', confirmed);
    setShowTeamFormation(true);
  };

  const handleShareList = async () => {
    try {
      // Get actual member names/nicknames for the list
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

  // Format date without timezone issues
  const formattedDate = gameDate 
    ? (() => {
        // Parse the date properly without timezone adjustments
        const [year, month, day] = gameDate.split('T')[0].split('-').map(Number);
        // Create a new date with just the year, month, day components
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
      })()
    : 'Data não especificada';

  const handleCloseTeamFormation = () => {
    setShowTeamFormation(false);
  };

  // Render a player card for mobile
  const renderPlayerCard = (member: Member, actionButton: React.ReactNode) => (
    <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm mb-2">
      <span className="truncate max-w-[160px]">{member.nickname}</span>
      {actionButton}
    </div>
  );

  useEffect(() => {
    if (!isOpen || !gameId || !user?.activeClub?.id) return;
    
    const fetchMembers = async () => {
      setLoading(true);
      try {
        console.log('Fetching members for game:', gameId, 'and club:', user.activeClub.id);
        
        // Fetch all club members with status 'Ativo' or 'Sistema'
        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('id, nickname')
          .eq('club_id', user.activeClub.id)
          .in('status', ['Ativo', 'Sistema']);
        
        if (membersError) throw membersError;
        console.log('Fetched members:', membersData?.length);
        
        // Fetch existing participants for this game
        const { data: participantsData, error: participantsError } = await supabase
          .from('game_participants')
          .select('member_id, status')
          .eq('game_id', gameId);
        
        if (participantsError) throw participantsError;
        console.log('Fetched participants:', participantsData?.length);
        
        // Map existing participants
        const participantsMap = new Map();
        participantsData?.forEach(participant => {
          participantsMap.set(participant.member_id, participant.status);
        });
        
        // Combine data and set default status as 'unconfirmed'
        const combinedMembers = membersData?.map(member => ({
          id: member.id,
          nickname: member.nickname || member.id,
          status: (participantsMap.get(member.id) || 'unconfirmed') as 'confirmed' | 'declined' | 'unconfirmed'
        })) || [];
        
        console.log('Combined members:', combinedMembers.length);
        console.log('Confirmed members:', combinedMembers.filter(m => m.status === 'confirmed').length);
        
        setMembers(combinedMembers);
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
              <div className={`flex gap-2 ${isMobile ? "flex-wrap mt-2" : ""}`}>
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className={isMobile ? "h-8 w-8" : ""}
                >
                  <X className={`${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
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
                // Mobile layout
                <div className="flex flex-col gap-4 mt-2">
                  {/* Tabs for mobile view - now with click handlers */}
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
                  
                  {/* Content for active tab - now renders different content based on activeTab */}
                  <div className="min-h-[300px] max-h-[50vh] overflow-y-auto p-1">
                    {/* Confirmed players tab */}
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
                    
                    {/* Declined players tab */}
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
                    
                    {/* Unconfirmed players tab */}
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
                // Desktop layout
                <div className="grid grid-cols-3 gap-4">
                  {/* Confirmed Players */}
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
                  
                  {/* Declined Players */}
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
                  
                  {/* Unconfirmed Players */}
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

      {/* Team Formation Modal */}
      {showTeamFormation && (
        <TeamFormationModal
          isOpen={showTeamFormation}
          onClose={handleCloseTeamFormation}
          gameId={gameId}
          gameData={{
            title: `Jogo de ${formattedDate}`,
            location: "Local do jogo",
            date: gameDate || new Date().toISOString()
          }}
          confirmedPlayers={confirmed}
        />
      )}
    </>
  );
};

export default ConfirmationModal;
