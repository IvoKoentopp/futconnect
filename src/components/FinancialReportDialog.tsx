import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download, LineChart, FileText, TrendingUp, TrendingDown, List } from 'lucide-react';
import { calculateFinancialStatement, calculateSummary, formatCurrency } from '@/utils/financialStatement';
import { exportElementToPdf } from '@/utils/exportToPdf';
import { Transaction } from '@/types/transaction';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Get current year
const currentYear = new Date().getFullYear();
// Generate years for selection (current year and 4 years back)
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
// Generate months for selection
const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
  { value: 0, label: 'Todos os meses' }
];

// Bank account type from API
interface BankAccount {
  id: string;
  name: string;
}

interface FinancialReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

export function FinancialReportDialog({ isOpen, onClose, transactions }: FinancialReportDialogProps) {
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(0); // 0 means all months
  const [bankAccountId, setBankAccountId] = useState<string>('all'); // 'all' means all accounts
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'transactions'>('summary');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const { user } = useAuth();

  // Fetch bank accounts on mount
  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        // Only proceed if we have a user with an active club
        if (!user?.activeClub?.id) {
          console.error('No active club found');
          return;
        }

        const { data, error } = await supabase
          .from('bank_accounts')
          .select('id, bank')
          .eq('club_id', user.activeClub.id) // Filter by the active club
          .order('bank');
        
        if (error) throw error;
        
        // Transform the data to match our BankAccount interface
        const transformedData = data.map(account => ({
          id: account.id,
          name: account.bank
        }));
        
        setBankAccounts(transformedData || []);
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
      }
    };

    if (isOpen) {
      fetchBankAccounts();
    }
  }, [isOpen, user?.activeClub?.id]);

  // Filter transactions based on selected filters
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const transactionYear = transactionDate.getFullYear();
    const transactionMonth = transactionDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    const yearMatches = transactionYear === year;
    const monthMatches = month === 0 || transactionMonth === month;
    const bankAccountMatches = bankAccountId === 'all' || transaction.bankAccountId === bankAccountId;
    
    return yearMatches && monthMatches && bankAccountMatches;
  });

  // Generate report based on filtered transactions
  const financialData = calculateFinancialStatement(filteredTransactions, year, month === 0 ? null : month);
  const summaryData = calculateSummary(financialData);

  const exportReport = () => {
    const accountName = bankAccountId === 'all' 
      ? 'todas-contas' 
      : bankAccounts.find(acc => acc.id === bankAccountId)?.name?.replace(/\s+/g, '-').toLowerCase() || 'conta';
    
    exportElementToPdf(
      'financial-report-content', 
      `relatorio-financeiro-${year}-${month !== 0 ? month : 'todos'}-${accountName}`
    );
  };

  const getMonthName = (monthNumber: number) => {
    if (monthNumber === 0) return 'Todos os meses';
    return months.find(m => m.value === monthNumber)?.label || '';
  };

  const getBankAccountName = (accountId: string) => {
    if (accountId === 'all') return 'Todas as contas';
    return bankAccounts.find(acc => acc.id === accountId)?.name || '';
  };

  // Format date for display DD/MM/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Format payment method for display
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Relatório Financeiro</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Selecione o período e tipo de relatório desejado
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            <Select
              value={year.toString()}
              onValueChange={(value) => setYear(parseInt(value))}
            >
              <SelectTrigger id="year" className="w-full">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="month">Mês</Label>
            <Select
              value={month.toString()}
              onValueChange={(value) => setMonth(parseInt(value))}
            >
              <SelectTrigger id="month" className="w-full">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bankAccount">Conta Bancária</Label>
            <Select
              value={bankAccountId}
              onValueChange={(value) => setBankAccountId(value)}
            >
              <SelectTrigger id="bankAccount" className="w-full">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportType">Tipo de Relatório</Label>
            <Select
              value={reportType}
              onValueChange={(value) => setReportType(value as 'summary' | 'detailed' | 'transactions')}
            >
              <SelectTrigger id="reportType" className="w-full">
                <SelectValue placeholder="Selecione o tipo de relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Resumido</SelectItem>
                <SelectItem value="detailed">Detalhado</SelectItem>
                <SelectItem value="transactions">Transações</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[400px] mt-4 rounded-md border">
          <div 
            id="financial-report-content" 
            className="p-6 bg-white"
          >
            {/* Report header - Always visible in the PDF */}
            <div className="pdf-header-section" style={{ display: 'none' }}>
              <h1 className="text-2xl font-bold text-center mb-2">Relatório Financeiro</h1>
              <p className="text-center text-gray-500 mb-4">
                {year} - {getMonthName(month)} - {getBankAccountName(bankAccountId)}
              </p>
              <Separator className="my-4" />
            </div>

            {/* Summary Section */}
            {reportType === 'summary' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <LineChart className="h-5 w-5" /> 
                  Resumo Financeiro
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border p-4 rounded-md bg-green-50">
                    <h3 className="text-sm font-medium text-gray-500">Total de Receitas</h3>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.totalRevenue)}</p>
                  </div>
                  
                  <div className="border p-4 rounded-md bg-red-50">
                    <h3 className="text-sm font-medium text-gray-500">Total de Despesas</h3>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(summaryData.totalExpenses)}</p>
                  </div>
                  
                  <div className="border p-4 rounded-md bg-blue-50">
                    <h3 className="text-sm font-medium text-gray-500">Lucro Líquido</h3>
                    <p className={`text-2xl font-bold ${summaryData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summaryData.netProfit)}
                    </p>
                  </div>
                  
                  <div className="border p-4 rounded-md bg-purple-50">
                    <h3 className="text-sm font-medium text-gray-500">Margem de Lucro</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {summaryData.profitMargin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'detailed' && (
              <>
                {/* Revenue Section */}
                <div className="mt-8 space-y-4">
                  <h2 className="text-xl font-bold mb-2 text-green-700 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> 
                    Receitas
                  </h2>
                  
                  {Object.keys(financialData.revenue).length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200 border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoria
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(financialData.revenue).map(([category, amount]) => (
                          <tr key={category} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-green-50">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            Total
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                            {formatCurrency(summaryData.totalRevenue)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <p className="text-gray-500 italic">Nenhuma receita registrada no período selecionado.</p>
                  )}
                </div>

                {/* Expenses Section */}
                <div className="mt-8 space-y-4">
                  <h2 className="text-xl font-bold mb-2 text-red-700 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" /> 
                    Despesas
                  </h2>
                  
                  {Object.keys(financialData.expenses).length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200 border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoria
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(financialData.expenses).map(([category, amount]) => (
                          <tr key={category} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-red-50">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            Total
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-bold">
                            {formatCurrency(summaryData.totalExpenses)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <p className="text-gray-500 italic">Nenhuma despesa registrada no período selecionado.</p>
                  )}
                </div>
              </>
            )}

            {/* Transactions Report Section */}
            {reportType === 'transactions' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <List className="h-5 w-5" /> 
                  Listagem de Transações
                </h2>
                
                {filteredTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Favorecido</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(transaction.date)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'income' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                          </TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{formatPaymentMethod(transaction.paymentMethod)}</TableCell>
                          <TableCell>{transaction.beneficiary}</TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10 border rounded-md bg-gray-50">
                    <p className="text-gray-500">Nenhuma transação encontrada no período selecionado.</p>
                  </div>
                )}

                {filteredTransactions.length > 0 && (
                  <div className="pt-4 flex justify-between border-t mt-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Total de transações: <span className="font-medium">{filteredTransactions.length}</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 text-right">
                        Receitas: <span className="font-medium text-green-600">
                          {formatCurrency(filteredTransactions
                            .filter(t => t.type === 'income')
                            .reduce((sum, t) => sum + t.amount, 0))}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 text-right">
                        Despesas: <span className="font-medium text-red-600">
                          {formatCurrency(filteredTransactions
                            .filter(t => t.type === 'expense')
                            .reduce((sum, t) => sum + t.amount, 0))}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={exportReport}
            className="bg-futconnect-600 hover:bg-futconnect-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
