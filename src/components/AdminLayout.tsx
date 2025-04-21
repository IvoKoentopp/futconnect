import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut, Menu, X, User, FileText, ShoppingCart, Settings as SettingsIcon, UserPlus, List, PlusCircle, BarChart, ListChecks, Trophy, BarChart2, UserCog, Receipt, Award, Star, HelpCircle, Music, Mail, Bell, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
interface AdminLayoutProps {
  children: React.ReactNode;
  appMode?: 'sales' | 'club';
}

// Club Management navigation items
const clubNavItems = [{
  name: 'Dashboard',
  path: '/club',
  icon: <LayoutDashboard size={20} />
}, {
  name: 'Documentos',
  icon: <FileText size={20} />,
  submenu: [{
    name: 'Estatuto',
    path: '/club/documents/statute',
    icon: <FileText size={16} />
  }, {
    name: 'Hino',
    path: '/club/documents/anthem',
    icon: <Music size={16} />
  }, {
    name: 'Convite',
    path: '/club/documents/invitation',
    icon: <Mail size={16} />
  }]
}, {
  name: 'Sócios',
  icon: <Users size={20} />,
  submenu: [{
    name: 'Novo Sócio',
    path: '/members/new',
    icon: <UserPlus size={16} />
  }, {
    name: 'Lista de Sócios',
    path: '/members/list',
    icon: <List size={16} />
  }, {
    name: 'Perfil de Sócios',
    path: '/members/profile',
    icon: <UserCog size={16} />
  }, {
    name: 'Estatísticas de Sócios',
    path: '/members/statistics',
    icon: <BarChart size={16} />
  }, {
    name: 'Patrocinador',
    path: '/sponsors',
    icon: <Award size={16} />
  }]
}, {
  name: 'Jogos',
  icon: <Calendar size={20} />,
  submenu: [{
    name: 'Listar Jogos',
    path: '/games',
    icon: <ListChecks size={16} />
  }, {
    name: 'Destaque da Partida',
    path: '/game-highlights',
    icon: <Star size={16} />
  }, {
    name: 'Estatísticas',
    path: '/game-statistics',
    icon: <BarChart2 size={16} />
  }, {
    name: 'Performance',
    path: '/game-performance',
    icon: <Trophy size={16} />
  }, {
    name: 'Alertas de Ausência',
    path: '/game-absence-alerts',
    icon: <Bell size={16} />
  }]
}, {
  name: 'Financeiro',
  icon: <DollarSign size={20} />,
  submenu: [{
    name: 'Plano de Contas',
    path: '/chart-of-accounts',
    icon: <Receipt size={16} />
  }, {
    name: 'Contas Bancárias',
    path: '/bank-accounts',
    icon: <DollarSign size={16} />
  }, {
    name: 'Movimentações',
    path: '/finances',
    icon: <DollarSign size={16} />
  }, {
    name: 'DRE',
    path: '/financial-statement',
    icon: <BarChart2 size={16} />
  }]
}, {
  name: 'Mensalidades',
  icon: <FileText size={20} />,
  submenu: [{
    name: 'Criar',
    path: '/monthly-fees/create',
    icon: <PlusCircle size={16} />
  }, {
    name: 'Listar Mensalidade',
    path: '/monthly-fees',
    icon: <List size={16} />
  }]
}, {
  name: 'Configurações',
  path: '/settings',
  icon: <Settings size={20} />
},
{
  name: 'Manual de Uso',
  path: '/club/user-guide',
  icon: <HelpCircle size={20} />
}, {
  name: 'Futebot',
  external: true,
  icon: <Bot size={20} />,
  onClick: () => window.open('https://chatvolt.ai/@coalabot', '_blank')
}];

// Sales Admin navigation items
const salesNavItems = [{
  name: 'Dashboard',
  path: '/dashboard',
  icon: <LayoutDashboard size={20} />
}, {
  name: 'Clientes',
  path: '/customers',
  icon: <Users size={20} />
}, {
  name: 'Vendas',
  path: '/sales',
  icon: <ShoppingCart size={20} />
}, {
  name: 'Planos',
  path: '/plan-config',
  icon: <FileText size={20} />
}, {
  name: 'Configurações',
  path: '/admin-settings',
  icon: <SettingsIcon size={20} />
},
{
  name: 'Manual de Uso',
  path: '/user-guide',
  icon: <HelpCircle size={20} />
}];

const AdminLayout = ({
  children,
  appMode = 'sales'
}: AdminLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const {
    logout,
    user
  } = useAuth();

  // Use the explicitly provided appMode prop instead of determining it from the URL
  const navItems = appMode === 'club' ? clubNavItems : salesNavItems;
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  return <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Fixed Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo and mobile menu toggle */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} className="md:hidden text-gray-600 hover:bg-gray-100">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
            
            {appMode === 'club' ? <Link to="/club" className="flex items-center">
                {user?.activeClub?.logo ? <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center bg-futconnect-100">
                    <img src={user.activeClub.logo} alt={user.activeClub.name} className="h-full w-full object-cover" />
                  </div> : <div className="h-10 w-10 bg-futconnect-100 rounded-full flex items-center justify-center text-futconnect-600 font-bold">
                    {user?.activeClub?.name?.charAt(0) || 'C'}
                  </div>}
                <span className="ml-2 font-medium text-gray-900">{user?.activeClub?.name}</span>
              </Link> : <Link to="/dashboard" className="flex items-center">
                <img src="/lovable-uploads/c6c7c3c3-6543-4157-8202-b465ea229d9d.png" alt="FutConnect Admin" className="h-8 w-auto" />
                <span className="ml-2 font-medium text-gray-900">FutConnect Admin</span>
              </Link>}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => item.submenu ? (
  <div key={item.name} className="relative group">
    <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100">
      <span className="mr-2">{item.icon}</span>
      {item.name}
    </button>
    <div className="absolute left-0 top-full mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
      <div className="py-1">
        {item.submenu.map(subItem => <Link key={subItem.path} to={subItem.path} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
            {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
            {subItem.name}
          </Link>)}
      </div>
    </div>
  </div>
) : item.onClick ? (
  <button key={item.name}
    type="button"
    onClick={item.onClick}
    className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100"
    style={{ background: 'none', border: 'none' }}
  >
    <span className="mr-2">{item.icon}</span>
    {item.name}
  </button>
) : (
  <Link key={item.path} to={item.path} className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === item.path ? 'bg-futconnect-50 text-futconnect-700' : 'text-gray-700 hover:bg-gray-100'}`}>
    <span className="mr-2">{item.icon}</span>
    {item.name}
  </Link>
))}
          </div>
          
          {/* User Info & Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="rounded-full bg-gray-100">
                <User size={20} />
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:flex text-gray-700 hover:text-red-600" onClick={logout}>
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && <div className="fixed inset-0 z-30 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobileMenu}></div>
          <div className="fixed top-16 left-0 right-0 z-40 bg-white shadow-lg overflow-y-auto max-h-[calc(100vh-4rem)]">
            <nav className="px-2 pt-2 pb-4">
              <ul className="space-y-1">
                {navItems.map(item => item.submenu ? (
  <li key={item.name} className="space-y-1">
    <div className="px-4 py-2 text-sm font-medium text-gray-900 flex items-center">
      <span className="mr-2">{item.icon}</span>
      {item.name}
    </div>
    <ul className="pl-8 space-y-1">
      {item.submenu.map(subItem => <li key={subItem.path}>
        <Link to={subItem.path} className={`block rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center ${location.pathname === subItem.path ? 'bg-gray-50 text-futconnect-700' : ''}`} onClick={toggleMobileMenu}>
          {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
          {subItem.name}
        </Link>
      </li>)}
    </ul>
  </li>
) : item.onClick ? (
  <li key={item.name}>
    <button
      type="button"
      onClick={() => { item.onClick(); toggleMobileMenu(); }}
      className="flex items-center rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 w-full"
      style={{ background: 'none', border: 'none' }}
    >
      <span className="mr-3">{item.icon}</span>
      {item.name}
    </button>
  </li>
) : (
  <li key={item.path}>
    <Link to={item.path} className={`flex items-center rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 ${location.pathname === item.path ? 'bg-gray-50 text-futconnect-700 font-medium' : ''}`} onClick={toggleMobileMenu}>
      <span className="mr-3">{item.icon}</span>
      {item.name}
    </Link>
  </li>
))}
                <li className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full justify-start border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-red-600" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
        </div>}
      
      {/* Main Content */}
      <main className="flex-1 pt-16 py-[6px]">
        <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>;
};
export default AdminLayout;
