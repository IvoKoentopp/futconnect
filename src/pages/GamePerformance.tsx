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
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const currentYear = new Date().getFullYear();
  
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [participationRanking, setParticipationRanking] = useState<ParticipationRankingStats[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingParticipation, setIsLoadingParticipation] = useState(true);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);
  const [activeTab, setActiveTab] = useState("teams");
  
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
        
        // Generate array of years from earliest to current
        const years = ["all"];
        for (let year = currentYear; year >= earliestYear; year--) {
          years.push(year.toString());
        }
        
        setAvailableYears(years);
      } catch (error) {
        console.error('Error determining available years:', error);
        // Fallback to showing last 5 years if there's an error
        const fallbackYears = ["all", ...Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())];
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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Performance</h1>
          
          <div className="flex items-center space-x-2">
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
                    <div className="rounded-md border overflow-hidden">
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
                      <div className="rounded-md border overflow-hidden">
                        <Table className="player-ranking-table">
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-16 text-center font-semibold">Posição</TableHead>
                              <TableHead className="font-semibold">Jogador</TableHead>
                              <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center">
                                  <span>Pontos</span>
                                  <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">Jogos</TableHead>
                              <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center">
                                  <span>Vitórias</span>
                                  <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground" />
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">Empates</TableHead>
                              <TableHead className="text-center font-semibold">Derrotas</TableHead>
                              <TableHead className="text-center font-semibold">Gols</TableHead>
                              <TableHead className="text-center font-semibold">Gols Contra</TableHead>
                              <TableHead className="text-center font-semibold">Média de Gols</TableHead>
                              <TableHead className="text-center font-semibold">Defesas</TableHead>
                              <TableHead className="text-center font-semibold">Aproveitamento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {playerStats.map((player, index) => (
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
                    <div className="rounded-md border overflow-hidden">
                      <Table className="player-ranking-table">
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-16 text-center font-semibold">Posição</TableHead>
                            <TableHead className="font-semibold">Jogador</TableHead>
                            <TableHead className="text-center font-semibold">
                              <div className="flex items-center justify-center">
                                <span>Pontos</span>
                                <ArrowDown className="ml-1 h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableHead>
                            <TableHead className="text-center font-semibold">Taxa de Participação</TableHead>
                            <TableHead className="text-center font-semibold">Jogos</TableHead>
                            <TableHead className="text-center font-semibold">Tempo de Associação (dias)</TableHead>
                            <TableHead className="text-center font-semibold">Idade (anos)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participationRanking.map((player, index) => (
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
                              <TableCell className="text-center font-semibold">{player.points.toFixed(2)}</TableCell>
                              <TableCell className="text-center">
                                {player.participationRate ? `${player.participationRate.toFixed(2)}%` : '0.00%'}
                              </TableCell>
                              <TableCell className="text-center">{player.games}</TableCell>
                              <TableCell className="text-center">{player.membershipTime}</TableCell>
                              <TableCell className="text-center">{player.age}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
