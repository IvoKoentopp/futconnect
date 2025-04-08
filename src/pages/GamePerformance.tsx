import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Users, BarChart, Calendar, ArrowUp, ArrowDown, Activity, FileDown, Star, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gamePerformanceService } from '@/services/gamePerformanceService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { exportElementToPdf } from "@/utils/exportToPdf";
import { useToast } from "@/components/ui/use-toast";
import { highlightService } from '@/services/highlightService';
import type { TeamStats, PlayerStats, ParticipationRankingStats } from '@/services/gamePerformanceService';

interface Highlight {
  date: string;
  field: string;
  nickname: string;
  votes: number;
  is_winner: boolean;
}

interface GameVotingControl {
  game_id: string;
  games: {
    id: string;
    date: string;
    club_id: string;
  };
}

type GameEventResponse = {
  id: number;
  game_id: string;
  member_id: string;
  votes_count: number;
  is_winner: boolean;
  game: {
    date: string;
    field: string;
  };
  member: {
    nickname: string;
    birth_date?: string | null;
  };
};

const GamePerformance = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [participationRanking, setParticipationRanking] = useState<ParticipationRankingStats[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingParticipation, setIsLoadingParticipation] = useState(true);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);
  const [activeTab, setActiveTab] = useState("teams");
  const [sortField, setSortField] = useState<'points' | 'pointsAverage' | 'wins' | 'winRate'>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estados para ordenação da aba participação
  const [participationSortField, setParticipationSortField] = useState<'points' | 'participationRate' | 'effectiveParticipationRate'>('points');
  const [participationSortDirection, setParticipationSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // References for PDF export
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const clubId = user?.activeClub?.id || '';
  const clubName = user?.activeClub?.name || 'Clube';
  
  // Month names in Portuguese
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  // Function to generate PDF using exportElementToPdf
  const generatePDF = () => {
    try {
      // Define element ID and filename
      const elementId = "performance-content";
      
      // Create a descriptive filename
      const periodText = selectedYear === "all" 
        ? "Todos_Anos" 
        : selectedMonth === "all" 
          ? `Ano_${selectedYear}` 
          : `${monthNames[parseInt(selectedMonth) - 1]}_${selectedYear}`;
          
      let tabText = "";
      switch(activeTab) {
        case "teams":
          tabText = "Times";
          break;
        case "players":
          tabText = "Jogadores";
          break;
        case "participation":
          tabText = "Participacao";
          break;
        case "highlights":
          tabText = "Destaques";
          break;
      }
      
      const fileName = `Performance_${tabText}_${periodText}_${clubName.replace(/\s+/g, '_')}`;
      
      // Export the content to PDF (landscape orientation)
      exportElementToPdf(elementId, fileName, 'l');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o arquivo PDF"
      });
    }
  };
  
  useEffect(() => {
    const fetchEarliestGameDate = async () => {
      if (!clubId) return;
      
      try {
        // Fetch the earliest game date with at least one event
        const { data: gameEventsData, error: gameEventsError } = await supabase
          .from('game_events')
          .select('game_id');
          
        if (gameEventsError || !gameEventsData || gameEventsData.length === 0) {
          console.error('Error fetching game events or no events found:', gameEventsError);
          return;
        }
        
        // Extract game IDs from events
        const gameIdsWithEvents = [...new Set(gameEventsData.map(event => event.game_id))];
        
        // Get the earliest game date
        const { data: earliestGame, error: gamesError } = await supabase
          .from('games')
          .select('date')
          .eq('club_id', clubId)
          .eq('status', 'completed')
          .in('id', gameIdsWithEvents)
          .order('date', { ascending: true })
          .limit(1);
          
        if (gamesError || !earliestGame || earliestGame.length === 0) {
          console.error('Error fetching earliest game:', gamesError);
          return;
        }
        
        const earliestYear = new Date(earliestGame[0].date).getFullYear();
        
        // Generate array of years starting with current year
        const years = [currentYear.toString(), "all"];
        for (let year = currentYear - 1; year >= earliestYear; year--) {
          years.push(year.toString());
        }
        
        setAvailableYears(years);
      } catch (error) {
        console.error('Error determining available years:', error);
        // Fallback to showing last 5 years if there's an error
        const fallbackYears = [currentYear.toString(), "all", ...Array.from({ length: 4 }, (_, i) => (currentYear - (i + 1)).toString())];
        setAvailableYears(fallbackYears);
      }
    };
    
    fetchEarliestGameDate();
  }, [clubId, currentYear]);
  
  // Reset month when year changes
  useEffect(() => {
    if (selectedYear === "all") {
      setSelectedMonth("all");
    }
  }, [selectedYear]);
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!clubId) return;
      
      setIsLoading(true);
      
      try {
        // Fetch team statistics
        const teamData = await gamePerformanceService.fetchTeamStats(
          clubId,
          selectedYear === 'all' ? new Date().getFullYear() : parseInt(selectedYear),
          selectedMonth === 'all' ? 'all' : parseInt(selectedMonth)
        );
        setTeamStats(teamData);
        
        // Fetch player statistics
        const playerData = await gamePerformanceService.fetchPlayerStats(clubId, selectedYear, selectedMonth);
        setPlayerStats(playerData);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [clubId, selectedYear, selectedMonth]);
  
  // Fetch participation ranking stats (now affected by year/month filters)
  useEffect(() => {
    const fetchParticipationRanking = async () => {
      if (!clubId) return;
      
      setIsLoadingParticipation(true);
      
      try {
        const participationData = await gamePerformanceService.fetchParticipationRanking(
          clubId, 
          selectedYear, 
          selectedMonth
        );
        setParticipationRanking(participationData);
      } catch (error) {
        console.error('Error fetching participation ranking:', error);
      } finally {
        setIsLoadingParticipation(false);
      }
    };
    
    fetchParticipationRanking();
  }, [clubId, selectedYear, selectedMonth]);

  useEffect(() => {
    const fetchHighlights = async () => {
      if (!clubId) {
        toast({
          variant: "destructive",
          title: "Clube não selecionado",
          description: "Por favor, selecione um clube para ver os destaques."
        });
        setIsLoadingHighlights(false);
        return;
      }
      
      setIsLoadingHighlights(true);
      
      try {
        // Buscar apenas jogos finalizados do clube atual
        const { data: finishedGames, error: gamesError } = await supabase
          .from('game_voting_control')
          .select(`
            game_id,
            games!inner (
              id,
              date,
              club_id
            )
          `)
          .eq('is_finalized', true)
          .eq('games.club_id', clubId)
          .order('games(date)', { ascending: false });

        if (gamesError) {
          console.error('Error fetching games:', gamesError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar jogos",
            description: gamesError.message || "Ocorreu um erro ao buscar os jogos com votação finalizada."
          });
          setIsLoadingHighlights(false);
          return;
        }

        console.log('Query Debug:', {
          clubId,
          finishedGames,
          filters: {
            is_finalized: true,
            club_id: clubId
          }
        });

        if (!finishedGames || finishedGames.length === 0) {
          console.log('No finished games found');
          setHighlights([]);
          setIsLoadingHighlights(false);
          return;
        }

        // Filtrar por ano/mês se selecionados
        const filteredGames = finishedGames.filter(g => {
          const gameDate = new Date(g.games.date);
          
          if (selectedYear !== "all") {
            if (gameDate.getFullYear() !== parseInt(selectedYear)) {
              return false;
            }
            
            if (selectedMonth !== "all") {
              if (gameDate.getMonth() !== parseInt(selectedMonth) - 1) {
                return false;
              }
            }
          }
          
          return true;
        });

        console.log('Filtered Games:', filteredGames);

        if (filteredGames.length === 0) {
          console.log('No games after filtering');
          setHighlights([]);
          setIsLoadingHighlights(false);
          return;
        }

        // Para cada jogo finalizado, buscar o destaque vencedor usando o highlightService
        const winners = [];
        for (const game of filteredGames) {
          // Verificar se o jogo pertence ao clube atual
          if (game.games.club_id === clubId) {
            const winner = await highlightService.getWinner(game.game_id);
            console.log('Game ID:', game.game_id, 'Winner:', winner);
            if (winner) {
              winners.push({
                ...winner,
                game: {
                  ...winner.game,
                  date: game.games.date // Usar a data do jogo da query principal
                }
              });
            }
          }
        }

        console.log('Winners:', winners);

        // Formatar os vencedores para exibição
        const formattedHighlights: Highlight[] = winners.map(winner => ({
          date: new Date(winner.game.date).toLocaleDateString('pt-BR'),
          field: winner.game.location,
          nickname: winner.member?.nickname || winner.member?.name || 'Sem nome',
          votes: winner.votes_count || 0,
          is_winner: winner.is_winner
        }));

        setHighlights(formattedHighlights);
      } catch (error: any) {
        console.error('Error fetching highlights:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar destaques",
          description: error.message || "Ocorreu um erro ao buscar os destaques das partidas."
        });
      } finally {
        setIsLoadingHighlights(false);
      }
    };

    fetchHighlights();
  }, [clubId, selectedYear, selectedMonth]);
  
  return (
    <AdminLayout appMode="club">
      <div className="container mx-auto py-4">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold">Performance</h1>
          
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year === "all" ? "Todos" : year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedMonth} 
              onValueChange={setSelectedMonth} 
              disabled={selectedYear === "all"}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {monthNames.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString().padStart(2, '0')}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={generatePDF} 
              className="flex items-center gap-2"
              disabled={isLoading || isLoadingParticipation || isLoadingHighlights}
            >
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="teams" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="teams" onClick={() => setActiveTab("teams")}>
              <Users className="w-4 h-4 mr-2" />
              Times
            </TabsTrigger>
            <TabsTrigger value="players" onClick={() => setActiveTab("players")}>
              <Trophy className="w-4 h-4 mr-2" />
              Jogadores
            </TabsTrigger>
            <TabsTrigger value="participation" onClick={() => setActiveTab("participation")}>
              <Activity className="w-4 h-4 mr-2" />
              Participação
            </TabsTrigger>
            <TabsTrigger value="highlights" onClick={() => setActiveTab("highlights")}>
              <Star className="w-4 h-4 mr-2" />
              Destaques
            </TabsTrigger>
          </TabsList>
          
          {/* Main content area wrapped in a div with ref for PDF export */}
          <div id="performance-content" ref={contentRef}>
            {/* Club name and period for PDF header - visible only during PDF generation */}
            <div className="pdf-header-section" style={{display: 'none'}}>
              <h2 className="text-xl font-bold">{clubName}</h2>
              <p className="text-md text-muted-foreground">
                {selectedYear === "all" 
                  ? "Todos os anos" 
                  : selectedMonth === "all" 
                    ? `Ano: ${selectedYear}` 
                    : `${monthNames[parseInt(selectedMonth) - 1]} de ${selectedYear}`}
              </p>
              <p className="text-md font-medium">
                {activeTab === "teams" 
                  ? "Estatísticas de Times" 
                  : activeTab === "players" 
                    ? "Ranking de Jogadores" 
                    : activeTab === "participation" 
                      ? "Ranking de Participação" 
                      : "Destaques"}
              </p>
            </div>
          
            <TabsContent value="teams" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Times</CardTitle>
                  <CardDescription>
                    Desempenho dos times durante 
                    {selectedYear === "all" 
                      ? " todos os anos" 
                      : selectedMonth === "all" 
                        ? ` ${selectedYear}` 
                        : ` ${monthNames[parseInt(selectedMonth) - 1]} de ${selectedYear}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
                    </div>
                  ) : teamStats.length > 0 ? (
                    <div>
                      <div className="hidden md:block rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-16 text-center font-semibold">Posição</TableHead>
                              <TableHead className="font-semibold">Time</TableHead>
                              <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center">
                                  <span>Pontos</span>
                                  <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">Jogos</TableHead>
                              <TableHead className="text-center font-semibold">Vitórias</TableHead>
                              <TableHead className="text-center font-semibold">Empates</TableHead>
                              <TableHead className="text-center font-semibold">Derrotas</TableHead>
                              <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center">
                                  <span>Gols Marcados</span>
                                  <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">Gols Sofridos</TableHead>
                              <TableHead className="text-center font-semibold">Aproveitamento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamStats.map((team, index) => (
                              <TableRow 
                                key={team.id} 
                                className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                              >
                                <TableCell className="text-center font-medium">
                                  {index < 3 ? (
                                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full 
                                      ${index === 0 ? 'bg-amber-100 text-amber-800' : 
                                        index === 1 ? 'bg-slate-200 text-slate-800' : 
                                        'bg-amber-900/20 text-amber-900'}`
                                    }>
                                      {index + 1}
                                    </div>
                                  ) : (
                                    index + 1
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-4 h-4 rounded border border-gray-200" 
                                      style={{ backgroundColor: team.color }}
                                    />
                                    {team.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-semibold">{team.points}</TableCell>
                                <TableCell className="text-center">{team.totalGames}</TableCell>
                                <TableCell className="text-center">{team.wins}</TableCell>
                                <TableCell className="text-center">{team.draws}</TableCell>
                                <TableCell className="text-center">{team.losses}</TableCell>
                                <TableCell className="text-center font-medium">{team.goalsScored}</TableCell>
                                <TableCell className="text-center">{team.goalsConceded}</TableCell>
                                <TableCell className="text-center">{team.winRate}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Mobile view */}
                      <div className="grid grid-cols-1 gap-4 md:hidden">
                        {teamStats.map((team, index) => (
                          <Card key={team.id}>
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                {/* Header com posição, nome e cor do time */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium
                                      ${index === 0 ? 'bg-amber-100 text-amber-800' : 
                                        index === 1 ? 'bg-slate-200 text-slate-800' : 
                                        index === 2 ? 'bg-amber-900/20 text-amber-900' :
                                        'bg-gray-100 text-gray-600'}`
                                    }>
                                      {index + 1}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-4 h-4 rounded border border-gray-200" 
                                        style={{ backgroundColor: team.color }}
                                      />
                                      <span className="font-medium text-lg">{team.name}</span>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="font-semibold">
                                    {team.points} pts
                                  </Badge>
                                </div>
                                
                                {/* Estatísticas principais */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Jogos</p>
                                    <p className="font-medium">{team.totalGames}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Vitórias</p>
                                    <p className="font-medium">{team.wins}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Aproveit.</p>
                                    <p className="font-medium">{team.winRate}</p>
                                  </div>
                                </div>
                                
                                {/* Estatísticas detalhadas */}
                                <div className="space-y-2 pt-2 border-t">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Empates</span>
                                    <span>{team.draws}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Derrotas</span>
                                    <span>{team.losses}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Gols Marcados</span>
                                    <span className="font-medium">{team.goalsScored}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Gols Sofridos</span>
                                    <span>{team.goalsConceded}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum dado disponível para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="players" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking de Jogadores</CardTitle>
                  <CardDescription>
                    Performance individual dos jogadores em 
                    {selectedYear === "all" 
                      ? " todos os anos" 
                      : selectedMonth === "all" 
                        ? ` ${selectedYear}` 
                        : ` ${monthNames[parseInt(selectedMonth) - 1]} de ${selectedYear}`}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
                    </div>
                  ) : playerStats.length > 0 ? (
                    <>
                      <div className="hidden md:block rounded-md border overflow-hidden">
                        <Table className="player-ranking-table">
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-16 text-center font-semibold">Posição</TableHead>
                              <TableHead className="font-semibold">Jogador</TableHead>
                              <TableHead 
                                className="text-center font-semibold cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (sortField === 'points') {
                                    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                                  } else {
                                    setSortField('points');
                                    setSortDirection('desc');
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <span>Pontos</span>
                                  {sortField === 'points' 
                                    ? sortDirection === 'desc'
                                      ? <ArrowDown className="ml-1 h-4 w-4 text-futconnect-600" />
                                      : <ArrowUp className="ml-1 h-4 w-4 text-futconnect-600" />
                                    : <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground opacity-50" />
                                  }
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-center font-semibold cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (sortField === 'pointsAverage') {
                                    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                                  } else {
                                    setSortField('pointsAverage');
                                    setSortDirection('desc');
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <span>Média de Pontos</span>
                                  {sortField === 'pointsAverage'
                                    ? sortDirection === 'desc'
                                      ? <ArrowDown className="ml-1 h-4 w-4 text-futconnect-600" />
                                      : <ArrowUp className="ml-1 h-4 w-4 text-futconnect-600" />
                                    : <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground opacity-50" />
                                  }
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">Jogos</TableHead>
                              <TableHead 
                                className="text-center font-semibold cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (sortField === 'wins') {
                                    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                                  } else {
                                    setSortField('wins');
                                    setSortDirection('desc');
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <span>Vitórias</span>
                                  {sortField === 'wins'
                                    ? sortDirection === 'desc'
                                      ? <ArrowDown className="ml-1 h-4 w-4 text-futconnect-600" />
                                      : <ArrowUp className="ml-1 h-4 w-4 text-futconnect-600" />
                                    : <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground opacity-50" />
                                  }
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">Empates</TableHead>
                              <TableHead className="text-center font-semibold">Derrotas</TableHead>
                              <TableHead className="text-center font-semibold">Gols</TableHead>
                              <TableHead className="text-center font-semibold">Gols Contra</TableHead>
                              <TableHead className="text-center font-semibold">Média de Gols</TableHead>
                              <TableHead className="text-center font-semibold">Defesas</TableHead>
                              <TableHead 
                                className="text-center font-semibold cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (sortField === 'winRate') {
                                    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                                  } else {
                                    setSortField('winRate');
                                    setSortDirection('desc');
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <span>Aproveitamento</span>
                                  {sortField === 'winRate'
                                    ? sortDirection === 'desc'
                                      ? <ArrowDown className="ml-1 h-4 w-4 text-futconnect-600" />
                                      : <ArrowUp className="ml-1 h-4 w-4 text-futconnect-600" />
                                    : <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground opacity-50" />
                                  }
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...playerStats]
                              .sort((a, b) => {
                                let aValue, bValue;
                                switch (sortField) {
                                  case 'points':
                                    aValue = a.points;
                                    bValue = b.points;
                                    break;
                                  case 'pointsAverage':
                                    aValue = a.points / a.games;
                                    bValue = b.points / b.games;
                                    break;
                                  case 'wins':
                                    aValue = a.wins;
                                    bValue = b.wins;
                                    break;
                                  case 'winRate':
                                    aValue = parseFloat(a.winRate.replace('%', ''));
                                    bValue = parseFloat(b.winRate.replace('%', ''));
                                    break;
                                  default:
                                    aValue = a.points;
                                    bValue = b.points;
                                }
                                return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
                              })
                              .map((player, index) => (
                              <TableRow 
                                key={player.id}
                                className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                              >
                                <TableCell className="text-center font-medium">
                                  {index < 3 ? (
                                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full 
                                      ${index === 0 ? 'bg-amber-100 text-amber-800' : 
                                        index === 1 ? 'bg-slate-200 text-slate-800' : 
                                        'bg-amber-900/20 text-amber-900'}`
                                    }>
                                      {index + 1}
                                    </div>
                                  ) : (
                                    index + 1
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{player.name}</TableCell>
                                <TableCell className="text-center font-semibold">{player.points.toFixed(1)}</TableCell>
                                <TableCell className="text-center font-semibold">{(player.points / player.games).toFixed(2)}</TableCell>
                                <TableCell className="text-center">{player.games}</TableCell>
                                <TableCell className="text-center">{player.wins}</TableCell>
                                <TableCell className="text-center">{player.draws}</TableCell>
                                <TableCell className="text-center">{player.losses}</TableCell>
                                <TableCell className="text-center">{player.goals}</TableCell>
                                <TableCell className="text-center">{player.ownGoals}</TableCell>
                                <TableCell className="text-center">{player.goalAverage.toFixed(2)}</TableCell>
                                <TableCell className="text-center">{player.saves}</TableCell>
                                <TableCell className="text-center">{player.winRate}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile view */}
                      <div className="grid grid-cols-1 gap-4 md:hidden">
                        {[...playerStats]
                          .sort((a, b) => {
                            let aValue, bValue;
                            switch (sortField) {
                              case 'points':
                                aValue = a.points;
                                bValue = b.points;
                                break;
                              case 'pointsAverage':
                                aValue = a.points / a.games;
                                bValue = b.points / b.games;
                                break;
                              case 'wins':
                                aValue = a.wins;
                                bValue = b.wins;
                                break;
                              case 'winRate':
                                aValue = parseFloat(a.winRate.replace('%', ''));
                                bValue = parseFloat(b.winRate.replace('%', ''));
                                break;
                              default:
                                aValue = a.points;
                                bValue = b.points;
                            }
                            return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
                          })
                          .map((player, index) => (
                          <Card key={player.id}>
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                {/* Header com posição, nome e pontos */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium
                                      ${index === 0 ? 'bg-amber-100 text-amber-800' : 
                                        index === 1 ? 'bg-slate-200 text-slate-800' : 
                                        index === 2 ? 'bg-amber-900/20 text-amber-900' :
                                        'bg-gray-100 text-gray-600'}`
                                    }>
                                      {index + 1}
                                    </div>
                                    <span className="font-medium text-lg">{player.name}</span>
                                  </div>
                                  <Badge variant="outline" className="font-semibold">
                                    {player.points.toFixed(1)} pts
                                  </Badge>
                                </div>

                                {/* Estatísticas principais */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Jogos</p>
                                    <p className="font-medium">{player.games}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Vitórias</p>
                                    <p className="font-medium">{player.wins}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Aproveit.</p>
                                    <p className="font-medium">{player.winRate}</p>
                                  </div>
                                </div>

                                {/* Estatísticas de gols */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Gols</p>
                                    <p className="font-medium">{player.goals}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Média</p>
                                    <p className="font-medium">{player.goalAverage.toFixed(2)}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Defesas</p>
                                    <p className="font-medium">{player.saves}</p>
                                  </div>
                                </div>

                                {/* Estatísticas detalhadas */}
                                <div className="space-y-2 pt-2 border-t">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Empates</span>
                                    <span>{player.draws}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Derrotas</span>
                                    <span>{player.losses}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Gols Contra</span>
                                    <span>{player.ownGoals}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="mt-6 p-4 bg-slate-50 rounded-md border">
                        <h3 className="font-medium text-slate-900 mb-2">Critérios de Pontuação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Jogo:</span> 1 ponto
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Gol Marcado:</span> 1 ponto
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Gol Contra:</span> -1 ponto
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Vitória:</span> 3 pontos
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Empate:</span> 1 ponto
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Derrota:</span> 0 pontos
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Defesa:</span> 0,20 pontos
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-slate-600">
                          <p><span className="font-medium">Critérios de desempate:</span> 1° Número de jogos, 2° Média de gols</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum dado disponível para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="participation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking de Participação</CardTitle>
                  <CardDescription>
                    Classificação de participação dos sócios 
                    {selectedYear === "all" 
                      ? " considerando todos os anos" 
                      : selectedMonth === "all" 
                        ? ` em ${selectedYear}` 
                        : ` em ${monthNames[parseInt(selectedMonth) - 1]} de ${selectedYear}`}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {isLoadingParticipation ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
                    </div>
                  ) : participationRanking.length > 0 ? (
                    <>
                      <div className="hidden md:block rounded-md border overflow-hidden">
                        <Table className="player-ranking-table">
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-16 text-center font-semibold">Posição</TableHead>
                              <TableHead className="font-semibold">Jogador</TableHead>
                              <TableHead 
                                className="text-center font-semibold cursor-pointer hover:bg-slate-50"
                                onClick={() => {
                                  if (participationSortField === 'points') {
                                    setParticipationSortDirection(participationSortDirection === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setParticipationSortField('points');
                                    setParticipationSortDirection('desc');
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <span>Pontos</span>
                                  <div className="ml-1">
                                    {participationSortField === 'points' ? (
                                      participationSortDirection === 'desc' ? 
                                        <ArrowDown className="h-4 w-4" /> : 
                                        <ArrowUp className="h-4 w-4" />
                                    ) : (
                                      <ArrowDown className="h-4 w-4 text-muted-foreground/30" />
                                    )}
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-center font-semibold cursor-pointer hover:bg-slate-50"
                                onClick={() => {
                                  if (participationSortField === 'participationRate') {
                                    setParticipationSortDirection(participationSortDirection === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setParticipationSortField('participationRate');
                                    setParticipationSortDirection('desc');
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <span>Taxa de Participação Total</span>
                                  <div className="ml-1">
                                    {participationSortField === 'participationRate' ? (
                                      participationSortDirection === 'desc' ? 
                                        <ArrowDown className="h-4 w-4" /> : 
                                        <ArrowUp className="h-4 w-4" />
                                    ) : (
                                      <ArrowDown className="h-4 w-4 text-muted-foreground/30" />
                                    )}
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-center font-semibold cursor-pointer hover:bg-slate-50"
                                onClick={() => {
                                  if (participationSortField === 'effectiveParticipationRate') {
                                    setParticipationSortDirection(participationSortDirection === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setParticipationSortField('effectiveParticipationRate');
                                    setParticipationSortDirection('desc');
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <span>Taxa de Participação Efetiva</span>
                                  <div className="ml-1">
                                    {participationSortField === 'effectiveParticipationRate' ? (
                                      participationSortDirection === 'desc' ? 
                                        <ArrowDown className="h-4 w-4" /> : 
                                        <ArrowUp className="h-4 w-4" />
                                    ) : (
                                      <ArrowDown className="h-4 w-4 text-muted-foreground/30" />
                                    )}
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">Jogos</TableHead>
                              <TableHead className="text-center font-semibold">Tempo de Associação (anos)</TableHead>
                              <TableHead className="text-center font-semibold">Idade (anos)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...participationRanking]
                              .sort((a, b) => {
                                const getValue = (player: typeof a) => {
                                  switch (participationSortField) {
                                    case 'points':
                                      return player.points;
                                    case 'participationRate':
                                      return player.participationRate;
                                    case 'effectiveParticipationRate':
                                      return player.effectiveParticipationRate;
                                    default:
                                      return 0;
                                  }
                                };
                                
                                const aValue = getValue(a);
                                const bValue = getValue(b);
                                
                                return participationSortDirection === 'asc'
                                  ? aValue - bValue
                                  : bValue - aValue;
                              })
                              .map((player, index) => (
                              <TableRow 
                                key={player.id}
                                className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                              >
                                <TableCell className="text-center font-medium">
                                  {index < 3 ? (
                                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full 
                                      ${index === 0 ? 'bg-amber-100 text-amber-800' : 
                                        index === 1 ? 'bg-slate-200 text-slate-800' : 
                                        'bg-amber-900/20 text-amber-900'}`
                                    }>
                                      {index + 1}
                                    </div>
                                  ) : (
                                    index + 1
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{player.nickname}</TableCell>
                                <TableCell className="text-center font-semibold">{player.points.toFixed(2)}</TableCell>
                                <TableCell className="text-center">
                                  {player.participationRate ? `${player.participationRate.toFixed(2)}%` : '0.00%'}
                                </TableCell>
                                <TableCell className="text-center">
                                  {player.effectiveParticipationRate ? `${player.effectiveParticipationRate.toFixed(2)}%` : '0.00%'}
                                </TableCell>
                                <TableCell className="text-center">{player.games}</TableCell>
                                <TableCell className="text-center">{(player.membershipTime / 365).toFixed(1)}</TableCell>
                                <TableCell className="text-center">{player.age}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="mt-6 p-4 bg-slate-50 rounded-md border">
                        <h3 className="font-medium text-slate-900 mb-2">Cálculo de Participação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Taxa de Participação Total:</span>
                            <p className="text-sm text-slate-600 mt-1">Porcentagem de jogos que o sócio participou em relação ao total de jogos do clube no período selecionado.</p>
                            <p className="text-sm text-slate-600 mt-1">Exemplo: Se o clube realizou 20 jogos e o sócio participou de 15, sua taxa é de 75%.</p>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-semibold">Taxa de Participação Efetiva:</span>
                            <p className="text-sm text-slate-600 mt-1">Porcentagem de jogos que o sócio participou considerando apenas os jogos realizados após sua data de associação ao clube.</p>
                            <p className="text-sm text-slate-600 mt-1">Exemplo: Se após a associação ocorreram 10 jogos e o sócio participou de 8, sua taxa efetiva é de 80%.</p>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-slate-600">
                          <p><span className="font-medium">Critérios de ordenação:</span> A tabela pode ser ordenada por pontos, taxa de participação total ou taxa de participação efetiva.</p>
                        </div>
                      </div>

                      {/* Mobile view */}
                      <div className="grid grid-cols-1 gap-4 md:hidden">
                        {[...participationRanking]
                          .sort((a, b) => {
                            const getValue = (player: typeof a) => {
                              switch (participationSortField) {
                                case 'points':
                                  return player.points;
                                case 'participationRate':
                                  return player.participationRate;
                                case 'effectiveParticipationRate':
                                  return player.effectiveParticipationRate;
                                default:
                                  return 0;
                              }
                            };
                            
                            const aValue = getValue(a);
                            const bValue = getValue(b);
                            
                            return participationSortDirection === 'asc'
                              ? aValue - bValue
                              : bValue - aValue;
                          })
                          .map((player, index) => (
                          <Card key={player.id}>
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                {/* Header com posição, nome e pontos */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium
                                      ${index === 0 ? 'bg-amber-100 text-amber-800' : 
                                        index === 1 ? 'bg-slate-200 text-slate-800' : 
                                        index === 2 ? 'bg-amber-900/20 text-amber-900' :
                                        'bg-gray-100 text-gray-600'}`
                                    }>
                                      {index + 1}
                                    </div>
                                    <span className="font-medium text-lg">{player.name}</span>
                                  </div>
                                  <Badge variant="outline" className="font-semibold">
                                    {player.points.toFixed(2)} pts
                                  </Badge>
                                </div>

                                {/* Estatísticas principais */}
                                <div className="grid grid-cols-2 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Taxa Total</p>
                                    <p className="font-medium">{player.participationRate.toFixed(2)}%</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Taxa Efetiva</p>
                                    <p className="font-medium">{player.effectiveParticipationRate.toFixed(2)}%</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-slate-50">
                                    <p className="text-sm text-muted-foreground">Jogos</p>
                                    <p className="font-medium">{player.games}</p>
                                  </div>
                                </div>

                                {/* Informações adicionais */}
                                <div className="space-y-2 pt-2 border-t">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Tempo de Associação</span>
                                    <span>{player.membershipTime} dias</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Idade</span>
                                    <span>{player.age} anos</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum dado disponível para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="highlights">
              <Card>
                <CardHeader>
                  <CardTitle>Destaques</CardTitle>
                  <CardDescription>
                    Jogadores que foram eleitos destaques das partidas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingHighlights ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
                    </div>
                  ) : highlights.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum destaque encontrado para o período selecionado.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {highlights.map((highlight, index) => (
                        <div key={index} className="border border-amber-200 rounded-md p-4 bg-amber-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Trophy className="h-6 w-6 text-amber-500" />
                              <div>
                                <div className="font-bold text-amber-700">
                                  {highlight.nickname}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {highlight.date} - {highlight.field}
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              {highlight.votes} {highlight.votes === 1 ? 'voto' : 'votos'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Footer section visible only in PDF export */}
            <div className="pdf-footer hidden">
              <p className="text-xs text-gray-500 mt-4 text-right">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default GamePerformance;
