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
  Goal,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Equal,
  ChevronDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useMemberFees } from '@/hooks/useMemberFees';
import { useMemberGames } from '@/hooks/useMemberGames';
import MemberFeesHistory from '@/components/MemberFeesHistory';
import MemberGamesHistory from '@/components/MemberGamesHistory';
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from 'date-fns';
import { formatDisplayDate, parseExactDate } from '@/lib/utils';

const MemberProfile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Estado para carregamento de dados
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchBasicMembers();
  }, []);

  const fetchBasicMembers = async () => {
    if (!user?.activeClub?.id) return;
    
    setIsLoading(true);
    try {
      // Carregar apenas lista mínima de membros
      const { data: membersData, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          nickname,
          category,
          status,
          photo_url
        `)
        .eq('club_id', user.activeClub.id)
        .neq('status', 'Sistema')
        .order('name', { ascending: true });
        
      if (error) throw error;

      const basicMembers = membersData || [];
      setMembers(basicMembers);
      
      // Se houver membros, carregar o primeiro
      if (basicMembers.length > 0) {
        const firstMember = basicMembers[0] as MemberDetails;
        setSelectedMember(firstMember);
        await fetchMemberDetails(firstMember.id);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar sócios",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  interface MemberDetails {
    id: string;
    name: string;
    nickname?: string;
    email?: string;
    phone?: string;
    birth_date?: string;
    photo_url?: string;
    registration_date?: string;
    payment_start_date?: string;
    departure_date?: string;
    category: string;
    status: string;
    sponsor_id?: string;
    positions?: string[];
    club_id: string;
    godchildren?: Array<{
      id: string;
      name: string;
      nickname?: string;
      status: string;
    }>;
  }

  interface GameParticipant {
    status: string;
    games: any;
  }

  interface MonthlyFee {
    id: string;
    reference_month: string;
    status: string;
    amount: number;
  }

  const fetchMemberDetails = async (memberId: string) => {
    setLoadingDetails(true);

    try {
      // Buscar detalhes completos do membro
      const { data: memberData, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          nickname,
          email,
          phone,
          birth_date,
          photo_url,
          registration_date,
          payment_start_date,
          departure_date,
          category,
          status,
          sponsor_id,
          positions,
          club_id,
          godchildren:members(id, name, nickname, status)
        `)
        .eq('id', memberId)
        .single();

      if (error) throw error;

      // Buscar mensalidades e jogos em paralelo
      const [feesResponse, gamesResponse] = await Promise.all([
        supabase
          .from('monthly_fees')
          .select('id, reference_month, status, amount')
          .eq('member_id', memberId)
          .order('reference_month', { ascending: false })
          .limit(12),

        supabase
          .from('game_participants')
          .select('status, games(*)')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (feesResponse.error) throw feesResponse.error;
      if (gamesResponse.error) throw gamesResponse.error;

      // Combinar todos os dados
      const memberWithDetails = {
        ...(memberData as MemberDetails),
        godchildren: (memberData as MemberDetails).godchildren || [],
        fees: (feesResponse.data as MonthlyFee[]) || [],
        games: (gamesResponse.data as GameParticipant[]) || []
      };
      
      setSelectedMember(memberWithDetails);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes do sócio",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const selectMember = async (member: MemberDetails) => {
    // Limpar dados anteriores
    setSelectedMember(member);
    // Carregar detalhes completos
    await fetchMemberDetails(member.id);
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

    // Get departure date or current date for tenure calculation
    const departureDate = selectedMember.departure_date
      ? parseExactDate(selectedMember.departure_date)
      : new Date();
    
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
            years: differenceInYears(departureDate, registrationDate),
            months: differenceInMonths(departureDate, registrationDate) % 12,
            days: (() => {
              // Calcular corretamente os dias restantes
              const years = differenceInYears(departureDate, registrationDate);
              const months = differenceInMonths(departureDate, registrationDate) % 12;
              
              // Adicionar anos e meses à data de registro
              let dateWithYearsAndMonths = addYears(registrationDate, years);
              dateWithYearsAndMonths = addMonths(dateWithYearsAndMonths, months);
              
              // Calcular os dias restantes
              return differenceInDays(departureDate, dateWithYearsAndMonths);
            })(),
            isFormer: !!selectedMember.departure_date
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Members selector - Mobile */}
        <div className="md:hidden w-full">
          <Select value={selectedMember?.id || ''} onValueChange={(value) => {
            const member = members.find(m => m.id === value);
            if (member) selectMember(member);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um sócio">
                {selectedMember ? (
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs">
                        {selectedMember.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{selectedMember.name}</span>
                  </div>
                ) : (
                  "Selecione um sócio"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs">
                        {member.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      <small className="text-muted-foreground text-xs">
                        {member.category}
                      </small>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Members sidebar - Desktop */}
        <Card className="hidden md:block w-full md:w-1/4 lg:w-1/5">
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
                          <AvatarFallback className="bg-primary/10">
                            {member.name?.charAt(0)}
                          </AvatarFallback>
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
              <CardContent className="text-center p-6 sm:p-12">
                <User size={40} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg sm:text-xl font-medium text-gray-500">
                  Selecione um sócio para visualizar seu perfil
                </h3>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <div className="mb-10">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0">
                  <TabsTrigger value="profile" className="text-sm sm:text-base whitespace-nowrap">Perfil</TabsTrigger>
                  <TabsTrigger value="financial" className="text-sm sm:text-base whitespace-nowrap">Financeiro</TabsTrigger>
                  <TabsTrigger value="games" className="text-sm sm:text-base whitespace-nowrap">Jogos</TabsTrigger>
                  <TabsTrigger value="statistics" className="text-sm sm:text-base whitespace-nowrap">Estatísticas</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <div className="flex flex-col items-center md:items-start">
                        <Avatar className="h-32 w-32 mb-4">
                          {selectedMember.photo_url ? (
                            <AvatarImage src={selectedMember.photo_url} alt={selectedMember.name} />
                          ) : (
                            <AvatarFallback className="text-4xl bg-primary/10">
                              {selectedMember.name?.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                      <div className="flex-1 text-center md:text-left md:ml-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <h2 className="text-2xl font-bold">{selectedMember.name}</h2>
                            {selectedMember.nickname && (
                              <p className="text-gray-500">{selectedMember.nickname}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2 md:mt-0">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          
                          <div className="flex items-start">
                            <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Início do Pagamento</p>
                              <p>{formatDisplayDate(selectedMember.payment_start_date)}</p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Data de Saída</p>
                              <p>{formatDisplayDate(selectedMember.departure_date)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <UserCheck className="mr-2 h-5 w-5 text-gray-500" /> 
                          Posições Preferidas
                        </h3>
                        
                        <div>
                          {selectedMember.positions?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedMember.positions.map((position, idx) => (
                                <Badge key={idx} variant="outline" className="text-sm py-1 px-3">{position}</Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Nenhuma posição informada</p>
                          )}
                        </div>

                        <Separator className="my-4" />

                        <h3 className="text-lg font-medium flex items-center">
                          <Users className="mr-2 h-5 w-5 text-gray-500" /> 
                          Afilhados
                        </h3>
                        
                        <div className="space-y-2">
                          {selectedMember?.godchildren?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedMember.godchildren.map((godchild) => (
                                <div key={godchild.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">
                                    {godchild.nickname || godchild.name}
                                  </span>
                                  <Badge variant="outline" className={getStatusBadgeColor(godchild.status)}>
                                    {godchild.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum afilhado encontrado</p>
                          )}
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
                    {loadingDetails ? (
                      <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <MemberFeesHistory 
                        fees={fees} 
                        isLoading={feesLoading} 
                        error={feesError} 
                        memberName={selectedMember?.name}
                      />
                    )}
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
                    {loadingDetails ? (
                      <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <MemberGamesHistory 
                        games={games} 
                        scoreDetails={scoreDetails}
                        isLoading={gamesLoading} 
                        error={gamesError} 
                      />
                    )}
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
                                    {stats.tenure.days > 0 && (
                                      <>
                                        <span className="text-3xl font-bold ml-2">
                                          {stats.tenure.days}
                                        </span>
                                        <span className="text-sm ml-1">dias</span>
                                      </>
                                    )}
                                    {stats.tenure.isFormer && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        (Ex-sócio)
                                      </p>
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
