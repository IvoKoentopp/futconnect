import React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MemberGameParticipation, MemberScoreDetails } from '@/hooks/useMemberGames';
import { Card, CardContent } from "@/components/ui/card";
import { Gamepad, CheckCircle, XCircle } from "lucide-react";

interface MemberGamesHistoryProps {
  games: MemberGameParticipation[];
  scoreDetails: MemberScoreDetails | null;
  isLoading: boolean;
  error: Error | null;
}

const MemberGamesHistory: React.FC<MemberGamesHistoryProps> = ({ 
  games, 
  scoreDetails,
  isLoading, 
  error 
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    const statusColors = {
      'confirmed': 'bg-green-100 text-green-800',
      'declined': 'bg-red-100 text-red-800',
      'unconfirmed': 'bg-amber-100 text-amber-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };
  
  // Get game status badge color
  const getGameStatusBadgeColor = (status: string) => {
    const statusColors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'canceled': 'bg-red-100 text-red-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };
  
  if (isLoading) {
    return <div className="p-4 text-center">Carregando histórico de jogos...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">Erro ao carregar histórico de jogos: {error.message}</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card - Total de Jogos */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Gamepad className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="text-lg font-medium">Total de Jogos</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {games.length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                participações registradas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card - Total de Confirmações */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="text-lg font-medium">Total de Confirmações</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {games.filter(game => game.status === 'confirmed').length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                jogos confirmados
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card - Total de Recusados */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-8 w-8 text-red-500 mb-2" />
              <h3 className="text-lg font-medium">Total de Recusados</h3>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {games.filter(game => game.status === 'declined').length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                jogos recusados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableCaption>Histórico de jogos do sócio</TableCaption>
        <TableHeader>
          {/* Cabeçalho para Desktop */}
          <TableRow className="hidden md:table-row">
            <TableHead>Data</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Status do Jogo</TableHead>
            <TableHead>Participação</TableHead>
          </TableRow>
          {/* Cabeçalho para Mobile */}
          <TableRow className="md:hidden">
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Participação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6">
                Nenhum jogo encontrado para este sócio.
              </TableCell>
            </TableRow>
          ) : (
            games.map((participation) => {
              return [
                // Linha para Desktop
                <TableRow key={`desktop-${participation.game.id}`} className="hidden md:table-row">
                  <TableCell>{formatDate(participation.game.date)}</TableCell>
                  <TableCell>{participation.game.title}</TableCell>
                  <TableCell>{participation.game.location}</TableCell>
                  <TableCell>
                    <Badge className={getGameStatusBadgeColor(participation.game.status)}>
                      {participation.game.status === 'scheduled' ? 'Agendado' : 
                       participation.game.status === 'completed' ? 'Realizado' : 
                       participation.game.status === 'canceled' ? 'Cancelado' : participation.game.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(participation.status)}>
                      {participation.status === 'confirmed' ? 'Confirmado' : 
                       participation.status === 'declined' ? 'Recusado' : 'Não confirmado'}
                    </Badge>
                  </TableCell>
                </TableRow>,
                // Linha para Mobile
                <TableRow key={`mobile-${participation.game.id}`} className="md:hidden">
                  <TableCell>{formatDate(participation.game.date)}</TableCell>
                  <TableCell>
                    <Badge className={getGameStatusBadgeColor(participation.game.status)}>
                      {participation.game.status === 'scheduled' ? 'Agendado' : 
                       participation.game.status === 'completed' ? 'Realizado' : 
                       participation.game.status === 'canceled' ? 'Cancelado' : participation.game.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(participation.status)}>
                      {participation.status === 'confirmed' ? 'Confirmado' : 
                       participation.status === 'declined' ? 'Recusado' : 'Não confirmado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ];
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default MemberGamesHistory;
