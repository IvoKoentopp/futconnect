
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Club {
  id: string;
  name: string;
  logo?: string;
  isAdmin: boolean;
}

interface User {
  id?: string;
  email: string;
  role: string;
  name: string;
  phone?: string; // Added phone property
  clubs: Club[];
  activeClub?: Club;
  is_super_admin?: boolean;
  isMember?: boolean; // Added to identify member accounts
  memberId?: string; // Added to store the member ID
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setActiveClub: (clubId: string) => void;
  updateUserProfile: (userData: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const authData = localStorage.getItem('futconnect_auth');
      
      if (authData) {
        try {
          const { isAuthenticated, user } = JSON.parse(authData);
          if (isAuthenticated && user) {
            setUser(user);
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error("Error parsing auth data:", error);
          localStorage.removeItem('futconnect_auth');
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const updateUserProfile = async (userData: Partial<User>): Promise<boolean> => {
    if (!user || !user.id) return false;

    try {
      const { error } = await supabase
        .from('system_admins')
        .update({
          name: userData.name,
          email: userData.email,
          phone: userData.phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast({
          variant: "destructive",
          title: "Erro ao atualizar perfil",
          description: "Ocorreu um erro ao atualizar seu perfil. Tente novamente.",
        });
        return false;
      }

      // Update local user state
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);

      // Update in local storage
      localStorage.setItem('futconnect_auth', JSON.stringify({
        isAuthenticated: true,
        user: updatedUser
      }));

      toast({
        title: "Perfil atualizado",
        description: "Seu perfil foi atualizado com sucesso.",
      });

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar seu perfil. Tente novamente.",
      });
      return false;
    }
  };
  
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Verificar se é um administrador do sistema
      const { data: adminData, error: adminError } = await supabase
        .from('system_admins')
        .select('id, name, email, phone, role, is_super_admin')
        .eq('email', email)
        .eq('password', password)
        .single();
      
      if (adminError) {
        console.log("Admin login error or not found:", adminError);
      }
      
      // Se for um administrador do sistema
      if (adminData) {
        // Atualizar último login
        await supabase
          .from('system_admins')
          .update({ last_login: new Date().toISOString() })
          .eq('id', adminData.id);
        
        // Mock user com clubes para admin geral
        const mockClubs: Club[] = [
          { id: '1', name: 'Estrela FC', logo: '/clubs/estrela-fc.png', isAdmin: true },
          { id: '2', name: 'Atlético Amador', logo: '/clubs/atletico-amador.png', isAdmin: false },
        ];
        
        const userData = { 
          id: adminData.id,
          email: adminData.email, 
          role: adminData.role,
          name: adminData.name,
          phone: adminData.phone,
          is_super_admin: adminData.is_super_admin,
          clubs: mockClubs,
          activeClub: mockClubs[0]
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        
        localStorage.setItem('futconnect_auth', JSON.stringify({
          isAuthenticated: true,
          user: userData
        }));
        
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo ao FutConnect!",
        });
        
        setIsLoading(false);
        return true;
      } 
      
      // Se não for um administrador do sistema, verificar se é o administrador do clube Coala FC
      const clubAdminCredentials = {
        email: 'ivo@coala.com',
        password: 'ivo123'
      };
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verificar se é o administrador do clube Coala FC
      if (email === clubAdminCredentials.email && password === clubAdminCredentials.password) {
        // Mock user para o administrador do clube
        const coalaClub: Club = { 
          id: '3', 
          name: 'Coala FC', 
          logo: '/clubs/coala-fc.png', 
          isAdmin: true 
        };
        
        const userData = { 
          email, 
          role: 'club_admin',
          name: 'Ivo',
          clubs: [coalaClub],
          activeClub: coalaClub
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        
        localStorage.setItem('futconnect_auth', JSON.stringify({
          isAuthenticated: true,
          user: userData
        }));
        
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo ao gerenciamento do clube ${userData.activeClub.name}!`,
        });
        
        setIsLoading(false);
        return true;
      }
      
      // Nova verificação: verificar se é um membro/sócio
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, name, nickname, email, club_id')
        .eq('email', email)
        .eq('password', password)
        .single();
      
      if (memberError) {
        console.log("Member login error or not found:", memberError);
      }
      
      // Se for um membro/sócio
      if (memberData) {
        // Obter informações do clube
        const { data: clubData, error: clubError } = await supabase
          .from('clubs')
          .select('id, name')
          .eq('id', memberData.club_id)
          .single();
          
        if (clubError) {
          console.error("Error fetching club data:", clubError);
          toast({
            variant: "destructive",
            title: "Erro ao obter informações do clube",
            description: "Não foi possível carregar os dados do clube. Tente novamente.",
          });
          
          setIsLoading(false);
          return false;
        }
        
        // Get club settings to retrieve logo_url
        const { data: clubSettingsData, error: clubSettingsError } = await supabase
          .from('club_settings')
          .select('logo_url')
          .eq('club_id', memberData.club_id)
          .single();
          
        let logoUrl = undefined;
        if (!clubSettingsError && clubSettingsData) {
          logoUrl = clubSettingsData.logo_url;
        }
        
        const club: Club = {
          id: clubData.id,
          name: clubData.name,
          logo: logoUrl,
          isAdmin: false
        };
        
        const userData: User = {
          id: memberData.id,
          email: memberData.email,
          role: 'member',
          name: memberData.name || memberData.nickname || 'Sócio',
          clubs: [club],
          activeClub: club,
          isMember: true,
          memberId: memberData.id
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        
        localStorage.setItem('futconnect_auth', JSON.stringify({
          isAuthenticated: true,
          user: userData
        }));
        
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo, ${userData.name}!`,
        });
        
        setIsLoading(false);
        return true;
      }
      
      // Verificar se é um administrador de clube criado através da assinatura
      const userDataString = localStorage.getItem(`futconnect_user_${email}`);
      
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        
        // Verificar senha (NUNCA fazer isso em produção, apenas para demonstração)
        if (userData.password === password) {
          // Remover a senha antes de armazenar no estado
          const { password: _, ...userWithoutPassword } = userData;
          
          setUser(userWithoutPassword);
          setIsAuthenticated(true);
          
          localStorage.setItem('futconnect_auth', JSON.stringify({
            isAuthenticated: true,
            user: userWithoutPassword
          }));
          
          toast({
            title: "Login realizado com sucesso",
            description: `Bem-vindo ao gerenciamento do clube ${userWithoutPassword.activeClub?.name}!`,
          });
          
          setIsLoading(false);
          return true;
        }
      }
      
      // Se chegou aqui, credenciais inválidas
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "E-mail ou senha incorretos. Tente novamente.",
      });
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "Ocorreu um erro ao tentar fazer login. Tente novamente.",
      });
      
      setIsLoading(false);
      return false;
    }
  };
  
  const setActiveClub = (clubId: string) => {
    if (!user) return;
    
    const club = user.clubs.find(c => c.id === clubId);
    if (club) {
      const updatedUser = {
        ...user,
        activeClub: club
      };
      
      setUser(updatedUser);
      
      // Update in local storage
      localStorage.setItem('futconnect_auth', JSON.stringify({
        isAuthenticated: true,
        user: updatedUser
      }));
      
      toast({
        title: "Clube alterado",
        description: `Você está gerenciando agora o clube ${club.name}`,
      });
    }
  };
  
  const logout = () => {
    localStorage.removeItem('futconnect_auth');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/'); // Changed from '/login' to '/' to redirect to landing page
    toast({
      title: "Logout realizado",
      description: "Você saiu do sistema com sucesso.",
    });
  };
  
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, setActiveClub, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
