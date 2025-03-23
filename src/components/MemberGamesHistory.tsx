
import React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MemberGameParticipation, MemberScoreDetails } from '@/hooks/useMemberGames';

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
      <Table>
        <TableCaption>Histórico de jogos do sócio</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Status do Jogo</TableHead>
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
            games.map((participation) => (
              <TableRow key={participation.game.id}>
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default MemberGamesHistory;
