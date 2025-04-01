import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navigateToClubArea = () => {
    closeMobileMenu();
    navigate('/club-login');
  };

  const publicLinks = [
    { name: 'Início', path: '/' },
    { name: 'Preços', path: '/pricing' },
  ];

  const adminLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Documentos', path: '/documents' },
    { name: 'Vendas', path: '/sales' },
    { name: 'Configurações', path: '/settings' }
  ];

  // Se estamos na página principal (Index), mostrar apenas links públicos
  // Caso contrário, mostrar todos os links de acordo com a autenticação
  const isHomePage = location.pathname === '/';
  const navLinks = isHomePage ? [] : (isAuthenticated ? [...publicLinks, ...adminLinks] : publicLinks);

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'glass-navbar py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link to="/" className="flex items-center space-x-2">
          {/* Always show FutConnect logo and name on homepage */}
          {isHomePage || !user?.activeClub?.logo ? (
            <>
              <img 
                src="/lovable-uploads/c6c7c3c3-6543-4157-8202-b465ea229d9d.png" 
                alt="FutConnect Logo" 
                className="h-10 w-auto"
              />
              {isHomePage && (
                <span className="font-medium text-gray-900">FutConnect</span>
              )}
            </>
          ) : (
            <>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user.activeClub.logo}
                  alt={user.activeClub.name || "Club Logo"}
                />
                <AvatarFallback className="bg-futconnect-100 text-futconnect-600 font-bold">
                  {user.activeClub?.name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              {user?.activeClub?.name && (
                <span className="font-medium text-gray-900">{user.activeClub.name}</span>
              )}
            </>
          )}
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`transition-colors hover:text-futconnect-600 ${
                location.pathname === link.path 
                  ? 'text-futconnect-600 font-medium' 
                  : 'text-gray-600'
              }`}
            >
              {link.name}
            </Link>
          ))}
          
          {/* Botão para Login no App do FutConnect (gerenciamento de clubes) */}
          <Button 
            className="bg-futconnect-600 hover:bg-futconnect-700 text-white rounded-full px-5"
            onClick={navigateToClubArea}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Área do Clube
          </Button>
          
          {/* Botão para Admin do FutConnect (administração de vendas) */}
          <Link to="/login">
            <Button className="bg-gray-700 hover:bg-gray-800 text-white rounded-full px-5">
              <Settings className="mr-2 h-4 w-4" />
              Admin Vendas
            </Button>
          </Link>
        </div>

        <div className="md:hidden">
          {!isHomePage || navLinks.length > 0 ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMobileMenu}
              className="text-gray-700"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          ) : (
            <div className="flex space-x-2">
              {/* Botão Mobile para Login no App do FutConnect (gerenciamento de clubes) */}
              <Button 
                className="bg-futconnect-600 hover:bg-futconnect-700 text-white rounded-full px-4 py-2"
                onClick={navigateToClubArea}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Clube
              </Button>
              
              {/* Botão Mobile para Admin do FutConnect (administração de vendas) */}
              <Link to="/login">
                <Button className="bg-gray-700 hover:bg-gray-800 text-white rounded-full px-4 py-2">
                  <Settings className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {isMobileMenuOpen && navLinks.length > 0 && (
        <div className="md:hidden">
          <div className="glass-card mt-2 mx-4 rounded-xl p-4 flex flex-col space-y-4 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`py-2 px-4 rounded-lg transition-colors ${
                  location.pathname === link.path 
                    ? 'bg-futconnect-100 text-futconnect-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={closeMobileMenu}
              >
                {link.name}
              </Link>
            ))}
            
            {/* Menu Mobile - Botão para Login no App do FutConnect (gerenciamento de clubes) */}
            <Button 
              className="bg-futconnect-600 hover:bg-futconnect-700 text-white w-full rounded-lg mb-2"
              onClick={navigateToClubArea}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Área do Clube
            </Button>
            
            {/* Menu Mobile - Botão para Admin do FutConnect (administração de vendas) */}
            <Link to="/login" onClick={closeMobileMenu}>
              <Button className="bg-gray-700 hover:bg-gray-800 text-white w-full rounded-lg">
                <Settings className="mr-2 h-4 w-4" />
                Admin Vendas
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
