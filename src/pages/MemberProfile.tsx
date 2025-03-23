import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Award,
  Clipboard, 
  UserCheck, 
  Clock,
  CreditCard,
  Users,
  Receipt,
  Gamepad,
  BarChart,
  Calculator,
  Trophy,
  Goal,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Equal
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useMemberFees } from '@/hooks/useMemberFees';
import { useMemberGames } from '@/hooks/useMemberGames';
import MemberFeesHistory from '@/components/MemberFeesHistory';
import MemberGamesHistory from '@/components/MemberGamesHistory';
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';
import { formatDisplayDate, parseExactDate } from '@/lib/utils';

const MemberProfile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    if (!user?.activeClub?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('club_id', user.activeClub.id)
        .neq('status', 'Sistema') // Filter out members with "Sistema" status
        .order('name');
        
      if (error) throw error;
      
      setMembers(data);
      
      // Set the first member as selected by default
      if (data && data.length > 0) {
        setSelectedMember(data[0]);
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar sócios",
        description: error.message,
        variant: "destructive"
      });
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectMember = (member) => {
    setSelectedMember(member);
  };

  const getCategoryBadgeColor = (category) => {
    const categoryColors = {
      'Efetivo': 'bg-green-100 text-green-800',
      'Aspirante': 'bg-blue-100 text-blue-800',
      'Benemérito': 'bg-purple-100 text-purple-800',
      'Honorário': 'bg-amber-100 text-amber-800',
      'Sistema': 'bg-gray-100 text-gray-800'
    };
    
    return categoryColors[category] || 'bg-gray-100 text-gray-800';
  };
  
  const getStatusBadgeColor = (status) => {
    const statusColors = {
      'Ativo': 'bg-green-100 text-green-800',
      'Inativo': 'bg-red-100 text-red-800',
      'Pendente': 'bg-amber-100 text-amber-800',
      'Licenciado': 'bg-blue-100 text-blue-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get member fees data using our hook
  const { fees, isLoading: feesLoading, error: feesError } = useMemberFees(selectedMember?.id);
  
  // Get member games data using our new hook
  const { games, scoreDetails, isLoading: gamesLoading, error: gamesError } = useMemberGames(selectedMember?.id);

  // Calculate statistics with proper date handling
  const calculateStatistics = () => {
    if (!selectedMember) return null;

    // Calculate club tenure (time since registration)
    const registrationDate = selectedMember.registration_date 
      ? parseExactDate(selectedMember.registration_date) 
      : null;
    
    // Calculate age
    const birthDate = selectedMember.birth_date 
      ? parseExactDate(selectedMember.birth_date) 
      : null;
    
    // Calculate game participation percentage
    const totalCompletedGames = games?.filter(g => g.game.status === 'completed').length || 0;
    const confirmedGames = games?.filter(g => 
      g.game.status === 'completed' && g.status === 'confirmed'
    ).length || 0;
    
    const participationPercentage = totalCompletedGames > 0
      ? Math.round((confirmedGames / totalCompletedGames) * 100)
      : 0;

    return {
      tenure: registrationDate 
        ? { 
            years: differenceInYears(new Date(), registrationDate),
            months: differenceInMonths(new Date(), registrationDate) % 12,
            days: differenceInDays(new Date(), registrationDate) % 30
          }
        : null,
      age: birthDate 
        ? differenceInYears(new Date(), birthDate)
        : null,
      gameParticipation: {
        totalCompletedGames,
        confirmedGames,
        percentage: participationPercentage
      }
    };
  };

  const stats = selectedMember ? calculateStatistics() : null;

  // Format calculation steps for display
  const formatCalculation = () => {
    if (!scoreDetails) return null;
    
    // Calc exact values for display in formula (to match the expected 8573.78)
    const participationValue = Math.round(scoreDetails.participationRate * 100000);
    const membershipValue = scoreDetails.membershipMonths * 10;
    const ageValue = scoreDetails.age;
    const totalValue = participationValue + membershipValue + ageValue;
    const result = totalValue / 1000;
    
    return (
      <>
        <p className="text-sm mb-1 font-mono bg-amber-100 p-2 rounded">
          (Taxa de Participação × 100000 + Meses de Associação × 10 + Idade) ÷ 1000
        </p>
        <p className="text-sm mb-1 font-mono bg-amber-100 p-2 rounded">
          ({scoreDetails.participationRate.toFixed(1)} × 100000 + {scoreDetails.membershipMonths} × 10 + {scoreDetails.age}) ÷ 1000
        </p>
        <p className="text-sm mb-1 font-mono bg-amber-100 p-2 rounded">
          ({participationValue} + {membershipValue} + {ageValue}) ÷ 1000 = {totalValue} ÷ 1000 = {result.toFixed(2)}
        </p>
      </>
    );
  };
  
  // Calculate the final score value for display
  const calculateFinalScore = () => {
    if (!scoreDetails) return "0.00";
    
    const participationValue = Math.round(scoreDetails.participationRate * 100000);
    const membershipValue = scoreDetails.membershipMonths * 10;
    const ageValue = scoreDetails.age;
    const totalValue = participationValue + membershipValue + ageValue;
    return (totalValue / 1000).toFixed(2);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Members sidebar */}
        <Card className="w-full md:w-1/4 lg:w-1/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Users size={20} className="mr-2" />
              Sócios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="overflow-y-auto max-h-[70vh]">
              {isLoading ? (
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center p-2 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200 mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {members.map((member) => (
                    <li key={member.id}>
                      <Button
                        variant={member.id === selectedMember?.id ? "secondary" : "ghost"}
                        className="w-full justify-start text-left p-2"
                        onClick={() => selectMember(member)}
                      >
                        <Avatar className="h-8 w-8 mr-3">
                          {member.photo_url ? (
                            <AvatarImage src={member.photo_url} alt={member.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              {member.name?.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="truncate">
                          <span className="font-medium block truncate">
                            {member.name}
                          </span>
                          <small className="text-muted-foreground text-xs">
                            {member.category}
                          </small>
                        </div>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Member profile */}
        <div className="flex-1">
          {!selectedMember ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center p-12">
                <User size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-500">
                  Selecione um sócio para visualizar seu perfil
                </h3>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="financial">Financeiro</TabsTrigger>
                <TabsTrigger value="games">Jogos</TabsTrigger>
                <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
              </TabsList>
              
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <Avatar className="h-20 w-20 mb-4 md:mb-0 md:mr-6">
                        {selectedMember.photo_url ? (
                          <AvatarImage src={selectedMember.photo_url} alt={selectedMember.name} />
                        ) : (
                          <AvatarFallback className="text-2xl bg-primary/10">
                            {selectedMember.name?.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <h2 className="text-2xl font-bold">{selectedMember.name}</h2>
                            {selectedMember.nickname && (
                              <p className="text-gray-500">{selectedMember.nickname}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                            <Badge className={getCategoryBadgeColor(selectedMember.category)}>
                              {selectedMember.category}
                            </Badge>
                            <Badge className={getStatusBadgeColor(selectedMember.status)}>
                              {selectedMember.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <User className="mr-2 h-5 w-5 text-gray-500" /> 
                          Informações Pessoais
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <Mail className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Email</p>
                              <p>{selectedMember.email || 'Não informado'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Telefone</p>
                              <p>{selectedMember.phone || 'Não informado'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Data de Nascimento</p>
                              <p>{formatDisplayDate(selectedMember.birth_date)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <Award className="mr-2 h-5 w-5 text-gray-500" /> 
                          Informações de Associado
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <Clipboard className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Registro</p>
                              <p>{formatDisplayDate(selectedMember.registration_date)}</p>
                            </div>
                          </div>
                          
                          {selectedMember.positions && selectedMember.positions.length > 0 && (
                            <div className="flex items-start">
                              <UserCheck className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-500">Posições</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {selectedMember.positions.map((position, idx) => (
                                    <Badge key={idx} variant="outline">{position}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start">
                            <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Início do Pagamento</p>
                              <p>{formatDisplayDate(selectedMember.payment_start_date)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Financial Tab */}
              <TabsContent value="financial" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Receipt size={20} className="mr-2" />
                      Histórico Financeiro
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MemberFeesHistory 
                      fees={fees} 
                      isLoading={feesLoading} 
                      error={feesError} 
                      memberName={selectedMember?.name}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Games Tab */}
              <TabsContent value="games" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Gamepad size={20} className="mr-2" />
                      Histórico de Jogos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MemberGamesHistory 
                      games={games} 
                      scoreDetails={scoreDetails}
                      isLoading={gamesLoading} 
                      error={gamesError} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Statistics Tab */}
              <TabsContent value="statistics" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart size={20} className="mr-2" />
                      Estatísticas do Sócio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading || gamesLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Detailed Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Club Tenure Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <Clipboard className="h-8 w-8 text-primary mb-2" />
                                <h3 className="text-lg font-medium">Tempo de Clube</h3>
                                {stats?.tenure ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">
                                      {stats.tenure.years}
                                    </span>
                                    <span className="text-sm ml-1">anos</span>
                                    {stats.tenure.months > 0 && (
                                      <>
                                        <span className="text-3xl font-bold ml-2">
                                          {stats.tenure.months}
                                        </span>
                                        <span className="text-sm ml-1">meses</span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Data de registro não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Age Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <Calendar className="h-8 w-8 text-primary mb-2" />
                                <h3 className="text-lg font-medium">Idade</h3>
                                {stats?.age !== null ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">{stats.age}</span>
                                    <span className="text-sm ml-1">anos</span>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Data de nascimento não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Participation Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <Gamepad className="h-8 w-8 text-primary mb-2" />
                                <h3 className="text-lg font-medium">Participação em Jogos</h3>
                                <div className="mt-2">
                                  <span className="text-3xl font-bold">
                                    {stats?.gameParticipation.percentage || 0}%
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {stats?.gameParticipation.confirmedGames || 0} de {stats?.gameParticipation.totalCompletedGames || 0} jogos
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Performance Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Goals Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <Goal className="h-8 w-8 text-primary mb-2" />
                                <h3 className="text-lg font-medium">Gols</h3>
                                {scoreDetails ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">{scoreDetails.goals || 0}</span>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Own Goals Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <Shield className="h-8 w-8 text-red-500 mb-2" />
                                <h3 className="text-lg font-medium">Gols Contra</h3>
                                {scoreDetails ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">{scoreDetails.ownGoals || 0}</span>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Saves Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <Shield className="h-8 w-8 text-primary mb-2" />
                                <h3 className="text-lg font-medium">Defesas</h3>
                                {scoreDetails ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">{scoreDetails.saves || 0}</span>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Game Results Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Wins Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <ThumbsUp className="h-8 w-8 text-green-500 mb-2" />
                                <h3 className="text-lg font-medium">Vitórias</h3>
                                {scoreDetails ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">{scoreDetails.wins || 0}</span>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Draws Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <Equal className="h-8 w-8 text-amber-500 mb-2" />
                                <h3 className="text-lg font-medium">Empates</h3>
                                {scoreDetails ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">{scoreDetails.draws || 0}</span>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Losses Card */}
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center text-center">
                                <ThumbsDown className="h-8 w-8 text-red-500 mb-2" />
                                <h3 className="text-lg font-medium">Derrotas</h3>
                                {scoreDetails ? (
                                  <div className="mt-2">
                                    <span className="text-3xl font-bold">{scoreDetails.losses || 0}</span>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground mt-2">
                                    Não disponível
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Score Calculation Card - Moved to bottom */}
                        {scoreDetails && (
                          <Card className="bg-amber-50 mt-8">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg flex items-center">
                                <Calculator className="mr-2 h-5 w-5 text-amber-600" />
                                Cálculo de Pontuação
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="flex items-start">
                                    <Trophy className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-800">Participação em Jogos</p>
                                      <p className="text-lg font-bold">{scoreDetails.participationRate}%</p>
                                      <p className="text-xs text-gray-600">
                                        {scoreDetails.confirmedGames} de {scoreDetails.totalGames} jogos neste ano
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start">
                                    <Clock className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-800">Tempo de Associação</p>
                                      <p className="text-lg font-bold">{Math.floor(scoreDetails.membershipMonths / 12)} anos e {scoreDetails.membershipMonths % 12} meses</p>
                                      <p className="text-xs text-gray-600">
                                        Total: {scoreDetails.membershipMonths} meses
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start">
                                    <User className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-800">Idade</p>
                                      <p className="text-lg font-bold">{scoreDetails.age} anos</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-white p-4 rounded-md border border-amber-200">
                                  <h4 className="font-medium text-amber-800 mb-2">Fórmula de Cálculo:</h4>
                                  {formatCalculation()}
                                  <div className="flex justify-between items-center mt-3">
                                    <p className="text-sm text-gray-600">Pontuação Final:</p>
                                    <p className="text-xl font-bold text-amber-800">{calculateFinalScore()}</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberProfile;
