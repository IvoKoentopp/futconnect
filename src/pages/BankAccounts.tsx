import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BankAccountModal } from '@/components/BankAccountModal';
import { TransactionModal } from '@/components/TransactionModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Wallet, PlusCircle, AlertCircle, Trash2, PenLine, ArrowDown, ArrowUp, Filter, FileText, CalendarRange } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount, Transaction, TransactionType, PaymentMethod, TransactionStatus } from '@/types/transaction';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { DateInput } from "@/components/ui/date-input";

const BankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30)); // Default to last 30 days
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<{id: string, name: string}[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<{id: string, description: string}[]>([]);
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
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('club_id', user.activeClub.id)
        .order('bank', { ascending: true });
      
      if (error) throw error;
      
      const formattedAccounts = data.map(acc => ({
        id: acc.id,
        bank: acc.bank,
        branch: acc.branch,
        initialBalance: acc.initial_balance,
        currentBalance: acc.current_balance,
        clubId: acc.club_id
      }));
      
      setAccounts(formattedAccounts);
      
      // If there are accounts, auto-select the first one for the statement
      if (formattedAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(formattedAccounts[0].id);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar contas bancárias",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (accountId: string) => {
    if (!user?.activeClub?.id || !accountId) return;
    
    setIsLoadingTransactions(true);
    try {
      // First, get the account information
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) {
        throw new Error("Account not found");
      }
      
      // Get ALL transactions for this account (for correct balance calculation)
      const { data: allTransactionsData, error: allTransactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('bank_account_id', accountId)
        .order('date', { ascending: true });
      
      if (allTransactionsError) throw allTransactionsError;
      
      // Format ALL transactions (for balance calculation)
      const allFormattedTransactions: Transaction[] = allTransactionsData.map(tx => {
        // Validate payment_method to ensure it's a valid PaymentMethod type
        let paymentMethod: PaymentMethod = 'pix'; // Default value
        
        // Check if the payment_method from DB is one of the allowed values
        if (['pix', 'cash', 'transfer', 'credit_card', 'debit_card'].includes(tx.payment_method)) {
          paymentMethod = tx.payment_method as PaymentMethod;
        }
        
        // Validate status to ensure it's a valid TransactionStatus type
        let status: TransactionStatus = 'completed'; // Default value
        
        // Check if the status from DB is one of the allowed values
        if (['completed', 'pending', 'cancelled'].includes(tx.status)) {
          status = tx.status as TransactionStatus;
        }
        
        return {
          id: tx.id,
          type: tx.type as TransactionType,
          description: tx.description,
          amount: tx.amount,
          date: tx.date,
          category: tx.category,
          paymentMethod: paymentMethod,
          status: status,
          beneficiary: tx.beneficiary,
          bankAccountId: tx.bank_account_id,
          clubId: tx.club_id,
          reference_month: tx.reference_month
        };
      });
      
      // Calculate running balance for ALL transactions
      let runningBalance = account.initialBalance;
      const allTransactionsWithBalance = allFormattedTransactions.map(tx => {
        if (tx.type === 'income') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
        
        return {
          ...tx,
          runningBalance
        };
      });
      
      // Now filter transactions based on date range
      let filteredTransactions = [...allTransactionsWithBalance];
      
      if (startDate || endDate) {
        filteredTransactions = allTransactionsWithBalance.filter(tx => {
          const txDate = parseISO(tx.date);
          
          if (startDate && endDate) {
            // Set time to start and end of day for accurate comparison
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            
            return (
              (isAfter(txDate, startDateTime) || isEqual(txDate, startDateTime)) && 
              (isBefore(txDate, endDateTime) || isEqual(txDate, endDateTime))
            );
          } else if (startDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            return isAfter(txDate, startDateTime) || isEqual(txDate, startDateTime);
          } else if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            return isBefore(txDate, endDateTime) || isEqual(txDate, endDateTime);
          }
          
          return true;
        });
      }
      
      // If filtering by date range, we need to adjust the initial balance
      if (startDate && filteredTransactions.length > 0) {
        // Calculate balance up to the start date
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        
        let balanceBeforeStartDate = account.initialBalance;
        
        for (const tx of allTransactionsWithBalance) {
          const txDate = parseISO(tx.date);
          if (isBefore(txDate, startDateTime)) {
            if (tx.type === 'income') {
              balanceBeforeStartDate += tx.amount;
            } else {
              balanceBeforeStartDate -= tx.amount;
            }
          }
        }
        
        // Set the running balance for the first transaction in the filtered list
        let newRunningBalance = balanceBeforeStartDate;
        filteredTransactions = filteredTransactions.map(tx => {
          if (tx.type === 'income') {
            newRunningBalance += tx.amount;
          } else {
            newRunningBalance -= tx.amount;
          }
          
          return {
            ...tx,
            runningBalance: newRunningBalance
          };
        });
      }
      
      // Sort in descending order for display (newest first)
      const sortedFilteredTransactions = filteredTransactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Ensure the running balance is correct for the sorted transactions
      // The first transaction (newest) should have the final balance
      if (sortedFilteredTransactions.length > 0) {
        const finalBalance = account.currentBalance;
        let currentBalance = finalBalance;
        
        // Recalculate running balance in reverse order (from newest to oldest)
        for (let i = 0; i < sortedFilteredTransactions.length; i++) {
          const tx = sortedFilteredTransactions[i];
          sortedFilteredTransactions[i].runningBalance = currentBalance;
          
          // Subtract the effect of this transaction to get the previous balance
          if (tx.type === 'income') {
            currentBalance -= tx.amount;
          } else {
            currentBalance += tx.amount;
          }
        }
      }
      
      setTransactions(sortedFilteredTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar transações",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [user?.activeClub?.id]);

  useEffect(() => {
    if (selectedAccountId) {
      loadTransactions(selectedAccountId);
    } else {
      setTransactions([]);
    }
  }, [selectedAccountId, startDate, endDate]);

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
        
        setChartOfAccounts(chartAccountsData);
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

  const handleDelete = async (id: string) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir contas bancárias.",
      });
      return;
    }
    
    setDeleteAccountId(id);
    setIsDeleteDialogOpen(true);
  };
  
  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteAccountId || !user?.activeClub?.id || !canEdit) return;
    
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', deleteAccountId)
        .eq('club_id', user.activeClub.id);
      
      if (error) throw error;
      
      toast({
        title: "Conta excluída com sucesso",
        description: "A conta bancária foi removida.",
      });
      
      loadAccounts();
      
      // Reset selected account if it was deleted
      if (selectedAccountId === deleteAccountId) {
        setSelectedAccountId(null);
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
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
  
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAccount(null);
  };

  const handleTransactionCreated = () => {
    if (selectedAccountId) {
      loadTransactions(selectedAccountId);
    }
    loadAccounts();
  };

  const formatDate = (dateString: string) => {
    try {
      const [fullDate] = dateString.split('T');
      if (!fullDate) return '';
      
      const [year, month, day] = fullDate.split('-').map(Number);
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.bank} - Ag. ${account.branch}` : 'Conta não encontrada';
  };

  const getSelectedAccountBalance = () => {
    const account = accounts.find(acc => acc.id === selectedAccountId);
    return account ? account.currentBalance : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-gray-500">
            Gerencie as contas bancárias do {user?.activeClub?.name}
          </p>
        </div>
        {canEdit && (
          <div className="flex space-x-2">
            <Button 
              onClick={() => setIsTransactionModalOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
            <Button 
              onClick={() => {
                setSelectedAccount(null);
                setIsModalOpen(true);
              }}
              className="bg-futconnect-600 hover:bg-futconnect-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futconnect-600"></div>
          </div>
        ) : accounts.length > 0 ? (
          accounts.map((account) => (
            <Card 
              key={account.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                selectedAccountId === account.id ? 'ring-2 ring-futconnect-500' : ''
              }`}
              onClick={() => setSelectedAccountId(account.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex justify-between items-center">
                  <span>{account.bank} - Ag. {account.branch}</span>
                  <div className="flex space-x-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-futconnect-600 hover:text-futconnect-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(account);
                        }}
                      >
                        <PenLine className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(account.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(account.currentBalance)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Saldo inicial: {formatCurrency(account.initialBalance)}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-3">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma conta bancária</h3>
              <p className="text-gray-500 text-center mb-4">
                Você ainda não tem contas bancárias cadastradas.
              </p>
              {canEdit && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Cadastrar Conta Bancária
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bank Statement Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
            <CardTitle className="text-xl font-semibold flex items-center">
              <FileText className="mr-2 h-5 w-5 text-futconnect-600" />
              Extrato Bancário
            </CardTitle>

            {accounts.length > 0 && (
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select 
                    value={selectedAccountId || ''}
                    onValueChange={(value) => setSelectedAccountId(value)}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank} - Ag. {account.branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CalendarRange className="h-4 w-4 text-gray-500" />
                  <div className="flex space-x-2">
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-futconnect-600"></div>
            </div>
          ) : !selectedAccountId ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Selecione uma conta</h3>
              <p className="text-gray-500">
                Escolha uma conta bancária para visualizar seu extrato.
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma transação encontrada</h3>
              <p className="text-gray-500">
                Não há transações registradas para a conta {getAccountName(selectedAccountId)} no período selecionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Favorecido</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{formatDate(transaction.date)}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center">
                          {transaction.type === 'income' ? (
                            <ArrowUp className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                          )}
                          <span className="truncate">{transaction.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.beneficiary}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <BankAccountModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAccountCreated={loadAccounts}
          accountToEdit={selectedAccount}
        />
      )}

      <TransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)}
        onTransactionCreated={handleTransactionCreated}
        transactionToEdit={null}
        bankAccounts={bankAccounts}
        chartOfAccounts={chartOfAccounts}
      />

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

export default BankAccounts;
