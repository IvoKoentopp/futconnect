import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { fetchMonthlyFees, deleteMonthlyFee, updateMonthlyFeePayment, cancelMonthlyFee, updateMonthlyFee } from '@/utils/monthlyFees';
import { MonthlyFee, MonthlyFeeSetting, MonthlyFeePaymentMethod, MonthlyFeeStatus } from '@/types/monthlyFee';
import { MonthlyFeePaymentModal } from '@/components/MonthlyFeePaymentModal';
import { MonthlyFeeEditModal } from '@/components/MonthlyFeeEditModal';
import MonthlyFeeReportModal from '@/components/MonthlyFeeReportModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, FileText, Check, Clock, Ban, X, Trash2, MoreHorizontal, Pencil, AlertTriangle, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Status badge component
const StatusBadge = ({ status }: { status: MonthlyFee['status'] }) => {
  let className = '';
  let label = '';
  let icon = null;
  
  switch (status) {
    case 'paid':
      className = 'bg-green-100 text-green-800';
      label = 'Pago';
      icon = <Check className="mr-1 h-3 w-3" />;
      break;
    case 'paid_late':
      className = 'bg-orange-100 text-orange-800';
      label = 'Pago em Atraso';
      icon = <Check className="mr-1 h-3 w-3" />;
      break;
    case 'pending':
      className = 'bg-yellow-100 text-yellow-800';
      label = 'Pendente';
      icon = <Clock className="mr-1 h-3 w-3" />;
      break;
    case 'late':
      className = 'bg-red-100 text-red-800';
      label = 'Atrasado';
      icon = <AlertTriangle className="mr-1 h-3 w-3" />;
      break;
    case 'cancelled':
      className = 'bg-gray-100 text-gray-800';
      label = 'Cancelado';
      icon = <X className="mr-1 h-3 w-3" />;
      break;
    default:
      className = 'bg-gray-100 text-gray-800';
      label = status;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para formatar mês sem conversão de timezone
const formatMonth = (dateString: string) => {
  if (!dateString) return '';
  
  // Pegando apenas a parte da data (YYYY-MM-DD)
  const dateParts = dateString.split('T')[0].split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // Mês é 0-indexed em JS
  
  // Criando um objeto Date local sem conversão de timezone
  const date = new Date(year, month, 1);
  
  // Formatando para exibição
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// Função para formatar data sem conversão de timezone
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  
  // Extraindo apenas a parte da data (YYYY-MM-DD)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Formatando para o formato brasileiro DD/MM/YYYY
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

const MonthlyFees = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuth();
  const { isClubAdmin } = useAuthorization();
  const { toast } = useToast();
  const [canEdit, setCanEdit] = useState(false);
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<MonthlyFee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteFeeId, setDeleteFeeId] = useState<string | null>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      if (user?.activeClub?.id) {
        const isAdmin = await isClubAdmin(user.activeClub.id);
        setCanEdit(isAdmin);
      }
    };
    checkPermissions();
  }, [user?.activeClub?.id, isClubAdmin]);

  const handleDelete = async (id: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir mensalidades.",
      });
      return;
    }
    
    setDeleteFeeId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteFeeId || !canEdit) return;
    
    const success = await deleteMonthlyFee(deleteFeeId);
    
    if (success) {
      toast({
        title: "Mensalidade excluída",
        description: "A mensalidade foi removida com sucesso.",
      });
      loadMonthlyFees();
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Não foi possível excluir a mensalidade.",
      });
    }
    
    setIsDeleteDialogOpen(false);
    setDeleteFeeId(null);
  };

  const handlePayment = async (fee: MonthlyFee) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para registrar pagamentos.",
      });
      return;
    }
    
    setSelectedFee(fee);
    setIsPaymentModalOpen(true);
  };

  const handleEdit = async (fee: MonthlyFee) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para editar mensalidades.",
      });
      return;
    }
    
    setSelectedFee(fee);
    setIsEditModalOpen(true);
  };

  const handleCancel = async (fee: MonthlyFee) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para cancelar mensalidades.",
      });
      return;
    }
    
    const success = await cancelMonthlyFee(fee.id);
    
    if (success) {
      toast({
        title: "Mensalidade cancelada",
        description: "A mensalidade foi cancelada com sucesso.",
      });
      loadMonthlyFees();
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar a mensalidade.",
      });
    }
  };

  const loadMonthlyFees = async () => {
    if (!user?.activeClub?.id) return;
    
    setIsLoading(true);
    try {
      const fees = await fetchMonthlyFees(user.activeClub.id);
      setMonthlyFees(fees);
    } catch (error) {
      console.error("Erro ao carregar mensalidades:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar mensalidades",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyFees();
  }, [user?.activeClub?.id]);

  const filteredFees = monthlyFees.filter(fee => {
    const matchesSearch = 
      (fee.memberName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) || 
      formatMonth(fee.referenceMonth).toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && fee.status === 'pending';
    if (activeTab === 'paid') return matchesSearch && (fee.status === 'paid' || fee.status === 'paid_late');
    if (activeTab === 'late') return matchesSearch && fee.status === 'late';
    if (activeTab === 'cancelled') return matchesSearch && fee.status === 'cancelled';
    
    return matchesSearch;
  });

  const totalPending = monthlyFees
    .filter(fee => fee.status === 'pending' || fee.status === 'late')
    .reduce((sum, fee) => sum + fee.amount, 0);
    
  const totalPaid = monthlyFees
    .filter(fee => fee.status === 'paid' || fee.status === 'paid_late')
    .reduce((sum, fee) => sum + fee.amount, 0);
    
  const lateFees = monthlyFees.filter(fee => fee.status === 'late');
  const totalFees = monthlyFees.filter(fee => fee.status !== 'cancelled');
  
  const delinquencyRate = totalFees.length > 0 
    ? Math.round((lateFees.length / totalFees.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mensalidades</h1>
          <p className="text-gray-500">
            Gerencie as mensalidades do {user?.activeClub?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Botões de ação foram movidos para a página /monthly-fees/create */}
          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="outline"
          >
            <FileText className="mr-2 h-4 w-4" />
            Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total a receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyFees.filter(fee => fee.status === 'pending' || fee.status === 'late').length} mensalidades pendentes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyFees.filter(fee => fee.status === 'paid' || fee.status === 'paid_late').length} mensalidades pagas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {`${delinquencyRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {lateFees.length} de {totalFees.length} mensalidades
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Buscar por nome ou mês..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex flex-wrap">
              <TabsTrigger value="all">
                Todas
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {monthlyFees.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="mr-1 h-4 w-4" />
                Pendentes
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {monthlyFees.filter(m => m.status === 'pending').length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="paid">
                <Check className="mr-1 h-4 w-4" />
                Pagas
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {monthlyFees.filter(m => m.status === 'paid' || m.status === 'paid_late').length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="late">
                <AlertTriangle className="mr-1 h-4 w-4" />
                Atrasadas
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {monthlyFees.filter(m => m.status === 'late').length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                <X className="mr-1 h-4 w-4" />
                Canceladas
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {monthlyFees.filter(m => m.status === 'cancelled').length}
                </span>
              </TabsTrigger>
            </TabsList>
            
            {/* Conteúdo das tabs */}
            {['all', 'pending', 'paid', 'late', 'cancelled'].map(tabValue => (
              <TabsContent key={tabValue} value={tabValue} className="m-0">
                {/* Versão Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sócio
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mês de referência
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vencimento
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pagamento
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            Carregando mensalidades...
                          </td>
                        </tr>
                      ) : filteredFees.length > 0 ? (
                        filteredFees.map((fee) => (
                          <tr key={fee.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">
                                  {fee.memberName}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatMonth(fee.referenceMonth)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(fee.amount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(fee.dueDate)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge status={fee.status} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {fee.paymentDate 
                                ? formatDate(fee.paymentDate)
                                : '-'
                              }
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {(fee.status === 'pending' || fee.status === 'late') && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handlePayment(fee)}
                                    title="Registrar Pagamento"
                                    className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEdit(fee)}
                                  disabled={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? true : false}
                                  title={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? 
                                    "Não é possível editar mensalidades pagas com transação associada" : 
                                    "Editar mensalidade"}
                                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDelete(fee.id)}
                                  disabled={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? true : false}
                                  title={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? 
                                    "Não é possível excluir mensalidades pagas com transação associada" : 
                                    "Excluir mensalidade"}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            Nenhuma mensalidade encontrada com os filtros atuais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Versão Mobile */}
                <div className="md:hidden space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      Carregando mensalidades...
                    </div>
                  ) : filteredFees.length > 0 ? (
                    filteredFees.map((fee) => (
                      <Card key={fee.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* Cabeçalho com nome e status */}
                            <div className="flex items-center justify-between">
                              <div className="text-lg font-medium text-gray-900">
                                {fee.memberName}
                              </div>
                              <StatusBadge status={fee.status} />
                            </div>

                            {/* Ações */}
                            <div className="flex items-center justify-end space-x-2">
                              {(fee.status === 'pending' || fee.status === 'late') && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handlePayment(fee)}
                                  title="Registrar Pagamento"
                                  className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(fee)}
                                disabled={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? true : false}
                                title={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? 
                                  "Não é possível editar mensalidades pagas com transação associada" : 
                                  "Editar mensalidade"}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDelete(fee.id)}
                                disabled={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? true : false}
                                title={(fee.status === 'paid' || fee.status === 'paid_late') && fee.transactionId ? 
                                  "Não é possível excluir mensalidades pagas com transação associada" : 
                                  "Excluir mensalidade"}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma mensalidade encontrada com os filtros atuais.
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      {canEdit && (
        <>
          <MonthlyFeePaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedFee(null);
            }}
            fee={selectedFee}
            onRecordPayment={async (feeId: string, paymentDate: string, paymentMethod: MonthlyFeePaymentMethod, bankAccountId: string) => {
              const success = await updateMonthlyFeePayment(feeId, paymentDate, paymentMethod, bankAccountId);
              if (success) {
                await loadMonthlyFees();
              }
              return success;
            }}
          />

          <MonthlyFeeEditModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedFee(null);
            }}
            fee={selectedFee}
            onSave={async (updatedFee: MonthlyFee) => {
              const success = await updateMonthlyFee(updatedFee);
              if (success) {
                await loadMonthlyFees();
              }
              return success;
            }}
          />

        </>
      )}

      <MonthlyFeeReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        monthlyFees={monthlyFees}
        clubName={user?.activeClub?.name || ''}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mensalidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta mensalidade? Esta ação não poderá ser desfeita.
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

export default MonthlyFees;
