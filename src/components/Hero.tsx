
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  
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
    <div 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-futconnect-200 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-futconnect-300 rounded-full blur-3xl opacity-20" />
      </div>

      <div className="container mx-auto px-6 md:px-12 z-10">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Left Content */}
          <div className="w-full lg:w-1/2 space-y-6 mb-12 lg:mb-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 reveal-on-scroll" style={{ animationDelay: "0.1s" }}>
              Transforme a gestão do seu 
              <span className="text-futconnect-600"> clube de futebol</span>
            </h1>
            
            <p className="text-lg text-gray-600 max-w-md reveal-on-scroll" style={{ animationDelay: "0.3s" }}>
              Simplifique o gerenciamento de jogadores, partidas e finanças com o aplicativo número 1 para clubes amadores de futebol.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 reveal-on-scroll" style={{ animationDelay: "0.5s" }}>
              <Button className="bg-futconnect-600 hover:bg-futconnect-700 text-white px-8 py-6 rounded-xl text-lg">
                Comece a usar
              </Button>
              
              <Button variant="outline" className="border-futconnect-600 text-futconnect-600 px-8 py-6 rounded-xl text-lg button-highlight">
                Ver demonstração
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 reveal-on-scroll" style={{ animationDelay: "0.7s" }}>
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"
                  />
                ))}
              </div>
              <p>
                <span className="font-medium text-futconnect-600">+1,240</span> clubes usam o FutConnect
              </p>
            </div>
          </div>
          
          {/* Right Content - App Showcase */}
          <div className="w-full lg:w-1/2 flex justify-center items-center relative">
            <div className="relative w-[280px] h-[560px] bg-black rounded-[3rem] p-4 shadow-xl border-4 border-gray-800 reveal-on-scroll" style={{ animationDelay: "0.5s" }}>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-6 bg-black rounded-b-xl" />
              <div className="w-full h-full bg-futconnect-50 rounded-[2.5rem] overflow-hidden">
                <div className="w-full h-[15%] bg-futconnect-600 flex items-center justify-center">
                  <h3 className="text-white font-bold">FutConnect App</h3>
                </div>
                <div className="p-3 space-y-3">
                  <div className="h-20 bg-white rounded-lg shadow-sm flex items-center p-3">
                    <div className="w-12 h-12 rounded-lg bg-futconnect-100 flex items-center justify-center text-futconnect-600 font-bold mr-3">
                      FC
                    </div>
                    <div>
                      <h4 className="font-medium">Próximo Jogo</h4>
                      <p className="text-xs text-gray-500">Dom, 10:00 - Campo Central</p>
                    </div>
                  </div>
                  
                  <div className="h-20 bg-white rounded-lg shadow-sm flex items-center p-3">
                    <div className="w-12 h-12 rounded-lg bg-futconnect-100 flex items-center justify-center text-futconnect-600 font-bold mr-3">
                      23
                    </div>
                    <div>
                      <h4 className="font-medium">Jogadores Ativos</h4>
                      <p className="text-xs text-gray-500">2 novas solicitações</p>
                    </div>
                  </div>
                  
                  <div className="h-20 bg-white rounded-lg shadow-sm flex items-center p-3">
                    <div className="w-12 h-12 rounded-lg bg-futconnect-100 flex items-center justify-center text-futconnect-600 font-bold mr-3">
                      R$
                    </div>
                    <div>
                      <h4 className="font-medium">Mensalidades</h4>
                      <p className="text-xs text-gray-500">18 pagamentos pendentes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-10 -right-4 w-40 h-40 glass-card rounded-xl p-4 shadow-lg rotate-6 animate-float">
              <div className="w-10 h-10 rounded-lg bg-futconnect-100 flex items-center justify-center text-futconnect-600 mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-sm">Organize Torneios</h4>
              <p className="text-xs text-gray-500">Crie e gerencie facilmente torneios para sua equipe</p>
            </div>
            
            <div className="absolute -bottom-10 -left-4 w-40 h-40 glass-card rounded-xl p-4 shadow-lg -rotate-6 animate-float" style={{ animationDelay: "1.5s" }}>
              <div className="w-10 h-10 rounded-lg bg-futconnect-100 flex items-center justify-center text-futconnect-600 mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-sm">Controle Financeiro</h4>
              <p className="text-xs text-gray-500">Gerencie mensalidades e despesas facilmente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
