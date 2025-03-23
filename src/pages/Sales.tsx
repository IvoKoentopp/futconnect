
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Filter, Download, ArrowUpRight, DollarSign, ShoppingCart, Users, Loader2 } from 'lucide-react';
import SalesChart from '@/components/SalesChart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Definindo a interface para os dados de vendas e clientes
interface Customer {
  id: string;
  name: string;
  email: string;
  plan: string;
  total_spent: number;
}

interface Sale {
  id: string;
  customer_id: string;
  product: string;
  value: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  created_at: string;
  updated_at: string;
  customers: { name: string };
}

const Sales = () => {
  const [dateRange, setDateRange] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  useEffect(() => {
    fetchSalesData();
    fetchRecentSales();
  }, []);

  const fetchSalesData = async () => {
    setIsLoading(true);
    try {
      // Buscar o total de vendas e receita
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('value, status')
        .eq('status', 'completed');

      if (salesError) throw salesError;

      // Calcular o total de vendas e receita
      const completedSales = salesData || [];
      setTotalSales(completedSales.length);
      setTotalRevenue(completedSales.reduce((sum, sale) => sum + (sale.value || 0), 0));

      // Buscar novos clientes (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count, error: customersError } = await supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (customersError) throw customersError;
      
      setNewCustomers(count || 0);
    } catch (error: any) {
      console.error('Erro ao buscar dados de vendas:', error.message);
      toast.error('Não foi possível carregar os dados de vendas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name)
        `)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentSales(data as Sale[] || []);
    } catch (error: any) {
      console.error('Erro ao buscar vendas recentes:', error.message);
    }
  };

  // Formatar moeda para o formato brasileiro
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  // Formatar data relativa (há X tempo)
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `Há ${diffMins} minutos`;
    } else if (diffHours < 24) {
      return `Há ${diffHours} horas`;
    } else {
      return `Há ${diffDays} dias`;
    }
  };

  const salesStats = [
    {
      title: "Vendas Totais",
      value: isLoading ? "..." : totalSales.toString(),
      change: "+12%",
      icon: <ShoppingCart className="h-5 w-5 text-white" />,
      iconBg: "bg-futconnect-600"
    },
    {
      title: "Receita",
      value: isLoading ? "..." : formatCurrency(totalRevenue),
      change: "+18%",
      icon: <DollarSign className="h-5 w-5 text-white" />,
      iconBg: "bg-green-600"
    },
    {
      title: "Novos Clientes",
      value: isLoading ? "..." : newCustomers.toString(),
      change: "+5%",
      icon: <Users className="h-5 w-5 text-white" />,
      iconBg: "bg-blue-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Acompanhe o desempenho comercial da sua plataforma
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs defaultValue="month" className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-4 w-full sm:w-[300px]">
              <TabsTrigger value="day" onClick={() => setDateRange('day')} className="text-xs">Dia</TabsTrigger>
              <TabsTrigger value="week" onClick={() => setDateRange('week')} className="text-xs">Semana</TabsTrigger>
              <TabsTrigger value="month" onClick={() => setDateRange('month')} className="text-xs">Mês</TabsTrigger>
              <TabsTrigger value="year" onClick={() => setDateRange('year')} className="text-xs">Ano</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {salesStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline">
                    <h3 className="text-lg md:text-2xl font-bold">{stat.value}</h3>
                    <span className={`ml-2 text-xs md:text-sm font-medium ${
                      stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`rounded-full p-2 ${stat.iconBg}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Análise de Vendas</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Desempenho de vendas no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[500px] md:min-w-0">
            <SalesChart period={dateRange === 'year' ? 'yearly' : 'monthly'} />
          </div>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <CardTitle className="text-base md:text-lg">Vendas Recentes</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Últimas 5 transações realizadas na plataforma
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs w-full md:w-auto">
            Ver todas
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
              <span className="ml-3 text-gray-600">Carregando vendas recentes...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSales.length > 0 ? (
                recentSales.map((sale, index) => (
                  <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full w-8 h-8 md:w-10 md:h-10 bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="font-medium text-gray-600 text-xs md:text-sm">
                          {sale.customers?.name.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{sale.customers?.name || 'Cliente Desconhecido'}</p>
                        <p className="text-xs text-muted-foreground truncate">{sale.product}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0">
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(sale.value)}</p>
                        <p className="text-xs text-muted-foreground">{sale.payment_method}</p>
                      </div>
                      <div className="text-xs text-muted-foreground text-right w-24 hidden sm:block">
                        {formatRelativeTime(sale.date)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma venda recente encontrada.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;
