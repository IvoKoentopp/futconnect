import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { 
  Search, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  PenLine,
  Trash2,
  Wallet,
  AlertCircle,
  WalletCards,
  CalendarRange
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { ChartOfAccountsModal } from '@/components/ChartOfAccountsModal';
import { BankAccountModal } from '@/components/BankAccountModal';
import { TransactionModal } from '@/components/TransactionModal';
import { useToast } from '@/hooks/use-toast';
import { Transaction, BankAccount, TransactionType, PaymentMethod, TransactionStatus, ChartOfAccount } from '@/types/transaction';
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
import { TransactionFiltersDialog } from '@/components/TransactionFiltersDialog';
import { fetchChartOfAccounts } from '@/utils/chartOfAccounts';
import { MonthlyFeeGenerationModal } from '@/components/MonthlyFeeGenerationModal';
import { FinancialReportDialog } from '@/components/FinancialReportDialog';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { format, subDays, parseISO, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';

// Type badge component
const TypeBadge = ({ type }: { type: string }) => {
  if (type === 'income') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <TrendingUp className="mr-1 h-3 w-3" />
        Receita
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <TrendingDown className="mr-1 h-3 w-3" />
        Despesa
      </span>
    );
  }
};

// Amount display component
const AmountDisplay = ({ amount, type }: { amount: number, type: string }) => {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
  
  if (type === 'income') {
    return <span className="text-green-600 font-medium">{formattedAmount}</span>;
  } else {
    return <span className="text-red-600 font-medium">{formattedAmount}</span>;
  }
};

// Transaction total component
const TransactionTotal = ({ transactions }: { transactions: Transaction[] }) => {
  const total = transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);
  
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(total);
  
  const className = total >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
  
  return (
    <span className={`ml-1 ${className}`}>{formattedTotal}</span>
  );
};

const Finances = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const { user } = useAuth();
  const { isClubAdmin } = useAuthorization();
  const { toast } = useToast();
  const [canEdit, setCanEdit] = useState(false);
  const [isChartOfAccountsOpen, setIsChartOfAccountsOpen] = useState(false);
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [filteredChartOfAccounts, setFilteredChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [isMonthlyFeeSettingsOpen, setIsMonthlyFeeSettingsOpen] = useState(false);
  const [isMonthlyFeeModalOpen, setIsMonthlyFeeModalOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const { totalBalance, monthlyIncrease, isLoading: isLoadingAccounts } = useBankAccounts(user?.activeClub?.id);
  
  const fetchBankAccounts = async () => {
    if (!user?.activeClub?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('club_id', user.activeClub.id)
        .order('bank', { ascending: true });
      
      if (error) throw error;
      
      setBankAccounts(data.map(acc => ({
        id: acc.id,
        bank: acc.bank,
        branch: acc.branch,
        initialBalance: acc.initial_balance,
        currentBalance: acc.current_balance,
        club_id: acc.club_id
      })));
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar contas bancárias",
        description: "Verifique sua conexão e tente novamente.",
      });
    }
  };
  
  const fetchTransactions = async () => {
    if (!user?.activeClub?.id) return;
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('club_id', user.activeClub.id);

      // Aplicar filtros de data
      if (startDate) {
        const startDateTime = startOfDay(startDate);
        query = query.gte('date', startDateTime.toISOString());
      }
      
      if (endDate) {
        const endDateTime = endOfDay(endDate);
        query = query.lte('date', endDateTime.toISOString());
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      
      const formattedTransactions = data.map(tx => ({
        id: tx.id,
        type: tx.type as TransactionType,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        category: tx.category,
        paymentMethod: tx.payment_method as PaymentMethod,
        status: tx.status as TransactionStatus,
        beneficiary: tx.beneficiary,
        bankAccountId: tx.bank_account_id,
        club_id: tx.club_id
      }));
      
      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar transações",
        description: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (user?.activeClub?.id) {
      fetchBankAccounts();
      fetchTransactions();
      loadChartOfAccounts();
    }
  }, [user?.activeClub?.id]);

  // Recarregar transações quando as datas mudarem
  useEffect(() => {
    if (user?.activeClub?.id) {
      fetchTransactions();
    }
  }, [startDate, endDate]);
  
  const loadChartOfAccounts = async () => {
    if (!user?.activeClub?.id) return;
    
    try {
      const accounts = await fetchChartOfAccounts(user.activeClub.id);
      setFilteredChartOfAccounts(accounts);
    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
    }
  };
  
  const calculateSummary = (transactions: Transaction[]) => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      income,
      expense,
      balance: income - expense
    };
  };
  
  const summary = calculateSummary(transactions);
  
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      (typeof transaction.description === 'string' && transaction.description.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (typeof transaction.category === 'string' && transaction.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof transaction.beneficiary === 'string' && transaction.beneficiary.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTab = activeTab === 'all' ? true : transaction.type === activeTab;
    
    return matchesSearch && matchesTab;
  });
  
  const handleEdit = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setSelectedTransaction(transaction);
      setIsTransactionModalOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Transação não encontrada.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir transações.",
      });
      return;
    }
    
    setDeleteTransactionId(id);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!deleteTransactionId || !user?.activeClub?.id || !canEdit) return;
    
    try {
      // Primeiro, verificar se a transação está vinculada a uma mensalidade
      const { data: monthlyFee, error: monthlyFeeError } = await supabase
        .from('monthly_fees')
        .select('id')
        .eq('transaction_id', deleteTransactionId)
        .single();

      if (monthlyFeeError && monthlyFeeError.code !== 'PGRST116') { // PGRST116 = not found
        throw monthlyFeeError;
      }

      // Se houver uma mensalidade vinculada, atualizar seu status
      if (monthlyFee) {
        const { error: updateError } = await supabase
          .from('monthly_fees')
          .update({
            status: 'pending',
            payment_date: null,
            payment_method: null,
            bank_account_id: null,
            transaction_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', monthlyFee.id);

        if (updateError) throw updateError;
      }

      // Excluir a transação
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deleteTransactionId)
        .eq('club_id', user.activeClub.id);
      
      if (error) throw error;
      
      toast({
        title: "Transação excluída com sucesso",
        description: monthlyFee 
          ? "A transação foi removida e a mensalidade retornou ao status pendente."
          : "A transação foi removida.",
      });
      
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir transação",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTransactionId(null);
    }
  };

  useEffect(() => {
    const checkPermissions = async () => {
      if (user?.activeClub?.id) {
        const isAdmin = await isClubAdmin(user.activeClub.id);
        setCanEdit(isAdmin);
      }
    };
    checkPermissions();
  }, [user?.activeClub?.id, isClubAdmin]);

  const formatDate = (dateString: string) => {
    // Parse a data diretamente da string no formato YYYY-MM-DD
    const [fullDate] = dateString.split('T');
    if (!fullDate) return '';
    
    const [year, month, day] = fullDate.split('-').map(Number);
    
    // Criar a data no formato brasileiro (dd/mm/yyyy) sem usar o objeto Date
    // para evitar qualquer ajuste automático de timezone
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };
  
  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      pix: 'Pix',
      cash: 'Dinheiro',
      transfer: 'Transferência',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito'
    };
    
    return methods[method] || method;
  };
  
  const handleCloseModal = () => {
    setIsTransactionModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleGenerateMonthlyFees = async (referenceMonth: Date, selectedMembers?: string[]) => {
    console.log("Generate monthly fees called with:", referenceMonth, selectedMembers);
    return true;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Carregar dados necessários para o modal de transação
  useEffect(() => {
    const loadModalData = async () => {
      if (!user?.activeClub?.id || !isTransactionModalOpen) return;
      
      try {
        // Carregar contas bancárias
        const { data: bankAccountsData, error: bankAccountsError } = await supabase
          .from('bank_accounts')
          .select('id, bank, branch')
          .eq('club_id', user.activeClub.id);
        
        if (bankAccountsError) throw bankAccountsError;
        
        const formattedBankAccounts = bankAccountsData.map(acc => ({
          id: acc.id,
          name: `${acc.bank} - Ag. ${acc.branch}`
        }));
        
        setBankAccounts(formattedBankAccounts);
        
        // Carregar plano de contas
        const { data: chartAccountsData, error: chartAccountsError } = await supabase
          .from('chart_of_accounts')
          .select('id, description')
          .eq('club_id', user.activeClub.id);
        
        if (chartAccountsError) throw chartAccountsError;
        
        setFilteredChartOfAccounts(chartAccountsData);
      } catch (error) {
        console.error('Erro ao carregar dados para o modal:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados necessários.",
        });
        setIsTransactionModalOpen(false);
      }
    };
    
    loadModalData();
  }, [user?.activeClub?.id, isTransactionModalOpen]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
          <p className="text-gray-500">
            Gerencie as finanças do {user?.activeClub?.name}
          </p>
        </div>
        {canEdit && (
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsTransactionModalOpen(true)}
              className="bg-futconnect-600 hover:bg-futconnect-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
            <Button
              onClick={() => setIsChartOfAccountsOpen(true)}
              className="bg-futconnect-600 hover:bg-futconnect-700"
            >
              <WalletCards className="mr-2 h-4 w-4" />
              Plano de Contas
            </Button>
          </div>
        )}
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.income)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total de entradas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.expense)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total de saídas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Balanço atual</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-center flex-grow">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar transações..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-gray-500" />
                <div className="flex items-center space-x-2">
                  <DateInput
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Data inicial"
                    className="w-[160px]"
                  />
                  <span className="text-gray-500 whitespace-nowrap">até</span>
                  <DateInput
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Data final"
                    className="w-[160px]"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">

            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  Todas
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {transactions.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="income">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Receitas
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {transactions.filter(t => t.type === 'income').length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="expense">
                  <TrendingDown className="mr-1 h-4 w-4" />
                  Despesas
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {transactions.filter(t => t.type === 'expense').length}
                  </span>
                </TabsTrigger>
              </TabsList>
              
              <div className="rounded-md bg-muted p-1 text-muted-foreground">
                <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium">
                  Total: 
                  <TransactionTotal transactions={filteredTransactions} />
                </div>
              </div>
            </div>
            
            <TabsContent value="all" className="m-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futconnect-600"></div>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Conta
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Favorecido
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.category}
                              <div className="mt-1">
                                <TypeBadge type={transaction.type} />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.beneficiary}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Via {formatPaymentMethod(transaction.paymentMethod)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <AmountDisplay amount={transaction.amount} type={transaction.type} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex justify-center space-x-2">
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-futconnect-600 hover:text-futconnect-800"
                                    onClick={() => handleEdit(transaction.id)}
                                  >
                                    <PenLine className="h-4 w-4" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => handleDelete(transaction.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
                              <p className="text-lg font-medium">Nenhuma transação encontrada</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {searchQuery ? 
                                  "Tente ajustar os seus filtros de busca." : 
                                  "Comece adicionando sua primeira transação."}
                              </p>
                              {!searchQuery && canEdit && (
                                <Button 
                                  onClick={() => {
                                    setSelectedTransaction(null);
                                    setIsTransactionModalOpen(true);
                                  }}
                                  className="mt-4"
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Nova Transação
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="income" className="m-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futconnect-600"></div>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Conta
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Favorecido
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.category}
                              <div className="mt-1">
                                <TypeBadge type={transaction.type} />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.beneficiary}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Via {formatPaymentMethod(transaction.paymentMethod)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <AmountDisplay amount={transaction.amount} type={transaction.type} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex justify-center space-x-2">
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-futconnect-600 hover:text-futconnect-800"
                                    onClick={() => handleEdit(transaction.id)}
                                  >
                                    <PenLine className="h-4 w-4" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => handleDelete(transaction.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            Nenhuma receita encontrada com os filtros atuais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="expense" className="m-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futconnect-600"></div>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Conta
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Favorecido
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.category}
                              <div className="mt-1">
                                <TypeBadge type={transaction.type} />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.beneficiary}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Via {formatPaymentMethod(transaction.paymentMethod)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <AmountDisplay amount={transaction.amount} type={transaction.type} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex justify-center space-x-2">
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-futconnect-600 hover:text-futconnect-800"
                                    onClick={() => handleEdit(transaction.id)}
                                  >
                                    <PenLine className="h-4 w-4" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => handleDelete(transaction.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            Nenhuma despesa encontrada com os filtros atuais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {canEdit && (
        <TransactionModal 
          isOpen={isTransactionModalOpen} 
          onClose={handleCloseModal} 
          onTransactionCreated={() => {
            fetchTransactions();
            fetchBankAccounts();
          }}
          transactionToEdit={selectedTransaction}
          bankAccounts={bankAccounts}
          chartOfAccounts={filteredChartOfAccounts}
        />
      )}
      
      {canEdit && (
        <MonthlyFeeGenerationModal
          isOpen={isMonthlyFeeModalOpen}
          onClose={() => setIsMonthlyFeeModalOpen(false)}
          onGenerate={handleGenerateMonthlyFees}
          onOpenSettings={() => setIsMonthlyFeeSettingsOpen(true)}
        />
      )}
      
      {canEdit && (
        <BankAccountModal 
          isOpen={isBankAccountModalOpen} 
          onClose={() => setIsBankAccountModalOpen(false)}
          onAccountCreated={() => fetchBankAccounts()}
        />
      )}
      
      {canEdit && (
        <ChartOfAccountsModal 
          isOpen={isChartOfAccountsOpen} 
          onClose={() => setIsChartOfAccountsOpen(false)}
        />
      )}
      
      <FinancialReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        transactions={transactions}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não poderá ser desfeita.
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

export default Finances;
