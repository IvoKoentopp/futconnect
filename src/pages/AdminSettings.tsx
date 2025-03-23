
import { useState, useEffect } from "react";
import { 
  User, 
  Lock, 
  Bell,
  Shield,
  Building,
  Users,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
// Importando zod usando estratégia diferente
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface CompanyInfo {
  id: string;
  company_name: string;
  trade_name: string;
  cnpj: string;
  municipal_registration: string;
  email: string;
  phone: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
}

interface SystemAdmin {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_super_admin: boolean;
  created_at: string;
  last_login: string | null;
}

const AdminSettings = () => {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [openNewAdminDialog, setOpenNewAdminDialog] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || ""
  });
  
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [notificationsForm, setNotificationsForm] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    loginAlerts: true,
    twoFactorAuth: false
  });

  // Formulário para novo administrador
  const newAdminSchema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    email: z.string().email({ message: "E-mail inválido" }),
    phone: z.string().optional(),
    password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
    confirmPassword: z.string(),
    is_super_admin: z.boolean().default(false)
  }).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não correspondem",
    path: ["confirmPassword"],
  });

  const newAdminForm = useForm<z.infer<typeof newAdminSchema>>({
    resolver: zodResolver(newAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      is_super_admin: false
    },
  });

  useEffect(() => {
    fetchCompanyInfo();
    fetchAdmins();
  }, []);

  const fetchCompanyInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching company info:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as informações da empresa."
        });
      } else {
        setCompanyInfo(data as CompanyInfo);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_admins')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching admins:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar administradores",
          description: "Não foi possível carregar a lista de administradores."
        });
      } else {
        setAdmins(data as SystemAdmin[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurityForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotificationsForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await updateUserProfile({
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone
    });

    if (!success) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: "Não foi possível atualizar suas informações."
      });
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: "As senhas não correspondem. Por favor, tente novamente."
      });
      return;
    }

    try {
      // Verificar senha atual
      const { data, error } = await supabase
        .from('system_admins')
        .select('id')
        .eq('id', user?.id)
        .eq('password', securityForm.currentPassword)
        .single();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar senha",
          description: "Senha atual incorreta. Por favor, tente novamente."
        });
        return;
      }

      // Atualizar senha
      const { error: updateError } = await supabase
        .from('system_admins')
        .update({ 
          password: securityForm.newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar senha",
          description: "Ocorreu um erro ao atualizar a senha. Tente novamente."
        });
        return;
      }

      // Atualizar data da última alteração de senha
      await supabase
        .from('admin_security_settings')
        .update({ 
          password_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('admin_id', user?.id);

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso."
      });
      
      setSecurityForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: "Ocorreu um erro ao atualizar a senha. Tente novamente."
      });
    }
  };

  const handleNotificationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('admin_security_settings')
        .update({ 
          login_notifications: notificationsForm.loginAlerts,
          two_factor_auth: notificationsForm.twoFactorAuth,
          updated_at: new Date().toISOString()
        })
        .eq('admin_id', user?.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar preferências",
          description: "Ocorreu um erro ao atualizar suas preferências. Tente novamente."
        });
        return;
      }

      toast({
        title: "Preferências atualizadas",
        description: "Suas preferências de notificação foram atualizadas."
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar preferências",
        description: "Ocorreu um erro ao atualizar suas preferências. Tente novamente."
      });
    }
  };

  const onSubmitNewAdmin = async (data: z.infer<typeof newAdminSchema>) => {
    try {
      // Verificar se o e-mail já existe
      const { data: existingAdmin, error: checkError } = await supabase
        .from('system_admins')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingAdmin) {
        toast({
          variant: "destructive",
          title: "Erro ao criar administrador",
          description: "Já existe um administrador com este e-mail."
        });
        return;
      }

      // Criar novo administrador
      const { data: newAdmin, error } = await supabase
        .from('system_admins')
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          password: data.password,
          role: 'admin',
          is_super_admin: data.is_super_admin
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating admin:', error);
        toast({
          variant: "destructive",
          title: "Erro ao criar administrador",
          description: "Ocorreu um erro ao criar o administrador. Tente novamente."
        });
        return;
      }

      // Criar configurações de segurança para o novo administrador
      await supabase
        .from('admin_security_settings')
        .insert({
          admin_id: newAdmin.id,
          two_factor_auth: false,
          login_notifications: true
        });

      toast({
        title: "Administrador criado",
        description: "O administrador foi criado com sucesso."
      });

      // Resetar formulário e fechar dialog
      newAdminForm.reset();
      setOpenNewAdminDialog(false);
      
      // Recarregar lista de administradores
      fetchAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar administrador",
        description: "Ocorreu um erro ao criar o administrador. Tente novamente."
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Configurações de Administrador</h1>
        <p className="text-gray-500">Gerencie suas preferências e informações de conta</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-8 w-full max-w-md grid grid-cols-5 bg-gray-100 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white">
            <Lock className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-white">
            <Building className="h-4 w-4 mr-2" />
            Empresa
          </TabsTrigger>
          {user?.is_super_admin && (
            <TabsTrigger value="admins" className="data-[state=active]:bg-white">
              <Users className="h-4 w-4 mr-2" />
              Administradores
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium mb-6 flex items-center">
              <User className="mr-2 h-5 w-5 text-futconnect-600" />
              Informações Pessoais
            </h2>
            
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input 
                    id="name" 
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Seu nome"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    placeholder="seu.email@exemplo.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    placeholder="(xx) xxxxx-xxxx"
                  />
                </div>
              </div>
              
              <Button type="submit" className="bg-futconnect-600 hover:bg-futconnect-700 mt-4">
                Salvar alterações
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="security" className="animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium mb-6 flex items-center">
              <Shield className="mr-2 h-5 w-5 text-futconnect-600" />
              Segurança da Conta
            </h2>
            
            <form onSubmit={handleSecuritySubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha atual</Label>
                  <Input 
                    id="currentPassword" 
                    name="currentPassword"
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={handleSecurityChange}
                    placeholder="Digite sua senha atual"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input 
                    id="newPassword" 
                    name="newPassword"
                    type="password"
                    value={securityForm.newPassword}
                    onChange={handleSecurityChange}
                    placeholder="Digite sua nova senha"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input 
                    id="confirmPassword" 
                    name="confirmPassword"
                    type="password"
                    value={securityForm.confirmPassword}
                    onChange={handleSecurityChange}
                    placeholder="Confirme sua nova senha"
                  />
                </div>
              </div>
              
              <Button type="submit" className="bg-futconnect-600 hover:bg-futconnect-700 mt-4">
                Atualizar senha
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium mb-6 flex items-center">
              <Bell className="mr-2 h-5 w-5 text-futconnect-600" />
              Preferências de Notificação
            </h2>
            
            <form onSubmit={handleNotificationsSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    name="emailNotifications"
                    checked={notificationsForm.emailNotifications}
                    onChange={handleNotificationChange}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="emailNotifications" className="font-medium">Notificações por e-mail</Label>
                    <p className="text-sm text-gray-500">Receber atualizações e notificações via e-mail</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="pushNotifications"
                    name="pushNotifications"
                    checked={notificationsForm.pushNotifications}
                    onChange={handleNotificationChange}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="pushNotifications" className="font-medium">Notificações push</Label>
                    <p className="text-sm text-gray-500">Receber notificações no navegador</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="weeklyReports"
                    name="weeklyReports"
                    checked={notificationsForm.weeklyReports}
                    onChange={handleNotificationChange}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="weeklyReports" className="font-medium">Relatórios semanais</Label>
                    <p className="text-sm text-gray-500">Receber relatórios semanais de vendas e desempenho</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="loginAlerts"
                    name="loginAlerts"
                    checked={notificationsForm.loginAlerts}
                    onChange={handleNotificationChange}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="loginAlerts" className="font-medium">Alertas de login</Label>
                    <p className="text-sm text-gray-500">Receber alertas quando houver um novo login na sua conta</p>
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="bg-futconnect-600 hover:bg-futconnect-700 mt-4">
                Salvar preferências
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="company" className="animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium mb-6 flex items-center">
              <Building className="mr-2 h-5 w-5 text-futconnect-600" />
              Informações da Empresa
            </h2>
            
            {loading ? (
              <div className="text-center py-4">
                <p>Carregando informações...</p>
              </div>
            ) : companyInfo ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Razão Social</Label>
                    <Input 
                      id="company_name" 
                      value={companyInfo.company_name}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="trade_name">Nome Fantasia</Label>
                    <Input 
                      id="trade_name" 
                      value={companyInfo.trade_name || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input 
                      id="cnpj" 
                      value={companyInfo.cnpj}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="municipal_registration">Inscrição Municipal</Label>
                    <Input 
                      id="municipal_registration" 
                      value={companyInfo.municipal_registration || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={companyInfo.email}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      value={companyInfo.phone || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                <h3 className="text-md font-medium mt-6 mb-4">Endereço</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="address_street">Logradouro</Label>
                    <Input 
                      id="address_street" 
                      value={companyInfo.address_street || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address_number">Número</Label>
                    <Input 
                      id="address_number" 
                      value={companyInfo.address_number || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address_complement">Complemento</Label>
                    <Input 
                      id="address_complement" 
                      value={companyInfo.address_complement || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address_neighborhood">Bairro</Label>
                    <Input 
                      id="address_neighborhood" 
                      value={companyInfo.address_neighborhood || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address_city">Cidade</Label>
                    <Input 
                      id="address_city" 
                      value={companyInfo.address_city || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address_state">Estado</Label>
                    <Input 
                      id="address_state" 
                      value={companyInfo.address_state || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address_zip">CEP</Label>
                    <Input 
                      id="address_zip" 
                      value={companyInfo.address_zip || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                <h3 className="text-md font-medium mt-6 mb-4">Administrador</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin_name">Nome</Label>
                    <Input 
                      id="admin_name" 
                      value={companyInfo.admin_name || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="admin_email">Email</Label>
                    <Input 
                      id="admin_email" 
                      value={companyInfo.admin_email || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="admin_phone">Telefone</Label>
                    <Input 
                      id="admin_phone" 
                      value={companyInfo.admin_phone || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    type="button" 
                    className="bg-futconnect-600 hover:bg-futconnect-700"
                    onClick={() => toast({
                      title: "Edição de empresa",
                      description: "Em breve você poderá editar as informações da empresa."
                    })}
                  >
                    Editar Informações
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p>Nenhuma informação encontrada.</p>
                <Button 
                  className="mt-4 bg-futconnect-600 hover:bg-futconnect-700"
                  onClick={fetchCompanyInfo}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {user?.is_super_admin && (
          <TabsContent value="admins" className="animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium flex items-center">
                  <Users className="mr-2 h-5 w-5 text-futconnect-600" />
                  Gerenciar Administradores
                </h2>

                <Dialog open={openNewAdminDialog} onOpenChange={setOpenNewAdminDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-futconnect-600 hover:bg-futconnect-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Novo Administrador
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Administrador</DialogTitle>
                      <DialogDescription>
                        Preencha as informações para criar um novo administrador do sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...newAdminForm}>
                      <form onSubmit={newAdminForm.handleSubmit(onSubmitNewAdmin)} className="space-y-4 py-4">
                        <FormField
                          control={newAdminForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do administrador" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newAdminForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@exemplo.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newAdminForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input placeholder="(xx) xxxxx-xxxx" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newAdminForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newAdminForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newAdminForm.control}
                          name="is_super_admin"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="mt-1"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Super Administrador</FormLabel>
                                <FormDescription>
                                  Concede acesso total ao sistema, incluindo gerenciamento de outros administradores
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <DialogFooter className="mt-6">
                          <Button type="submit" className="bg-futconnect-600">Criar Administrador</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {adminLoading ? (
                <div className="text-center py-10">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Carregando administradores...</p>
                </div>
              ) : (
                <>
                  {admins.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-500">Nenhum administrador encontrado.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nome</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">E-mail</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tipo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Último login</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {admins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">{admin.name}</td>
                              <td className="px-4 py-3 text-sm">{admin.email}</td>
                              <td className="px-4 py-3 text-sm">
                                {admin.is_super_admin ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Super Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Admin
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">{formatDate(admin.last_login)}</td>
                              <td className="px-4 py-3 text-sm">
                                <Button
                                  variant="ghost"
                                  className="h-8 px-2 text-futconnect-600 hover:text-futconnect-700"
                                  onClick={() => toast({
                                    title: "Edição de administrador",
                                    description: "Em breve você poderá editar os administradores."
                                  })}
                                >
                                  Editar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AdminSettings;
