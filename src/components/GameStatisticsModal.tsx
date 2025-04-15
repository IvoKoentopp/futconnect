import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Goal, ShieldAlert, AlertTriangle, Users, FileText } from 'lucide-react';
import { GameEventWithMember, getTeamDisplayName } from '@/types/game';
import { gameService } from '@/services/gameService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { PlayerActionsPopup } from './PlayerActionsPopup';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeamConfiguration {
  id: string;
  team_name: string;
  team_color: string;
}

interface GameStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
}

export function GameStatisticsModal({ isOpen, onClose, gameId }: GameStatisticsModalProps) {
  const [events, setEvents] = useState<GameEventWithMember[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string, nickname: string, team: string } | null>(null);
  const [isPlayerActionsOpen, setIsPlayerActionsOpen] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [gameData, setGameData] = useState<any>(null);
  const [totalSaves, setTotalSaves] = useState(0);
  const [totalGoals, setTotalGoals] = useState(0);
  const [teamConfigurations, setTeamConfigurations] = useState<TeamConfiguration[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (isOpen && gameId) {
      fetchGameData().then(() => {
        fetchTeamsAndEvents();
      });
    }
  }, [isOpen, gameId]);
  
  const fetchGameData = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('title, date, club_id, status')
        .eq('id', gameId)
        .single();
      
      if (error) throw error;
      setGameData(data);
      
      // Fetch team configurations for this club
      if (data && data.club_id) {
        fetchTeamConfigurations(data.club_id);
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
    }
  };

  const fetchTeamConfigurations = async (clubId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_configurations')
        .select('*')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Use default configurations if none found
        setTeamConfigurations([
          { id: 'white', team_name: 'Time Branco', team_color: '#ffffff' },
          { id: 'green', team_name: 'Time Verde', team_color: '#4ade80' },
          { id: 'yellow', team_name: 'Time Amarelo', team_color: '#facc15' }
        ]);
      } else {
        setTeamConfigurations(data);
      }
    } catch (error) {
      console.error('Error fetching team configurations:', error);
      // Use default configurations if error
      setTeamConfigurations([
        { id: 'white', team_name: 'Time Branco', team_color: '#ffffff' },
        { id: 'green', team_name: 'Time Verde', team_color: '#4ade80' },
        { id: 'yellow', team_name: 'Time Amarelo', team_color: '#facc15' }
      ]);
    }
  };
  
  const fetchTeamsAndEvents = async () => {
    setIsLoading(true);
    try {
      // First, check if there's an active team formation for this game
      const { data: teamFormations, error: teamFormationsError } = await supabase
        .from('team_formations')
        .select('id')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .limit(1);
      
      if (teamFormationsError) throw teamFormationsError;
      
      let activeTeams: string[] = [];
      
      if (teamFormations && teamFormations.length > 0) {
        const teamFormationId = teamFormations[0].id;
        
        // Fetch team members from the active team formation
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('team_members')
          .select('member_id, team, members(id, name, nickname, status)')
          .eq('team_formation_id', teamFormationId);
        
        if (teamMembersError) throw teamMembersError;
        
        // Organize players by team
        const players: Record<string, any[]> = {};
        const teamsSet = new Set<string>();
        
        teamMembers.forEach(member => {
          const team = member.team;
          if (!players[team]) {
            players[team] = [];
            teamsSet.add(team);
          }
          
          players[team].push({
            id: member.member_id,
            name: member.members?.name || 'Unknown',
            nickname: member.members?.nickname || member.members?.name || 'Unknown'
          });
        });
        
        setTeamPlayers(players);
        activeTeams = Array.from(teamsSet);
      } else {
        // If no active team formation, use confirmed game participants
        const { data: participants, error } = await supabase
          .from('game_participants')
          .select('member_id, status, members(id, name, nickname, status)')
          .eq('game_id', gameId)
          .eq('status', 'confirmed');
        
        if (error) throw error;
        
        const allMembers = participants.map(p => ({
          id: p.member_id,
          name: p.members?.name || 'Unknown',
          nickname: p.members?.nickname || p.members?.name || 'Unknown'
        }));
        
        // Get team configurations for the club
        const { data: teamConfigs } = await supabase
          .from('team_configurations')
          .select('*')
          .eq('club_id', gameData?.club_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(2);
        
        // Use the first two active team configurations or fallback to default
        const team1 = teamConfigs?.[0]?.id || 'yellow';
        const team2 = teamConfigs?.[1]?.id || 'black';
        activeTeams = [team1, team2];
        
        const halfLength = Math.ceil(allMembers.length / 2);
        const teamPlayersData = {
          [team1]: allMembers.slice(0, halfLength),
          [team2]: allMembers.slice(halfLength)
        };
        
        setTeamPlayers(teamPlayersData);
      }

      // Initialize scores with 0 for all active teams
      const initialScores: Record<string, number> = {};
      activeTeams.forEach(team => {
        initialScores[team] = 0;
      });
      setTeamScores(initialScores);
      
      // Then fetch events
      const fetchedEvents = await gameService.fetchGameEvents(gameId);
      console.log("Fetched events:", fetchedEvents);
      setEvents(fetchedEvents);
      
      // Update scores based on events if any exist
      if (fetchedEvents && fetchedEvents.length > 0) {
        const calculatedScores = calculateScoresFromEvents(fetchedEvents, initialScores);
        console.log("Calculated scores:", calculatedScores);
        setTeamScores(calculatedScores);
      }

      // Calculate total goals and saves
      const goals = fetchedEvents.filter(e => e.event_type === 'goal' || e.event_type === 'own_goal').length;
      const saves = fetchedEvents.filter(e => e.event_type === 'save').length;
      setTotalGoals(goals);
      setTotalSaves(saves);
    } catch (error) {
      console.error('Error fetching game data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do jogo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Esta função retorna um novo objeto de scores ao invés de modificar estado diretamente
  const calculateScoresFromEvents = (eventsList: GameEventWithMember[], initialScores: Record<string, number>): Record<string, number> => {
    // Cria uma cópia do objeto de scores iniciais para não modificar o original
    const scores = { ...initialScores };
    
    // Process each event and update the scores
    eventsList.forEach(event => {
      // Skip non-goal events
      if (event.event_type !== 'goal' && event.event_type !== 'own_goal') {
        return;
      }

      // Get the event team
      const eventTeam = event.team;
      
      if (event.event_type === 'goal') {
        console.log(`Processing goal for team ${eventTeam}`);
        if (scores.hasOwnProperty(eventTeam)) {
          scores[eventTeam] += 1;
          console.log(`Added goal to team ${eventTeam}, new score: ${scores[eventTeam]}`);
        } else {
          console.warn(`Team ${eventTeam} not found in available teams: ${JSON.stringify(Object.keys(scores))}`);
        }
      } 
      else if (event.event_type === 'own_goal') {
        console.log(`Processing own goal for team ${eventTeam}`);
        // For own goals, add point to all other teams
        Object.keys(scores).forEach(scoreTeam => {
          if (scoreTeam !== eventTeam) {
            scores[scoreTeam] += 1;
            console.log(`Added own goal point to opposing team ${scoreTeam}, new score: ${scores[scoreTeam]}`);
          }
        });
      }
    });
    
    console.log('Final calculated scores:', scores);
    return scores;
  };
  
  const handleDeleteEvent = async (eventId: string) => {
    // Só permite deletar eventos se o jogo estiver com status 'scheduled'
    if (gameData?.status !== 'scheduled') {
      toast({
        title: "Ação não permitida",
        description: "Eventos só podem ser excluídos em jogos com status 'Agendado'.",
        variant: "destructive",
      });
      return;
    }

    try {
      await gameService.deleteGameEvent(eventId);
      const updatedEvents = events.filter(event => event.id !== eventId);
      setEvents(updatedEvents);
      toast({
        title: "Evento deletado",
        description: "O evento foi removido com sucesso.",
      });
      
      // Recalculate scores after deletion
      const initialScores: Record<string, number> = {};
      Object.keys(teamPlayers).forEach(team => {
        initialScores[team] = 0;
      });
      
      // Garante que temos times padrão mínimos
      if (Object.keys(initialScores).length < 2) {
        initialScores['white'] = 0;
        initialScores['green'] = 0;
      }
      
      const calculatedScores = calculateScoresFromEvents(updatedEvents, initialScores);
      setTeamScores(calculatedScores);

      // Recalculate totals
      const goals = updatedEvents.filter(e => e.event_type === 'goal' || e.event_type === 'own_goal').length;
      const saves = updatedEvents.filter(e => e.event_type === 'save').length;
      setTotalGoals(goals);
      setTotalSaves(saves);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro ao deletar evento",
        description: "Não foi possível deletar o evento do jogo.",
        variant: "destructive"
      });
    }
  };

  const handleEventAction = async (memberId: string, eventType: 'goal' | 'own_goal' | 'save', team: string) => {
    // Só permite adicionar eventos se o jogo estiver com status 'scheduled'
    if (gameData?.status !== 'scheduled') {
      toast({
        title: "Ação não permitida",
        description: "Eventos só podem ser adicionados em jogos com status 'Agendado'.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Recording event:', { memberId, eventType, team, gameId });
      
      const newEvent = await gameService.recordGameEvent({
        game_id: gameId,
        member_id: memberId,
        event_type: eventType,
        team: team
      });
      
      if (newEvent) {
        let memberName = 'Unknown';
        let originalTeam = team;
        
        for (const [teamName, players] of Object.entries(teamPlayers)) {
          const player = players.find(p => p.id === memberId);
          if (player) {
            memberName = player.nickname;
            originalTeam = teamName;
            break;
          }
        }
          
        const updatedEvents = [
          {
            ...newEvent,
            team: team,
            member: {
              name: memberName,
              nickname: memberName
            }
          } as GameEventWithMember,
          ...events
        ];
        
        setEvents(updatedEvents);
        
        // Inicializa as pontuações zeradas para o recálculo
        const initialScores: Record<string, number> = {};
        Object.keys(teamPlayers).forEach(team => {
          initialScores[team] = 0;
        });
        
        // Garante que temos times padrão mínimos
        if (Object.keys(initialScores).length < 2) {
          initialScores['white'] = 0;
          initialScores['green'] = 0;
        }
        
        // Recalcula os scores do zero com todos os eventos
        const updatedScores = calculateScoresFromEvents(updatedEvents, initialScores);
        setTeamScores(updatedScores);

        // Update totals
        if (eventType === 'goal' || eventType === 'own_goal') {
          setTotalGoals(prev => prev + 1);
        } else if (eventType === 'save') {
          setTotalSaves(prev => prev + 1);
        }
        
        toast({
          title: "Evento registrado",
          description: `O evento foi salvo com sucesso para ${memberName} do ${getTeamName(originalTeam)}.`,
        });
      }
    } catch (error) {
      console.error('Error recording event:', error);
      toast({
        title: "Erro ao registrar evento",
        description: "Não foi possível salvar o evento do jogo.",
        variant: "destructive"
      });
    }
  };
  
  const handlePlayerClick = (player: any, team: string) => {
    // Só permite adicionar eventos se o jogo estiver com status 'scheduled'
    if (gameData?.status !== 'scheduled') {
      toast({
        title: "Ação não permitida",
        description: "Eventos só podem ser adicionados em jogos com status 'Agendado'.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlayer({ ...player, team });
    setIsPlayerActionsOpen(true);
  };
  
  const getEventIcon = (eventType: 'goal' | 'own_goal' | 'save') => {
    switch (eventType) {
      case 'goal': return <Goal className="h-4 w-4 text-green-600" />;
      case 'own_goal': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'save': return <ShieldAlert className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };
  
  const getEventLabel = (eventType: 'goal' | 'own_goal' | 'save') => {
    switch (eventType) {
      case 'goal': return 'Gol';
      case 'own_goal': return 'Gol Contra';
      case 'save': return 'Defesa';
      default: return '';
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss');
    } catch (e) {
      return timestamp;
    }
  };
  
  // Get display name for team based on team name and configurations
  const getTeamName = (teamName: string): string => {
    // Try to find the team in configurations by team_name or id
    const teamConfig = teamConfigurations.find(t => 
      t.team_name === teamName || t.id === teamName
    );
    
    if (teamConfig) {
      return teamConfig.team_name;
    }
    
    // Fallback for legacy values
    if (teamName === 'white') return 'Time Branco';
    if (teamName === 'green') return 'Time Verde';
    if (teamName === 'yellow') return 'Time Amarelo';
    
    return teamName;
  };
  
  // Get team color from configurations or mapping
  const getTeamColor = (teamName: string): string => {
    // Try to find the team in configurations by team_name or id
    const teamConfig = teamConfigurations.find(t => 
      t.team_name === teamName || t.id === teamName
    );
    
    if (teamConfig) {
      return teamConfig.team_color;
    }
    
    // Fallback for legacy values
    if (teamName === 'white') return '#ffffff';
    if (teamName === 'green') return '#4ade80';
    if (teamName === 'yellow') return '#facc15';
    
    return '#cccccc'; // Default gray
  };
  
  // Calculate player statistics for PDF
  const calculatePlayerStats = () => {
    // Create maps to store player statistics
    const playerStats = new Map<string, { goals: number, ownGoals: number, saves: number }>();
    
    // Initialize stats for all players
    Object.values(teamPlayers).flat().forEach(player => {
      playerStats.set(player.id, { goals: 0, ownGoals: 0, saves: 0 });
    });
    
    // Count events for each player
    events.forEach(event => {
      const stats = playerStats.get(event.member_id);
      if (stats) {
        if (event.event_type === 'goal') {
          stats.goals += 1;
        } else if (event.event_type === 'own_goal') {
          stats.ownGoals += 1;
        } else if (event.event_type === 'save') {
          stats.saves += 1;
        }
      }
    });
    
    return playerStats;
  };
  
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);

    // Cores blue-gray
    const colors = {
      dark: '#1e293b',      // blue-gray-800
      medium: '#475569',    // blue-gray-600
      light: '#94a3b8',     // blue-gray-400
      lighter: '#f1f5f9',   // blue-gray-50
      border: '#cbd5e1',    // blue-gray-300
    };

    // Configurações de fonte
    doc.setFont('helvetica');

    // Cabeçalho (reduzido)
    doc.setFillColor(colors.dark);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Estatísticas do Jogo', pageWidth/2, 20, { align: 'center' });
    
    // Informações do jogo (mais compactas)
    doc.setTextColor(colors.dark);
    doc.setFontSize(11);
    doc.text(gameData?.title || 'Jogo sem título', margin, 40);
    doc.setTextColor(colors.medium);
    doc.setFontSize(9);
    doc.text(format(new Date(gameData?.date), 'dd/MM/yyyy HH:mm'), margin, 46);

    // Placar (reduzido)
    doc.setFillColor(colors.lighter);
    doc.rect(margin, 50, contentWidth, 20, 'F');
    doc.setDrawColor(colors.border);
    doc.rect(margin, 50, contentWidth, 20, 'S');

    let yPos = 60;
    Object.entries(teamScores).forEach(([team, score], index) => {
      if (index < 2) {
        const xPos = index === 0 ? pageWidth/3 : (2*pageWidth/3);
        doc.setFontSize(14);
        doc.setTextColor(colors.dark);
        doc.text(score.toString(), xPos, yPos, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(colors.medium);
        doc.text(getTeamName(team), xPos, yPos + 6, { align: 'center' });
      }
    });

    // Resumo (reduzido e compacto)
    yPos = 80;
    doc.setFillColor(colors.lighter);
    doc.rect(margin, yPos - 5, contentWidth, 25, 'F');
    doc.setDrawColor(colors.border);
    doc.rect(margin, yPos - 5, contentWidth, 25, 'S');

    doc.setFontSize(11);
    doc.setTextColor(colors.dark);
    doc.text('Resumo', margin + 5, yPos);

    doc.setFontSize(9);
    doc.setTextColor(colors.medium);
    doc.text(`Total de Gols: ${totalGoals}`, margin + 5, yPos + 8);
    doc.text(`Total de Defesas: ${totalSaves}`, pageWidth/2, yPos + 8);

    // Estatísticas por Time
    yPos = 110;
    doc.setFontSize(12);
    doc.setTextColor(colors.dark);
    doc.text('Estatísticas por Time', margin, yPos);

    // Preparar dados dos jogadores
    const playerStats = calculatePlayerStats();
    let currentY = yPos + 10;

    Object.entries(teamPlayers).forEach(([team, players], teamIndex) => {
      // Cabeçalho do time (mais compacto)
      doc.setFillColor(colors.dark);
      doc.rect(margin, currentY, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(getTeamName(team), margin + 5, currentY + 5);
      currentY += 7;

      // Tabela de jogadores
      const tableData = players.map(player => {
        const stats = playerStats.get(player.id);
        return [
          player.nickname || player.name,
          stats?.goals.toString() || '0',
          stats?.ownGoals.toString() || '0',
          stats?.saves.toString() || '0'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Jogador', 'Gols', 'Gols Contra', 'Defesas']],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          textColor: colors.medium,
          lineColor: colors.border,
          lineWidth: 0.1,
          cellPadding: 1, // Reduzir o padding das células
        },
        headStyles: {
          fillColor: colors.medium,
          textColor: '#ffffff',
          fontSize: 8,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: colors.lighter,
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
        },
      });

      // @ts-ignore - lastAutoTable é adicionado pelo plugin
      currentY = doc.lastAutoTable.finalY + 5; // Reduzir o espaço entre tabelas
    });

    // Rodapé
    const footerY = pageHeight - 20;
    doc.setDrawColor(colors.border);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setFontSize(8);
    doc.setTextColor(colors.light);
    doc.text('FutConnect - Relatório gerado em ' + format(new Date(), 'dd/MM/yyyy HH:mm'), pageWidth/2, footerY + 10, { align: 'center' });

    // Salvar o PDF
    doc.save(`estatisticas-${gameId}.pdf`);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center gap-4 pb-4 border-b relative">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Estatísticas do Jogo
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generatePDF} 
            className="h-9 w-[120px] sm:w-[140px]"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isMobile ? 'PDF' : 'Exportar PDF'}
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Carregando estatísticas...</span>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 py-4">
            {/* Placar */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-500 mb-3 text-center uppercase">Placar</h3>
              
              <div className="flex justify-center items-center space-x-4">
                {Object.entries(teamScores).slice(0, 2).map(([team, score], index) => (
                  <div key={team} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-16 h-16 rounded-md flex items-center justify-center text-white font-bold"
                        style={{ 
                          backgroundColor: getTeamColor(team),
                          color: getTeamColor(team) === '#ffffff' ? '#333' : 'white'
                        }}
                      >
                        {score}
                      </div>
                      <span className="mt-1 text-xs font-medium">{getTeamName(team)}</span>
                    </div>
                    
                    {index === 0 && Object.entries(teamScores).length > 1 && (
                      <div className="text-xl font-bold text-gray-400 ml-4 mr-4">×</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Resumo */}
            <div className="flex flex-col space-y-4">
              {/* Card de Resumo */}
              <div className="bg-gray-50 p-4 rounded-md w-full">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Resumo</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                        <Goal className="h-4 w-4 text-green-600" />
                      </div>
                      <span>Total de Gols</span>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">{totalGoals}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                        <ShieldAlert className="h-4 w-4 text-blue-600" />
                      </div>
                      <span>Total de Defesas</span>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">{totalSaves}</Badge>
                  </div>
                </div>
              </div>

              {/* Card de Jogadores */}
              <div className="bg-gray-50 p-4 rounded-md w-full">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Jogadores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(teamPlayers).map(([team, players]) => (
                    <div key={team} className="space-y-2">
                      <div
                        className="text-sm font-medium p-2 rounded"
                        style={{
                          backgroundColor: getTeamColor(team),
                          color: getTeamColor(team) === '#ffffff' ? '#333' : 'white'
                        }}
                      >
                        {getTeamName(team)}
                      </div>
                      
                      <div className="space-y-1">
                        {players.map((player) => {
                          const stats = calculatePlayerStats().get(player.id);
                          return (
                            <div
                              key={player.id}
                              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                              onClick={() => handlePlayerClick(player, team)}
                            >
                              <span className="font-medium">{player.nickname}</span>
                              <div className="flex items-center space-x-3 text-sm">
                                <span title="Gols" className="flex items-center">
                                  <Goal className="h-4 w-4 text-green-600 mr-1" />
                                  {stats?.goals || 0}
                                </span>
                                <span title="Gols Contra" className="flex items-center">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-1" />
                                  {stats?.ownGoals || 0}
                                </span>
                                <span title="Defesas" className="flex items-center">
                                  <ShieldAlert className="h-4 w-4 text-blue-600 mr-1" />
                                  {stats?.saves || 0}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Lista de eventos */}
            <div className="bg-gray-50 p-4 rounded-md w-full">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Eventos ({events.length})</h3>
              <div className="space-y-2">
                {events.length > 0 ? (
                  events.map(event => (
                    <div key={event.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                      <div className="flex items-center space-x-2">
                        {getEventIcon(event.event_type)}
                        <div>
                          <div className="font-medium text-sm">
                            {event.member.nickname || event.member.name} - {getEventLabel(event.event_type)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(event.created_at)} • {getTeamName(event.team)}
                          </div>
                        </div>
                      </div>
                      {gameData?.status === 'scheduled' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Nenhum evento registrado para este jogo.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      
      {/* Player actions popup */}
      {selectedPlayer && (
        <PlayerActionsPopup
          isOpen={isPlayerActionsOpen}
          onClose={() => setIsPlayerActionsOpen(false)}
          player={selectedPlayer}
          onAction={(eventType) => {
            if (selectedPlayer) {
              handleEventAction(selectedPlayer.id, eventType, selectedPlayer.team);
            }
            setIsPlayerActionsOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
