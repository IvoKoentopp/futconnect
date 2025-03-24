import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award, Star, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type TopPlayerProps = {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  score: number;
  participationRate: number;
  position: number;
};

const TopPlayerItem: React.FC<TopPlayerProps> = ({ 
  name, nickname, photoUrl, score, participationRate, position 
}) => {
  const displayName = nickname || name;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  // Ensure the score is formatted exactly as it is in MemberGamesHistory
  // by using toFixed(2) to show exactly 2 decimal places
  const formattedScore = score.toFixed(2);
  
  return (
    <div className={`flex items-center justify-between p-2 rounded-md ${position <= 3 ? 'bg-amber-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 relative">
          {position <= 3 && (
            <div className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-white text-xs
              ${position === 1 ? 'bg-yellow-500' : position === 2 ? 'bg-gray-400' : 'bg-amber-700'}`}>
              {position}
            </div>
          )}
          <Avatar className="h-10 w-10 border border-gray-200">
            <AvatarImage src={photoUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
        <div>
          <p className="font-medium text-sm">{displayName}</p>
          <div className="flex items-center text-xs text-muted-foreground">
            <Star className="h-3 w-3 mr-1 text-amber-500" />
            <span>{participationRate}% jogos</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <span className="font-bold text-sm">{formattedScore}</span>
        <p className="text-xs text-muted-foreground">pontos</p>
      </div>
    </div>
  );
};

type TopPlayersCardProps = {
  topPlayers: Array<{
    id: string;
    name: string;
    nickname: string | null;
    photoUrl: string | null;
    score: number;
    participationRate: number;
  }>;
  isLoading: boolean;
  error: Error | null;
};

const TopPlayersCard: React.FC<TopPlayersCardProps> = ({ topPlayers, isLoading, error }) => {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-futconnect-600" />
          Top Participantes
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Jogadores com mais participações
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
          </div>
        ) : error ? (
          <div className="py-4 text-center text-red-500">
            <p>Erro ao carregar jogadores</p>
          </div>
        ) : topPlayers.length === 0 ? (
          <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-md">
            <User className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <p>Nenhum dado de participação encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topPlayers.map((player, index) => (
              <TopPlayerItem
                key={player.id}
                id={player.id}
                name={player.name}
                nickname={player.nickname}
                photoUrl={player.photoUrl}
                score={player.score}
                participationRate={player.participationRate}
                position={index + 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopPlayersCard;
