import { useState } from "react";
import { 
  Settings as SettingsIcon, 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Monitor, 
  Mail,
  Building2,
  FileText,
  Music,
  Link,
  Image,
  FileUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ClubSettings } from "@/components/ClubSettings";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileForm, setProfileForm] = useState({
    name: "Administrador",
    email: user?.email || "",
    phone: "(11) 9xxxx-xxxx"
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
    loginAlerts: true
  });

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

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram atualizadas com sucesso."
    });
  };

  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: "As senhas não correspondem. Por favor, tente novamente."
      });
      return;
    }
    
    toast({
      title: "Senha atualizada",
      description: "Sua senha foi atualizada com sucesso."
    });
    
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };

  const handleNotificationsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Preferências atualizadas",
      description: "Suas preferências de notificação foram atualizadas."
    });
  };

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Configurações</h1>
        <p className="text-gray-500">Gerencie suas preferências e informações de conta</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-8 w-full max-w-md grid grid-cols-4 bg-gray-100 p-1">
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
          <TabsTrigger value="club" className="data-[state=active]:bg-white">
            <Building2 className="h-4 w-4 mr-2" />
            Clube
          </TabsTrigger>
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
                    <p className="text-sm text-gray-500">Receber relatórios semanais de desempenho</p>
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

        <TabsContent value="club" className="animate-fade-in">
          <ClubSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
