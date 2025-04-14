import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  CalendarPlus, 
  Search, 
  CalendarCheck, 
  CalendarX, 
  Trash2, 
  PenLine, 
  Users, 
  Share2, 
  MessageSquare,
  UserCheck,
  UserX,
  User,
  Loader2,
  BarChart,
  CalendarDays,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { GameFormModal } from '@/components/GameFormModal';
import { useToast } from '@/hooks/use-toast';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmationModal from '@/components/ConfirmationModal';
import { GameWithParticipants } from '@/types/game';
import { gameService } from '@/services/gameService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GameStatisticsModal } from '@/components/GameStatisticsModal';
import TeamFormationModal from '@/components/TeamFormationModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useYearFilter } from '@/hooks/useYearFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let className = '';
  let label = '';
  
  switch (status) {
    case 'scheduled':
      className = 'bg-blue-100 text-blue-800';
      label = 'Agendado';
      break;
    case 'completed':
      className = 'bg-green-100 text-green-800';
      label = 'Realizado';
      break;
    case 'canceled':
      className = 'bg-red-100 text-red-800';
      label = 'Cancelado';
      break;
    default:
      className = 'bg-gray-100 text-gray-800';
      label = status;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
};

const Games = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showGameModal, setShowGameModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameWithParticipants | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedGameForConfirmation, setSelectedGameForConfirmation] = useState<GameWithParticipants | null>(null);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [selectedGameForStatistics, setSelectedGameForStatistics] = useState<GameWithParticipants | null>(null);
  const [showTeamFormation, setShowTeamFormation] = useState(false);
  const [selectedGameForTeamFormation, setSelectedGameForTeamFormation] = useState<GameWithParticipants | null>(null);
  const { user } = useAuth();
  const { canEdit } = useAuthorization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Filtragem por ano
  const { selectedYear, setSelectedYear, availableYears } = useYearFilter(user?.activeClub?.id);

  // Fetch games using react-query
  const {
    data: games = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['games', user?.activeClub?.id, selectedYear],
    queryFn: () => gameService.fetchGames(user?.activeClub?.id || '', selectedYear),
    enabled: !!user?.activeClub?.id,
  });

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: (gameData: any) => {
      if (!canEdit) {
        throw new Error('Apenas administradores podem criar jogos.');
      }
      return gameService.createGame(gameData, user?.activeClub?.id || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast({
        title: "Jogo agendado com sucesso!",
        description: "O novo jogo foi adicionado à lista.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao agendar jogo",
        description: error.message || "Não foi possível agendar o jogo.",
        variant: "destructive",
      });
    }
  });

  // Update game mutation
  const updateGameMutation = useMutation({
    mutationFn: ({ gameId, gameData }: { gameId: string, gameData: any }) => {
      if (!canEdit) {
        throw new Error('Apenas administradores podem editar jogos.');
      }
      return gameService.updateGame(gameId, gameData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast({
        title: "Jogo atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar jogo",
        description: error.message || "Não foi possível atualizar o jogo.",
        variant: "destructive",
      });
    }
  });

  // Delete game mutation
  const deleteGameMutation = useMutation({
    mutationFn: (gameId: string) => {
      if (!canEdit) {
        throw new Error('Apenas administradores podem excluir jogos.');
      }
      return gameService.deleteGame(gameId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast({
        title: "Jogo deletado",
        description: "O jogo foi removido com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar jogo",
        description: error.message || "Não foi possível deletar o jogo.",
        variant: "destructive",
      });
    }
  });

  // Filter games based on search query and active tab
  const filteredGames = games.filter(game => {
    const matchesSearch = game.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'scheduled') return matchesSearch && game.status === 'scheduled';
    if (activeTab === 'completed') return matchesSearch && game.status === 'completed';
    if (activeTab === 'canceled') return matchesSearch && game.status === 'canceled';
    
    return matchesSearch;
  });
  
  // Sort games by date in descending order (newest first)
  const sortedGames = [...filteredGames].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    return dateB.getTime() - dateA.getTime(); // Sort by descending date (newest first)
  });
  
  // Existing handle functions for game actions
  const handleAddGame = (gameData: any) => {
    if (selectedGame) {
      // Update existing game
      updateGameMutation.mutate({
        gameId: selectedGame.id,
        gameData
      });
    } else {
      // Create new game
      createGameMutation.mutate(gameData);
    }

    // Close the modal and clear the selected game
    setShowGameModal(false);
    setSelectedGame(null);
  };

  const handleDeleteGame = (gameId: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem excluir jogos.",
      });
      return;
    }
    deleteGameMutation.mutate(gameId);
  };

  const handleEditGame = (gameId: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem editar jogos.",
      });
      return;
    }
    // Find the game to edit
    const gameToEdit = games.find(game => game.id === gameId);
    if (gameToEdit) {
      setSelectedGame(gameToEdit);
      setShowGameModal(true);
    }
  };

  const handleFormTeams = (gameId: string) => {
    // Find the game to use for team formation
    const gameToView = games.find(game => game.id === gameId);
    if (gameToView) {
      setSelectedGameForTeamFormation(gameToView);
      setShowTeamFormation(true);
    }
  };

  // New function to handle viewing game statistics
  const handleViewStatistics = (gameId: string) => {
    // Find the game to view statistics for
    const gameToView = games.find(game => game.id === gameId);
    if (gameToView) {
      // First set the selected game
      setSelectedGameForStatistics(gameToView);
      // Then show the modal - the teams will be fetched in the modal component
      setShowStatisticsModal(true);
    }
  };

  // Handle sharing participant list with actual participant names
  const handleShareParticipants = async (gameId: string) => {
    // Find the game to use for sharing participants
    const gameToShare = games.find(game => game.id === gameId);
    if (gameToShare) {
      try {
        // Buscar todos os membros ativos do clube para identificar os não confirmados
        const { data: allMembers, error: membersError } = await supabase
          .from('members')
          .select('id, nickname, name')
          .eq('club_id', user?.activeClub?.id)
          .in('status', ['Ativo', 'Sistema']);
        
        if (membersError) throw membersError;
        
        // Fetch actual participants with their details
        const { data: participants, error } = await supabase
          .from('game_participants')
          .select('member_id, status, members(nickname, name)')
          .eq('game_id', gameId);
        
        if (error) throw error;
        
        // Criar um mapa de participantes para fácil acesso
        const participantsMap = new Map();
        participants.forEach(p => {
          participantsMap.set(p.member_id, p);
        });
        
        // Group participants by status
        const confirmedParticipants = participants
          .filter(p => p.status === 'confirmed')
          .map(p => p.members?.nickname || p.members?.name || 'Sem apelido');
        
        const declinedParticipants = participants
          .filter(p => p.status === 'declined')
          .map(p => p.members?.nickname || p.members?.name || 'Sem apelido');
        
        // Identificar membros não confirmados (que não responderam)
        const unconfirmedParticipants = allMembers
          .filter(member => {
            const participant = participantsMap.get(member.id);
            return !participant || participant.status === 'unconfirmed';
          })
          .map(member => member.nickname || member.name || 'Sem apelido');
      
        // Format the participant lists with actual names
        const confirmedText = confirmedParticipants.length > 0 
          ? `Confirmados (${confirmedParticipants.length}): ${confirmedParticipants.join(', ')}` 
          : 'Nenhum jogador confirmado';
        
        const declinedText = declinedParticipants.length > 0 
          ? `Não vão jogar (${declinedParticipants.length}): ${declinedParticipants.join(', ')}` 
          : 'Nenhum jogador recusou';
        
        const unconfirmedText = unconfirmedParticipants.length > 0 
          ? `Não informaram (${unconfirmedParticipants.length}): ${unconfirmedParticipants.join(', ')}` 
          : 'Todos os jogadores informaram';
        
        const formattedDate = gameToShare.date 
          ? new Date(gameToShare.date).toLocaleDateString('pt-BR') 
          : 'Data não informada';
        
        const message = encodeURIComponent(
          `Participantes - ${formattedDate}\n\n${confirmedText}\n\n${declinedText}\n\n${unconfirmedText}`
        );
        
        window.open(`https://wa.me/?text=${message}`, '_blank');
      } catch (error) {
        console.error('Error fetching participants for sharing:', error);
        toast({
          title: "Erro ao compartilhar",
          description: "Não foi possível carregar os detalhes dos participantes",
          variant: "destructive"
        });
      }
    }
  };

  // Updated function to handle sending confirmation via WhatsApp
  const handleSendConfirmation = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) {
      toast({
        title: "Erro",
        description: "Jogo não encontrado",
        variant: "destructive",
      });
      return;
    }

    // Format the game date for display
    const formattedDate = game.date 
      ? new Date(game.date).toLocaleDateString('pt-BR')
      : 'Data não especificada';
    
    // Get the base URL from environment variable
    const baseUrl = import.meta.env.VITE_APP_URL;
    
    // Create the confirmation URL using the environment-specific base URL
    const confirmationUrl = `${baseUrl}/game-confirmation?gameId=${gameId}`;
    
    // Prepare the WhatsApp message
    const message = encodeURIComponent(
      `📢 *Confirmação de Presença* 📢\n\n` +
      `*Data:* ${formattedDate}\n` +
      `*Local:* ${game.location}\n\n` +
      `Por favor, confirme sua presença no jogo clicando no link abaixo:\n\n` +
      `${confirmationUrl}\n\n` +
      `Sua confirmação é importante para a organização do jogo!`
    );
    
    // Open WhatsApp with the message
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleViewConfirmations = (gameId: string) => {
    // Find the game to use for confirmations
    const gameToView = games.find(game => game.id === gameId);
    if (gameToView) {
      setSelectedGameForConfirmation(gameToView);
      setShowConfirmationModal(true);
    }
  }
  
  // Render a card for each game in mobile view
  const renderGameCard = (game: GameWithParticipants) => {
    return (
      <Card key={game.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <StatusBadge status={game.status} />
              <h3 className="text-lg font-semibold mt-2">{game.title || "Jogo"}</h3>
            </div>
            {canEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDeleteGame(game.id)} 
                className="text-red-600 hover:text-red-800 hover:bg-red-100 h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{new Date(game.date).toLocaleDateString('pt-BR')} às {new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{game.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span>{game.participants.confirmed}</span>
              </div>
              <div className="flex items-center gap-1">
                <UserX className="h-4 w-4 text-red-600" />
                <span>{game.participants.declined}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-gray-600" />
                <span>{game.participants.unconfirmed}</span>
              </div>
              <Button 
                variant="link" 
                className="text-xs h-6 p-0 text-blue-600" 
                onClick={() => handleViewConfirmations(game.id)}
              >
                Detalhes
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          {canEdit && (
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleEditGame(game.id)}
                className="h-8"
              >
                <PenLine className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleFormTeams(game.id)} 
                className="h-8"
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                Times
              </Button>
            </div>
          )}
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleShareParticipants(game.id)} 
              className="h-8 px-2"
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSendConfirmation(game.id)} 
              className="h-8 px-2"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleViewStatistics(game.id)} 
              className="h-8 px-2"
            >
              <BarChart className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  // Função para renderizar a tabela de jogos
  const renderGameTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Carregando jogos...</span>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="px-4 py-8 text-center text-red-500">
          <p>Erro ao carregar jogos: {(error as Error)?.message || "Erro desconhecido"}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['games'] })}
          >
            Tentar novamente
          </Button>
        </div>
      );
    }

    if (sortedGames.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-gray-500">
          <p>Nenhum jogo encontrado com os filtros atuais.</p>
          {activeTab !== 'all' && (
            <p className="mt-2">Tente mudar o filtro ou adicionar um novo jogo.</p>
          )}
        </div>
      );
    }

    // For mobile devices, show cards
    if (isMobile) {
      return (
        <div className="space-y-4 px-2">
          {sortedGames.map(game => renderGameCard(game))}
        </div>
      );
    }

    // For desktop, continue showing the table
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confirmações
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedGames.map((game) => (
              <tr key={game.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(game.date).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {game.location}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={game.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <div className="flex items-center space-x-1">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{game.participants.confirmed}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <UserX className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">{game.participants.declined}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">{game.participants.unconfirmed}</span>
                    </div>
                    <Button 
                      variant="link" 
                      className="text-sm h-6 p-0 text-blue-600"
                      onClick={() => handleViewConfirmations(game.id)}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-center space-x-2">
                    {canEdit && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteGame(game.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                              disabled={deleteGameMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Deletar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {canEdit && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditGame(game.id)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                            >
                              <PenLine className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleFormTeams(game.id)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-100"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Formar Times</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleShareParticipants(game.id)}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Compartilhar lista de participantes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleSendConfirmation(game.id)}
                            className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enviar confirmação no WhatsApp</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* New button for viewing game statistics */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewStatistics(game.id)}
                            className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                          >
                            <BarChart className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver Estatísticas</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jogos</h1>
          <p className="text-gray-500">
            Gerencie os jogos e partidas do {user?.activeClub?.name}
          </p>
        </div>
        {canEdit && (
          <Button 
            className="bg-futconnect-600 hover:bg-futconnect-700 w-full sm:w-auto"
            onClick={() => {
              setSelectedGame(null);
              setShowGameModal(true);
            }}
            disabled={createGameMutation.isPending}
          >
            {createGameMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Novo Jogo
              </>
            )}
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar por título ou local..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-[180px]">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>
                        {year === 'all' ? 'Todos os anos' : year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Aviso de permissões */}
          {!canEdit && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-md mb-4">
              <ShieldAlert className="h-5 w-5" />
              <p>Você está no modo visualização. Apenas administradores podem criar, editar ou excluir jogos.</p>
            </div>
          )}

          <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 w-full md:w-auto overflow-x-auto flex whitespace-nowrap">
              <TabsTrigger value="all" className="flex-shrink-0">
                Todos
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {games.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex-shrink-0">
                <CalendarCheck className="md:mr-1 h-4 w-4" />
                <span className="hidden md:inline">Agendados</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {games.filter(g => g.status === 'scheduled').length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-shrink-0">
                <CalendarCheck className="md:mr-1 h-4 w-4" />
                <span className="hidden md:inline">Realizados</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {games.filter(g => g.status === 'completed').length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="canceled" className="flex-shrink-0">
                <CalendarX className="md:mr-1 h-4 w-4" />
                <span className="hidden md:inline">Cancelados</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {games.filter(g => g.status === 'canceled').length}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="m-0">
              {renderGameTable()}
            </TabsContent>
            <TabsContent value="scheduled" className="m-0">
              {renderGameTable()}
            </TabsContent>
            <TabsContent value="completed" className="m-0">
              {renderGameTable()}
            </TabsContent>
            <TabsContent value="canceled" className="m-0">
              {renderGameTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de novo jogo ou edição */}
      <GameFormModal 
        isOpen={showGameModal}
        onClose={() => {
          setShowGameModal(false);
          setSelectedGame(null);
        }}
        onSave={handleAddGame}
        gameToEdit={selectedGame}
      />

      {/* Modal de confirmação de participantes */}
      {selectedGameForConfirmation && (
        <ConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setSelectedGameForConfirmation(null);
          }}
          gameId={selectedGameForConfirmation.id}
          userId={user.id}
          gameDate={selectedGameForConfirmation.date}
          gameStatus={selectedGameForConfirmation.status === 'scheduled' ? 'Agendado' : selectedGameForConfirmation.status === 'completed' ? 'Realizado' : 'Cancelado'}
          onConfirmation={() => {
            // Recarrega os jogos após confirmação
            queryClient.invalidateQueries({ queryKey: ['games'] });
          }}
        />
      )}

      {/* Modal de formação de times */}
      {showTeamFormation && selectedGameForTeamFormation && (
        <TeamFormationModal
          isOpen={showTeamFormation}
          onClose={() => {
            setShowTeamFormation(false);
            setSelectedGameForTeamFormation(null);
          }}
          gameId={selectedGameForTeamFormation.id}
          gameData={{
            title: selectedGameForTeamFormation.title || 'Jogo',
            location: selectedGameForTeamFormation.location,
            date: selectedGameForTeamFormation.date,
            status: selectedGameForTeamFormation.status === 'scheduled' ? 'Agendado' : selectedGameForTeamFormation.status === 'completed' ? 'Realizado' : 'Cancelado'
          }}
          confirmedPlayers={selectedGameForTeamFormation.participants.confirmed_players || []}
        />
      )}

      {/* Modal de estatísticas do jogo */}
      {selectedGameForStatistics && (
        <GameStatisticsModal
          isOpen={showStatisticsModal}
          onClose={() => {
            setShowStatisticsModal(false);
            setSelectedGameForStatistics(null);
          }}
          gameId={selectedGameForStatistics.id}
        />
      )}
    </div>
  );
};

export default Games;
