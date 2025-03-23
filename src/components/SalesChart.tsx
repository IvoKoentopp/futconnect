import { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  PieChart,
  Pie,
  Sector
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const salesData = [
  { month: 'Jan', vendas: 65, receita: 6500 },
  { month: 'Fev', vendas: 59, receita: 5900 },
  { month: 'Mar', vendas: 80, receita: 8000 },
  { month: 'Abr', vendas: 81, receita: 8100 },
  { month: 'Mai', vendas: 56, receita: 5600 },
  { month: 'Jun', vendas: 55, receita: 5500 },
  { month: 'Jul', vendas: 40, receita: 4000 },
  { month: 'Ago', vendas: 70, receita: 7000 },
  { month: 'Set', vendas: 90, receita: 9000 },
  { month: 'Out', vendas: 110, receita: 11000 },
  { month: 'Nov', vendas: 130, receita: 13000 },
  { month: 'Dez', vendas: 150, receita: 15000 },
];

const planData = [
  { name: 'Básico', value: 45 },
  { name: 'Premium', value: 35 },
  { name: 'Pro', value: 20 },
];

const regionData = [
  { name: 'Sudeste', value: 40 },
  { name: 'Nordeste', value: 25 },
  { name: 'Sul', value: 20 },
  { name: 'Centro-Oeste', value: 10 },
  { name: 'Norte', value: 5 },
];

const COLORS = ['#0284c7', '#38bdf8', '#7dd3fc', '#BAE6FD', '#E0F2FE'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
        <p className="font-medium text-gray-900">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

interface SalesChartProps {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const SalesChart = ({ period = 'monthly' }: SalesChartProps) => {
  const [chartData, setChartData] = useState(salesData);
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    if (period === 'yearly') {
      const yearlyData = [
        { month: '2022', vendas: 700, receita: 70000 },
        { month: '2023', vendas: 900, receita: 90000 },
        { month: '2024', vendas: 1100, receita: 110000 },
      ];
      setChartData(yearlyData);
    } else {
      setChartData(salesData);
    }
  }, [period]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral de Vendas</CardTitle>
          <CardDescription>Análise de desempenho de vendas e receita</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="area" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="area">Tendência</TabsTrigger>
              <TabsTrigger value="bar">Comparativo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="area" className="space-y-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="vendas"
                      stroke="#0ea5e9"
                      fillOpacity={1}
                      fill="url(#colorVendas)"
                      name="Vendas"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="receita"
                      stroke="#38bdf8"
                      fillOpacity={1}
                      fill="url(#colorReceita)"
                      name="Receita (R$)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="bar">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar name="Vendas" dataKey="vendas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Plano</CardTitle>
            <CardDescription>Distribuição de vendas por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={(props) => {
                      const RADIAN = Math.PI / 180;
                      const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
                      const sin = Math.sin(-RADIAN * midAngle);
                      const cos = Math.cos(-RADIAN * midAngle);
                      const sx = cx + (outerRadius + 10) * cos;
                      const sy = cy + (outerRadius + 10) * sin;
                      const mx = cx + (outerRadius + 30) * cos;
                      const my = cy + (outerRadius + 30) * sin;
                      const ex = mx + (cos >= 0 ? 1 : -1) * 22;
                      const ey = my;
                      const textAnchor = cos >= 0 ? 'start' : 'end';
                  
                      return (
                        <g>
                          <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-medium">
                            {payload.name}
                          </text>
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                          />
                          <Sector
                            cx={cx}
                            cy={cy}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            innerRadius={outerRadius + 6}
                            outerRadius={outerRadius + 10}
                            fill={fill}
                          />
                          <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
                          <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
                          <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="text-xs">{`${value}%`}</text>
                          <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-xs">
                            {`(${(percent * 100).toFixed(2)}%)`}
                          </text>
                        </g>
                      );
                    }}
                    onMouseEnter={onPieEnter}
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={false}
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Região</CardTitle>
            <CardDescription>Distribuição geográfica de vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesChart;
