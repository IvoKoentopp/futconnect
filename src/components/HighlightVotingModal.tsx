import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Trophy, AlertCircle, UserRound, CheckCircle, Lock } from 'lucide-react';
import { GameWithParticipants } from '@/types/game';
import { highlightService, GameHighlight } from '@/services/highlightService';
import { gameService } from '@/services/gameService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface HighlightVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameWithParticipants;
  onVotingComplete?: () => void;
}

export const HighlightVotingModal: React.FC<HighlightVotingModalProps> = ({
  isOpen,
  onClose,
  game,
  onVotingComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('vote');
  const [currentVoterId, setCurrentVoterId] = useState<string>('');
  const [votingFinalized, setVotingFinalized] = useState<boolean>(false);
  
  // Fetch participants for this game
  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery({
    queryKey: ['game-participants', game.id],
    queryFn: async () => {
      const allParticipants = await gameService.fetchParticipants(game.id);
      const filteredParticipants = allParticipants.filter(p => p.status === 'confirmed');
      
      const participantDetails = [];
      for (const participant of filteredParticipants) {
        const { data } = await supabase
          .from('members')
          .select('id, name, nickname, photo_url, status, birth_date')
          .eq('id', participant.member_id)
          .neq('status', 'Sistema') // Excluir membros com status "Sistema"
          .single();
          
        if (data) {
          participantDetails.push({
            ...participant,
            memberDetails: data
          });
        }
      }
      
      return participantDetails;
    },
    enabled: isOpen && !!game.id,
  });
  
  // Verificar se a votação já foi finalizada
  const { data: isVotingAlreadyFinalized = false, isLoading: isCheckingVotingStatus } = useQuery({
    queryKey: ['voting-finalized', game.id],
    queryFn: async () => {
      return await highlightService.isVotingFinalized(game.id);
    },
    enabled: isOpen && !!game.id,
    meta: {
      onSuccess: (isFinalized: boolean) => {
        if (isFinalized) {
          setVotingFinalized(true);
          setActiveTab('results'); // Mudar para aba de resultados automaticamente
        }
      }
    }
  });
  
  // Fetch current highlights
  const { data: highlights = [], isLoading: isLoadingHighlights, refetch: refetchHighlights } = useQuery({
    queryKey: ['highlights-details', game.id],
    queryFn: async () => {
      // Inicializar os destaques se ainda não existirem
      const participantIds = participants.map(p => p.member_id);
      await highlightService.initializeHighlights(game.id, participantIds);
      
      // Buscar os destaques
      return highlightService.getGameHighlights(game.id);
    },
    enabled: isOpen && !!game.id && !!participants.length,
  });
  
  // Buscar os votos registrados
  const { data: votes = [], isLoading: isLoadingVotes, refetch: refetchVotes } = useQuery({
    queryKey: ['game-votes', game.id],
    queryFn: async () => {
      return highlightService.getVotes(game.id);
    },
    enabled: isOpen && !!game.id,
  });
  
  // Verificar quem ainda não votou
  const pendingVoters = participants.filter(participant => 
    !votes.some(vote => vote.voter_id === participant.member_id)
  );
  
  // Verificar se o votante atual já votou
  const hasCurrentVoterVoted = currentVoterId ? 
    votes.some(vote => vote.voter_id === currentVoterId) : 
    false;
  
  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!currentVoterId || !selectedPlayerId) {
        throw new Error("Informações de voto inválidas");
      }
      
      // Verificar se a votação já foi finalizada
      if (votingFinalized) {
        throw new Error("A votação já foi finalizada");
      }
      
      await highlightService.voteForMember(game.id, currentVoterId, selectedPlayerId);
    },
    onSuccess: () => {
      // Atualizar as queries
      queryClient.invalidateQueries({ queryKey: ['game-votes', game.id] });
      queryClient.invalidateQueries({ queryKey: ['highlights-details', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game-highlights', user?.activeClub?.id] });
      
      // Atualizar votos e destaque para refletir as mudanças
      refetchVotes();
      refetchHighlights();
      
      toast({
        title: "Voto registrado com sucesso!",
        description: "Obrigado por participar da votação.",
      });
      
      // Resetar a seleção para o próximo voto, mas mantém o modal aberto
      setSelectedPlayerId('');
      setCurrentVoterId('');
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao registrar voto",
        description: error.message || "Ocorreu um erro ao tentar registrar seu voto.",
      });
    },
  });
  
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      await highlightService.finalizeVoting(game.id);
    },
    onSuccess: () => {
      // Atualizar estado local e queries
      setVotingFinalized(true);
      setActiveTab('results');
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['voting-finalized', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game-votes', game.id] });
      queryClient.invalidateQueries({ queryKey: ['highlights-details', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game-highlights', user?.activeClub?.id] });
      
      toast({
        title: "Votação finalizada",
        description: "Os resultados da votação agora estão disponíveis.",
      });
      
      // Notificar o componente pai
      if (onVotingComplete) {
        onVotingComplete();
      }
    },
    onError: (error: any) => {
      console.error("Erro ao finalizar votação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao finalizar votação",
        description: error.message || "Ocorreu um erro ao tentar finalizar a votação.",
      });
    }
  });

  const deleteVotingMutation = useMutation({
    mutationFn: async () => {
      await highlightService.deleteVoting(game.id);
    },
    onSuccess: () => {
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['voting-finalized', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game-votes', game.id] });
      queryClient.invalidateQueries({ queryKey: ['highlights-details', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game-highlights', user?.activeClub?.id] });
      
      setVotingFinalized(false);
      setActiveTab('vote');
      
      toast({
        title: "Votação excluída",
        description: "A votação foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir votação",
        description: error.message || "Ocorreu um erro ao tentar excluir a votação.",
      });
    }
  });

  const reopenVotingMutation = useMutation({
    mutationFn: async () => {
      await highlightService.reopenVoting(game.id);
    },
    onSuccess: () => {
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['voting-finalized', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game-votes', game.id] });
      queryClient.invalidateQueries({ queryKey: ['highlights-details', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game-highlights', user?.activeClub?.id] });
      
      setVotingFinalized(false);
      setActiveTab('vote');
      
      toast({
        title: "Votação reaberta",
        description: "A votação foi reaberta com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao reabrir votação",
        description: error.message || "Ocorreu um erro ao tentar reabrir a votação.",
      });
    }
  });

  const handleVote = async () => {
    if (votingFinalized) {
      toast({
        variant: "destructive",
        title: "Votação finalizada",
        description: "A votação já foi finalizada e não é mais possível votar.",
      });
      setActiveTab('results');
      return;
    }
    
    if (!currentVoterId) {
      toast({
        variant: "destructive",
        title: "Nenhum votante selecionado",
        description: "Por favor, selecione quem está votando.",
      });
      return;
    }
    
    if (!selectedPlayerId) {
      toast({
        variant: "destructive",
        title: "Nenhum jogador selecionado",
        description: "Por favor, selecione um jogador para votar.",
      });
      return;
    }
    
    voteMutation.mutate();
  };
  
  const handleFinalizeVoting = () => {
    finalizeMutation.mutate();
  };

  const handleDeleteVoting = () => {
    if (window.confirm("Tem certeza que deseja excluir esta votação? Todos os votos serão perdidos.")) {
      deleteVotingMutation.mutate();
    }
  };

  const handleReopenVoting = () => {
    if (window.confirm("Tem certeza que deseja reabrir esta votação?")) {
      reopenVotingMutation.mutate();
    }
  };

  // Use o mesmo método para obter o vencedor que o utilizado no highlightService
  const determineWinner = (): GameHighlight | null => {
    if (!highlights || highlights.length === 0) return null;
    
    // Verificar se existe um destaque marcado como vencedor
    const savedWinner = highlights.find(h => h.is_winner);
    if (savedWinner) return savedWinner;
    
    // Se não houver um vencedor salvo, ordenar por votos
    const sortedHighlights = [...highlights].sort((a, b) => b.votes_count - a.votes_count);
    
    // Se o primeiro colocado tem votos e tem mais votos que o segundo
    const topVoteCount = sortedHighlights[0].votes_count;
    if (topVoteCount > 0 && (sortedHighlights.length < 2 || topVoteCount > sortedHighlights[1].votes_count)) {
      return sortedHighlights[0]; // Vencedor claro sem empate
    }
    
    // Em caso de empate, filtrar os jogadores com a mesma quantidade de votos
    const tiedPlayers = sortedHighlights.filter(h => h.votes_count === topVoteCount);
    if (tiedPlayers.length === 1) return tiedPlayers[0];
    
    // Em caso de empate, ordenar por idade (mais velho primeiro)
    const sortedByAge = [...tiedPlayers].sort((a, b) => {
      // Se não tiver data de nascimento, considerar como mais novo (vai para o fim da lista)
      if (!a.member?.birth_date) return 1;
      if (!b.member?.birth_date) return -1;
      
      // Precisamos comparar as datas corretamente:
      // Datas mais antigas (pessoas mais velhas) vêm ANTES (são menores numericamente)
      const dateA = new Date(a.member.birth_date).getTime();
      const dateB = new Date(b.member.birth_date).getTime();
      
      // Valor negativo significa que a é mais antigo (mais velho) que b
      return dateA - dateB;
    });
    
    console.log("Tied players sorted by age (oldest first):", sortedByAge.map(p => ({
      name: p.member?.name,
      birth_date: p.member?.birth_date,
      votes: p.votes_count
    })));
    
    return sortedByAge[0]; // Retorna o jogador mais velho entre os empatados
  };
  
  // Obter o vencedor usando a lógica correta
  const winner = determineWinner();
  
  // Efeito para verificar e atualizar o estado quando o modal é aberto/fechado
  useEffect(() => {
    if (isOpen) {
      // Quando o modal abre, precisamos verificar se a votação já está finalizada
      if (isVotingAlreadyFinalized) {
        setVotingFinalized(true);
        setActiveTab('results');
      } else {
        // Importante: resetar o estado de votação finalizada quando abre o modal
        // e a votação NÃO está finalizada no banco de dados
        setVotingFinalized(false);
      }
    } else {
      // Quando o modal fecha, resetamos apenas seleções do usuário
      setCurrentVoterId('');
      setSelectedPlayerId('');
    }
  }, [isOpen, isVotingAlreadyFinalized]);
  
  // Verificar se todos votaram (para exibição condicional do botão de finalizar)
  const allVoted = pendingVoters.length === 0 && participants.length > 0;
  
  // Filtrar os jogadores que podem receber votos (excluindo o votante atual)
  const eligiblePlayersForVoting = participants.filter(
    participant => participant.member_id !== currentVoterId
  );
  
  // Obter os destaques ordenados por votos para exibição
  const sortedHighlights = [...highlights].sort((a, b) => b.votes_count - a.votes_count);
  
  // Condição que verifica se estamos carregando o status da votação ou os destaques
  const isLoading = isLoadingParticipants || isLoadingHighlights || isLoadingVotes || isCheckingVotingStatus;
  
  const checkVotingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('game_voting_control')
        .select('is_finalized')
        .eq('game_id', game.id)
        .single();

      if (error) throw error;

      setVotingFinalized(data?.is_finalized === true);
    } catch (error) {
      console.error('Error checking voting status:', error);
      toast({
        variant: "destructive",
        title: "Erro ao verificar status da votação",
        description: "Ocorreu um erro ao verificar se a votação está finalizada."
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center mb-4">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Destaque da Partida
            </DialogTitle>
            {user?.activeClub?.isAdmin && votingFinalized && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReopenVoting}
                  disabled={reopenVotingMutation.isPending}
                >
                  {reopenVotingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Reabrir Votação"
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteVoting}
                  disabled={deleteVotingMutation.isPending}
                >
                  {deleteVotingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Excluir Votação"
                  )}
                </Button>
              </div>
            )}
          </div>
          <DialogDescription>
            {new Date(game.date).toLocaleDateString('pt-BR')} - {game.location}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-futconnect-600 mb-2" />
            <p className="text-gray-500">Carregando informações...</p>
          </div>
        ) : (
          <Tabs value={votingFinalized ? 'results' : activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="vote" disabled={votingFinalized}>Votar</TabsTrigger>
              <TabsTrigger value="results">Resultados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vote" className="space-y-4">
              {participants.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-center text-gray-700">
                    Não há jogadores confirmados para esta partida.
                  </p>
                </div>
              ) : votingFinalized ? (
                <div className="py-6 flex flex-col items-center justify-center border rounded-md p-4 bg-amber-50">
                  <Lock className="h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-center text-gray-700">
                    A votação foi finalizada. Veja os resultados na aba "Resultados".
                  </p>
                  <Button 
                    onClick={() => setActiveTab('results')} 
                    className="mt-4 bg-amber-500 hover:bg-amber-600"
                  >
                    Ver Resultados
                  </Button>
                </div>
              ) : (
                <>
                  {/* Seleção de quem está votando */}
                  {!currentVoterId ? (
                    <div className="border rounded-md p-4 bg-gray-50">
                      <div className="space-y-4">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                          <UserRound className="h-4 w-4" />
                          Quem está votando:
                        </h3>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {participants.map((participant) => {
                            const hasVoted = votes.some(vote => vote.voter_id === participant.member_id);
                            const isSelected = currentVoterId === participant.member_id;
                            
                            return (
                              <button
                                key={participant.member_id}
                                onClick={() => !hasVoted && !votingFinalized && setCurrentVoterId(participant.member_id)}
                                disabled={hasVoted || votingFinalized}
                                className={`
                                  relative p-3 rounded-lg border transition-all duration-200
                                  ${isSelected 
                                    ? 'border-futconnect-600 bg-futconnect-50 ring-2 ring-futconnect-600 ring-opacity-50' 
                                    : 'border-gray-200 hover:border-futconnect-600 hover:bg-futconnect-50'
                                  }
                                  ${hasVoted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                  flex flex-col items-center text-center gap-2
                                `}
                              >
                                {/* Foto ou Avatar */}
                                <div className="relative">
                                  {participant.memberDetails?.photo_url ? (
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                                      <img 
                                        src={participant.memberDetails.photo_url} 
                                        alt={participant.memberDetails?.name} 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                      <span className="text-xl font-bold text-gray-500">
                                        {(participant.memberDetails?.nickname || participant.memberDetails?.name || "?")[0]}
                                      </span>
                                    </div>
                                  )}
                                  {hasVoted && (
                                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                                      <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Nome */}
                                <div className="font-medium text-sm">
                                  {participant.memberDetails?.nickname || participant.memberDetails?.name}
                                </div>
                                
                                {/* Status */}
                                {hasVoted && (
                                  <Badge variant="success" className="text-xs absolute top-1 left-1">
                                    Votou
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-md p-3 bg-gray-50 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserRound className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            Votando como:{' '}
                            <span className="text-futconnect-600">
                              {participants.find(p => p.member_id === currentVoterId)?.memberDetails?.nickname || 
                               participants.find(p => p.member_id === currentVoterId)?.memberDetails?.name}
                            </span>
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentVoterId('');
                            setSelectedPlayerId('');
                          }}
                          className="text-gray-500 hover:text-futconnect-600"
                        >
                          Trocar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Lista de jogadores que faltam votar */}
                  {pendingVoters.length > 0 && !votingFinalized && (
                    <div className="border rounded-md p-4 bg-amber-50">
                      <h3 className="font-medium mb-3">Ainda faltam votar ({pendingVoters.length}):</h3>
                      <div className="flex flex-wrap gap-1">
                        {pendingVoters.map(voter => (
                          <Badge key={voter.member_id} variant="warning" className="mb-1">
                            {voter.memberDetails?.nickname || voter.memberDetails?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Botão para finalizar votação */}
                  {pendingVoters.length > 0 && votes.length > 0 && !votingFinalized && !finalizeMutation.isPending && (
                    <div className="border rounded-md p-4 bg-blue-50">
                      <div className="flex flex-col items-center">
                        <p className="text-center text-gray-700 mb-2">
                          Se nem todos os jogadores desejam votar, você pode finalizar a votação agora.
                        </p>
                        <Button 
                          variant="secondary"
                          onClick={handleFinalizeVoting}
                          className="bg-blue-500 text-white hover:bg-blue-600"
                          disabled={finalizeMutation.isPending}
                        >
                          {finalizeMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Finalizando...
                            </>
                          ) : "Finalizar Votação"}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-finalização quando todos votaram */}
                  {allVoted && votes.length > 0 && !votingFinalized && (
                    <div className="border rounded-md p-4 bg-green-50">
                      <div className="flex flex-col items-center">
                        <p className="text-center text-gray-700 mb-2">
                          Todos os jogadores já votaram! Você pode finalizar a votação agora.
                        </p>
                        <Button 
                          onClick={handleFinalizeVoting}
                          className="bg-green-500 text-white hover:bg-green-600"
                          disabled={finalizeMutation.isPending}
                        >
                          {finalizeMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Finalizando...
                            </>
                          ) : "Finalizar Votação e Ver Resultados"}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Votação */}
                  {currentVoterId && !hasCurrentVoterVoted ? (
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          Selecione o destaque da partida:
                        </h3>
                        
                        <RadioGroup value={selectedPlayerId} onValueChange={setSelectedPlayerId} className="w-full">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {eligiblePlayersForVoting.map((participant) => {
                              const isSelected = selectedPlayerId === participant.member_id;
                              
                              return (
                                <div key={participant.member_id}>
                                  <RadioGroupItem
                                    value={participant.member_id}
                                    id={`player-${participant.member_id}`}
                                    className="peer sr-only"
                                    disabled={votingFinalized}
                                  />
                                  <Label
                                    htmlFor={`player-${participant.member_id}`}
                                    className={`
                                      relative p-3 rounded-lg border transition-all duration-200 block cursor-pointer
                                      ${isSelected 
                                        ? 'border-futconnect-600 bg-futconnect-50 ring-2 ring-futconnect-600 ring-opacity-50' 
                                        : 'border-gray-200 hover:border-futconnect-600 hover:bg-futconnect-50 peer-disabled:opacity-50'
                                      }
                                      flex flex-col items-center text-center gap-2
                                    `}
                                  >
                                    {/* Foto ou Avatar */}
                                    <div className="relative">
                                      {participant.memberDetails?.photo_url ? (
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                                          <img 
                                            src={participant.memberDetails.photo_url} 
                                            alt={participant.memberDetails?.name} 
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                          <span className="text-2xl font-bold text-gray-500">
                                            {(participant.memberDetails?.nickname || participant.memberDetails?.name || "?")[0]}
                                          </span>
                                        </div>
                                      )}
                                      {isSelected && (
                                        <div className="absolute -top-1 -right-1 bg-futconnect-500 rounded-full p-1">
                                          <Trophy className="h-4 w-4 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Nome */}
                                    <div className="font-medium">
                                      {participant.memberDetails?.nickname || participant.memberDetails?.name}
                                    </div>
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setCurrentVoterId('');
                          setSelectedPlayerId('');
                        }}>Cancelar</Button>
                        <Button 
                          onClick={handleVote} 
                          disabled={!selectedPlayerId || voteMutation.isPending || votingFinalized}
                          className="bg-futconnect-600 hover:bg-futconnect-700"
                        >
                          {voteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Confirmar Voto
                        </Button>
                      </div>
                    </div>
                  ) : currentVoterId && hasCurrentVoterVoted ? (
                    <div className="py-6 flex flex-col items-center justify-center border rounded-md p-4 bg-green-50">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-center text-gray-700">
                        Este jogador já votou. Selecione outro jogador para continuar a votação.
                      </p>
                      <Button 
                        onClick={() => setCurrentVoterId('')}
                        className="mt-4"
                        variant="outline"
                      >
                        Selecionar outro votante
                      </Button>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center border rounded-md p-4">
                      <UserRound className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-center text-gray-700">
                        Selecione quem está votando para continuar.
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="results" className="space-y-4">
              {!votingFinalized ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-center text-gray-700">
                    A votação ainda está em andamento. Os resultados serão exibidos quando a votação for finalizada.
                  </p>
                  <Button 
                    onClick={() => setActiveTab('vote')}
                    className="mt-4"
                    variant="outline"
                  >
                    Voltar para votação
                  </Button>
                </div>
              ) : votes.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-center text-gray-700">
                    Nenhum voto foi registrado nesta partida.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mostrar o vencedor com destaque */}
                  {winner && winner.votes_count > 0 && (
                    <div className="border border-amber-200 rounded-md p-4 bg-amber-50">
                      <div className="flex flex-col items-center text-center">
                        <h3 className="font-bold text-amber-700 mb-3">DESTAQUE DA PARTIDA</h3>
                        <div className="relative">
                          {winner.member?.photo_url ? (
                            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400">
                              <img 
                                src={winner.member.photo_url} 
                                alt={winner.member?.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-amber-200 flex items-center justify-center border-2 border-amber-400">
                              <span className="text-2xl font-bold text-amber-600">
                                {(winner.member?.nickname || winner.member?.name || "?")[0]}
                              </span>
                            </div>
                          )}
                          <div className="absolute -top-2 -right-2 bg-amber-400 rounded-full p-1">
                            <Trophy className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">
                          {winner.member?.nickname || winner.member?.name}
                        </h3>
                        <p className="text-amber-600 mt-1">
                          <strong>{winner.votes_count}</strong> {winner.votes_count === 1 ? 'voto' : 'votos'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Lista de resultados sem mostrar quem votou em quem (voto secreto) */}
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Resultado da votação:</h3>
                    <div className="space-y-2">
                      {sortedHighlights.map((highlight, index) => (
                        <div 
                          key={highlight.id} 
                          className={`flex items-center justify-between border rounded-md p-2 ${index === 0 && highlight.votes_count > 0 ? 'bg-amber-50 border-amber-200' : ''}`}
                        >
                          <div className="flex items-center">
                            {highlight.member?.photo_url ? (
                              <div className="h-8 w-8 rounded-full overflow-hidden mr-2">
                                <img 
                                  src={highlight.member.photo_url} 
                                  alt={highlight.member?.name} 
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                <span className="text-sm font-medium text-gray-600">
                                  {(highlight.member?.nickname || highlight.member?.name || "?")[0]}
                                </span>
                              </div>
                            )}
                            <span>
                              {highlight.member?.nickname || highlight.member?.name}
                            </span>
                          </div>
                          <span className={`font-medium ${index === 0 && highlight.votes_count > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {highlight.votes_count} {highlight.votes_count === 1 ? 'voto' : 'votos'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Fechar</Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
