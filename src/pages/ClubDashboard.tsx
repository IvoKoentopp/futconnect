import React from 'react';
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
import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import BirthdayCard from '@/components/BirthdayCard';
import OverdueFeesTable from '@/components/OverdueFeesTable';
import TopPlayersCard from '@/components/TopPlayersCard';
import TopPlayerRankingCard from '@/components/TopPlayerRankingCard';
import TopHighlightsCard from '@/components/TopHighlightsCard';
import GameSummaryCard from '@/components/GameSummaryCard';
import { Calendar, Users, TrendingUp, CreditCard, ArrowUp, ArrowDown, Trophy, Filter } from 'lucide-react';
import { formatCurrency } from '@/utils/financialStatement';

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
      <DashboardGrid className="mb-6">
        <DashboardCard
          title="Sócios Ativos"
          icon={Users}
          isLoading={isLoadingMembers}
          error={errorMembers}
        >
          <div className="text-3xl font-bold">{memberCount}</div>
          <p className="text-sm text-muted-foreground">
            <TrendingUp className="mr-1 inline-block h-4 w-4 align-middle" />
            {newMembersThisMonth} novos sócios este mês
          </p>
        </DashboardCard>

        <DashboardCard
          title="Jogos Realizados"
          icon={Trophy}
          isLoading={isLoadingGames}
          error={errorGames}
        >
          <div className="text-3xl font-bold">{gameCount}</div>
          <p className="text-sm text-muted-foreground">
            <TrendingUp className="mr-1 inline-block h-4 w-4 align-middle" />
            {gamesThisMonth} jogos este mês
          </p>
        </DashboardCard>

        <DashboardCard
          title="Saldo"
          icon={CreditCard}
          isLoading={isLoadingBalance}
          error={errorBalance}
        >
          <div className="text-3xl font-bold">{formatCurrency(totalBalance)}</div>
          <p className="text-sm text-muted-foreground">
            {monthlyIncrease >= 0 ? (
              <ArrowUp className="mr-1 inline-block h-4 w-4 align-middle text-green-500" />
            ) : (
              <ArrowDown className="mr-1 inline-block h-4 w-4 align-middle text-red-500" />
            )}
            {formatCurrency(Math.abs(monthlyIncrease))} este mês
          </p>
        </DashboardCard>
      </DashboardGrid>

      {/* Segunda linha: Cards de performance */}
      <DashboardGrid className="mb-6">
        <DashboardCard
          title="Top Participação"
          description="Jogadores com maior participação"
          isLoading={isLoadingTopPlayers}
          error={errorTopPlayers}
        >
          <TopPlayersCard 
            topPlayers={topPlayers}
            isLoading={isLoadingTopPlayers}
            error={errorTopPlayers}
          />
        </DashboardCard>

        <DashboardCard
          title="Top Desempenho"
          description="Jogadores com melhor desempenho"
          isLoading={isLoadingPlayerRanking}
          error={errorPlayerRanking}
        >
          <TopPlayerRankingCard 
            topPlayers={topRankedPlayers}
            isLoading={isLoadingPlayerRanking}
            error={errorPlayerRanking}
          />
        </DashboardCard>

        <DashboardCard
          title="Top Destaques"
          description="Jogadores mais votados como destaque"
          isLoading={isLoadingHighlights}
          error={errorHighlights}
        >
          <TopHighlightsCard 
            topHighlights={topHighlights}
            isLoading={isLoadingHighlights}
            error={errorHighlights}
          />
        </DashboardCard>
      </DashboardGrid>

      {/* Terceira linha: Resumo, Aniversariantes e Mensalidades */}
      <DashboardGrid>
        <DashboardCard
          title="Resumo dos Jogos"
          isLoading={isLoadingGameSummary}
          error={errorGameSummary}
        >
          <GameSummaryCard
            averageGoalsPerGame={averageGoalsPerGame}
            averagePlayersPerGame={averagePlayersPerGame}
            completionRate={completionRate}
            isLoading={isLoadingGameSummary}
            error={errorGameSummary}
          />
        </DashboardCard>

        <DashboardCard
          title="Aniversariantes"
          isLoading={isLoadingBirthdays}
          error={errorBirthdays}
        >
          <BirthdayCard 
            birthdaysByMonth={birthdays}
            isLoading={isLoadingBirthdays}
            currentMonth={new Date().getMonth() + 1}
          />
        </DashboardCard>

        <DashboardCard
          title="Mensalidades em Atraso"
        >
          {clubId && <OverdueFeesTable clubId={clubId} />}
        </DashboardCard>
      </DashboardGrid>
    </div>
  );
};

export default ClubDashboard;
