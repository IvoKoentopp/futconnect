
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Trophy, 
  MessageSquare, 
  BarChart 
} from 'lucide-react';

const features = [
  {
    id: "gerenciamento",
    title: "Gerenciamento de Jogadores",
    icon: <Users className="h-6 w-6 text-futconnect-600" />,
    description: "Organize informações detalhadas de todos os membros do clube, incluindo histórico de pagamentos, presença e estatísticas de jogo.",
    benefits: [
      "Perfis completos para cada jogador",
      "Controle de presença automatizado",
      "Estatísticas de desempenho individual",
      "Sistema de pontuação por participação"
    ],
    image: "/placeholder.svg"
  },
  {
    id: "agendamento",
    title: "Agendamento de Partidas",
    icon: <Calendar className="h-6 w-6 text-futconnect-600" />,
    description: "Crie, agende e gerencie partidas e treinamentos. Notifique automaticamente os jogadores e acompanhe presenças confirmadas.",
    benefits: [
      "Calendário integrado de eventos",
      "Confirmação de presença automatizada",
      "Lembretes por notificação push",
      "Gestão de campos e horários"
    ],
    image: "/placeholder.svg"
  },
  {
    id: "financeiro",
    title: "Controle Financeiro",
    icon: <DollarSign className="h-6 w-6 text-futconnect-600" />,
    description: "Gerencie mensalidades, controle despesas e receitas, e gere relatórios financeiros detalhados para transparência total.",
    benefits: [
      "Registro automático de mensalidades",
      "Notificações de pagamentos pendentes",
      "Relatórios financeiros detalhados",
      "Integração com métodos de pagamento"
    ],
    image: "/placeholder.svg"
  },
  {
    id: "torneios",
    title: "Organização de Torneios",
    icon: <Trophy className="h-6 w-6 text-futconnect-600" />,
    description: "Crie e gerencie torneios completos, com tabelas automatizadas, chaveamentos e estatísticas em tempo real.",
    benefits: [
      "Criação de tabelas automáticas",
      "Sistema de pontuação personalizado",
      "Estatísticas de artilharia e assistências",
      "Gerenciamento de múltiplas equipes"
    ],
    image: "/placeholder.svg"
  },
  {
    id: "comunicacao",
    title: "Comunicação Integrada",
    icon: <MessageSquare className="h-6 w-6 text-futconnect-600" />,
    description: "Comunique-se diretamente com jogadores, crie grupos de discussão e compartilhe informações importantes instantaneamente.",
    benefits: [
      "Chat em grupo para cada equipe",
      "Anúncios e notificações importantes",
      "Compartilhamento de mídia e arquivos",
      "Enquetes e votações integradas"
    ],
    image: "/placeholder.svg"
  },
  {
    id: "analytics",
    title: "Análise de Desempenho",
    icon: <BarChart className="h-6 w-6 text-futconnect-600" />,
    description: "Acompanhe estatísticas detalhadas de jogadores e equipes, identificando pontos fortes e áreas para desenvolvimento.",
    benefits: [
      "Estatísticas individuais detalhadas",
      "Análise de desempenho coletivo",
      "Gráficos e relatórios personalizados",
      "Comparativo histórico de performance"
    ],
    image: "/placeholder.svg"
  }
];

const Features = () => {
  const [activeTab, setActiveTab] = useState("gerenciamento");
  
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
    <section id="features" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 reveal-on-scroll">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Funcionalidades Completas para o Seu Clube
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            O FutConnect oferece todas as ferramentas necessárias para transformar a 
            gestão do seu clube amador em uma experiência profissional e sem complicações.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="gerenciamento" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-center mb-8 reveal-on-scroll">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 bg-gray-100 p-1 rounded-xl">
                {features.map((feature) => (
                  <TabsTrigger 
                    key={feature.id} 
                    value={feature.id}
                    className="px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-futconnect-600"
                  >
                    <span className="hidden md:block">{feature.icon}</span>
                    <span className="text-xs md:text-sm whitespace-nowrap">{feature.title.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {features.map((feature) => (
              <TabsContent key={feature.id} value={feature.id} className="mt-2">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1 reveal-on-scroll">
                    <div className="flex items-center mb-4">
                      {feature.icon}
                      <h3 className="text-2xl font-bold ml-2">{feature.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-6">{feature.description}</p>
                    
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start">
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-futconnect-100 text-futconnect-600 flex items-center justify-center mr-3">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="order-1 md:order-2 reveal-on-scroll">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-futconnect-50 to-futconnect-100 p-8 flex items-center justify-center">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-futconnect-200 rounded-full blur-2xl opacity-50" />
                      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-futconnect-300 rounded-full blur-2xl opacity-30" />
                      
                      <div className="relative z-10 w-full max-w-[300px] h-[500px] border-8 border-white rounded-[2rem] shadow-xl bg-white overflow-hidden">
                        {/* Mock phone UI */}
                        <div className="w-full h-[12%] bg-futconnect-600 flex items-center justify-center">
                          <h4 className="text-white font-medium">FutConnect</h4>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="w-full h-10 bg-gray-100 rounded-lg flex items-center px-3">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="text-xs text-gray-400">Pesquisar...</span>
                          </div>
                          
                          <div className="w-full h-16 bg-white border border-gray-200 rounded-lg flex items-center p-3">
                            <div className="w-10 h-10 rounded-lg bg-futconnect-100 flex items-center justify-center text-futconnect-600 font-bold mr-3">
                              {feature.icon}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{feature.title}</h4>
                              <p className="text-xs text-gray-500">Clique para gerenciar</p>
                            </div>
                          </div>
                          
                          {[1, 2, 3].map((_, idx) => (
                            <div key={idx} className="w-full h-16 bg-white border border-gray-200 rounded-lg flex items-center p-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 mr-3" />
                              <div className="space-y-1">
                                <div className="h-2 w-24 bg-gray-200 rounded-full" />
                                <div className="h-2 w-16 bg-gray-100 rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default Features;
