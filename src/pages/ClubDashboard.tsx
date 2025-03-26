import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { useActiveMembers } from '@/hooks/useActiveMembers';
import { useMemberBirthdays } from '@/hooks/useMemberBirthdays';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCompletedGames } from '@/hooks/useCompletedGames';
import { useTopPlayers } from '@/hooks/useTopPlayers';
import { usePlayerRanking } from '@/hooks/usePlayerRanking';
import { useGameSummary } from '@/hooks/useGameSummary';
import { useTopHighlights } from '@/hooks/useTopHighlights';
import BirthdayCard from '@/components/BirthdayCard';
import OverdueFeesTable from '@/components/OverdueFeesTable';
import TopPlayersCard from '@/components/TopPlayersCard';
import TopPlayerRankingCard from '@/components/TopPlayerRankingCard';
import TopHighlightsCard from '@/components/TopHighlightsCard';
import GameSummaryCard from '@/components/GameSummaryCard';
import { Calendar, Users, TrendingUp, CreditCard, ArrowUp, ArrowDown, Trophy } from 'lucide-react';

const ClubDashboard = () => {
  const { user } = useAuth();
  const { memberCount, newMembersThisMonth, isLoading: isLoadingMembers, error: errorMembers } = useActiveMembers(user?.activeClub?.id);
  const { birthdays, isLoading: isLoadingBirthdays, error: errorBirthdays } = useMemberBirthdays(user?.activeClub?.id);
  const { totalBalance, monthlyIncrease, isLoading: isLoadingBalance, error: errorBalance } = useBankAccounts(user?.activeClub?.id);
  const { gameCount, gamesThisMonth, isLoading: isLoadingGames, error: errorGames } = useCompletedGames(user?.activeClub?.id);
  const { topPlayers, isLoading: isLoadingTopPlayers, error: errorTopPlayers } = useTopPlayers(user?.activeClub?.id);
  const { topPlayers: topRankedPlayers, isLoading: isLoadingPlayerRanking, error: errorPlayerRanking } = usePlayerRanking(user?.activeClub?.id);
  const { topHighlights, isLoading: isLoadingHighlights, error: errorHighlights } = useTopHighlights(user?.activeClub?.id);
  const { 
    averageGoalsPerGame, 
    averagePlayersPerGame, 
    completionRate, 
    isLoading: isLoadingGameSummary, 
    error: errorGameSummary 
  } = useGameSummary(user?.activeClub?.id);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard do Clube</h1>
      
      {/* First Row: Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Stats Card 1: Sócios Ativos */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-futconnect-600" />
              Sócios Ativos
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Total de sócios ativos no clube
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorMembers ? (
              <div className="text-red-500">Erro ao carregar sócios.</div>
            ) : (
              <div className="text-3xl font-bold">{memberCount}</div>
            )}
            <p className="text-sm text-muted-foreground">
              <TrendingUp className="mr-1 inline-block h-4 w-4 align-middle" />
              {newMembersThisMonth} novos sócios este mês
            </p>
          </CardContent>
        </Card>
        
        {/* Stats Card 2: Total de Jogos Realizados */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-futconnect-600" />
              Total de Jogos Realizados no Ano
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Jogos realizados no ano corrente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGames ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorGames ? (
              <div className="text-red-500">Erro ao carregar jogos.</div>
            ) : (
              <div className="text-3xl font-bold">{gameCount}</div>
            )}
            <p className="text-sm text-muted-foreground">
              <Calendar className="mr-1 inline-block h-4 w-4 align-middle" />
              {gamesThisMonth} jogos neste mês
            </p>
          </CardContent>
        </Card>
        
        {/* Stats Card 3: Saldo Bancário */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-futconnect-600" />
              Saldo Bancário
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Saldo total nas contas bancárias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
              </div>
            ) : errorBalance ? (
              <div className="text-red-500">Erro ao carregar saldo.</div>
            ) : (
              <div className="text-3xl font-bold">{formatCurrency(totalBalance)}</div>
            )}
            <p className="text-sm text-muted-foreground">
              {monthlyIncrease >= 0 ? (
                <ArrowUp className="mr-1 inline-block h-4 w-4 align-middle text-green-500" />
              ) : (
                <ArrowDown className="mr-1 inline-block h-4 w-4 align-middle text-red-500" />
              )}
              {formatCurrency(Math.abs(monthlyIncrease))} {monthlyIncrease >= 0 ? 'aumento' : 'redução'} este mês
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Second Row: Top Players, Rankings and Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Top Players Participation Card */}
        <div className="col-span-1">
          {user?.activeClub?.id && (
            <TopPlayersCard 
              topPlayers={topPlayers}
              isLoading={isLoadingTopPlayers}
              error={errorTopPlayers}
            />
          )}
        </div>
        
        {/* Top Players Ranking Card */}
        <div className="col-span-1">
          {user?.activeClub?.id && (
            <TopPlayerRankingCard 
              topPlayers={topRankedPlayers}
              isLoading={isLoadingPlayerRanking}
              error={errorPlayerRanking}
            />
          )}
        </div>
        
        {/* Top Highlights Card */}
        <div className="col-span-1">
          {user?.activeClub?.id && (
            <TopHighlightsCard 
              topHighlights={topHighlights}
              isLoading={isLoadingHighlights}
              error={errorHighlights}
            />
          )}
        </div>
      </div>
      
      {/* Third Row: Game Summary, Birthdays and Overdue Fees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Summary Card */}
        <div className="col-span-1">
          {user?.activeClub?.id && (
            <GameSummaryCard
              averageGoalsPerGame={averageGoalsPerGame}
              averagePlayersPerGame={averagePlayersPerGame}
              completionRate={completionRate}
              isLoading={isLoadingGameSummary}
              error={errorGameSummary}
            />
          )}
        </div>
        
        {/* Birthdays Card */}
        <div className="col-span-1">
          {user?.activeClub?.id && (
            <BirthdayCard 
              birthdaysByMonth={birthdays}
              isLoading={isLoadingBirthdays}
              currentMonth={new Date().getMonth() + 1}
            />
          )}
        </div>
        
        {/* Overdue Fees Table */}
        <div className="col-span-1">
          {user?.activeClub?.id && (
            <OverdueFeesTable clubId={user.activeClub.id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubDashboard;
