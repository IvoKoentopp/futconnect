
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Percent,
  ListChecks,
  Clock,
  UserRound,
  Award,
  Info
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress";
import { differenceInYears, differenceInMonths } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type CategoryDistribution = {
  category: string;
  count: number;
  percentage: number;
  members?: { id: string; name: string; nickname: string | null }[];
};

type MembershipDuration = {
  label: string;
  count: number;
  percentage: number;
  order: number;
  members?: { id: string; name: string; nickname: string | null }[];
};

type AgeDistribution = {
  ageRange: string;
  count: number;
  percentage: number;
  order: number;
  members?: { id: string; name: string; nickname: string | null }[];
};

type SponsorData = {
  sponsorId: string;
  sponsorName: string;
  sponsorNickname: string | null;
  count: number;
  percentage: number;
  godchildren?: { id: string; name: string; nickname: string | null }[];
};

const MemberStatistics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    activityRate: 0
  });
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistribution[]>([]);
  const [membershipDurations, setMembershipDurations] = useState<MembershipDuration[]>([]);
  const [averageMembershipYears, setAverageMembershipYears] = useState<number>(0);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistribution[]>([]);
  const [averageAge, setAverageAge] = useState<number>(0);
  const [topSponsors, setTopSponsors] = useState<SponsorData[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMemberStats();
  }, []);

  const fetchMemberStats = async () => {
    if (!user?.activeClub?.id) return;
    
    setIsLoading(true);
    try {
      // Get all members excluding "Sistema" status
      const { data: allMembers, error: allError } = await supabase
        .from('members')
        .select('*')
        .eq('club_id', user.activeClub.id)
        .neq('status', 'Sistema');
        
      if (allError) throw allError;
      
      // Get active members
      const { data: activeMembers, error: activeError } = await supabase
        .from('members')
        .select('*')
        .eq('club_id', user.activeClub.id)
        .eq('status', 'Ativo')
        .neq('status', 'Sistema');
        
      if (activeError) throw activeError;
      
      // Get inactive members
      const { data: inactiveMembers, error: inactiveError } = await supabase
        .from('members')
        .select('*')
        .eq('club_id', user.activeClub.id)
        .eq('status', 'Inativo')
        .neq('status', 'Sistema');
        
      if (inactiveError) throw inactiveError;
      
      // Calculate statistics
      const totalCount = allMembers ? allMembers.length : 0;
      const activeCount = activeMembers ? activeMembers.length : 0;
      const inactiveCount = inactiveMembers ? inactiveMembers.length : 0;
      const activityRate = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
      
      setStats({
        totalMembers: totalCount,
        activeMembers: activeCount,
        inactiveMembers: inactiveCount,
        activityRate: activityRate
      });

      // Calculate category distribution for active members with member details
      if (activeMembers) {
        const categoryCount: Record<string, number> = {};
        const categoryMembers: Record<string, { id: string; name: string; nickname: string | null }[]> = {};
        
        // Count members by category and store member details
        activeMembers.forEach(member => {
          const category = member.category || 'Não categorizado';
          
          if (!categoryCount[category]) {
            categoryCount[category] = 0;
            categoryMembers[category] = [];
          }
          
          categoryCount[category]++;
          categoryMembers[category].push({
            id: member.id,
            name: member.name,
            nickname: member.nickname
          });
        });
        
        // Convert to array and calculate percentages
        const distribution = Object.entries(categoryCount).map(([category, count]) => ({
          category,
          count,
          percentage: (count / activeCount) * 100,
          members: categoryMembers[category].sort((a, b) => a.name.localeCompare(b.name))
        }));
        
        // Sort by count descending
        distribution.sort((a, b) => b.count - a.count);
        
        setCategoryDistribution(distribution);
      }

      // Calculate membership duration statistics for active members
      if (activeMembers && activeMembers.length > 0) {
        const today = new Date();
        const durationsInMonths: number[] = [];
        const durationBrackets: Record<string, { 
          count: number, 
          order: number,
          members: { id: string; name: string; nickname: string | null }[]
        }> = {
          "Menos de 1 ano": { count: 0, order: 1, members: [] },
          "1-5 anos": { count: 0, order: 2, members: [] },
          "6-10 anos": { count: 0, order: 3, members: [] },
          "10-20 anos": { count: 0, order: 4, members: [] },
          "20-30 anos": { count: 0, order: 5, members: [] },
          "30-40 anos": { count: 0, order: 6, members: [] },
          "Mais de 40 anos": { count: 0, order: 7, members: [] }
        };

        // Calculate duration for each active member
        activeMembers.forEach(member => {
          if (member.registration_date) {
            const regDate = new Date(member.registration_date);
            const years = differenceInYears(today, regDate);
            const months = differenceInMonths(today, regDate);
            
            durationsInMonths.push(months);
            
            // Member data for tooltip
            const memberData = {
              id: member.id,
              name: member.name,
              nickname: member.nickname
            };
            
            // Categorize into brackets
            if (years < 1) {
              durationBrackets["Menos de 1 ano"].count++;
              durationBrackets["Menos de 1 ano"].members.push(memberData);
            } else if (years >= 1 && years <= 5) {
              durationBrackets["1-5 anos"].count++;
              durationBrackets["1-5 anos"].members.push(memberData);
            } else if (years > 5 && years <= 10) {
              durationBrackets["6-10 anos"].count++;
              durationBrackets["6-10 anos"].members.push(memberData);
            } else if (years > 10 && years <= 20) {
              durationBrackets["10-20 anos"].count++;
              durationBrackets["10-20 anos"].members.push(memberData);
            } else if (years > 20 && years <= 30) {
              durationBrackets["20-30 anos"].count++;
              durationBrackets["20-30 anos"].members.push(memberData);
            } else if (years > 30 && years <= 40) {
              durationBrackets["30-40 anos"].count++;
              durationBrackets["30-40 anos"].members.push(memberData);
            } else {
              durationBrackets["Mais de 40 anos"].count++;
              durationBrackets["Mais de 40 anos"].members.push(memberData);
            }
          }
        });

        // Calculate average membership duration in years
        const totalMonths = durationsInMonths.reduce((sum, months) => sum + months, 0);
        const averageMonths = durationsInMonths.length > 0 ? totalMonths / durationsInMonths.length : 0;
        const averageYears = averageMonths / 12;
        setAverageMembershipYears(averageYears);

        // Convert to array format for display
        const durations = Object.entries(durationBrackets)
          .filter(([_, { count }]) => count > 0) // Only include brackets with members
          .map(([label, { count, order, members }]) => ({
            label,
            count,
            percentage: (count / activeCount) * 100,
            order,
            members: members.sort((a, b) => a.name.localeCompare(b.name))
          }));

        // Sort by the predefined order
        durations.sort((a, b) => a.order - b.order);
        
        setMembershipDurations(durations);
      }

      // Calculate age distribution for active members
      if (activeMembers && activeMembers.length > 0) {
        const today = new Date();
        const ages: number[] = [];
        const ageBrackets: Record<string, { 
          count: number, 
          order: number,
          members: { id: string; name: string; nickname: string | null }[]
        }> = {
          "Até 20 anos": { count: 0, order: 1, members: [] },
          "20-30 anos": { count: 0, order: 2, members: [] },
          "30-40 anos": { count: 0, order: 3, members: [] },
          "40-50 anos": { count: 0, order: 4, members: [] },
          "50-60 anos": { count: 0, order: 5, members: [] },
          "60+ anos": { count: 0, order: 6, members: [] }
        };

        // Calculate age for each active member
        activeMembers.forEach(member => {
          if (member.birth_date) {
            const birthDate = new Date(member.birth_date);
            const age = differenceInYears(today, birthDate);
            
            ages.push(age);
            
            // Collect member for proper age bracket
            const memberData = {
              id: member.id,
              name: member.name,
              nickname: member.nickname
            };
            
            // Categorize into age brackets
            if (age <= 20) {
              ageBrackets["Até 20 anos"].count++;
              ageBrackets["Até 20 anos"].members.push(memberData);
            } else if (age > 20 && age <= 30) {
              ageBrackets["20-30 anos"].count++;
              ageBrackets["20-30 anos"].members.push(memberData);
            } else if (age > 30 && age <= 40) {
              ageBrackets["30-40 anos"].count++;
              ageBrackets["30-40 anos"].members.push(memberData);
            } else if (age > 40 && age <= 50) {
              ageBrackets["40-50 anos"].count++;
              ageBrackets["40-50 anos"].members.push(memberData);
            } else if (age > 50 && age <= 60) {
              ageBrackets["50-60 anos"].count++;
              ageBrackets["50-60 anos"].members.push(memberData);
            } else {
              ageBrackets["60+ anos"].count++;
              ageBrackets["60+ anos"].members.push(memberData);
            }
          }
        });

        // Calculate average age
        const totalAge = ages.reduce((sum, age) => sum + age, 0);
        const avgAge = ages.length > 0 ? totalAge / ages.length : 0;
        setAverageAge(avgAge);

        // Convert to array format for display
        const ageDistribution = Object.entries(ageBrackets)
          .filter(([_, { count }]) => count > 0) // Only include brackets with members
          .map(([ageRange, { count, order, members }]) => ({
            ageRange,
            count,
            percentage: (count / activeCount) * 100,
            order,
            members: members.sort((a, b) => a.name.localeCompare(b.name))
          }));

        // Sort by the predefined order (youngest to oldest)
        ageDistribution.sort((a, b) => a.order - b.order);
        
        setAgeDistribution(ageDistribution);
      }

      // Calculate top sponsors - UPDATED to include both active and inactive members
      const { data: sponsorsData, error: sponsorsError } = await supabase
        .from('members')
        .select('sponsor_id')
        .eq('club_id', user.activeClub.id)
        .neq('status', 'Sistema')
        .not('sponsor_id', 'is', null);
        
      if (sponsorsError) throw sponsorsError;
      
      if (sponsorsData && sponsorsData.length > 0) {
        // Count sponsors
        const sponsorCounts: Record<string, number> = {};
        
        sponsorsData.forEach(member => {
          if (member.sponsor_id) {
            sponsorCounts[member.sponsor_id] = (sponsorCounts[member.sponsor_id] || 0) + 1;
          }
        });
        
        // Get sponsor details including nicknames
        const sponsorIds = Object.keys(sponsorCounts);
        const { data: sponsorDetails, error: sponsorDetailsError } = await supabase
          .from('members')
          .select('id, name, nickname')
          .in('id', sponsorIds)
          .eq('club_id', user.activeClub.id);
          
        if (sponsorDetailsError) throw sponsorDetailsError;
        
        // Fetch godchildren for each sponsor
        const godchildrenBySponsors: Record<string, { id: string; name: string; nickname: string | null }[]> = {};
        
        for (const sponsorId of sponsorIds) {
          const { data: godchildren, error: godchildrenError } = await supabase
            .from('members')
            .select('id, name, nickname')
            .eq('sponsor_id', sponsorId)
            .eq('club_id', user.activeClub.id);
            
          if (godchildrenError) throw godchildrenError;
          
          if (godchildren) {
            godchildrenBySponsors[sponsorId] = godchildren;
          }
        }
        
        // Create sponsor data objects
        let sponsorData: SponsorData[] = [];
        
        if (sponsorDetails) {
          sponsorData = sponsorIds.map(id => {
            const sponsor = sponsorDetails.find(s => s.id === id);
            return {
              sponsorId: id,
              sponsorName: sponsor ? sponsor.name : 'Desconhecido',
              sponsorNickname: sponsor ? sponsor.nickname : null,
              count: sponsorCounts[id],
              percentage: (sponsorCounts[id] / sponsorsData.length) * 100,
              godchildren: godchildrenBySponsors[id] || []
            };
          });
          
          // Sort by count (descending)
          sponsorData.sort((a, b) => b.count - a.count);
          
          // Take top 10 sponsors
          setTopSponsors(sponsorData.slice(0, 10));
        }
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar estatísticas",
        description: error.message,
        variant: "destructive"
      });
      console.error('Error fetching member stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold mb-6">Estatísticas de Sócios</h1>
        
        {/* Stats Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Members Card */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center text-gray-600">
                <Users className="mr-2 h-5 w-5 text-blue-500" />
                Total de Sócios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 w-full animate-pulse bg-gray-200 rounded"></div>
              ) : (
                <div className="text-3xl font-bold">{stats.totalMembers}</div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Excluindo membros do sistema
              </p>
            </CardContent>
          </Card>
          
          {/* Active Members Card */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center text-gray-600">
                <UserCheck className="mr-2 h-5 w-5 text-green-500" />
                Sócios Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 w-full animate-pulse bg-gray-200 rounded"></div>
              ) : (
                <div className="text-3xl font-bold text-green-600">{stats.activeMembers}</div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Membros com status "Ativo"
              </p>
            </CardContent>
          </Card>
          
          {/* Inactive Members Card */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center text-gray-600">
                <UserX className="mr-2 h-5 w-5 text-red-500" />
                Sócios Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 w-full animate-pulse bg-gray-200 rounded"></div>
              ) : (
                <div className="text-3xl font-bold text-red-600">{stats.inactiveMembers}</div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Membros com status "Inativo"
              </p>
            </CardContent>
          </Card>
          
          {/* Activity Rate Card */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center text-gray-600">
                <Percent className="mr-2 h-5 w-5 text-amber-500" />
                Taxa de Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 w-full animate-pulse bg-gray-200 rounded"></div>
              ) : (
                <div className="text-3xl font-bold text-amber-600">
                  {stats.activityRate.toFixed(1)}%
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Sócios Ativos / Total de Sócios
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two-column layout for charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Distribution Chart */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-indigo-500" />
                Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full animate-pulse bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : categoryDistribution.length > 0 ? (
                <div className="space-y-4">
                  {categoryDistribution.map((category, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">{category.category}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                type="button" 
                                className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-gray-200 transition-colors"
                                aria-label="Ver apelidos"
                              >
                                <Info className="h-4 w-4 text-gray-400" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="start" className="max-w-sm max-h-[300px] overflow-y-auto">
                              <ul className="text-xs space-y-1">
                                {category.members?.filter(member => member.nickname).map(member => (
                                  <li key={member.id} className="flex items-center">
                                    <span>{member.nickname}</span>
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{category.count}</span>
                        <Progress 
                          value={category.percentage} 
                          className="h-4 flex-1"
                          indicatorColor="#10b981" // emerald-500
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Nenhum dado de categoria disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Age Distribution Chart */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center">
                <UserRound className="mr-2 h-5 w-5 text-blue-500" />
                Distribuição por Idade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full animate-pulse bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : ageDistribution.length > 0 ? (
                <div className="space-y-4">
                  {ageDistribution.map((ageBracket, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">{ageBracket.ageRange}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                type="button" 
                                className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-gray-200 transition-colors"
                                aria-label="Ver apelidos"
                              >
                                <Info className="h-4 w-4 text-gray-400" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="start" className="max-w-sm max-h-[300px] overflow-y-auto">
                              <ul className="text-xs space-y-1">
                                {ageBracket.members?.filter(member => member.nickname).map(member => (
                                  <li key={member.id} className="flex items-center">
                                    <span>{member.nickname}</span>
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm text-gray-500">{ageBracket.count} sócios</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={ageBracket.percentage} 
                          className="h-4 flex-1"
                          indicatorColor="#3b82f6" // blue-500
                        />
                      </div>
                    </div>
                  ))}

                  {/* Average Age */}
                  <div className="bg-gray-50 p-4 rounded-lg border-t-2 border-blue-500 mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-700">Idade Média</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {averageAge.toFixed(1)} anos
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={100} 
                        className="h-4 flex-1"
                        indicatorColor="#3b82f6" // blue-500
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Nenhum dado de idade disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membership Duration Chart - UPDATED with tooltip */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center">
                <Clock className="mr-2 h-5 w-5 text-emerald-500" />
                Tempo de Associação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full animate-pulse bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : membershipDurations.length > 0 ? (
                <div className="space-y-4">
                  {membershipDurations.map((duration, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">{duration.label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                type="button" 
                                className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-gray-200 transition-colors"
                                aria-label="Ver apelidos"
                              >
                                <Info className="h-4 w-4 text-gray-400" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="start" className="max-w-sm max-h-[300px] overflow-y-auto">
                              <ul className="text-xs space-y-1">
                                {duration.members?.filter(member => member.nickname).map(member => (
                                  <li key={member.id} className="flex items-center">
                                    <span>{member.nickname}</span>
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm text-gray-500">{duration.count} sócios</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={duration.percentage} 
                          className="h-4 flex-1"
                          indicatorColor="#10b981" // emerald-500
                        />
                      </div>
                    </div>
                  ))}

                  {/* Average Membership Duration */}
                  <div className="bg-gray-50 p-4 rounded-lg border-t-2 border-emerald-500 mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-700">Tempo Médio</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {averageMembershipYears.toFixed(1)} anos
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={100} 
                        className="h-4 flex-1"
                        indicatorColor="#10b981" // emerald-500
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Nenhum dado de tempo de associação disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Sponsors Chart - UPDATED to show nicknames and tooltips */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center">
                <Award className="mr-2 h-5 w-5 text-amber-500" />
                Top Padrinhos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full animate-pulse bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : topSponsors.length > 0 ? (
                <div className="space-y-4">
                  {topSponsors.map((sponsor, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">
                            {sponsor.sponsorNickname || sponsor.sponsorName}
                          </span>
                          {sponsor.godchildren && sponsor.godchildren.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  type="button" 
                                  className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-gray-200 transition-colors"
                                  aria-label="Ver afilhados"
                                >
                                  <Info className="h-4 w-4 text-gray-400" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="start" className="max-w-sm max-h-[300px] overflow-y-auto">
                                <ul className="text-xs space-y-1">
                                  {sponsor.godchildren
                                    .filter(godchild => godchild.nickname)
                                    .map(godchild => (
                                      <li key={godchild.id} className="flex items-center">
                                        <span>{godchild.nickname}</span>
                                      </li>
                                    ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{sponsor.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{sponsor.count}</span>
                        <Progress 
                          value={sponsor.percentage} 
                          className="h-4 flex-1"
                          indicatorColor="#f59e0b" // amber-500
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Nenhum dado de padrinho disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MemberStatistics;
