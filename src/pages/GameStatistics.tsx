import React, { useState, useEffect } from 'react';
import { Calendar, Users, BarChart, X, CheckCheck, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useToast } from '@/hooks/use-toast';

const GameStatistics = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalGames: 0,
    completedGames: 0,
    cancelledGames: 0,
    completionRate: "0%",
  });
  const [monthlyGames, setMonthlyGames] = useState<any[]>([]);
  const [cancellationReasons, setCancellationReasons] = useState<any[]>([]);
  const [gamesByField, setGamesByField] = useState<any[]>([]);
  const [participationStats, setParticipationStats] = useState<any[]>([]);
  const [firstGameYear, setFirstGameYear] = useState<number | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const clubId = user?.activeClub?.id || '';
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    if (clubId) {
      fetchFirstGameYear();
    }
  }, [clubId]);

  useEffect(() => {
    // Generate available years - starting with current year
    if (firstGameYear !== null) {
      const years = [currentYear.toString(), "all"];
      for (let i = currentYear - 1; i >= firstGameYear; i--) {
        years.push(i.toString());
      }
      setAvailableYears(years);
      
      if (clubId) {
        fetchStatistics();
      }
    }
  }, [clubId, selectedYear, firstGameYear]);

  const fetchFirstGameYear = async () => {
    if (!clubId) return;
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select('date')
        .eq('club_id', clubId)
        .order('date', { ascending: true })
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const firstGameDate = new Date(data[0].date);
        setFirstGameYear(firstGameDate.getFullYear());
      } else {
        // If no games found, use current year
        setFirstGameYear(currentYear);
      }
    } catch (error) {
      console.error('Error fetching first game date:', error);
      setFirstGameYear(currentYear); // Default to current year on error
    }
  };

  const fetchStatistics = async () => {
    if (!clubId) return;
    
    setIsLoading(true);
    
    try {
      // Define year filter range
      let gamesQuery = supabase
        .from('games')
        .select('*')
        .eq('club_id', clubId);
      
      // Only apply year filter if not "all"
      if (selectedYear !== "all") {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        gamesQuery = gamesQuery
          .gte('date', startDate)
          .lte('date', endDate);
      }
      
      // Get games
      const { data: games, error } = await gamesQuery;
        
      if (error) throw error;
      
      console.log('Fetched games:', games);
      
      // Calculate basic statistics
      // Only count completed and canceled games in the total (exclude scheduled games)
      const completedGames = games?.filter(game => game.status === 'completed') || [];
      const cancelledGames = games?.filter(game => 
        game.status === 'canceled' || game.status === 'cancelled'
      ) || [];
      
      // Total is now the sum of completed and cancelled games, excluding scheduled
      const total = completedGames.length + cancelledGames.length;
      const completed = completedGames.length;
      const cancelled = cancelledGames.length;
      
      console.log('Game statuses:', games?.map(g => g.status));
      console.log(`Total (excluding scheduled): ${total}, Completed: ${completed}, Cancelled: ${cancelled}`);
      
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      setStatistics({
        totalGames: total,
        completedGames: completed,
        cancelledGames: cancelled,
        completionRate: `${completionRate}%`,
      });
      
      // Process monthly games data - showing only completed games
      const monthlyData = Array(12).fill(0).map((_, i) => ({
        month: new Date(0, i).toLocaleString('default', { month: 'short' }),
        completed: 0
      }));
      
      games?.forEach(game => {
        const month = new Date(game.date).getMonth();
        if (game.status === 'completed') {
          monthlyData[month].completed += 1;
        }
      });
      
      setMonthlyGames(monthlyData);
      
      // Process cancellation reasons
      const reasons = games
        ?.filter(game => game.status === 'canceled' || game.status === 'cancelled')
        ?.reduce((acc: any, game: any) => {
          const reason = game.cancel_reason || 'Não especificado';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {});
      
      const reasonsData = Object.keys(reasons || {}).map(key => ({
        name: key,
        value: reasons[key]
      }));
      
      setCancellationReasons(reasonsData);
      
      // Process games by field - apenas jogos realizados (completed)
      const fields = games
        ?.filter(game => game.status === 'completed')
        ?.reduce((acc: any, game: any) => {
          const field = game.location || 'Não especificado';
          acc[field] = (acc[field] || 0) + 1;
          return acc;
        }, {});
      
      const fieldsData = Object.keys(fields || {}).map(key => ({
        name: key,
        value: fields[key]
      }));
      
      setGamesByField(fieldsData);
      
      // Fetch player participation data for completed games
      const completedGameIds = games
        ?.filter(game => game.status === 'completed')
        ?.map(game => game.id) || [];
      
      if (completedGameIds.length > 0) {
        // Fetch all participants with their member details for completed games
        const { data: participations, error: participationsError } = await supabase
          .from('game_participants')
          .select(`
            *,
            members (
              id,
              name,
              status
            )
          `)
          .in('game_id', completedGameIds)
          .neq('members.status', 'Sistema');  // Exclui membros com status Sistema
        
        if (participationsError) throw participationsError;
        
        // Garante que temos dados válidos e exclui qualquer participação que não tenha membro associado
        const filteredParticipations = (participations || []).filter(p => p.members !== null);
        
        console.log('Total participants (excluding Sistema):', filteredParticipations.length);
        
        // Calculate total confirmed, declined and unconfirmed participants per game
        const gameParticipationMap: Record<string, { confirmed: number, declined: number, unconfirmed: number }> = {};
        
        // Processa apenas participações com membros válidos
        filteredParticipations.forEach(p => {
          if (!gameParticipationMap[p.game_id]) {
            gameParticipationMap[p.game_id] = { confirmed: 0, declined: 0, unconfirmed: 0 };
          }
          
          // Conta apenas se o membro não for Sistema
          if (p.status === 'confirmed') {
            gameParticipationMap[p.game_id].confirmed += 1;
          } else if (p.status === 'declined') {
            gameParticipationMap[p.game_id].declined += 1;
          } else if (p.status === 'unconfirmed') {
            gameParticipationMap[p.game_id].unconfirmed += 1;
          }
        });

        console.log('Game participation map:', gameParticipationMap);
        
        // Calculate averages
        let totalConfirmed = 0;
        let totalDeclined = 0;
        let totalUnconfirmed = 0;
        const gameCount = Object.keys(gameParticipationMap).length;
        
        Object.values(gameParticipationMap).forEach(stats => {
          totalConfirmed += stats.confirmed;
          totalDeclined += stats.declined;
          totalUnconfirmed += stats.unconfirmed;
        });
        
        const avgConfirmed = gameCount > 0 ? (totalConfirmed / gameCount) : 0;
        const avgDeclined = gameCount > 0 ? (totalDeclined / gameCount) : 0;
        const avgUnconfirmed = gameCount > 0 ? (totalUnconfirmed / gameCount) : 0;
        
        // Calculate the maximum value for percentage calculation
        const maxAvg = Math.max(avgConfirmed, avgDeclined, avgUnconfirmed);
        const confirmedPercentage = maxAvg > 0 ? (avgConfirmed / maxAvg) * 100 : 0;
        const declinedPercentage = maxAvg > 0 ? (avgDeclined / maxAvg) * 100 : 0;
        const unconfirmedPercentage = maxAvg > 0 ? (avgUnconfirmed / maxAvg) * 100 : 0;
        
        const participationStatsData = [
          { 
            name: 'Confirmados', 
            value: avgConfirmed,
            percentage: confirmedPercentage 
          },
          { 
            name: 'Recusados', 
            value: avgDeclined,
            percentage: declinedPercentage 
          },
          {
            name: 'Não Responderam',
            value: avgUnconfirmed,
            percentage: unconfirmedPercentage
          }
        ];
        
        setParticipationStats(participationStatsData);
        console.log('Participation stats:', participationStatsData);
      } else {
        setParticipationStats([]);
      }
      
    } catch (error) {
      console.error('Error fetching game statistics:', error);
      toast({
        title: "Erro ao carregar estatísticas",
        description: "Não foi possível carregar as estatísticas dos jogos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estatísticas de Jogos</h1>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>{year === "all" ? "Todos" : year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Jogos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{statistics.totalGames}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Jogos Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCheck className="mr-2 h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">{statistics.completedGames}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Jogos Cancelados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <X className="mr-2 h-4 w-4 text-red-500" />
                  <span className="text-2xl font-bold">{statistics.cancelledGames}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Realização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart className="mr-2 h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold">{statistics.completionRate}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Jogos Realizados por Mês</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={monthlyGames}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" name="Realizados" fill="#8884d8">
                      <LabelList dataKey="completed" position="top" fill="#666" fontSize={12} />
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Motivos de Cancelamento</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {cancellationReasons.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cancellationReasons}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {cancellationReasons.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} jogos`, 'Quantidade']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Nenhum jogo cancelado no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Jogos por Campo</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gamesByField}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#82ca9d"
                      dataKey="value"
                    >
                      {gamesByField.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} jogos`, 'Quantidade']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Participação</CardTitle>
                <CardDescription>
                  Média de jogadores por status de participação {selectedYear !== "all" ? `em ${selectedYear}` : "(todos os jogos)"} (excluindo sócios do tipo "Sistema")
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {participationStats.length > 0 ? (
                  <div className="flex flex-col justify-center h-full space-y-8">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                          <span>Confirmados</span>
                        </div>
                        <span className="font-semibold">{participationStats[0].value.toFixed(1)} jogadores</span>
                      </div>
                      <Progress 
                        value={participationStats[0].percentage} 
                        className="h-4"
                        indicatorColor="#10b981" // emerald-500
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                          <span>Recusados</span>
                        </div>
                        <span className="font-semibold">{participationStats[1].value.toFixed(1)} jogadores</span>
                      </div>
                      <Progress 
                        value={participationStats[1].percentage} 
                        className="h-4"
                        indicatorColor="#f97316" // orange-500
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                          <span>Não Responderam</span>
                        </div>
                        <span className="font-semibold">{participationStats[2].value.toFixed(1)} jogadores</span>
                      </div>
                      <Progress 
                        value={participationStats[2].percentage} 
                        className="h-4"
                        indicatorColor="#6b7280" // gray-500
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Nenhum dado de participação disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameStatistics;
