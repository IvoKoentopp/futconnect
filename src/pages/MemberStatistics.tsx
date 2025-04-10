import { useEffect, useState } from 'react';
import { differenceInYears, differenceInMonths } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Info, 
  Clock, 
  Users, 
  UserCheck, 
  UserX, 
  Percent, 
  ListChecks, 
  UserRound, 
  Award 
} from 'lucide-react';
import { MemberStats, CategoryDistributionResult, AgeDistributionResult, MembershipDurationResult, TopSponsorResult } from '@/types/database';

interface CategoryMember {
  id: string;
  name: string;
  nickname: string | null;
}

interface AgeDistribution extends AgeDistributionResult {}

interface MembershipDuration extends MembershipDurationResult {}

interface TopSponsor extends TopSponsorResult {}

interface SponsorData {
  sponsor_id: string;
  sponsor_name: string;
  sponsor_nickname: string | null;
  count: number;
  percentage: number;
  godchildren: CategoryMember[];
}

const MemberStatistics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<MemberStats>({
    total_members: 0,
    active_members: 0,
    inactive_members: 0,
    activity_rate: 0
  });
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistributionResult[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistribution[]>([]);
  const [membershipDuration, setMembershipDuration] = useState<MembershipDuration[]>([]);
  const [topSponsors, setTopSponsors] = useState<TopSponsor[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const clubId = user?.activeClub?.id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Buscar estatísticas gerais dos membros usando RPC
        const { data: statsData, error: statsError } = await supabase
          .rpc<MemberStats>('get_member_stats', {
            club_id: clubId
          });

        if (statsError) {
          console.error('Stats Error:', statsError);
          throw statsError;
        }

        if (statsData) {
          setStats(statsData);
        }

        // Calcular distribuição por categoria usando a função RPC
        const { data: categoryData, error: categoryError } = await supabase
          .rpc<CategoryDistributionResult[]>('get_category_distribution', {
            club_id: clubId
          });

        if (categoryError) {
          console.error('Category Error:', categoryError);
          throw categoryError;
        }
        
        if (categoryData && Array.isArray(categoryData)) {
          setCategoryDistribution(categoryData);
        }

        // Calcular distribuição por idade usando RPC
        const { data: ageData, error: ageError } = await supabase
          .rpc<AgeDistribution[]>('get_age_distribution', {
            club_id: clubId
          });

        if (ageError) {
          console.error('Age Error:', ageError);
          throw ageError;
        }

        if (ageData && Array.isArray(ageData)) {
          setAgeDistribution(ageData);
        }

        // Buscar distribuição por tempo de associação
        const { data: durationData, error: durationError } = await supabase.rpc('get_membership_duration', {
          club_id: clubId
        });

        if (durationError) {
          console.error('Duration Error:', durationError);
          throw durationError;
        }

        if (durationData) {
          setMembershipDuration(durationData);
        }

        // Buscar top padrinhos usando RPC
        const { data: sponsorData, error: sponsorError } = await supabase
          .rpc<TopSponsorResult[]>('get_top_sponsors', {
            club_id: clubId,
            limit_num: 10
          });

        if (sponsorError) {
          console.error('Sponsor Error:', sponsorError);
          throw sponsorError;
        }
        
        if (sponsorData && Array.isArray(sponsorData)) {
          setTopSponsors(sponsorData);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Erro ao carregar estatísticas",
          description: "Não foi possível carregar as estatísticas dos membros. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (clubId) {
      fetchData();
    }
  }, [clubId, toast]);

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
                <div className="text-3xl font-bold">{stats.total_members}</div>
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
                <div className="text-3xl font-bold text-green-600">{stats.active_members}</div>
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
                <div className="text-3xl font-bold text-red-600">{stats.inactive_members}</div>
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
                <div className="text-3xl font-bold text-amber-600">{stats.activity_rate.toFixed(1)}%</div>
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
                  {categoryDistribution.map((category) => (
                    <div key={`category-${category.category}`} className="bg-gray-50 p-4 rounded-lg">
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
                <div className="space-y-8">
                  <div className="space-y-4">
                    {ageDistribution.map((age) => (
                      <div key={age.order_num}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-sm font-medium">{age.age_range}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  type="button" 
                                  className="ml-1 flex items-center justify-center h-5 w-5 rounded-full hover:bg-gray-100"
                                  aria-label="Ver apelidos"
                                >
                                  <Info className="h-4 w-4 text-gray-400" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="start" className="max-w-sm max-h-[300px] overflow-y-auto">
                                <ul className="text-xs space-y-1">
                                  {age.members?.filter(member => member.nickname).map(member => (
                                    <li key={member.id}>{member.nickname}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-sm text-gray-500">{age.count} sócios</span>
                        </div>
                        <Progress 
                          value={age.percentage} 
                          className="h-3"
                          indicatorColor="#3b82f6"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Idade Média</span>
                      <span className="text-sm text-blue-600">{ageDistribution[0].average_age} anos</span>
                    </div>
                    <Progress 
                      value={100} 
                      className="h-3"
                      indicatorColor="#3b82f6"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Nenhum dado de idade disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membership Duration Chart */}
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
              ) : membershipDuration.length > 0 ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    {membershipDuration.map((duration) => (
                      <div key={duration.order_num}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-sm font-medium">{duration.duration_range}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  type="button" 
                                  className="ml-1 flex items-center justify-center h-5 w-5 rounded-full hover:bg-gray-100"
                                  aria-label="Ver apelidos"
                                >
                                  <Info className="h-4 w-4 text-gray-400" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="start" className="max-w-sm max-h-[300px] overflow-y-auto">
                                <ul className="text-xs space-y-1">
                                  {duration.members?.filter(member => member.nickname).map(member => (
                                    <li key={member.id}>{member.nickname}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-sm text-gray-500">{duration.members?.length || 0} sócios</span>
                        </div>
                        <Progress 
                          value={duration.percentage} 
                          className="h-3"
                          indicatorColor="#10b981"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Tempo Médio</span>
                      <span className="text-sm text-emerald-600">{membershipDuration[0].average_years} anos</span>
                    </div>
                    <Progress 
                      value={100} 
                      className="h-3"
                      indicatorColor="#10b981"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Nenhum dado de tempo de associação disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Sponsors Chart */}
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
                  {topSponsors.map((sponsor) => (
                    <div key={`sponsor-${sponsor.sponsor_id}`} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">
                            {sponsor.sponsor_nickname || sponsor.sponsor_name}
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
