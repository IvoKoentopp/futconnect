import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, MapPin, Users, Trophy, CalendarCheck, Loader2, ChevronDown } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { gameService } from '@/services/gameService';
import { GameWithParticipants } from '@/types/game';
import { highlightService, GameHighlight } from '@/services/highlightService';
import { HighlightVotingModal } from '@/components/HighlightVotingModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const GameHighlights: React.FC = () => {
  const { user } = useAuth();
  const clubId = user?.activeClub?.id || '';
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedGame, setSelectedGame] = useState<GameWithParticipants | null>(null);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  const [completedVotingGames, setCompletedVotingGames] = useState<Set<string>>(new Set());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // mês corrente (1-12)
  const [firstGameYear, setFirstGameYear] = useState<number | null>(null);
  
  // Buscar o ano do primeiro jogo
  const { data: firstGameYearData } = useQuery({
    queryKey: ['first-game-year', clubId],
    queryFn: async () => {
      const allGames = await gameService.fetchGames(clubId);
      if (allGames.length === 0) return null;
      
      const completedGames = allGames.filter(game => game.status === 'completed');
      if (completedGames.length === 0) return null;
      
      const dates = completedGames.map(game => new Date(game.date));
      const firstDate = new Date(Math.min(...dates.map(date => date.getTime())));
      return firstDate.getFullYear();
    },
    enabled: !!clubId,
  });

  // Atualizar firstGameYear quando os dados chegarem
  useEffect(() => {
    if (firstGameYearData !== undefined) {
      setFirstGameYear(firstGameYearData);
    }
  }, [firstGameYearData]);

  // Buscar jogos realizados do ano e mês selecionados
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['completed-games', clubId, selectedYear, selectedMonth],
    queryFn: async () => {
      // Buscar jogos já filtrando por ano e mês se não for 'all'
      let allGames = await gameService.fetchGames(clubId, selectedYear !== 'all' ? selectedYear : undefined);
      // Filtrar jogos realizados
      let completedGames = allGames.filter(game => game.status === 'completed');
      
      // Se selectedYear for 'all', retorna todos os jogos realizados
      if (selectedYear === 'all') {
        return completedGames;
      }
      // Filtrar por mês, se 'selectedMonth' não for 'all'
      if (selectedMonth !== 0 && selectedMonth !== 13) {
        completedGames = completedGames.filter(game => {
          // Extrai o mês usando regex para aceitar qualquer formato ISO
          const dateStr = typeof game.date === 'string' ? game.date : '';
          const match = dateStr.match(/^\d{4}-(\d{2})/);
          const monthNum = match ? Number(match[1]) : null;
          return monthNum === selectedMonth;
        });
        // Log para depuração: mostra os jogos filtrados e suas datas
        console.log('[GameHighlights] Jogos filtrados por mês:', selectedMonth, completedGames.map(g => ({id: g.id, date: g.date, status: g.status})));
      }
      return completedGames;
    },
    enabled: !!clubId,
  });
  
  // Buscar resultados de destaque para todos os jogos
  const { data: gameHighlights = {}, isLoading: isLoadingHighlights, refetch: refetchHighlights } = useQuery({
    queryKey: ['game-highlights', clubId, selectedYear, selectedMonth, games.map(g => g.id).join(',')],
    queryFn: async () => {
      if (!games.length) return {};
      // Busca todos os highlights dos jogos filtrados em lote
      const allHighlights = await highlightService.getHighlightsForGames(games.map(g => g.id));
      // Monta um objeto: { [gameId]: highlightWinner | null }
      const highlights: Record<string, GameHighlight | null> = {};
      for (const game of games) {
        // Pega o highlight vencedor (is_winner: true) desse jogo, se existir
        const winner = allHighlights.find(h => h.game_id === game.id && h.is_winner === true) || null;
        highlights[game.id] = winner;
      }
      return highlights;
    },
    enabled: !!games.length,
  });
  
  // Verificar se o usuário é administrador do clube
  const { data: isClubAdmin = false } = useQuery({
    queryKey: ['club-admin', user?.name, clubId],
    queryFn: async () => {
      if (!user?.name || !clubId) return false;

      const { data, error } = await supabase
        .from('club_admins')
        .select('*')
        .eq('name', user.name)
        .eq('club_id', clubId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar administrador:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.name && !!clubId,
  });
  
  // Mutation para excluir votação
  const deleteVotingMutation = useMutation({
    mutationFn: async (gameId: string) => {
      if (!gameId) throw new Error("ID do jogo é obrigatório");
      if (!isClubAdmin) throw new Error("Apenas administradores podem excluir votações");
      await highlightService.deleteVoting(gameId);
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['completed-games'] });
      
      setCompletedVotingGames(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
      
      toast({
        title: "Votação excluída",
        description: "A votação foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir votação:', error);
      toast({
        title: "Erro ao excluir votação",
        description: error.message || "Ocorreu um erro ao tentar excluir a votação.",
        variant: "destructive",
      });
    }
  });

  // Mutation para reabrir votação
  const reopenVotingMutation = useMutation({
    mutationFn: async (gameId: string) => {
      if (!gameId) throw new Error("ID do jogo é obrigatório");
      if (!isClubAdmin) throw new Error("Apenas administradores podem reabrir votações");
      await highlightService.reopenVoting(gameId);
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['completed-games'] });
      
      setCompletedVotingGames(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
      
      toast({
        title: "Votação reaberta",
        description: "A votação foi reaberta com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao reabrir votação:', error);
      toast({
        title: "Erro ao reabrir votação",
        description: error.message || "Ocorreu um erro ao tentar reabrir a votação.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteVoting = async (gameId: string) => {
    try {
      if (!isClubAdmin) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem excluir votações.",
          variant: "destructive",
        });
        return;
      }

      if (window.confirm("Tem certeza que deseja excluir esta votação? Todos os votos serão perdidos.")) {
        await deleteVotingMutation.mutateAsync(gameId);
      }
    } catch (error) {
      console.error('Erro ao executar deleteVotingMutation:', error);
    }
  };

  const handleReopenVoting = async (gameId: string) => {
    try {
      if (!isClubAdmin) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem reabrir votações.",
          variant: "destructive",
        });
        return;
      }

      if (window.confirm("Tem certeza que deseja reabrir esta votação?")) {
        await reopenVotingMutation.mutateAsync(gameId);
      }
    } catch (error) {
      console.error('Erro ao executar reopenVotingMutation:', error);
    }
  };

  const openVotingModal = (game: GameWithParticipants) => {
    setSelectedGame(game);
    setIsVotingModalOpen(true);
  };
  
  const handleVotingComplete = () => {
    if (selectedGame) {
      // Adicionar o jogo à lista de jogos com votação completa
      setCompletedVotingGames(prev => new Set(prev).add(selectedGame.id));
      
      // Atualizar highlights após finalização da votação
      refetchHighlights();
    }
    
    // Exibir mensagem de sucesso
    toast({
      title: "Votação finalizada",
      description: "A votação foi finalizada e o destaque da partida foi definido!",
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
        <span className="ml-2 text-lg">Carregando jogos...</span>
      </div>
    );
  }
  
  if (!games.length) {
    return (
      <div className="container p-4">
        <h1 className="text-2xl font-bold mb-6">Destaque da Partida</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10">
            <Trophy className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">Nenhum jogo realizado</h2>
            <div className="text-gray-500 mb-4 text-center">
              Para votar no destaque da partida, é necessário ter jogos com status "Realizado".
            </div>
            <Button variant="outline" asChild>
              <a href="/games">Ir para Jogos</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Ordenar jogos por data (mais recentes primeiro)
  const sortedGames = [...games].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  return (
    <div className="container p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Destaque da Partida</h1>
          <div className="text-gray-500">
            Vote e acompanhe os destaques das partidas realizadas
          </div>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {/* Select de Ano */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {firstGameYear && Array.from(
                { length: new Date().getFullYear() - firstGameYear + 1 },
                (_, i) => (new Date().getFullYear() - i).toString()
              ).map(year => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Select de Mês */}
          <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <SelectItem key={month} value={month.toString()}>
                  {new Date(0, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedGames.map(game => {
          const gameHighlight = gameHighlights[game.id];
          const isVotingComplete = completedVotingGames.has(game.id);
          // Só mostrar o destaque se a votação estiver completa ou se houver um vencedor oficialmente marcado
          const hasWinner = !!gameHighlight && (isVotingComplete || gameHighlight.is_winner);
          
          return (
            <Card key={game.id} className="overflow-hidden flex flex-col h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Realizado
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {game.participants.confirmed} jogadores
                  </Badge>
                </div>
                <CardTitle className="mt-2">{
                  game.title || `Jogo em ${game.location}`
                }</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{new Date(game.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{game.location}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow">
                {hasWinner ? (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        {gameHighlight?.member?.photo_url ? (
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400">
                            <img 
                              src={gameHighlight.member.photo_url} 
                              alt={gameHighlight.member?.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-amber-200 flex items-center justify-center border-2 border-amber-400">
                            <span className="text-2xl font-bold text-amber-600">
                              {(gameHighlight?.member?.nickname || gameHighlight?.member?.name || "?")[0]}
                            </span>
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-amber-400 rounded-full p-1">
                          <Trophy className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <h3 className="mt-3 font-semibold">
                        {gameHighlight?.member?.nickname || gameHighlight?.member?.name}
                      </h3>
                      <div className="text-sm text-amber-700 mt-1">Destaque da Partida</div>
                      <div className="text-sm text-amber-600 mt-1">
                        <strong>{gameHighlight?.votes_count}</strong> {gameHighlight?.votes_count === 1 ? 'voto' : 'votos'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col items-center text-center">
                    <Star className="h-10 w-10 text-gray-300 mb-2" />
                    <div className="text-gray-600">{isVotingComplete 
                      ? "Processando resultados da votação..." 
                      : "Ainda não há um destaque definido para esta partida"}
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-2">
                <div className="flex gap-2 w-full">
                  <Button 
                    variant={hasWinner ? "outline" : "default"}
                    className={hasWinner ? "flex-1" : "bg-futconnect-600 hover:bg-futconnect-700 w-full"}
                    onClick={() => openVotingModal(game)}
                  >
                    {hasWinner ? "Ver Resultados" : "Votar no Destaque"}
                  </Button>
                  
                  {isClubAdmin && (gameHighlight || isVotingComplete) && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleReopenVoting(game.id)}
                      disabled={reopenVotingMutation.isPending}
                    >
                      {reopenVotingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Reabrir Votação"
                      )}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {selectedGame && (
        <HighlightVotingModal
          isOpen={isVotingModalOpen}
          onClose={() => setIsVotingModalOpen(false)}
          game={selectedGame}
          onVotingComplete={handleVotingComplete}
        />
      )}
    </div>
  );
};

export default GameHighlights;
