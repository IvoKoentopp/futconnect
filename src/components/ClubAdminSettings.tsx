import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus,
  Loader2,
  Trash2,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAuthorization } from "@/hooks/useAuthorization";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface ClubMember {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface ClubAdmin {
  id: string;
  name: string;
  email: string;
  created_at: string;
  club_id: string;
  password: string;
}

type Database = {
  public: {
    Tables: {
      club_members: {
        Row: ClubMember;
      };
      club_admins: {
        Row: ClubAdmin;
      };
    };
  };
};

export const ClubAdminSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canEdit } = useAuthorization();
  const [admins, setAdmins] = useState<ClubAdmin[]>([]);
  const [activeMembers, setActiveMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openNewAdminDialog, setOpenNewAdminDialog] = useState(false);

  // Form schema for selecting a member to make admin
  const newAdminSchema = z.object({
    memberId: z.string().min(1, { message: "Selecione um sócio" }),
  });

  const newAdminForm = useForm<z.infer<typeof newAdminSchema>>({
    resolver: zodResolver(newAdminSchema),
    defaultValues: {
      memberId: "",
    },
  });

  useEffect(() => {
    if (user?.activeClub?.id) {
      fetchClubAdmins();
    }
  }, [user?.activeClub?.id]);

  const handleOpenDialog = () => {
    fetchActiveMembers();
    setOpenNewAdminDialog(true);
  };

  const fetchClubAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_admins')
        .select('id, name, email, created_at')
        .eq('club_id', user?.activeClub?.id)
        .order('name');
      
      if (error) {
        console.error('Error fetching club admins:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar administradores",
          description: "Não foi possível carregar a lista de administradores do clube."
        });
      } else {
        const typedData = data as unknown as ClubAdmin[];
        setAdmins(typedData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar administradores",
        description: "Ocorreu um erro ao carregar a lista de administradores."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    if (!canEdit) return;

    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, email, status')
        .eq('club_id', user?.activeClub?.id)
        .eq('status', 'Ativo')
        .order('name');

      if (error) {
        throw error;
      }

      // Filtrar membros que já são administradores
      const membersNotAdmin = (data || []).filter(member => 
        !admins.some(admin => admin.email?.toLowerCase() === member.email?.toLowerCase())
      );

      setActiveMembers(membersNotAdmin);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar sócios",
        description: "Não foi possível carregar a lista de sócios ativos."
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddAdmin = async (values: z.infer<typeof newAdminSchema>) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem adicionar novos administradores.",
      });
      return;
    }

    try {
      setLoading(true);

      // Find the selected member
      const selectedMember = activeMembers.find(member => member.id === values.memberId);
      if (!selectedMember) {
        throw new Error('Sócio não encontrado');
      }

      // Gerar uma senha aleatória temporária
      const tempPassword = Math.random().toString(36).slice(-8);

      const { error } = await supabase
        .from('club_admins')
        .insert({
          club_id: user?.activeClub?.id,
          email: selectedMember.email,
          name: selectedMember.name,
          password: tempPassword // Adicionando senha temporária
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Administrador adicionado",
        description: "O sócio foi adicionado como administrador com sucesso."
      });

      // Reset form and refresh lists
      newAdminForm.reset();
      setOpenNewAdminDialog(false);
      fetchClubAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar administrador",
        description: "Não foi possível adicionar o sócio como administrador."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem remover administradores.",
      });
      return;
    }

    try {
      setDeleteLoading(true);

      const { error } = await supabase
        .from('club_admins')
        .delete()
        .eq('id', adminId);

      if (error) {
        throw error;
      }

      toast({
        title: "Administrador removido",
        description: "O administrador foi removido com sucesso."
      });

      // Refresh list
      fetchClubAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        variant: "destructive",
        title: "Erro ao remover administrador",
        description: "Não foi possível remover o administrador."
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
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
          <Users className="h-5 w-5" />
          Administradores do Clube
        </CardTitle>
        <CardDescription>
          Gerencie os administradores do seu clube
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canEdit && (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-md mb-4">
            <ShieldAlert className="h-5 w-5" />
            <p>Você está no modo visualização. Apenas administradores podem gerenciar outros administradores.</p>
          </div>
        )}

        {/* Lista de Administradores */}
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between p-2 rounded-md border"
            >
              <div className="flex flex-col">
                <span className="font-medium">{admin.name}</span>
                <span className="text-sm text-muted-foreground">{admin.email}</span>
              </div>
              {canEdit && admin.email !== user?.email && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleteLoading}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O usuário perderá acesso às funcionalidades de administrador.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>

        {/* Botão e Dialog para Adicionar Administrador */}
        {canEdit && (
          <Dialog open={openNewAdminDialog} onOpenChange={setOpenNewAdminDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" onClick={handleOpenDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Administrador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Administrador</DialogTitle>
                <DialogDescription>
                  Selecione um sócio para torná-lo administrador do clube.
                </DialogDescription>
              </DialogHeader>
              <Form {...newAdminForm}>
                <form onSubmit={newAdminForm.handleSubmit(handleAddAdmin)} className="space-y-4">
                  <FormField
                    control={newAdminForm.control}
                    name="memberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sócio</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={loadingMembers}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingMembers ? "Carregando..." : "Selecione um sócio"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadingMembers ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : (
                              activeMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Adicionar"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};
