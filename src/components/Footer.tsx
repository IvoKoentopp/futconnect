
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin 
} from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center mb-6">
              <img 
                src="/lovable-uploads/c6c7c3c3-6543-4157-8202-b465ea229d9d.png" 
                alt="FutConnect Logo" 
                className="h-12"
              />
            </Link>
            <p className="text-gray-600 mb-6">
              Transformando a gestão de clubes amadores de futebol com tecnologia e simplicidade.
            </p>
            <div className="space-y-2">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-futconnect-600 mr-2" />
                <a href="mailto:contato@futconnect.com.br" className="text-gray-600 hover:text-futconnect-600">contato@futconnect.com.br</a>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-futconnect-600 mr-2" />
                <a href="tel:+5511999999999" className="text-gray-600 hover:text-futconnect-600">(11) 99999-9999</a>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-futconnect-600 mr-2" />
                <span className="text-gray-600">São Paulo, SP - Brasil</span>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="font-bold text-gray-900 mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              {[
                { name: 'Início', path: '/' },
                { name: 'Funcionalidades', path: '/#features' },
                { name: 'Preços', path: '/pricing' },
                { name: 'Dashboard', path: '/dashboard' },
                { name: 'Análises', path: '/analytics' },
                { name: 'Política de Privacidade', path: '/privacy' },
                { name: 'Termos de Uso', path: '/terms' },
              ].map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.path} 
                    className="text-gray-600 hover:text-futconnect-600 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Resources */}
          <div className="col-span-1">
            <h3 className="font-bold text-gray-900 mb-4">Recursos</h3>
            <ul className="space-y-2">
              {[
                { name: 'Blog', path: '/blog' },
                { name: 'Tutoriais', path: '/tutorials' },
                { name: 'FAQ', path: '/faq' },
                { name: 'Suporte', path: '/support' },
                { name: 'API Docs', path: '/api-docs' },
                { name: 'Comunidade', path: '/community' },
              ].map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.path} 
                    className="text-gray-600 hover:text-futconnect-600 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Newsletter */}
          <div className="col-span-1">
            <h3 className="font-bold text-gray-900 mb-4">Fique por dentro</h3>
            <p className="text-gray-600 mb-4">
              Inscreva-se para receber as últimas novidades, dicas e atualizações.
            </p>
            <form className="mb-4">
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Seu e-mail" 
                  className="flex-grow px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-futconnect-600 focus:border-transparent"
                />
                <button 
                  type="submit" 
                  className="bg-futconnect-600 hover:bg-futconnect-700 text-white px-4 py-2 rounded-r-lg transition-colors"
                >
                  Inscrever
                </button>
              </div>
            </form>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-futconnect-600 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-futconnect-600 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-futconnect-600 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-futconnect-600 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} FutConnect. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6">
            <Link to="/privacy" className="text-gray-500 hover:text-futconnect-600 text-sm">
              Privacidade
            </Link>
            <Link to="/terms" className="text-gray-500 hover:text-futconnect-600 text-sm">
              Termos
            </Link>
            <Link to="/cookies" className="text-gray-500 hover:text-futconnect-600 text-sm">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
