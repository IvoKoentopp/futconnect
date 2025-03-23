import { useState, useEffect } from "react";
import { Settings, Plus, Trash2, ShieldAlert, PaintBucket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface TeamConfiguration {
  id: string;
  team_name: string;
  team_color: string;
  is_active: boolean;
}

export const TeamConfigurationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [teamConfigurations, setTeamConfigurations] = useState<TeamConfiguration[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#ffffff");

  // Fetch existing team configurations
  useEffect(() => {
    if (user?.activeClub?.id) {
      fetchTeamConfigurations();
    } else {
      setIsFetching(false);
    }
  }, [user]);

  const fetchTeamConfigurations = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('team_configurations')
        .select('*')
        .eq('club_id', user?.activeClub?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // If no configurations exist, create default ones
      if (!data || data.length === 0) {
        // Create default White and Green teams
        await createDefaultTeams();
        return;
      }

      setTeamConfigurations(data);
    } catch (error) {
      console.error('Error fetching team configurations:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações de times",
        description: "Não foi possível carregar as configurações de times.",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const createDefaultTeams = async () => {
    try {
      const defaultTeams = [
        { team_name: "Time Branco", team_color: "#ffffff" },
        { team_name: "Time Verde", team_color: "#4ade80" }
      ];

      for (const team of defaultTeams) {
        await supabase
          .from('team_configurations')
          .insert({
            club_id: user?.activeClub?.id,
            team_name: team.team_name,
            team_color: team.team_color
          });
      }

      // Fetch the newly created teams
      await fetchTeamConfigurations();
    } catch (error) {
      console.error('Error creating default teams:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar times padrão",
        description: "Não foi possível criar os times padrão.",
      });
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome do time é obrigatório",
        description: "Por favor, digite um nome para o time.",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if a team with this name already exists
      const { data: existingTeam } = await supabase
        .from('team_configurations')
        .select('id')
        .eq('club_id', user?.activeClub?.id)
        .eq('team_name', newTeamName.trim())
        .eq('is_active', true)
        .maybeSingle();
      
      if (existingTeam) {
        toast({
          variant: "destructive",
          title: "Time já existe",
          description: "Já existe um time com este nome.",
        });
        return;
      }

      const { data, error } = await supabase
        .from('team_configurations')
        .insert({
          club_id: user?.activeClub?.id,
          team_name: newTeamName.trim(),
          team_color: newTeamColor
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setTeamConfigurations(prev => [...prev, data]);
      setNewTeamName("");
      setNewTeamColor("#ffffff");

      toast({
        title: "Time adicionado",
        description: "O time foi adicionado com sucesso.",
      });
    } catch (error) {
      console.error('Error adding team:', error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar time",
        description: "Não foi possível adicionar o time.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTeam = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Instead of deleting, we set is_active to false
      const { error } = await supabase
        .from('team_configurations')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setTeamConfigurations(prev => prev.filter(team => team.id !== id));

      toast({
        title: "Time removido",
        description: "O time foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error removing team:', error);
      toast({
        variant: "destructive",
        title: "Erro ao remover time",
        description: "Não foi possível remover o time.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTeam = async (id: string, field: string, value: string) => {
    try {
      setIsLoading(true);
      
      // If updating the name, check for duplicates
      if (field === 'team_name') {
        const { data: existingTeam } = await supabase
          .from('team_configurations')
          .select('id')
          .eq('club_id', user?.activeClub?.id)
          .eq('team_name', value.trim())
          .eq('is_active', true)
          .neq('id', id)
          .maybeSingle();
        
        if (existingTeam) {
          toast({
            variant: "destructive",
            title: "Time já existe",
            description: "Já existe um time com este nome.",
          });
          // Reset the UI by refreshing the teams
          await fetchTeamConfigurations();
          return;
        }
      }

      const { error } = await supabase
        .from('team_configurations')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setTeamConfigurations(prev => prev.map(team => 
        team.id === id ? { ...team, [field]: value } : team
      ));

      toast({
        title: "Time atualizado",
        description: "O time foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar time",
        description: "Não foi possível atualizar o time.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-futconnect-600" />
        <span className="ml-2">Carregando configurações de times...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-futconnect-600" />
          Configuração de Times
        </CardTitle>
        <CardDescription>
          Defina os times que serão utilizados para formar os jogos no seu clube.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing teams list */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Times Configurados</h3>
          
          {teamConfigurations.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhum time configurado.</p>
          ) : (
            <div className="space-y-2">
              {teamConfigurations.map(team => (
                <div key={team.id} className="flex items-center space-x-2 border p-2 rounded-md">
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-300" 
                    style={{ backgroundColor: team.team_color }}
                  ></div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={team.team_name}
                      onChange={(e) => handleUpdateTeam(team.id, 'team_name', e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value !== team.team_name) {
                          handleUpdateTeam(team.id, 'team_name', e.target.value);
                        }
                      }}
                      className="flex-1"
                    />
                    
                    <Input
                      type="color"
                      value={team.team_color}
                      onChange={(e) => handleUpdateTeam(team.id, 'team_color', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTeam(team.id)}
                    disabled={isLoading || teamConfigurations.length <= 2}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title={teamConfigurations.length <= 2 ? "É necessário ter pelo menos dois times" : "Remover time"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Add new team form */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Adicionar Novo Time</h3>
          
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Nome do time"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="flex-1"
            />
            
            <div className="flex items-center gap-2 w-32">
              <PaintBucket className="h-4 w-4 text-gray-500" />
              <Input
                type="color"
                value={newTeamColor}
                onChange={(e) => setNewTeamColor(e.target.value)}
                className="w-20 h-10 p-1"
              />
            </div>
            
            <Button
              onClick={handleAddTeam}
              disabled={isLoading || !newTeamName.trim()}
              className="bg-futconnect-600 hover:bg-futconnect-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Nota: É necessário ter pelo menos dois times configurados para formar jogos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
