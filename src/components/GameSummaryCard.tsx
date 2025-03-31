import React from 'react';
import { Trophy, Users, Target } from 'lucide-react';

interface GameSummaryCardProps {
  averageGoalsPerGame: number;
  averagePlayersPerGame: number;
  completionRate: number;
  isLoading: boolean;
  error: Error | null;
}

const GameSummaryCard: React.FC<GameSummaryCardProps> = ({
  averageGoalsPerGame,
  averagePlayersPerGame,
  completionRate,
  isLoading,
  error
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Erro ao carregar resumo dos jogos.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Target className="h-5 w-5 text-futconnect-600" />
        <div>
          <div className="text-sm font-medium">Média de Gols por Jogo</div>
          <div className="text-2xl font-bold">{averageGoalsPerGame.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Users className="h-5 w-5 text-futconnect-600" />
        <div>
          <div className="text-sm font-medium">Média de Jogadores Confirmados</div>
          <div className="text-2xl font-bold">{averagePlayersPerGame.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Trophy className="h-5 w-5 text-futconnect-600" />
        <div>
          <div className="text-sm font-medium">Taxa de Realização</div>
          <div className="text-2xl font-bold">{completionRate.toFixed(2)}%</div>
        </div>
      </div>
    </div>
  );
};

export default GameSummaryCard;
