import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus,
  Loader2,
  Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

interface ClubAdmin {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface ClubMember {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const ClubAdminSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  useEffect(() => {
    if (openNewAdminDialog && user?.activeClub?.id) {
      fetchActiveMembers();
    }
  }, [openNewAdminDialog, user?.activeClub?.id]);

  const fetchClubAdmins = async () => {
    setLoading(true);
    try {
      // Usando uma abordagem do tipo não verificada para acessar a nova tabela
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
        // Tipagem segura para o nosso estado
        const typedData = data as unknown as ClubAdmin[];
        setAdmins(typedData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, email, password')
        .eq('club_id', user?.activeClub?.id)
        .eq('status', 'Ativo')
        .order('name');
      
      if (error) {
        console.error('Error fetching active members:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar sócios",
          description: "Não foi possível carregar a lista de sócios ativos do clube."
        });
      } else {
        // Filter out members who are already admins
        const filteredMembers = (data || []).filter(member => 
          !admins.some(admin => admin.email === member.email)
        );
        setActiveMembers(filteredMembers as ClubMember[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const onSubmitNewAdmin = async (data: z.infer<typeof newAdminSchema>) => {
    if (!user?.activeClub?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum clube ativo selecionado."
      });
      return;
    }

    try {
      // Find the selected member from our list
      const selectedMember = activeMembers.find(member => member.id === data.memberId);
      
      if (!selectedMember) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Sócio não encontrado."
        });
        return;
      }

      // Check if email already exists using a não-tipada abordagem para club_admins
      const { data: existingAdmin, error: checkError } = await supabase
        .from('club_admins')
        .select('id')
        .eq('email', selectedMember.email)
        .eq('club_id', user.activeClub.id)
        .maybeSingle();

      if (existingAdmin) {
        toast({
          variant: "destructive",
          title: "Erro ao adicionar administrador",
          description: "Já existe um administrador com este e-mail."
        });
        return;
      }

      // Add new admin using a não-tipada abordagem para club_admins
      const { error } = await supabase
        .from('club_admins')
        .insert({
          club_id: user.activeClub.id,
          name: selectedMember.name,
          email: selectedMember.email,
          password: selectedMember.password // Use the member's existing password
        });

      if (error) {
        console.error('Error adding club admin:', error);
        toast({
          variant: "destructive",
          title: "Erro ao adicionar administrador",
          description: "Ocorreu um erro ao adicionar o administrador. Tente novamente."
        });
        return;
      }

      toast({
        title: "Administrador adicionado",
        description: "O administrador foi adicionado com sucesso."
      });

      // Reset form and close dialog
      newAdminForm.reset();
      setOpenNewAdminDialog(false);
      
      // Refresh admin list
      fetchClubAdmins();
    } catch (error) {
      console.error('Error adding club admin:', error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar administrador",
        description: "Ocorreu um erro ao adicionar o administrador. Tente novamente."
      });
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!user?.activeClub?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum clube ativo selecionado."
      });
      return;
    }

    try {
      setDeleteLoading(true);
      
      const { error } = await supabase
        .from('club_admins')
        .delete()
        .eq('id', adminId)
        .eq('club_id', user.activeClub.id);
      
      if (error) {
        console.error('Error deleting club admin:', error);
        toast({
          variant: "destructive",
          title: "Erro ao excluir administrador",
          description: "Ocorreu um erro ao excluir o administrador. Tente novamente."
        });
        return;
      }

      toast({
        title: "Administrador excluído",
        description: "O administrador foi excluído com sucesso."
      });
      
      // Refresh admin list
      fetchClubAdmins();
    } catch (error) {
      console.error('Error deleting club admin:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir administrador",
        description: "Ocorreu um erro ao excluir o administrador. Tente novamente."
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-futconnect-600" />
          Administradores do Clube
        </CardTitle>
        <CardDescription>
          Gerencie os administradores que têm acesso ao seu clube.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">
            Administradores têm acesso completo à gestão do clube.
          </p>

          <Dialog open={openNewAdminDialog} onOpenChange={setOpenNewAdminDialog}>
            <DialogTrigger asChild>
              <Button className="bg-futconnect-600 hover:bg-futconnect-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Administrador
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Administrador</DialogTitle>
                <DialogDescription>
                  Selecione um sócio ativo para torná-lo administrador do clube.
                </DialogDescription>
              </DialogHeader>
              {loadingMembers ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-futconnect-600" />
                  <span className="ml-2">Carregando sócios...</span>
                </div>
              ) : (
                <Form {...newAdminForm}>
                  <form onSubmit={newAdminForm.handleSubmit(onSubmitNewAdmin)} className="space-y-4 py-4">
                    <FormField
                      control={newAdminForm.control}
                      name="memberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sócio</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um sócio" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeMembers.length === 0 ? (
                                  <SelectItem value="no-members" disabled>
                                    Nenhum sócio ativo disponível
                                  </SelectItem>
                                ) : (
                                  activeMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="mt-6">
                      <Button 
                        type="submit" 
                        className="bg-futconnect-600"
                        disabled={activeMembers.length === 0}
                      >
                        Adicionar Administrador
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-futconnect-600" />
            <span className="ml-2">Carregando administradores...</span>
          </div>
        ) : (
          <>
            {admins.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-200 rounded-md">
                <p className="text-gray-500">Nenhum administrador adicional foi cadastrado.</p>
                <p className="text-sm text-gray-400 mt-1">Clique em "Novo Administrador" para adicionar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nome</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">E-mail</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Data de cadastro</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{admin.name}</td>
                        <td className="px-4 py-3 text-sm">{admin.email}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(admin.created_at)}</td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <Button
                            variant="ghost"
                            className="h-8 px-2 text-futconnect-600 hover:text-futconnect-700"
                            onClick={() => {
                              toast({
                                title: "Funcionalidade em desenvolvimento",
                                description: "A edição de administradores estará disponível em breve."
                              });
                            }}
                          >
                            Editar
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost" 
                                className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir administrador</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este administrador? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  disabled={deleteLoading}
                                >
                                  {deleteLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Excluindo...
                                    </>
                                  ) : (
                                    "Excluir"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
