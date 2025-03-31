import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveMembers } from '@/hooks/useActiveMembers';
import { useMemberBirthdays } from '@/hooks/useMemberBirthdays';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCompletedGames } from '@/hooks/useCompletedGames';
import { useTopPlayers } from '@/hooks/useTopPlayers';
import { usePlayerRanking } from '@/hooks/usePlayerRanking';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useTopHighlights } from '@/hooks/useTopHighlights';
import { useYearFilter } from '@/hooks/useYearFilter';
import BirthdayCard from '@/components/BirthdayCard';
import OverdueFeesTable from '@/components/OverdueFeesTable';
import TopPlayersCard from '@/components/TopPlayersCard';
import TopPlayerRankingCard from '@/components/TopPlayerRankingCard';
import TopHighlightsCard from '@/components/TopHighlightsCard';
import GameSummaryCard from '@/components/GameSummaryCard';
import { Calendar, Users, TrendingUp, CreditCard, ArrowUp, ArrowDown, Trophy, Filter } from 'lucide-react';

const ClubDashboard = () => {
  const { user } = useAuth();
  const clubId = user?.activeClub?.id;
  
  // Hooks de dados
  const { selectedYear, setSelectedYear, availableYears, isLoading: isLoadingYears } = useYearFilter(clubId);
  const { memberCount, newMembersThisMonth, isLoading: isLoadingMembers, error: errorMembers } = useActiveMembers(clubId);
  const { birthdays, isLoading: isLoadingBirthdays, error: errorBirthdays } = useMemberBirthdays(clubId);
  const { totalBalance, monthlyIncrease, isLoading: isLoadingBalance, error: errorBalance } = useBankAccounts(clubId);
  const { gameCount, gamesThisMonth, isLoading: isLoadingGames, error: errorGames } = useCompletedGames(clubId);
  
  // Hooks filtrados por ano
  const { topPlayers, isLoading: isLoadingTopPlayers, error: errorTopPlayers } = useTopPlayers(clubId, selectedYear);
  const { topPlayers: topRankedPlayers, isLoading: isLoadingPlayerRanking, error: errorPlayerRanking } = usePlayerRanking(clubId, selectedYear);
  const { topHighlights, isLoading: isLoadingHighlights, error: errorHighlights } = useTopHighlights(clubId, selectedYear);
  const { 
    averageGoalsPerGame, 
    averagePlayersPerGame, 
    completionRate, 
    isLoading: isLoadingGameSummary, 
    error: errorGameSummary 
  } = useGameSummary(clubId, selectedYear);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard do Clube</h1>
        
        {/* Filtro de ano */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
            disabled={isLoadingYears}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por ano" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year === "all" ? "Todos os anos" : year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Primeira linha: Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Sócios Ativos */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-futconnect-600" />
              Sócios Ativos
            </CardTitle>
            <CardDescription>Total de sócios ativos no clube</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorMembers ? (
              <div className="text-red-500">Erro ao carregar sócios.</div>
            ) : (
              <>
                <div className="text-3xl font-bold">{memberCount}</div>
                <p className="text-sm text-muted-foreground">
                  <TrendingUp className="mr-1 inline-block h-4 w-4 align-middle" />
                  {newMembersThisMonth} novos sócios este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Jogos Realizados */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-futconnect-600" />
              Jogos Realizados
            </CardTitle>
            <CardDescription>Total de jogos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGames ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorGames ? (
              <div className="text-red-500">Erro ao carregar jogos.</div>
            ) : (
              <>
                <div className="text-3xl font-bold">{gameCount}</div>
                <p className="text-sm text-muted-foreground">
                  <TrendingUp className="mr-1 inline-block h-4 w-4 align-middle" />
                  {gamesThisMonth} jogos este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-futconnect-600" />
              Saldo
            </CardTitle>
            <CardDescription>Saldo total do clube</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorBalance ? (
              <div className="text-red-500">Erro ao carregar saldo.</div>
            ) : (
              <>
                <div className="text-3xl font-bold">R$ {totalBalance}</div>
                <p className="text-sm text-muted-foreground">
                  {monthlyIncrease >= 0 ? (
                    <ArrowUp className="mr-1 inline-block h-4 w-4 align-middle text-green-500" />
                  ) : (
                    <ArrowDown className="mr-1 inline-block h-4 w-4 align-middle text-red-500" />
                  )}
                  R$ {Math.abs(monthlyIncrease)} este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha: Cards de performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Top Participação */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Top Participação</CardTitle>
            <CardDescription>Jogadores com maior participação</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTopPlayers ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorTopPlayers ? (
              <div className="text-red-500">Erro ao carregar top jogadores.</div>
            ) : (
              <TopPlayersCard 
                topPlayers={topPlayers}
                isLoading={isLoadingTopPlayers}
                error={errorTopPlayers}
              />
            )}
          </CardContent>
        </Card>

        {/* Top Desempenho */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Top Desempenho</CardTitle>
            <CardDescription>Jogadores com melhor desempenho</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPlayerRanking ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorPlayerRanking ? (
              <div className="text-red-500">Erro ao carregar ranking.</div>
            ) : (
              <TopPlayerRankingCard 
                topPlayers={topRankedPlayers}
                isLoading={isLoadingPlayerRanking}
                error={errorPlayerRanking}
              />
            )}
          </CardContent>
        </Card>

        {/* Top Destaques */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Top Destaques</CardTitle>
            <CardDescription>Jogadores mais votados como destaque</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHighlights ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorHighlights ? (
              <div className="text-red-500">Erro ao carregar destaques.</div>
            ) : (
              <TopHighlightsCard 
                topHighlights={topHighlights}
                isLoading={isLoadingHighlights}
                error={errorHighlights}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Terceira linha: Resumo, Aniversariantes e Mensalidades */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Resumo dos Jogos */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Resumo dos Jogos</CardTitle>
            <CardDescription>Estatísticas gerais dos jogos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGameSummary ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorGameSummary ? (
              <div className="text-red-500">Erro ao carregar resumo dos jogos.</div>
            ) : (
              <GameSummaryCard
                averageGoalsPerGame={averageGoalsPerGame}
                averagePlayersPerGame={averagePlayersPerGame}
                completionRate={completionRate}
                isLoading={isLoadingGameSummary}
                error={errorGameSummary}
              />
            )}
          </CardContent>
        </Card>

        {/* Aniversariantes */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Aniversariantes</CardTitle>
            <CardDescription>Aniversariantes do mês</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBirthdays ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorBirthdays ? (
              <div className="text-red-500">Erro ao carregar aniversariantes.</div>
            ) : (
              <BirthdayCard 
                birthdaysByMonth={birthdays}
                isLoading={isLoadingBirthdays}
                currentMonth={new Date().getMonth() + 1}
              />
            )}
          </CardContent>
        </Card>

        {/* Mensalidades em Atraso */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Mensalidades em Atraso</CardTitle>
            <CardDescription>Sócios com pagamentos pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            {clubId && <OverdueFeesTable clubId={clubId} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClubDashboard;
