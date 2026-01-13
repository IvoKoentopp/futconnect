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
  
  // Função para obter o texto do período selecionado
  const getPeriodText = (formatted = false) => {
    if (selectedYear === "all") {
      return formatted ? "Todos os Anos" : "Todos_Anos";
    } else if (selectedMonth === "all") {
      return formatted ? `Ano de ${selectedYear}` : `Ano_${selectedYear}`;
    } else {
      return formatted 
        ? `${monthNames[parseInt(selectedMonth) - 1]} de ${selectedYear}` 
        : `${monthNames[parseInt(selectedMonth) - 1]}_${selectedYear}`;
    }
  };

  // Função principal para gerar PDF
  const generatePDF = () => {
    try {
      // Mostrar toast informativo
      toast({
        title: "Gerando PDF",
        description: "Por favor aguarde enquanto o relatório é gerado."
      });
      
      // Chamar a função específica com base na aba ativa
      switch(activeTab) {
        case "teams":
          generateTeamsReport();
          break;
        case "players":
          generatePlayersReport();
          break;
        case "participation":
          generateParticipationReport();
          break;
        case "highlights":
          generateHighlightsReport();
          break;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o arquivo PDF"
      });
    }
  };
  
  // Gerar relatório de times
  const generateTeamsReport = () => {
    // Importar jsPDF e autoTable dinamicamente para evitar problemas de SSR
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then((autoTableModule) => {
        const autoTable = autoTableModule.default;
        
        // Criar documento em orientação vertical (retrato)
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Cabeçalho com fundo colorido
        doc.setFillColor(25, 33, 57); // Cor escura do FutConnect
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('Relatório de Desempenho de Times', pageWidth/2, 12, { align: 'center' });
        
        // Título e informações centralizadas
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(`Clube: ${clubName}`, pageWidth/2, 30, { align: 'center' });
        doc.text(`Período: ${getPeriodText(true)}`, pageWidth/2, 38, { align: 'center' });
        
        // Definir larguras das colunas
        const colPosicao = 10;       // Posição
        const colTime = 40;          // Time
        const colPontos = 12;        // Pontos
        const colJogos = 10;         // Jogos
        const colVitorias = 10;      // Vitórias
        const colEmpates = 10;       // Empates
        const colDerrotas = 10;      // Derrotas
        const colGolsMarcados = 12;  // Gols Marcados
        const colGolsSofridos = 12;  // Gols Sofridos
        const colAproveit = 20;      // Aproveitamento
        
        // Calcular largura total da tabela
        const tableWidth = colPosicao + colTime + colPontos + colJogos + colVitorias + 
                          colEmpates + colDerrotas + colGolsMarcados + colGolsSofridos + colAproveit;
        
        // Calcular margens para centralizar a tabela
        const marginX = Math.max((pageWidth - tableWidth) / 2, 5); // Garantir margem mínima de 5mm
        
        // Gerar tabela centralizada
        autoTable(doc, {
          startY: 45,
          head: [['Pos.', 'Time', 'Pts', 'J', 'V', 'E', 'D', 'GM', 'GS', 'Aproveit.']],
          body: teamStats.map((team, index) => [
            index + 1,
            team.name,
            team.points,
            team.totalGames,
            team.wins,
            team.draws,
            team.losses,
            team.goalsScored,
            team.goalsConceded,
            team.winRate
          ]),
          styles: { 
            fontSize: 9, 
            cellPadding: 2,
            halign: 'center',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [25, 33, 57], 
            fontSize: 9, 
            halign: 'center',
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          columnStyles: {
            0: { cellWidth: colPosicao, halign: 'center' },
            1: { cellWidth: colTime, halign: 'left' },     // Alinhar nomes à esquerda
            2: { cellWidth: colPontos, halign: 'center' },
            3: { cellWidth: colJogos, halign: 'center' },
            4: { cellWidth: colVitorias, halign: 'center' },
            5: { cellWidth: colEmpates, halign: 'center' },
            6: { cellWidth: colDerrotas, halign: 'center' },
            7: { cellWidth: colGolsMarcados, halign: 'center' },
            8: { cellWidth: colGolsSofridos, halign: 'center' },
            9: { cellWidth: colAproveit, halign: 'center' }
          },
          margin: { left: marginX, right: marginX },
          didDrawPage: (data) => {
            // Adicionar rodapé em cada página
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const pageInfo = `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()}`;
            doc.text('FutConnect - Relatório de Times', pageWidth/2, pageHeight - 10, { align: 'center' });
            doc.text(pageInfo, pageWidth/2, pageHeight - 5, { align: 'center' });
          }
        });
        
        // Salvar o PDF
        doc.save(`Times_${clubName.replace(/\s+/g, '_')}_${getPeriodText()}.pdf`);
        
        // Notificar o usuário
        toast({
          title: "PDF Gerado",
          description: "O relatório de times foi gerado com sucesso."
        });
      });
    });
  };
  
  // Gerar relatório de jogadores
  const generatePlayersReport = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then((autoTableModule) => {
        const autoTable = autoTableModule.default;
        
        // Criar documento em orientação vertical (retrato)
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Cabeçalho com fundo colorido
        doc.setFillColor(25, 33, 57);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('Ranking de Jogadores', pageWidth/2, 12, { align: 'center' });
        
        // Título e informações centralizadas
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(`Clube: ${clubName}`, pageWidth/2, 30, { align: 'center' });
        doc.text(`Período: ${getPeriodText(true)}`, pageWidth/2, 38, { align: 'center' });
        
        // Definir larguras das colunas
        const colPosicao = 10;      // Posição
        const colJogador = 40;      // Jogador
        const colPontos = 15;       // Pontos
        const colVitorias = 15;     // Vitórias
        const colEmpates = 15;      // Empates
        const colDerrotas = 15;     // Derrotas
        const colGols = 15;         // Gols
        const colGolsContra = 15;   // Gols Contra
        const colDefesas = 15;      // Defesas
        
        // Calcular largura total da tabela
        const tableWidth = colPosicao + colJogador + colPontos + colVitorias + colEmpates + 
                          colDerrotas + colGols + colGolsContra + colDefesas;
        
        // Calcular margens para centralizar a tabela
        const marginX = Math.max((pageWidth - tableWidth) / 2, 5); // Garantir margem mínima de 5mm
        
        // Formatar pontos com uma casa decimal
        const formatarPontos = (pontos: number) => pontos.toFixed(1);
        
        // Gerar tabela centralizada com as colunas solicitadas
        autoTable(doc, {
          startY: 45,
          head: [['Pos.', 'Jogador', 'Pontos', 'Vit.', 'Emp.', 'Der.', 'Gols', 'G.C.', 'Def.']],
          body: playerStats.map((player, index) => [
            index + 1,
            player.nickname || player.name,
            formatarPontos(player.points),
            player.wins,
            player.draws,
            player.losses,
            player.goals,
            player.ownGoals,
            player.saves
          ]),
          styles: { 
            fontSize: 9, 
            cellPadding: 2,
            halign: 'center',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [25, 33, 57], 
            fontSize: 9, 
            halign: 'center',
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          columnStyles: {
            0: { cellWidth: colPosicao, halign: 'center' },
            1: { cellWidth: colJogador, halign: 'left' },   // Alinhar nomes à esquerda
            2: { cellWidth: colPontos, halign: 'center' },
            3: { cellWidth: colVitorias, halign: 'center' },
            4: { cellWidth: colEmpates, halign: 'center' },
            5: { cellWidth: colDerrotas, halign: 'center' },
            6: { cellWidth: colGols, halign: 'center' },
            7: { cellWidth: colGolsContra, halign: 'center' },
            8: { cellWidth: colDefesas, halign: 'center' }
          },
          margin: { left: marginX, right: marginX },
          didDrawPage: (data) => {
            // Adicionar rodapé em cada página
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const pageInfo = `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()}`;
            doc.text('FutConnect - Relatório de Jogadores', pageWidth/2, pageHeight - 10, { align: 'center' });
            doc.text(pageInfo, pageWidth/2, pageHeight - 5, { align: 'center' });
          }
        });
        
        // Salvar o PDF
        doc.save(`Jogadores_${clubName.replace(/\s+/g, '_')}_${getPeriodText()}.pdf`);
        
        // Notificar o usuário
        toast({
          title: "PDF Gerado",
          description: "O ranking de jogadores foi gerado com sucesso."
        });
      });
    });
  };
  
  // Gerar relatório de participação
  const generateParticipationReport = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then((autoTableModule) => {
        const autoTable = autoTableModule.default;
        
        // Criar documento em orientação vertical (retrato)
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Cabeçalho com fundo colorido
        doc.setFillColor(25, 33, 57); // Cor escura do FutConnect
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('Ranking de Participação', pageWidth/2, 12, { align: 'center' });
        
        // Título e informações centralizadas
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(`Clube: ${clubName}`, pageWidth/2, 30, { align: 'center' });
        doc.text(`Período: ${getPeriodText(true)}`, pageWidth/2, 38, { align: 'center' });
        
        // Definir larguras das colunas
        const colPosicao = 12;
        const colJogador = 40;
        const colPontos = 20;
        const colJogos = 15;
        const colPartTotal = 25;
        const colPartEfetiva = 25;
        
        // Calcular largura total da tabela
        const tableWidth = colPosicao + colJogador + colPontos + colJogos + colPartTotal + colPartEfetiva;
        
        // Calcular margens para centralizar a tabela
        const marginX = Math.max((pageWidth - tableWidth) / 2, 10); // Garantir margem mínima de 10mm
        
        // Gerar tabela centralizada
        autoTable(doc, {
          startY: 45,
          head: [['Pos.', 'Jogador', 'Pontos', 'Jogos', 'Part. Total', 'Part. Efetiva']],
          body: participationRanking.map((player, index) => [
            index + 1,
            player.nickname || player.name,
            player.points,
            player.games,
            `${player.participationRate}%`,
            `${player.effectiveParticipationRate}%`
          ]),
          styles: { 
            fontSize: 10, 
            cellPadding: 2,
            halign: 'center', // Centralizar todo o conteúdo por padrão
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [25, 33, 57], 
            fontSize: 9, 
            halign: 'center',
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          columnStyles: {
            0: { cellWidth: colPosicao, halign: 'center' },
            1: { cellWidth: colJogador, halign: 'left' },   // Alinhar nomes à esquerda
            2: { cellWidth: colPontos, halign: 'center' },
            3: { cellWidth: colJogos, halign: 'center' },
            4: { cellWidth: colPartTotal, halign: 'center' },
            5: { cellWidth: colPartEfetiva, halign: 'center' }
          },
          margin: { left: marginX, right: marginX },
          didDrawPage: (data) => {
            // Adicionar rodapé em cada página
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const pageInfo = `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()}`;
            doc.text('FutConnect - Relatório de Participação', pageWidth/2, pageHeight - 10, { align: 'center' });
            doc.text(pageInfo, pageWidth/2, pageHeight - 5, { align: 'center' });
          }
        });
        
        // Salvar o PDF
        doc.save(`Participacao_${clubName.replace(/\s+/g, '_')}_${getPeriodText()}.pdf`);
        
        // Notificar o usuário
        toast({
          title: "PDF Gerado",
          description: "O ranking de participação foi gerado com sucesso."
        });
      });
    });
  };
  
  // Gerar relatório de destaques
  const generateHighlightsReport = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then((autoTableModule) => {
        const autoTable = autoTableModule.default;
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Cabeçalho
        doc.setFillColor(25, 33, 57);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('Relatório de Jogadores Destaque', pageWidth/2, 12, { align: 'center' });
        
        // Informações do clube e período
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Clube: ${clubName}`, 15, 30);
        doc.text(`Período: ${getPeriodText(true)}`, 15, 38);
        
        // Tabela de destaques
        autoTable(doc, {
          startY: 45,
          head: [['Data', 'Campo', 'Jogador', 'Votos']],
          body: highlights.map(highlight => [
            highlight.date,
            highlight.field || 'Não informado',
            highlight.nickname,
            highlight.votes
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [25, 33, 57] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        
        // Rodapé
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(`FutConnect - Página ${i} de ${pageCount}`, pageWidth/2, pageHeight - 10, { align: 'center' });
        }
        
        doc.save(`Destaques_${clubName.replace(/\s+/g, '_')}_${getPeriodText()}.pdf`);
        
        toast({
          title: "PDF Gerado",
          description: "O relatório de destaques foi gerado com sucesso."
        });
      });
    });
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
      if (!clubId || !(activeTab === 'teams' || activeTab === 'players')) return;
      
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
  }, [clubId, selectedYear, selectedMonth, activeTab]);

  useEffect(() => {
    const fetchParticipationRanking = async () => {
      if (!clubId || activeTab !== 'participation') return;
      
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
  }, [clubId, selectedYear, selectedMonth, activeTab]);

  useEffect(() => {
    const fetchHighlights = async () => {
      if (!clubId || activeTab !== 'highlights') return;
      setIsLoadingHighlights(true);
      try {
        // Buscar destaques diretamente na tabela game_highlights
        let query = supabase
          .from('game_highlights')
          .select(`
            id,
            game_id,
            votes_count,
            is_winner,
            member:member_id (name, nickname, photo_url),
            game:game_id (date, location, club_id)
          `)
          .eq('is_winner', true)
          .eq('game.club_id', clubId);

        // Remover filtros por data na query, pois game.date não existe em game_highlights
        // Filtros de ano/mês serão aplicados após o fetch, em memória

        // Não ordenar na query, pois 'date' não existe em game_highlights nem pode ser usada como foreignTable
        const { data, error } = await query;
        if (error) {
          throw error;
        }
        // Filtrar por ano/mês em memória
        let filteredData = data || [];
        if (selectedYear !== "all") {
          filteredData = filteredData.filter((highlight: any) => {
            const gameDate = highlight.game?.date ? new Date(highlight.game.date) : null;
            if (!gameDate) return false;
            if (gameDate.getFullYear() !== parseInt(selectedYear)) return false;
            if (selectedMonth !== "all") {
              if (gameDate.getMonth() + 1 !== parseInt(selectedMonth)) return false;
            }
            return true;
          });
        }
        // Ordenar por data do jogo em memória (mais recentes primeiro)
        filteredData.sort((a: any, b: any) => {
          const dateA = a.game?.date ? new Date(a.game.date).getTime() : 0;
          const dateB = b.game?.date ? new Date(b.game.date).getTime() : 0;
          return dateB - dateA;
        });
        // Formatar os destaques para exibição
        const formattedHighlights: Highlight[] = filteredData.map((highlight: any) => ({
          date: highlight.game?.date ? new Date(highlight.game.date).toLocaleDateString('pt-BR') : '',
          field: highlight.game?.location || 'Não informado',
          nickname: highlight.member?.nickname || highlight.member?.name || 'Sem nome',
          votes: highlight.votes_count || 0,
          is_winner: highlight.is_winner
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
  }, [clubId, selectedYear, selectedMonth, activeTab]);

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
                                        index === 2 ? 'bg-amber-900/20 text-amber-900' :
                                        'bg-gray-100 text-gray-600'}`
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
                                <TableCell className="text-center">
                                  {player.membershipYears.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center">{player.age}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
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
                                    <span>
                                      {player.membershipYears.toFixed(2)} anos
                                    </span>
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
