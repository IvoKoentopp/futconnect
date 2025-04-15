import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { BarChart as BarChartIcon, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { calculateFinancialStatement, calculateSummary, formatCurrency, calculateMonthlyTrends } from '@/utils/financialStatement';
import { Transaction } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { exportElementToPdf } from '@/utils/exportToPdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

// Get current year 
const currentYear = new Date().getFullYear();

// Months for display
const months = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

// Define chart data types for better type safety
interface ComparisonChartData {
  name: string;
  value: number;
  fill: string;
}

interface CategoryChartData {
  category: string;
  value: number;
  type: string;
}

interface ExpensePieChartData {
  name: string;
  value: number;
  fill: string;
  percentage: string;
}

interface ChartData {
  comparisonData: ComparisonChartData[];
  categoriesData: CategoryChartData[];
  expensesDistribution: ExpensePieChartData[];
}

// New interface for the monthly breakdown data
interface MonthlyBreakdownData {
  account: string;
  type: 'revenue' | 'expense';
  months: { [key: string]: number };
  total: number;
}

const FinancialStatement = () => {
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<ReturnType<typeof calculateFinancialStatement>>();
  const [summary, setSummary] = useState<ReturnType<typeof calculateSummary>>();
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyBreakdownData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // References for PDF export
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const balanceteContainerRef = useRef<HTMLDivElement>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>('table');

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        // Verificar se há um clube ativo selecionado
        if (!user?.activeClub?.id) {
          setTransactions([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('club_id', user.activeClub.id) // Filtrar pelo clube do usuário logado
          .order('date', { ascending: false });

        if (error) {
          throw error;
        }

        // Map database records to Transaction type
        const mappedTransactions: Transaction[] = data.map(transaction => ({
          id: transaction.id,
          type: transaction.type as 'income' | 'expense',
          category: transaction.category,
          amount: transaction.amount,
          date: transaction.date,
          description: transaction.description,
          status: transaction.status as 'completed' | 'pending' | 'cancelled',
          paymentMethod: transaction.payment_method as 'pix' | 'cash' | 'transfer' | 'credit_card' | 'debit_card',
          beneficiary: transaction.beneficiary,
          bankAccountId: transaction.bank_account_id,
          clubId: transaction.club_id,
          reference_month: transaction.reference_month
        }));

        setTransactions(mappedTransactions);
      
        // Calculate available years based on transaction dates
        if (mappedTransactions.length > 0) {
          let years = new Set<number>();
        
          // Add all years from transactions
          mappedTransactions.forEach(tx => {
            const txDate = new Date(tx.date);
            years.add(txDate.getFullYear());
          });
        
          // Always include current year if not already in the set
          years.add(currentYear);
        
          // Convert to array and sort in descending order
          const yearsArray = Array.from(years).sort((a, b) => b - a);
          setAvailableYears(yearsArray);
        
          // Set selected year to the most recent year with transactions
          if (yearsArray.length > 0 && !yearsArray.includes(parseInt(selectedYear))) {
            setSelectedYear(yearsArray[0].toString());
          }
        }
      } catch (error: any) {
        console.error('Error fetching transactions:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar transações",
          description: "Não foi possível carregar os dados financeiros.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [toast, user?.activeClub?.id, selectedYear]);

  useEffect(() => {
    if (transactions.length > 0) {
      const data = calculateFinancialStatement(
        transactions, 
        selectedYear ? parseInt(selectedYear) : 0,
        selectedMonth ? parseInt(selectedMonth) : null
      );
      setFinancialData(data);
      setSummary(calculateSummary(data));
      
      // Calculate monthly breakdown when transactions or year changes
      if (!selectedMonth) {
        const monthlyData = prepareMonthlyBreakdown(transactions, parseInt(selectedYear));
        setMonthlyBreakdown(monthlyData);
      }
    }
  }, [selectedYear, selectedMonth, transactions]);

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    // Reset month when year changes
    setSelectedMonth(null);
  };

  // Prepare monthly breakdown data for balancete tab
  const prepareMonthlyBreakdown = (transactions: Transaction[], year: number): MonthlyBreakdownData[] => {
    // Filter transactions for the selected year
    const filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      return txYear === year && tx.status === 'completed';
    });
    
    // Initialize objects to store revenue and expense categories by month
    const revenueByCategory: Record<string, Record<string, number>> = {};
    const expensesByCategory: Record<string, Record<string, number>> = {};
    
    // Process each transaction
    filteredTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const month = (txDate.getMonth() + 1).toString();
      
      if (tx.type === 'income') {
        if (!revenueByCategory[tx.category]) {
          revenueByCategory[tx.category] = {};
        }
        if (!revenueByCategory[tx.category][month]) {
          revenueByCategory[tx.category][month] = 0;
        }
        revenueByCategory[tx.category][month] += tx.amount;
      } else {
        if (!expensesByCategory[tx.category]) {
          expensesByCategory[tx.category] = {};
        }
        if (!expensesByCategory[tx.category][month]) {
          expensesByCategory[tx.category][month] = 0;
        }
        expensesByCategory[tx.category][month] += tx.amount;
      }
    });
    
    // Convert to the required format
    const result: MonthlyBreakdownData[] = [];
    
    // Add revenue categories
    Object.entries(revenueByCategory).forEach(([category, monthlyValues]) => {
      const total = Object.values(monthlyValues).reduce((sum, value) => sum + value, 0);
      result.push({
        account: category,
        type: 'revenue',
        months: monthlyValues,
        total
      });
    });
    
    // Add expense categories
    Object.entries(expensesByCategory).forEach(([category, monthlyValues]) => {
      const total = Object.values(monthlyValues).reduce((sum, value) => sum + value, 0);
      result.push({
        account: category,
        type: 'expense',
        months: monthlyValues,
        total
      });
    });
    
    return result;
  };

  // Prepare chart data from financial statement
  const prepareChartData = (): ChartData => {
    if (!financialData || !summary) return {
      comparisonData: [],
      categoriesData: [],
      expensesDistribution: []
    };
    
    // For revenue-expense comparison chart
    const comparisonData = [
      {
        name: 'Receitas',
        value: summary.totalRevenue || 0,
        fill: '#10b981' // Green color for revenues
      },
      {
        name: 'Despesas',
        value: summary.totalExpenses || 0,
        fill: '#ef4444' // Red color for expenses
      }
    ];
    
    // For detailed categories bar chart
    const categoriesData = [
      ...Object.entries(financialData.revenue).map(([category, value]) => ({
        category,
        value,
        type: 'Receita'
      })),
      ...Object.entries(financialData.expenses).map(([category, value]) => ({
        category,
        value,
        type: 'Despesa'
      }))
    ];
    
    // For expenses distribution pie chart
    const expensesDistribution = Object.entries(financialData.expenses).map(([category, value], index) => ({
      name: category,
      value,
      fill: COLORS[index % COLORS.length],
      percentage: summary.totalExpenses > 0 ? ((value / summary.totalExpenses) * 100).toFixed(1) : '0'
    }));
    
    return { comparisonData, categoriesData, expensesDistribution };
  };
  
  // Colors for charts
  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#f43f5e', '#0891b2'];
  const CATEGORY_COLORS = {
    Receita: '#10b981', // Green
    Despesa: '#ef4444'  // Red
  };
  
  // Create custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-md">
          {label && <p className="font-medium">{label}</p>}
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.fill || entry.color }}>
              {entry.name || entry.dataKey}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom label renderer for pie chart
  const renderCustomizedPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, fill, percent, value, name } = props;
    const RADIAN = Math.PI / 180;
    // Ajuste o raio para posicionar melhor as labels
    const radius = outerRadius * 1.1;
    // Calcule a posição x e y com base no ângulo médio
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Só renderize a label se o percentual for significativo (maior que 5%)
    if (percent < 0.05) return null;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={fill}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs md:text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  // Handle PDF export
  const handleExportPdf = async () => {
    // Determine which container to export based on active tab
    let elementId = '';
    let filename = '';
    let orientation: 'p' | 'l' = 'p';
    
    if (activeTab === 'table') {
      elementId = 'table-container';
      filename = `DRE-Tabela-${selectedYear}${selectedMonth ? '-' + selectedMonth : ''}`;
    } else if (activeTab === 'chart') {
      elementId = 'chart-container';
      filename = `DRE-Gráficos-${selectedYear}${selectedMonth ? '-' + selectedMonth : ''}`;
    } else if (activeTab === 'balancete') {
      elementId = 'balancete-container';
      filename = `DRE-Balancete-${selectedYear}${selectedMonth ? '-' + selectedMonth : ''}`;
      orientation = 'l'; // Use landscape orientation for balancete
    }
    
    if (elementId) {
      await exportElementToPdf(elementId, filename, orientation);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  // Get chart data
  const chartData = prepareChartData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Demonstrativo de Resultado (DRE)</h1>
        <div className="flex items-center space-x-2">
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth || "all"} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos os meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Totais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card className={summary.netProfit >= 0 ? "bg-green-50" : "bg-red-50"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.netProfit)}
                <span className="text-sm ml-2">({summary.profitMargin.toFixed(2)}%)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs 
        defaultValue="table" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value)}
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="balancete">Balancete</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {financialData && summary && (
          <TabsContent value="table" className="space-y-6">
            <div id="table-container" ref={tableContainerRef}>
              <Card>
                <CardHeader>
                  <CardTitle>Demonstrativo de Resultado</CardTitle>
                  <CardDescription>
                    {selectedMonth 
                      ? `${months.find(m => m.value === selectedMonth)?.label} de ${selectedYear}`
                      : `Ano de ${selectedYear}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Descrição</TableHead>
                        <TableHead className="text-right">Valor (R$)</TableHead>
                        <TableHead className="text-right">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="font-medium bg-muted/50">
                        <TableCell colSpan={3}>RECEITAS</TableCell>
                      </TableRow>
                      {Object.entries(financialData.revenue).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="pl-8">{key}</TableCell>
                          <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                          <TableCell className="text-right">{((value / summary.totalRevenue) * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Total de Receitas</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.totalRevenue)}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>

                      <TableRow className="font-medium bg-muted/50">
                        <TableCell colSpan={3}>DESPESAS</TableCell>
                      </TableRow>
                      {Object.entries(financialData.expenses).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="pl-8">{key}</TableCell>
                          <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                          <TableCell className="text-right">{((value / summary.totalExpenses) * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Total de Despesas</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.totalExpenses)}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>

                      <TableRow className="font-bold text-lg">
                        <TableCell>RESULTADO LÍQUIDO</TableCell>
                        <TableCell className={`text-right ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(summary.netProfit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="chart">
          <div id="chart-container" ref={chartContainerRef}>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Comparativo de Receitas e Despesas</CardTitle>
                  <CardDescription>
                    {selectedMonth 
                      ? `${months.find(m => m.value === selectedMonth)?.label} de ${selectedYear}`
                      : `Ano de ${selectedYear}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={chartData.comparisonData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="value" name="Valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Despesas</CardTitle>
                  <CardDescription>Proporção entre categorias de despesas</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.expensesDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={renderCustomizedPieLabel}
                        labelLine={false}
                      >
                        {chartData.expensesDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ fontSize: '12px', paddingLeft: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Detalhamento por Categorias</CardTitle>
                  <CardDescription>Valores por categoria de receitas e despesas</CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.categoriesData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <YAxis 
                        type="category" 
                        dataKey="category" 
                        width={150}
                        tick={{ fontSize: 12 }} 
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        name="Valor" 
                      >
                        {chartData.categoriesData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.type === 'Receita' ? CATEGORY_COLORS.Receita : CATEGORY_COLORS.Despesa}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balancete">
          <div id="balancete-container" ref={balanceteContainerRef}>
            <Card>
              <CardHeader>
                <CardTitle>Balancete Mensal</CardTitle>
                <CardDescription>Evolução das receitas e despesas ao longo do ano {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Contas</TableHead>
                      {months.map((month) => (
                        <TableHead key={month.value} className="text-right min-w-[100px]">
                          {month.label.substring(0, 3)}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-bold min-w-[120px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Revenues Section */}
                    <TableRow className="font-medium bg-muted/50">
                      <TableCell colSpan={14} className="sticky left-0 bg-muted/50">RECEITAS</TableCell>
                    </TableRow>
                    {monthlyBreakdown
                      .filter(item => item.type === 'revenue')
                      .map((item, index) => (
                        <TableRow key={`revenue-${index}`}>
                          <TableCell className="sticky left-0 bg-background">{item.account}</TableCell>
                          {months.map((month) => (
                            <TableCell key={month.value} className="text-right">
                              {formatCurrency(item.months[month.value] || 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    
                    {/* Revenue Total Row */}
                    <TableRow className="font-bold">
                      <TableCell className="sticky left-0 bg-background">Total de Receitas</TableCell>
                      {months.map((month) => {
                        const monthTotal = monthlyBreakdown
                          .filter(item => item.type === 'revenue')
                          .reduce((sum, item) => sum + (item.months[month.value] || 0), 0);
                        return (
                          <TableCell key={month.value} className="text-right">
                            {formatCurrency(monthTotal)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        {formatCurrency(
                          monthlyBreakdown
                            .filter(item => item.type === 'revenue')
                            .reduce((sum, item) => sum + item.total, 0)
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expenses Section */}
                    <TableRow className="font-medium bg-muted/50">
                      <TableCell colSpan={14} className="sticky left-0 bg-muted/50">DESPESAS</TableCell>
                    </TableRow>
                    {monthlyBreakdown
                      .filter(item => item.type === 'expense')
                      .map((item, index) => (
                        <TableRow key={`expense-${index}`}>
                          <TableCell className="sticky left-0 bg-background">{item.account}</TableCell>
                          {months.map((month) => (
                            <TableCell key={month.value} className="text-right">
                              {formatCurrency(item.months[month.value] || 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    
                    {/* Expenses Total Row */}
                    <TableRow className="font-bold">
                      <TableCell className="sticky left-0 bg-background">Total de Despesas</TableCell>
                      {months.map((month) => {
                        const monthTotal = monthlyBreakdown
                          .filter(item => item.type === 'expense')
                          .reduce((sum, item) => sum + (item.months[month.value] || 0), 0);
                        return (
                          <TableCell key={month.value} className="text-right">
                            {formatCurrency(monthTotal)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        {formatCurrency(
                          monthlyBreakdown
                            .filter(item => item.type === 'expense')
                            .reduce((sum, item) => sum + item.total, 0)
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Net Profit Row */}
                    <TableRow className="font-bold text-lg">
                      <TableCell className="sticky left-0 bg-background">RESULTADO LÍQUIDO</TableCell>
                      {months.map((month) => {
                        const revenueTotal = monthlyBreakdown
                          .filter(item => item.type === 'revenue')
                          .reduce((sum, item) => sum + (item.months[month.value] || 0), 0);
                        const expenseTotal = monthlyBreakdown
                          .filter(item => item.type === 'expense')
                          .reduce((sum, item) => sum + (item.months[month.value] || 0), 0);
                        const netProfit = revenueTotal - expenseTotal;
                        return (
                          <TableCell 
                            key={month.value} 
                            className={`text-right ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {formatCurrency(netProfit)}
                          </TableCell>
                        );
                      })}
                      <TableCell 
                        className={`text-right ${
                          monthlyBreakdown
                            .filter(item => item.type === 'revenue')
                            .reduce((sum, item) => sum + item.total, 0) -
                          monthlyBreakdown
                            .filter(item => item.type === 'expense')
                            .reduce((sum, item) => sum + item.total, 0) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(
                          monthlyBreakdown
                            .filter(item => item.type === 'revenue')
                            .reduce((sum, item) => sum + item.total, 0) -
                          monthlyBreakdown
                            .filter(item => item.type === 'expense')
                            .reduce((sum, item) => sum + item.total, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialStatement;
