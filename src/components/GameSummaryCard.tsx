
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Goal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type GameSummaryCardProps = {
  averageGoalsPerGame: number;
  averagePlayersPerGame: number;
  completionRate: number;
  isLoading: boolean;
  error: Error | null;
};

const GameSummaryCard: React.FC<GameSummaryCardProps> = ({
  averageGoalsPerGame,
  averagePlayersPerGame,
  completionRate,
  isLoading,
  error
}) => {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg">Resumo dos Jogos</CardTitle>
        <CardDescription className="text-xs md:text-sm">Estatísticas dos jogos no ano corrente</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
          </div>
        ) : error ? (
          <div className="py-4 text-center text-red-500">
            <p>Erro ao carregar estatísticas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-4 rounded-md p-3 bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Goal className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Média de Gols por Jogo</p>
                <p className="text-2xl font-bold">{averageGoalsPerGame}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 rounded-md p-3 bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Média de Jogadores Confirmados</p>
                <p className="text-2xl font-bold">{averagePlayersPerGame}</p>
              </div>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-start gap-4 rounded-md p-3 bg-gray-50 cursor-help">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <Award className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Taxa de Realização de Jogos</p>
                      <p className="text-2xl font-bold">{completionRate}%</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Porcentagem de jogos realizados em relação ao total de jogos (realizados + cancelados). Jogos agendados não são contabilizados neste cálculo.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameSummaryCard;
