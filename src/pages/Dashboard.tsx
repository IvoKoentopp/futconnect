
import { useState, useEffect } from 'react';
import SalesChart from '@/components/SalesChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Users, DollarSign, ArrowUpRight, Download, Filter, BarChart3, CalendarDays, ArrowRight } from 'lucide-react';

// Mock data for recent sales
const recentSales = [
  { id: 1, club: 'Estrela FC', plan: 'Premium', value: 'R$ 199,00', date: '2 min atrás', status: 'success' },
  { id: 2, club: 'Atlético Amador', plan: 'Basic', value: 'R$ 99,00', date: '15 min atrás', status: 'success' },
  { id: 3, club: 'Real Futebol', plan: 'Pro', value: 'R$ 349,00', date: '1 hora atrás', status: 'success' },
  { id: 4, club: 'Santos Amadores', plan: 'Premium', value: 'R$ 199,00', date: '3 horas atrás', status: 'success' },
  { id: 5, club: 'Unidos FC', plan: 'Basic', value: 'R$ 99,00', date: '5 horas atrás', status: 'success' },
];

// Define the type for the period to match SalesChart component's expected type
type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

const Dashboard = () => {
  const [period, setPeriod] = useState<ChartPeriod>('monthly');
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500 text-sm md:text-base">Gerencie e acompanhe as vendas do aplicativo FutConnect.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex items-center gap-2 text-xs md:text-sm" size="sm">
              <Download size={16} />
              <span>Exportar</span>
            </Button>
            <Button className="bg-futconnect-600 hover:bg-futconnect-700 text-white flex items-center gap-2 text-xs md:text-sm" size="sm">
              <Filter size={16} />
              <span>Filtros</span>
            </Button>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total de Vendas</CardTitle>
                <BarChart className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">1,482</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span>+12.3% em relação ao mês passado</span>
                </p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Novos Clientes</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">342</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span>+5.7% em relação ao mês passado</span>
                </p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 shadow-sm sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">R$ 98.640,00</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span>+18.2% em relação ao mês passado</span>
                </p>
              </CardContent>
            </Card>
          </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-2 space-y-4 md:space-y-8">
            {/* Chart controls */}
            <Card className="border border-gray-200 shadow-sm animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="pb-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <CardTitle className="text-base md:text-lg">Análise de Vendas e Receita</CardTitle>
                    <Tabs defaultValue="monthly" value={period} onValueChange={(value: ChartPeriod) => setPeriod(value)} className="w-full md:w-auto">
                      <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="monthly" className="text-xs md:text-sm">Mensal</TabsTrigger>
                        <TabsTrigger value="quarterly" className="text-xs md:text-sm">Trimestral</TabsTrigger>
                        <TabsTrigger value="yearly" className="text-xs md:text-sm">Anual</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    Acompanhe o desempenho de vendas e receita do aplicativo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <div className="min-w-[500px] md:min-w-0">
                    <SalesChart period={period} />
                  </div>
                </CardContent>
            </Card>
          </div>
          
          {/* Right Column */}
          <div className="space-y-4 md:space-y-8">
            {/* Recent Sales */}
            <Card className="border border-gray-200 shadow-sm animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Vendas Recentes</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    As últimas transações processadas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-futconnect-100 flex items-center justify-center text-futconnect-600 font-bold mr-3 text-xs md:text-base">
                          {sale.club.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sale.club}</p>
                          <p className="text-xs text-gray-500 truncate">{sale.plan} • {sale.date}</p>
                        </div>
                        <div className="text-xs md:text-sm font-medium">{sale.value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button variant="ghost" className="w-full text-futconnect-600 hover:text-futconnect-700 hover:bg-futconnect-50 text-xs md:text-sm">
                    Ver todas as vendas
                    <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </CardFooter>
            </Card>
            
            {/* Quick Actions */}
            <Card className="border border-gray-200 shadow-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Ações Rápidas</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Ferramentas e tarefas comuns.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 md:gap-4">
                  <Button variant="outline" className="h-16 md:h-24 flex flex-col justify-center items-center text-gray-700 text-xs md:text-sm">
                    <BarChart3 className="h-4 w-4 md:h-6 md:w-6 mb-1 md:mb-2" />
                    <span>Relatórios</span>
                  </Button>
                  <Button variant="outline" className="h-16 md:h-24 flex flex-col justify-center items-center text-gray-700 text-xs md:text-sm">
                    <Users className="h-4 w-4 md:h-6 md:w-6 mb-1 md:mb-2" />
                    <span>Clientes</span>
                  </Button>
                  <Button variant="outline" className="h-16 md:h-24 flex flex-col justify-center items-center text-gray-700 text-xs md:text-sm">
                    <CalendarDays className="h-4 w-4 md:h-6 md:w-6 mb-1 md:mb-2" />
                    <span>Agenda</span>
                  </Button>
                  <Button variant="outline" className="h-16 md:h-24 flex flex-col justify-center items-center text-gray-700 text-xs md:text-sm">
                    <DollarSign className="h-4 w-4 md:h-6 md:w-6 mb-1 md:mb-2" />
                    <span>Faturas</span>
                  </Button>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
