import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Users, Search, Filter, Edit, Trash2, 
  Plus, Eye, Download, ShoppingCart, DollarSign, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

// Types for our data
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  total_spent: number;
  status: 'active' | 'inactive';
  last_purchase: string | null;
}

interface Sale {
  id: string;
  customer_id: string;
  product: string;
  value: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  // Store customer name temporarily for display
  customerName?: string;
}

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("customers");
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchCustomers();
    fetchSales();
  }, []);

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Cast the status field to ensure it matches our Customer type
        const typedData: Customer[] = data.map(customer => ({
          ...customer,
          status: customer.status === 'active' ? 'active' : 'inactive'
        }));
        setCustomers(typedData);
        setFilteredCustomers(typedData);
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error.message);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Fetch sales from Supabase
  const fetchSales = async () => {
    setIsLoadingSales(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name)
        `)
        .order('date', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Process the data to include customer name
        const processedSales = data.map((sale: any) => ({
          ...sale,
          customerName: sale.customers?.name || 'Cliente Desconhecido',
          // Ensure status matches our type
          status: (sale.status === 'completed' ? 'completed' : 
                  sale.status === 'pending' ? 'pending' : 'failed') as 'completed' | 'pending' | 'failed'
        }));
        setSales(processedSales);
      }
    } catch (error: any) {
      console.error('Error fetching sales:', error.message);
      toast.error('Erro ao carregar vendas');
    } finally {
      setIsLoadingSales(false);
    }
  };

  // Filter customers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const handleCustomerDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      toast.success('Cliente removido com sucesso!');
      
      // Update local state
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => customer.id !== id)
      );
      
      // If the deleted customer was selected, clear selection
      if (selectedCustomer === id) {
        setSelectedCustomer(null);
        setActiveTab("customers");
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error.message);
      toast.error('Erro ao remover cliente');
    }
  };

  const handleViewCustomer = (id: string) => {
    setSelectedCustomer(id);
    setActiveTab("details");
  };

  const customerSales = sales.filter(sale => 
    selectedCustomer ? sale.customer_id === selectedCustomer : true
  );

  const selectedCustomerData = customers.find(
    customer => customer.id === selectedCustomer
  );

  // Format currency value
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes e Vendas</h1>
            <p className="text-gray-500">Gerencie os clientes e acompanhe as vendas do FutConnect.</p>
          </div>
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button variant="outline" className="flex items-center gap-2">
              <Download size={16} />
              <span>Exportar</span>
            </Button>
            <Button className="bg-futconnect-600 hover:bg-futconnect-700 text-white flex items-center gap-2">
              <Plus size={16} />
              <span>Novo Cliente</span>
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="customers" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users size={16} />
              <span>Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2" disabled={!selectedCustomer}>
              <User size={16} />
              <span>Detalhes do Cliente</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                  <div>
                    <CardTitle>Lista de Clientes</CardTitle>
                    <CardDescription>Gerencie todos os clientes registrados no aplicativo.</CardDescription>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Buscar cliente..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    {isLoadingCustomers ? (
                      <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
                        <span className="ml-3 text-gray-600">Carregando clientes...</span>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="py-3 px-4 text-left font-medium">Nome</th>
                            <th className="py-3 px-4 text-left font-medium hidden md:table-cell">E-mail</th>
                            <th className="py-3 px-4 text-left font-medium hidden lg:table-cell">Plano</th>
                            <th className="py-3 px-4 text-left font-medium">Total Gasto</th>
                            <th className="py-3 px-4 text-left font-medium">Status</th>
                            <th className="py-3 px-4 text-center font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.map((customer) => (
                            <tr key={customer.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{customer.name}</td>
                              <td className="py-3 px-4 hidden md:table-cell">{customer.email}</td>
                              <td className="py-3 px-4 hidden lg:table-cell">{customer.plan}</td>
                              <td className="py-3 px-4">{formatCurrency(customer.total_spent)}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  customer.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-center space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleViewCustomer(customer.id)}
                                  >
                                    <span className="sr-only">Visualizar</span>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <span className="sr-only">Editar</span>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleCustomerDelete(customer.id)}
                                  >
                                    <span className="sr-only">Excluir</span>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          
                          {filteredCustomers.length === 0 && !isLoadingCustomers && (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-gray-500">
                                Nenhum cliente encontrado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Histórico de Vendas</CardTitle>
                    <CardDescription>Todas as vendas realizadas no aplicativo.</CardDescription>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter size={16} />
                    <span>Filtrar</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    {isLoadingSales ? (
                      <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
                        <span className="ml-3 text-gray-600">Carregando vendas...</span>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="py-3 px-4 text-left font-medium">Cliente</th>
                            <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Produto</th>
                            <th className="py-3 px-4 text-left font-medium">Valor</th>
                            <th className="py-3 px-4 text-left font-medium hidden lg:table-cell">Data</th>
                            <th className="py-3 px-4 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((sale) => (
                            <tr key={sale.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{sale.customerName}</td>
                              <td className="py-3 px-4 hidden md:table-cell">{sale.product}</td>
                              <td className="py-3 px-4">{formatCurrency(sale.value)}</td>
                              <td className="py-3 px-4 hidden lg:table-cell">
                                {new Date(sale.date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  sale.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : sale.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {sale.status === 'completed' 
                                    ? 'Concluída' 
                                    : sale.status === 'pending'
                                    ? 'Pendente'
                                    : 'Falha'}
                                </span>
                              </td>
                            </tr>
                          ))}

                          {sales.length === 0 && !isLoadingSales && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-gray-500">
                                Nenhuma venda encontrada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="details">
            {selectedCustomerData && (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-1 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados do Cliente</CardTitle>
                      <CardDescription>Informações detalhadas do cliente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-futconnect-100 flex items-center justify-center text-futconnect-600 text-4xl font-bold">
                          {selectedCustomerData.name.charAt(0)}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm text-gray-500">Nome:</h3>
                        <p className="font-medium">{selectedCustomerData.name}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm text-gray-500">E-mail:</h3>
                        <p className="font-medium">{selectedCustomerData.email}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm text-gray-500">Telefone:</h3>
                        <p className="font-medium">{selectedCustomerData.phone || 'Não informado'}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm text-gray-500">Plano Atual:</h3>
                        <p className="font-medium">{selectedCustomerData.plan}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm text-gray-500">Total Gasto:</h3>
                        <p className="font-medium">{formatCurrency(selectedCustomerData.total_spent)}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm text-gray-500">Status:</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedCustomerData.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedCustomerData.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="text-sm text-gray-500">Última Compra:</h3>
                        <p className="font-medium">
                          {selectedCustomerData.last_purchase 
                            ? new Date(selectedCustomerData.last_purchase).toLocaleDateString('pt-BR')
                            : 'Nenhuma compra registrada'}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                      <Button className="w-full bg-futconnect-600 hover:bg-futconnect-700">
                        Editar Cliente
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab("customers")}>
                        Voltar para Lista
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                <div className="md:col-span-2 space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          <span>Histórico de Compras</span>
                        </CardTitle>
                        <CardDescription>Todas as transações deste cliente.</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <div className="overflow-x-auto">
                          {isLoadingSales ? (
                            <div className="flex justify-center items-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
                              <span className="ml-3 text-gray-600">Carregando histórico...</span>
                            </div>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b">
                                  <th className="py-3 px-4 text-left font-medium">Produto</th>
                                  <th className="py-3 px-4 text-left font-medium">Valor</th>
                                  <th className="py-3 px-4 text-left font-medium">Data</th>
                                  <th className="py-3 px-4 text-left font-medium">Método</th>
                                  <th className="py-3 px-4 text-left font-medium">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customerSales.length > 0 ? (
                                  customerSales.map((sale) => (
                                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                                      <td className="py-3 px-4">{sale.product}</td>
                                      <td className="py-3 px-4">{formatCurrency(sale.value)}</td>
                                      <td className="py-3 px-4">
                                        {new Date(sale.date).toLocaleDateString('pt-BR')}
                                      </td>
                                      <td className="py-3 px-4">{sale.payment_method}</td>
                                      <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          sale.status === 'completed' 
                                            ? 'bg-green-100 text-green-800' 
                                            : sale.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {sale.status === 'completed' 
                                            ? 'Concluída' 
                                            : sale.status === 'pending'
                                            ? 'Pendente'
                                            : 'Falha'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={5} className="py-10 text-center text-gray-500">
                                      Nenhuma compra encontrada.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        <span>Resumo Financeiro</span>
                      </CardTitle>
                      <CardDescription>Resumo das atividades financeiras do cliente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm text-gray-500 mb-1">Total Gasto</h3>
                          <p className="text-2xl font-bold">{formatCurrency(selectedCustomerData.total_spent)}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm text-gray-500 mb-1">Compras Realizadas</h3>
                          <p className="text-2xl font-bold">{customerSales.filter(s => s.status === 'completed').length}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm text-gray-500 mb-1">Última Compra</h3>
                          <p className="text-2xl font-bold">
                            {selectedCustomerData.last_purchase 
                              ? new Date(selectedCustomerData.last_purchase).toLocaleDateString('pt-BR')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Customers;
