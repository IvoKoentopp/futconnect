
import React, { useState, useEffect } from 'react';
import { Trophy, Users, BarChart, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { GameFormModal } from '@/components/GameFormModal';
import { gameService } from '@/services/gameService';
import { Game } from '@/types/game';

const GamePanel = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGameFormOpen, setIsGameFormOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  
  const { user } = useAuth();
  const clubId = user?.activeClub?.id || '';
  
  useEffect(() => {
    const fetchGames = async () => {
      if (!clubId) return;
      
      setIsLoading(true);
      
      try {
        const fetchedGames = await gameService.fetchGames(clubId);
        setGames(fetchedGames);
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGames();
  }, [clubId]);

  const handleCreateGame = () => {
    setSelectedGame(null);
    setIsGameFormOpen(true);
  };

  const handleEditGame = (game: Game) => {
    setSelectedGame(game);
    setIsGameFormOpen(true);
  };

  const handleSaveGame = async (gameData: any) => {
    try {
      if (selectedGame) {
        // Editing existing game
        await gameService.updateGame(selectedGame.id, gameData);
      } else {
        // Creating new game
        await gameService.createGame(clubId, gameData);
      }
      
      // Refresh the games list
      const updatedGames = await gameService.fetchGames(clubId);
      setGames(updatedGames);
      
      setIsGameFormOpen(false);
    } catch (error) {
      console.error('Error saving game:', error);
    }
  };

  const scheduledGames = games.filter(game => game.status === 'scheduled');
  const completedGames = games.filter(game => game.status === 'completed');
  const canceledGames = games.filter(game => game.status === 'canceled');

  return (
    <AdminLayout appMode="club">
      <div className="container mx-auto py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Painel de Jogos</h1>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleCreateGame}
              className="bg-futconnect-600 hover:bg-futconnect-700"
            >
              Agendar Novo Jogo
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="scheduled" className="space-y-4">
          <TabsList>
            <TabsTrigger value="scheduled" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Jogos Agendados ({scheduledGames.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              <Trophy className="mr-2 h-4 w-4" />
              Jogos Realizados ({completedGames.length})
            </TabsTrigger>
            <TabsTrigger value="canceled" className="flex items-center">
              <BarChart className="mr-2 h-4 w-4" />
              Jogos Cancelados ({canceledGames.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Jogos Agendados</CardTitle>
                <CardDescription>
                  Lista de jogos programados para acontecer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
                  </div>
                ) : scheduledGames.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold">Local</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduledGames.map((game) => (
                          <TableRow key={game.id}>
                            <TableCell className="font-medium">
                              {new Date(game.date).toLocaleDateString('pt-BR')} às {new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>{game.location}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                Agendado
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                onClick={() => handleEditGame(game)}
                              >
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum jogo agendado no momento
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Jogos Realizados</CardTitle>
                <CardDescription>
                  Jogos que já aconteceram
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
                  </div>
                ) : completedGames.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold">Local</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedGames.map((game) => (
                          <TableRow key={game.id}>
                            <TableCell className="font-medium">
                              {new Date(game.date).toLocaleDateString('pt-BR')} às {new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>{game.location}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                Realizado
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                onClick={() => handleEditGame(game)}
                              >
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum jogo realizado ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="canceled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Jogos Cancelados</CardTitle>
                <CardDescription>
                  Jogos que foram cancelados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
                  </div>
                ) : canceledGames.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold">Local</TableHead>
                          <TableHead className="font-semibold">Motivo</TableHead>
                          <TableHead className="font-semibold text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {canceledGames.map((game) => (
                          <TableRow key={game.id}>
                            <TableCell className="font-medium">
                              {new Date(game.date).toLocaleDateString('pt-BR')} às {new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>{game.location}</TableCell>
                            <TableCell>{game.cancelReason || 'Não informado'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                onClick={() => handleEditGame(game)}
                              >
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum jogo cancelado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal de formulário de jogo */}
      <GameFormModal
        isOpen={isGameFormOpen}
        onClose={() => setIsGameFormOpen(false)}
        onSave={handleSaveGame}
        gameToEdit={selectedGame}
      />
    </AdminLayout>
  );
};

export default GamePanel;
