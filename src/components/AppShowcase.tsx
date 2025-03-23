
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const AppShowcase = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <section className="py-20 bg-gradient-to-b from-white to-futconnect-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left side: App screenshots */}
          <div className="w-full lg:w-1/2 relative reveal-on-scroll">
            <div className="absolute top-1/4 -left-8 w-64 h-64 bg-futconnect-100 rounded-full filter blur-3xl opacity-30" />
            <div className="absolute bottom-1/4 -right-8 w-64 h-64 bg-futconnect-200 rounded-full filter blur-3xl opacity-30" />
            
            <div className="relative flex justify-center">
              {/* Main Phone */}
              <div className="relative z-20 w-[280px] bg-black rounded-[2.5rem] p-3 shadow-xl border-4 border-gray-800">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-6 bg-black rounded-b-xl" />
                <div className="h-[560px] w-full bg-white rounded-[2rem] overflow-hidden">
                  <div className="h-[12%] bg-futconnect-600 flex items-center justify-center">
                    <h3 className="text-white font-bold">Dashboard</h3>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="rounded-lg bg-futconnect-50 p-3">
                      <h4 className="font-medium text-sm">Próximos Jogos</h4>
                      <div className="mt-3 space-y-2">
                        <div className="bg-white p-2 rounded-lg shadow-sm flex justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 mr-2" />
                            <div>
                              <p className="text-xs font-medium">vs. Real FC</p>
                              <p className="text-xs text-gray-500">Amanhã, 20:00</p>
                            </div>
                          </div>
                          <div className="bg-green-100 text-green-800 text-xs px-2 rounded flex items-center">
                            Confirmado
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-sm flex justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 mr-2" />
                            <div>
                              <p className="text-xs font-medium">vs. Santos Amadores</p>
                              <p className="text-xs text-gray-500">Sábado, 15:00</p>
                            </div>
                          </div>
                          <div className="bg-yellow-100 text-yellow-800 text-xs px-2 rounded flex items-center">
                            Pendente
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg bg-futconnect-50 p-3">
                      <h4 className="font-medium text-sm">Finanças</h4>
                      <div className="mt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <p className="text-xs text-gray-500">Recebido</p>
                            <p className="text-sm font-bold text-green-600">R$ 1.200</p>
                          </div>
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <p className="text-xs text-gray-500">Pendente</p>
                            <p className="text-sm font-bold text-amber-600">R$ 450</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg bg-futconnect-50 p-3">
                      <h4 className="font-medium text-sm">Jogadores</h4>
                      <div className="mt-3 flex -space-x-2 overflow-hidden">
                        {[...Array(8)].map((_, i) => (
                          <div 
                            key={i} 
                            className="inline-block w-8 h-8 rounded-full border-2 border-white bg-gray-200"
                          />
                        ))}
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-futconnect-100 text-futconnect-600 text-xs font-bold">
                          +12
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Secondary Phone (behind and to the left) */}
              <div className="absolute bottom-4 -left-20 z-10 w-[240px] h-[480px] bg-black rounded-[2rem] p-3 shadow-xl border-4 border-gray-800 transform -rotate-12">
                <div className="w-full h-full bg-white rounded-[1.75rem] overflow-hidden">
                  <div className="h-[12%] bg-futconnect-400 flex items-center justify-center">
                    <h3 className="text-white font-medium text-sm">Mensalidades</h3>
                  </div>
                  <div className="bg-futconnect-50 h-[88%]" />
                </div>
              </div>
              
              {/* Tertiary Phone (behind and to the right) */}
              <div className="absolute bottom-4 -right-20 z-10 w-[240px] h-[480px] bg-black rounded-[2rem] p-3 shadow-xl border-4 border-gray-800 transform rotate-12">
                <div className="w-full h-full bg-white rounded-[1.75rem] overflow-hidden">
                  <div className="h-[12%] bg-futconnect-500 flex items-center justify-center">
                    <h3 className="text-white font-medium text-sm">Escalação</h3>
                  </div>
                  <div className="bg-futconnect-50 h-[88%]" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side: Content */}
          <div className="w-full lg:w-1/2 reveal-on-scroll">
            <div className="px-4 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Gerencie Seu Clube com Facilidade, Direto do Celular
              </h2>
              
              <p className="text-lg text-gray-600">
                O FutConnect oferece uma experiência completa para a gestão de clubes amadores
                de futebol, com aplicativo disponível para iOS e Android, permitindo acesso
                a todas as funcionalidades de qualquer lugar.
              </p>
              
              <ul className="space-y-4 mt-6">
                {[
                  { title: "Interface Intuitiva", description: "Design simples que facilita a navegação e uso por todos os membros do clube." },
                  { title: "Notificações em Tempo Real", description: "Receba alertas importantes sobre jogos, pagamentos e mensagens da equipe." },
                  { title: "Acesso Offline", description: "Continue gerenciando seu clube mesmo sem conexão com a internet." },
                  { title: "Sincronização com a Nuvem", description: "Todos os dados são sincronizados automaticamente entre dispositivos." },
                ].map((item, idx) => (
                  <li key={idx} className="flex">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-futconnect-100 text-futconnect-600 flex items-center justify-center mr-3">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Button className="bg-futconnect-600 hover:bg-futconnect-700 text-white rounded-xl px-8 py-6">
                  Baixar para iOS
                </Button>
                <Button variant="outline" className="border-futconnect-600 text-futconnect-600 rounded-xl px-8 py-6 button-highlight">
                  Baixar para Android
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;
