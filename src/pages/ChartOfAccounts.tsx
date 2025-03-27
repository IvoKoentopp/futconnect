import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartOfAccountsModal } from '@/components/ChartOfAccountsModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Book, PlusCircle, PenLine, Trash2, AlertCircle } from 'lucide-react';
import { fetchChartOfAccounts } from '@/utils/chartOfAccounts';
import { ChartOfAccount } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isClubAdmin } = useAuthorization();

  useEffect(() => {
    const checkPermissions = async () => {
      if (user?.activeClub?.id) {
        const isAdmin = await isClubAdmin(user.activeClub.id);
        setCanEdit(isAdmin);
      }
    };
    checkPermissions();
  }, [user?.activeClub?.id, isClubAdmin]);

  const loadAccounts = async () => {
    if (!user?.activeClub?.id) return;
    setIsLoading(true);
    try {
      const accounts = await fetchChartOfAccounts(user.activeClub.id);
      setAccounts(accounts);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar plano de contas",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [user?.activeClub?.id]);

  const handleDelete = async (id: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir contas.",
      });
      return;
    }
    
    setDeleteAccountId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteAccountId || !user?.activeClub?.id || !canEdit) return;
    
    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', deleteAccountId)
        .eq('club_id', user.activeClub.id);
      
      if (error) throw error;
      
      toast({
        title: "Conta excluída com sucesso",
        description: "A conta foi removida do plano de contas.",
      });
      
      loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir conta",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteAccountId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plano de Contas</h1>
          <p className="text-gray-500">
            Gerencie o plano de contas do {user?.activeClub?.name}
          </p>
        </div>
        {canEdit && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-futconnect-600 hover:bg-futconnect-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Conta
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold">Contas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futconnect-600"></div>
            </div>
          ) : accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-sm font-medium text-gray-500">Descrição</th>
                    <th className="py-3 text-left text-sm font-medium text-gray-500">Grupo</th>
                    {canEdit && (
                      <th className="py-3 text-center text-sm font-medium text-gray-500">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b last:border-0">
                      <td className="py-3 text-sm text-gray-900">{account.description}</td>
                      <td className="py-3 text-sm text-gray-900">
                        {account.accountGroup === 'income' ? 'Receita' : 'Despesa'}
                      </td>
                      {canEdit && (
                        <td className="py-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma conta cadastrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                {canEdit ? 'Comece cadastrando sua primeira conta no plano de contas.' : 'Nenhuma conta foi cadastrada ainda.'}
              </p>
              {canEdit && (
                <div className="mt-6">
                  <Button onClick={() => setIsModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Conta
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <ChartOfAccountsModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAccountCreated={loadAccounts}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChartOfAccounts;
