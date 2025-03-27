import { useState, useEffect } from "react";
import { Settings, Plus, Trash2, ShieldAlert, PaintBucket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
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
  const { canEdit } = useAuthorization();
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

      setTeamConfigurations(data || []);
    } catch (error) {
      console.error('Error fetching team configurations:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar times",
        description: "Não foi possível carregar as configurações dos times.",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddTeam = async () => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem adicionar times.",
      });
      return;
    }

    if (!newTeamName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o time.",
      });
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('team_configurations')
        .insert({
          club_id: user?.activeClub?.id,
          team_name: newTeamName.trim(),
          team_color: newTeamColor,
          is_active: true
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Time adicionado",
        description: "O time foi adicionado com sucesso.",
      });

      // Reset form and refresh list
      setNewTeamName("");
      setNewTeamColor("#ffffff");
      fetchTeamConfigurations();
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

  const handleDeleteTeam = async (teamId: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem excluir times.",
      });
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('team_configurations')
        .update({ is_active: false })
        .eq('id', teamId);

      if (error) {
        throw error;
      }

      toast({
        title: "Time removido",
        description: "O time foi removido com sucesso.",
      });

      // Refresh list
      fetchTeamConfigurations();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        variant: "destructive",
        title: "Erro ao remover time",
        description: "Não foi possível remover o time.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações dos Times
        </CardTitle>
        <CardDescription>
          Configure os times que serão usados nos jogos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canEdit && (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-md mb-4">
            <ShieldAlert className="h-5 w-5" />
            <p>Você está no modo visualização. Apenas administradores podem editar as configurações.</p>
          </div>
        )}

        {/* Lista de Times */}
        <div className="space-y-2">
          {teamConfigurations.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-2 rounded-md border"
              style={{ borderLeftColor: team.team_color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: team.team_color }}
                />
                <span>{team.team_name}</span>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTeam(team.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Formulário para Adicionar Time */}
        {canEdit && (
          <div className="flex gap-2">
            <Input
              placeholder="Nome do time"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex items-center gap-2 min-w-[120px]">
              <PaintBucket className="h-4 w-4 text-muted-foreground" />
              <Input
                type="color"
                value={newTeamColor}
                onChange={(e) => setNewTeamColor(e.target.value)}
                className="w-16 p-1 h-9"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleAddTeam}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
