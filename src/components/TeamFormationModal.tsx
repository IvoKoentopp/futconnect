import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Users, UserPlus, UserMinus, Goal, BarChart2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GameStatisticsModal } from './GameStatisticsModal';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfirmedPlayer {
  id: string;
  nickname: string;
}

interface TeamFormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameData: {
    title: string;
    location: string;
    date: string;
    status: string;
  };
  confirmedPlayers: ConfirmedPlayer[];
}

interface TeamFormation {
  id: string;
  game_id: string;
  is_active: boolean;
  created_at: string;
}

interface TeamMember {
  id: string;
  member_id: string;
  team_formation_id: string;
  team: string;
}

interface PlayerWithTeam extends ConfirmedPlayer {
  team?: string;
}

interface TeamConfiguration {
  id: string;
  team_name: string;
  team_color: string;
}

const TeamFormationModal = ({ isOpen, onClose, gameId, gameData, confirmedPlayers }: TeamFormationModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamFormation, setTeamFormation] = useState<TeamFormation | null>(null);
  const [playersWithTeam, setPlayersWithTeam] = useState<PlayerWithTeam[]>([]);
  const [isStatisticsModalOpen, setIsStatisticsModalOpen] = useState(false);
  const [teamConfigurations, setTeamConfigurations] = useState<TeamConfiguration[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Verifica se o jogo está agendado
  const canUpdateTeams = gameData.status.toLowerCase() === 'agendado';
  
  // Format date for display
  const formattedDate = new Date(gameData.date).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Load team configurations and formation data
  useEffect(() => {
    if (isOpen && gameId) {
      loadTeamConfigurations();
    }
  }, [isOpen, gameId]);

  // Load team configurations
  const loadTeamConfigurations = async () => {
    try {
      // Get the club_id from the game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('club_id')
        .eq('id', gameId)
        .single();

      if (gameError) {
        console.error('Error loading game:', gameError);
        throw gameError;
      }

      const clubId = gameData.club_id;

      // Get the team configurations
      const { data: configData, error: configError } = await supabase
        .from('team_configurations')
        .select('*')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (configError) {
        console.error('Error loading team configurations:', configError);
        throw configError;
      }

      // If no team configurations, create default ones
      if (!configData || configData.length === 0) {
        const defaultTeams = [
          { team_name: 'white', team_color: '#ffffff' },
          { team_name: 'green', team_color: '#4ade80' }
        ];

        for (const team of defaultTeams) {
          await supabase
            .from('team_configurations')
            .insert({
              club_id: clubId,
              team_name: team.team_name,
              team_color: team.team_color
            });
        }

        // Fetch again
        const { data: newConfigData } = await supabase
          .from('team_configurations')
          .select('*')
          .eq('club_id', clubId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        setTeamConfigurations(newConfigData || []);
      } else {
        setTeamConfigurations(configData);
      }

      // Now load team formation
      loadTeamFormation();
    } catch (error) {
      console.error('Error loading team configurations:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações de times."
      });
      setIsLoading(false);
    }
  };

  const loadTeamFormation = async () => {
    setIsLoading(true);
    try {
      console.log('Loading team formation for game:', gameId);
      console.log('Confirmed players received:', confirmedPlayers.length);
      console.log('Confirmed players data:', confirmedPlayers);
      
      // Get or create team formation
      const { data: existingFormation, error: formationError } = await supabase
        .from('team_formations')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (formationError) {
        console.error('Error loading team formation:', formationError);
        throw formationError;
      }
      
      let formationId: string;
      
      if (!existingFormation) {
        console.log('Creating new team formation');
        const { data: newFormation, error: createError } = await supabase
          .from('team_formations')
          .insert({
            game_id: gameId,
            is_active: true
          })
          .select()
          .single();
        
        if (createError || !newFormation) {
          console.error('Error creating team formation:', createError);
          throw createError;
        }
        
        setTeamFormation(newFormation);
        formationId = newFormation.id;
      } else {
        console.log('Found existing team formation:', existingFormation);
        setTeamFormation(existingFormation);
        formationId = existingFormation.id;
      }
      
      // Get team members
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_formation_id', formationId);
      
      if (membersError) {
        console.error('Error loading team members:', membersError);
        throw membersError;
      }
      
      console.log('Team members loaded:', teamMembers);
      
      // Map confirmedPlayers with team assignments
      const mappedPlayers = confirmedPlayers.map(player => {
        const teamMember = teamMembers?.find(member => member.member_id === player.id);
        return {
          ...player,
          team: teamMember?.team
        };
      });
      
      console.log('Mapped players with team assignments:', mappedPlayers);
      setPlayersWithTeam(mappedPlayers);
    } catch (error) {
      console.error('Failed to load team formation:', error);
      toast({
        title: "Erro ao carregar formação de times",
        description: "Não foi possível carregar a formação de times atual.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToTeam = async (playerId: string, teamName: string) => {
    if (!teamFormation) return;

    // Não permite nenhuma alteração se o jogo não está agendado
    if (!canUpdateTeams) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Só é possível formar times em jogos agendados.",
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log('Assigning player to team:', { playerId, teamName, formationId: teamFormation.id });
      
      // Validate if playerId is a valid UUID
      if (!isValidUUID(playerId)) {
        console.error('Invalid player ID format:', playerId);
        toast({
          title: "Erro ao atribuir jogador",
          description: "ID de jogador inválido. Entre em contato com o suporte.",
          variant: "destructive",
        });
        return;
      }
      
      // Encontrar a configuração do time selecionado
      const teamConfig = teamConfigurations.find(
        config => config.team_name === teamName || 
                 (teamName === 'Time Branco' && config.team_name === 'white') ||
                 (teamName === 'Time Verde' && config.team_name === 'green')
      );
      
      if (!teamConfig && teamName !== 'unassigned') { // Permite teamName vazio apenas se o jogo estiver agendado
        console.error(`Configuração do time não encontrada: ${teamName}`);
        toast({
          title: "Erro ao atribuir jogador",
          description: "Configuração de time inválida. Entre em contato com o suporte.",
          variant: "destructive",
        });
        return;
      }
      
      // Usar o team_name do banco de dados para salvar
      const dbTeamValue = teamConfig?.team_name || '';
      
      console.log(`Usando valor do banco de dados para o time: '${dbTeamValue}'`);
      
      // Check if player is already assigned to a team
      const { data: existingMember, error: checkError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_formation_id', teamFormation.id)
        .eq('member_id', playerId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking team member:', checkError);
        throw checkError;
      }
      
      if (existingMember) {
        // Delete existing team assignment only if assigning to a new team
        if (teamName !== 'unassigned') {
          const { error: deleteError } = await supabase
            .from('team_members')
            .delete()
            .eq('id', existingMember.id);
          
          if (deleteError) {
            console.error('Error deleting team member:', deleteError);
            throw deleteError;
          }
        }
      }
      
      // Insert a new entry only if assigning to a team (not removing)
      if (teamName !== 'unassigned') {
        const { data: newTeamMember, error: insertError } = await supabase
          .from('team_members')
          .insert({
            team_formation_id: teamFormation.id,
            member_id: playerId,
            team: dbTeamValue
          });
        
        if (insertError) {
          console.error('Error inserting team member:', insertError);
          throw insertError;
        }
      }
      
      // Update local state
      setPlayersWithTeam(prev => 
        prev.map(p => 
          p.id === playerId 
            ? { ...p, team: teamName === 'unassigned' ? undefined : teamName }
            : p
        )
      );
      
      toast({
        title: teamName === 'unassigned' ? "Jogador removido do time" : "Time atualizado",
        description: teamName === 'unassigned' 
          ? "O jogador foi removido do time com sucesso"
          : "O jogador foi atribuído ao time com sucesso",
      });
    } catch (error: any) {
      console.error('Error assigning player to team:', error);
      toast({
        title: "Erro ao atualizar time",
        description: error.message || "Não foi possível atualizar o time do jogador",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFromTeam = async (playerId: string) => {
    if (!teamFormation) return;
    
    try {
      setIsSaving(true);
      console.log('Removing player from team:', { playerId, formationId: teamFormation.id });
      
      // Validate if playerId is a valid UUID
      if (!isValidUUID(playerId)) {
        console.error('Invalid player ID format:', playerId);
        toast({
          title: "Erro ao remover jogador",
          description: "ID de jogador inválido. Entre em contato com o suporte.",
          variant: "destructive",
        });
        return;
      }
      
      // Find team member ID first
      const { data: teamMember, error: findError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_formation_id', teamFormation.id)
        .eq('member_id', playerId)
        .maybeSingle();
      
      if (findError) {
        console.error('Error finding team member:', findError);
        throw findError;
      }
      
      if (!teamMember) {
        console.log('No team member found to remove');
        // Update local state anyway in case of inconsistency
        setPlayersWithTeam(players => 
          players.map(player => 
            player.id === playerId 
              ? { ...player, team: undefined } 
              : player
          )
        );
        return;
      }
      
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', teamMember.id);
      
      if (error) {
        console.error('Error removing team member:', error);
        throw error;
      }
      
      // Update local state
      setPlayersWithTeam(players => 
        players.map(player => 
          player.id === playerId 
            ? { ...player, team: undefined } 
            : player
        )
      );
      
      toast({
        title: "Jogador removido",
        description: "Jogador removido do time com sucesso.",
      });
    } catch (error) {
      console.error('Failed to remove player from team:', error);
      toast({
        title: "Erro ao remover jogador",
        description: "Não foi possível remover o jogador do time.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to validate UUID format
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };
  
  const getUnassignedPlayers = () => {
    return playersWithTeam.filter(player => !player.team);
  };
  
  const getTeamPlayers = (teamName: string) => {
    return playersWithTeam.filter(player => player.team === teamName);
  };
  
  const unassignedPlayers = getUnassignedPlayers();
  
  const handleOpenStatisticsModal = () => {
    setIsStatisticsModalOpen(true);
  };

  // Helper function to convert database team value to display name
  const getDisplayTeamName = (dbTeamValue: string): string => {
    if (dbTeamValue === 'white') return 'Time Branco';
    if (dbTeamValue === 'green') return 'Time Verde';
    
    // Para outros times, use o nome direto da configuração
    const teamConfig = teamConfigurations.find(
      config => config.team_name === dbTeamValue
    );
    
    // Se encontrar configuração, use o nome dela, caso contrário retorne o valor original
    return teamConfig ? teamConfig.team_name : dbTeamValue;
  };

  // Helper function to convert display team name to database value
  const getDatabaseTeamValue = (displayName: string): string => {
    if (displayName === 'Time Branco') return 'white';
    if (displayName === 'Time Verde') return 'green';
    return displayName.toLowerCase();
  };

  // Render a player card
  const renderPlayerCard = (player: PlayerWithTeam, teamName: string | null) => {
    const isTeamCard = teamName !== null;
    
    // Se for um card de time, encontre a configuração do time pelo nome de exibição
    let teamConfig = null;
    if (isTeamCard) {
      if (teamName === 'Time Branco') {
        teamConfig = teamConfigurations.find(t => t.team_name === 'white');
      } else if (teamName === 'Time Verde') {
        teamConfig = teamConfigurations.find(t => t.team_name === 'green');
      } else {
        teamConfig = teamConfigurations.find(t => t.team_name === teamName);
      }
    }
    
    const bgColorClass = isTeamCard 
      ? `bg-white` 
      : 'hover:bg-gray-50';
    
    const teamColor = teamConfig?.team_color || '#ffffff';
    
    return (
      <div 
        key={`${teamName ?? 'unassigned'}-${player.id}`} 
        className={`flex items-center justify-between p-2 border rounded-md ${bgColorClass} ${isMobile ? 'mb-2' : ''}`}
        style={isTeamCard ? { borderLeft: `4px solid ${teamColor}` } : {}}
      >
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
            <AvatarFallback>{player.nickname.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm sm:text-base">{player.nickname}</span>
        </div>
        
        {isTeamCard ? (
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleRemoveFromTeam(player.id)}
            title="Remover do time"
            disabled={isSaving || !canUpdateTeams}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center">
            {teamConfigurations.length > 0 ? (
              <TooltipProvider>
                <div className="flex gap-1">
                  {teamConfigurations.map((team) => (
                    <Tooltip key={team.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:opacity-80"
                          onClick={() => handleAssignToTeam(player.id, team.team_name)}
                          disabled={!canUpdateTeams || isSaving}
                          style={{ 
                            backgroundColor: team.team_color,
                            border: team.team_color === '#ffffff' ? '1px solid #e5e7eb' : 'none'
                          }}
                        >
                          <UserPlus className={`h-3 w-3 sm:h-4 sm:w-4 ${team.team_color === '#ffffff' ? 'text-gray-600' : 'text-white'}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adicionar ao {team.team_name === 'white' ? 'Time Branco' : 
                           team.team_name === 'green' ? 'Time Verde' : team.team_name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            ) : (
              <p className="text-xs text-gray-500">Carregando times...</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Determine if there are any players in teams
  const hasAssignedPlayers = teamConfigurations.some(
    team => playersWithTeam.some(player => {
      // Converter nomes de exibição para nomes internos ao verificar
      const displayName = player.team;
      if (!displayName) return false;
      
      let internalName = displayName;
      if (displayName === 'Time Branco') internalName = 'white';
      if (displayName === 'Time Verde') internalName = 'green';
      
      return team.team_name === internalName || team.team_name === displayName;
    })
  );
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`${isMobile ? 'w-[95vw] p-3 sm:p-4' : 'max-w-5xl'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="text-xl">Formação de Times</DialogTitle>
            <div className="text-gray-500 text-sm mt-1">
              <p className="truncate">Jogo: {gameData.title} em {gameData.location} ({formattedDate})</p>
              <p className="mt-1">Jogadores confirmados: {confirmedPlayers.length}</p>
            </div>
          </DialogHeader>
          
          {/* Aviso quando o jogo não está agendado */}
          {!canUpdateTeams && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-md mb-4">
              <ShieldAlert className="h-5 w-5" />
              <p>Não é possível alterar os times pois o jogo não está mais agendado.</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
              <span className="ml-3 text-gray-600">Carregando formação de times...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {confirmedPlayers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum jogador confirmado para este jogo.</p>
                  <p className="text-gray-500 mt-2">Confirme a presença dos jogadores antes de formar os times.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="outline"
                      className="text-futconnect-600 border-futconnect-600 hover:bg-futconnect-50"
                      onClick={handleOpenStatisticsModal}
                      disabled={!hasAssignedPlayers}
                    >
                      <BarChart2 className="h-4 w-4 mr-2" />
                      {isMobile ? "" : "Estatísticas do Jogo"}
                    </Button>
                  </div>
                  
                  {isMobile ? (
                    // Mobile layout - vertical stacking
                    <div className="space-y-6">
                      {/* Team sections */}
                      {teamConfigurations.map(team => {
                        // Convert database team name to display name
                        const displayName = getDisplayTeamName(team.team_name);
                        
                        return (
                          <div 
                            key={team.id}
                            className="border rounded-md bg-white p-3 sm:p-4"
                            style={{ borderLeft: `4px solid ${team.team_color}` }}
                          >
                            <h3 className="font-semibold mb-4 flex items-center"
                                style={{ color: team.team_color !== '#ffffff' ? team.team_color : '#333' }}>
                              <Users className="mr-2 h-5 w-5" /> 
                              {displayName} ({getTeamPlayers(displayName).length})
                            </h3>
                            
                            <div className="space-y-2 min-h-[300px] sm:min-h-[400px] max-h-[300px] sm:max-h-[400px] overflow-y-auto p-1">
                              {getTeamPlayers(displayName).length === 0 ? (
                                <p className="text-gray-500 italic text-center p-4">
                                  Nenhum jogador neste time
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {getTeamPlayers(displayName).map(player => 
                                    renderPlayerCard(player, displayName)
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Jogadores Não Alocados (Unassigned Players) */}
                      <div className="border rounded-md bg-white p-3 sm:p-4">
                        <h3 className="font-semibold mb-4 flex items-center">
                          <Users className="mr-2 h-5 w-5" /> 
                          Jogadores Não Alocados ({unassignedPlayers.length})
                        </h3>
                        
                        <div className="space-y-2 min-h-[300px] sm:min-h-[400px] max-h-[300px] sm:max-h-[400px] overflow-y-auto p-1">
                          {unassignedPlayers.length === 0 ? (
                            <p className="text-gray-500 italic text-center p-4">
                              Todos os jogadores foram alocados
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {unassignedPlayers.map(player => renderPlayerCard(player, null))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Desktop layout - grid (dynamic based on team count + unassigned)
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Team sections */}
                      {teamConfigurations.map(team => {
                        // Convert database team name to display name
                        const displayName = getDisplayTeamName(team.team_name);
                        
                        return (
                          <div 
                            key={team.id}
                            className="border rounded-md bg-white p-3 sm:p-4"
                            style={{ borderLeft: `4px solid ${team.team_color}` }}
                          >
                            <h3 className="font-semibold mb-4 flex items-center"
                                style={{ color: team.team_color !== '#ffffff' ? team.team_color : '#333' }}>
                              <Users className="mr-2 h-5 w-5" /> 
                              {displayName} ({getTeamPlayers(displayName).length})
                            </h3>
                            
                            <div className="space-y-2 min-h-[300px] sm:min-h-[400px] max-h-[300px] sm:max-h-[400px] overflow-y-auto p-1">
                              {getTeamPlayers(displayName).length === 0 ? (
                                <p className="text-gray-500 italic text-center p-4">
                                  Nenhum jogador neste time
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {getTeamPlayers(displayName).map(player => 
                                    renderPlayerCard(player, displayName)
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Jogadores Não Alocados (Unassigned Players) */}
                      <div className="border rounded-md bg-white p-3 sm:p-4">
                        <h3 className="font-semibold mb-4 flex items-center">
                          <Users className="mr-2 h-5 w-5" /> 
                          Jogadores Não Alocados ({unassignedPlayers.length})
                        </h3>
                        
                        <div className="space-y-2 min-h-[300px] sm:min-h-[400px] max-h-[300px] sm:max-h-[400px] overflow-y-auto p-1">
                          {unassignedPlayers.length === 0 ? (
                            <p className="text-gray-500 italic text-center p-4">
                              Todos os jogadores foram alocados
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {unassignedPlayers.map(player => renderPlayerCard(player, null))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {isStatisticsModalOpen && (
        <GameStatisticsModal
          isOpen={isStatisticsModalOpen}
          onClose={() => setIsStatisticsModalOpen(false)}
          gameId={gameId}
        />
      )}
    </>
  );
};

export default TeamFormationModal;
