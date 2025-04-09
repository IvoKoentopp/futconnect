
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Users, Calendar, Trophy, CreditCard, Settings, HelpCircle } from 'lucide-react';

const UserGuide = () => {
  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Manual do Administrador</h1>
        <p className="text-muted-foreground">
          Guia completo para configuração e utilização do FutConnect
        </p>
      </div>

      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
          <TabsTrigger value="getting-started">Primeiros Passos</TabsTrigger>
          <TabsTrigger value="club-management">Gestão do Clube</TabsTrigger>
          <TabsTrigger value="games">Jogos</TabsTrigger>
          <TabsTrigger value="finances">Finanças</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Primeiros Passos */}
        <TabsContent value="getting-started">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-futconnect-600" />
                Primeiros Passos
              </CardTitle>
              <CardDescription>
                Aprenda o básico para começar a utilizar o FutConnect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Bem-vindo ao FutConnect</h3>
                <p>
                  O FutConnect é uma plataforma completa para gestão de clubes e peladas de futebol.
                  Este guia irá ajudá-lo a configurar seu clube e começar a utilizar todas as
                  funcionalidades disponíveis.
                </p>
                
                <Accordion type="single" collapsible className="mt-4">
                  <AccordionItem value="login">
                    <AccordionTrigger className="text-lg font-medium">1. Login e Acesso</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>Para acessar o sistema, use o e-mail e senha cadastrados durante a criação do seu clube.</p>
                      <p>Existem dois tipos de login:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>
                          <strong>Login de Administrador:</strong> Acesso à gestão completa do clube, incluindo configurações, 
                          finanças e relatórios.
                        </li>
                        <li>
                          <strong>Login de Sócio:</strong> Acesso total para visualização das informações do clube e manutenção do seu cadastro.
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="dashboard">
                    <AccordionTrigger className="text-lg font-medium">2. Dashboard Inicial</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>
                        Ao fazer login, você será direcionado para o Dashboard do Clube, onde encontrará
                        um resumo das principais informações:
                      </p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Jogadores Destaques</li>
                        <li>Resumo financeiro (mensalidades pendentes)</li>
                        <li>Estatísticas gerais do clube</li>
                        <li>Aniversariantes do mês</li>
                      </ul>
                      <p>
                        Use o menu superior para navegar entre as diferentes seções do sistema.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="menu">
                    <AccordionTrigger className="text-lg font-medium">3. Navegação pelo Menu</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>O menu lateral está organizado nas seguintes seções:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>
                          <strong>Dashboard:</strong> Visão geral das atividades do clube
                        </li>
                        <li>
                          <strong>Documentos:</strong> Principais informações do Clube (estatuto, hino, convite)
                        </li>
			<li>
                          <strong>Sócios:</strong> Gestão de sócios (cadastro, edição, relatórios)
                        </li>
                        <li>
                          <strong>Jogos:</strong> Agendamento, confirmações, estatísticas e destaques
                        </li>
                        <li>
                          <strong>Finanças:</strong> Mensalidades, lançamentos, relatórios financeiros
                        </li>
                        <li>
                          <strong>Configurações:</strong> Configurações gerais do clube
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestão do Clube */}
        <TabsContent value="club-management">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-futconnect-600" />
                Gestão do Clube
              </CardTitle>
              <CardDescription>
                Gerenciamento de sócios e configurações do clube
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="members">
                  <AccordionTrigger className="text-lg font-medium">Cadastro de Sócios</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para cadastrar novos sócios, siga os passos:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Sócios" e clique em "Novo Sócio"</li>
                      <li>Preencha os dados básicos (nome, email, telefone, data de nascimento)</li>
                      <li>Defina as posições que o sócio joga</li>
                      <li>Selecione a categoria do sócio (Contribuinte, Convidado, Colaborador)</li>
                      <li>Clique em "Salvar" para concluir o cadastro</li>
                    </ol>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Os sócios cadastrados poderão acessar o Portal do Sócio usando o e-mail e senha definidos.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="list-members">
                  <AccordionTrigger className="text-lg font-medium">Lista de Sócios</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Na lista de sócios você pode:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Visualizar todos os sócios cadastrados</li>
                      <li>Filtrar por nome, categoria ou status</li>
                      <li>Editar dados de um sócio existente</li>
                      <li>Inativar ou reativar sócios</li>
                      <li>Alterar senha</li>
                      <li>Deletar o sócio</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="statistics">
                  <AccordionTrigger className="text-lg font-medium">Estatísticas de Sócios</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>
                      Na seção de estatísticas, você pode analisar dados importantes sobre os sócios:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Percentual de confirmação em jogos</li>
                      <li>Frequência de participação</li>
                      <li>Distribuição por categoria</li>
                      <li>Gráficos de assiduidade</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Estas informações são úteis para entender o engajamento dos sócios e 
                      planejar ações para aumentar a participação.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jogos */}
        <TabsContent value="games">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-futconnect-600" />
                Jogos
              </CardTitle>
              <CardDescription>
                Gerenciamento de jogos, convocações e estatísticas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="game-schedule">
                  <AccordionTrigger className="text-lg font-medium">Agendamento de Jogos</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para agendar um novo jogo:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Jogos" e clique em "Novo Jogo"</li>
                      <li>Preencha os dados do jogo (título, data, horário, local)</li>
                      <li>Clique em "Salvar" para criar o jogo</li>
                    </ol>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Após a criação, um link de confirmação será gerado e poderá ser compartilhado com os sócios.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="game-panel">
                  <AccordionTrigger className="text-lg font-medium">Painel de Jogos</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>No painel de jogos, você pode:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Visualizar a lista de jogos agendados e realizados</li>
                      <li>Monitorar confirmações de presença</li>
                      <li>Gerar times</li>
                      <li>Registrar eventos do jogo (gols, defesas, etc.)</li>
                      <li>Finalizar jogos e atualizar o placar</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Após finalizar um jogo, ele ficará disponível para votação de destaque e geração de estatísticas.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="game-statistics">
                  <AccordionTrigger className="text-lg font-medium">Estatísticas de Jogos</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Na seção de estatísticas, você encontra:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Desempenho das equipes</li>
                      <li>Ranking de jogadores</li>
                      <li>Ranking de participação</li>
                      <li>Destaques das partidas</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      As estatísticas são atualizadas automaticamente após a finalização de cada jogo.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="game-highlights">
                  <AccordionTrigger className="text-lg font-medium">Destaques das Partidas</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para gerenciar os destaques:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Jogos" e clique em "Destaques"</li>
                      <li>Selecione um jogo finalizado para votar ou ver resultados</li>
                      <li>Os sócios podem votar uma vez por jogo no destaque</li>
                      <li>Em caso de empate, o jogador mais velho é definido como destaque</li>
                      <li>Os resultados são exibidos na página de destaques e no perfil dos jogadores</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finanças */}
        <TabsContent value="finances">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-futconnect-600" />
                Finanças
              </CardTitle>
              <CardDescription>
                Gestão financeira, mensalidades e relatórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="monthly-fees">
                  <AccordionTrigger className="text-lg font-medium">Mensalidades</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para configurar mensalidades:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Finanças" e clique em "Mensalidades"</li>
                      <li>Clique em "Configurações" para definir valores por categoria</li>
                      <li>Configure o dia de vencimento e a categoria do plano de contas</li>
                      <li>Salve as configurações</li>
                    </ol>
                    <p className="mt-2">Para gerar mensalidades:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Clique em "Nova Mensalidade"</li>
                      <li>Selecione o mês de referência</li>
                      <li>Escolha os sócios para os quais deseja gerar</li>
                      <li>Confirme a geração das mensalidades</li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-2">
                      As mensalidades são geradas automaticamente com base nas configurações definidas.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bank-accounts">
                  <AccordionTrigger className="text-lg font-medium">Contas Bancárias</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para gerenciar contas bancárias:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Finanças" e clique em "Contas Bancárias"</li>
                      <li>Cadastre as contas do clube (banco, agência, número)</li>
                      <li>Defina o saldo inicial de cada conta</li>
                      <li>As contas serão utilizadas para registro de transações</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="chart-accounts">
                  <AccordionTrigger className="text-lg font-medium">Plano de Contas</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para configurar o plano de contas:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Finanças" e clique em "Plano de Contas"</li>
                      <li>Cadastre categorias para receitas e despesas</li>
                      <li>Organize as categorias por grupos (administrativas, operacionais, etc.)</li>
                      <li>As categorias serão utilizadas nos lançamentos financeiros</li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-2">
                      Um plano de contas bem estruturado facilita a geração de relatórios financeiros.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="transactions">
                  <AccordionTrigger className="text-lg font-medium">Lançamentos Financeiros</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para registrar transações:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Finanças" e clique em "Financeiro"</li>
                      <li>Clique em "Novo Lançamento"</li>
                      <li>Selecione o tipo (receita ou despesa)</li>
                      <li>Preencha os dados da transação (valor, data, categoria, conta)</li>
                      <li>Confirme o lançamento</li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-2">
                      Os lançamentos atualizam automaticamente o saldo das contas bancárias.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="reports">
                  <AccordionTrigger className="text-lg font-medium">Relatórios Financeiros</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para gerar relatórios:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Finanças" e clique em "Demonstrativo"</li>
                      <li>Selecione o período desejado</li>
                      <li>Filtre por categorias ou contas (opcional)</li>
                      <li>Visualize gráficos e tabelas com o resumo financeiro</li>
                      <li>Exporte os relatórios em PDF (opcional)</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="settings">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-futconnect-600" />
                Configurações
              </CardTitle>
              <CardDescription>
                Configurações gerais do clube e do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="club-settings">
                  <AccordionTrigger className="text-lg font-medium">Configurações do Clube</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para configurar informações básicas do clube:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Configurações"</li>
                      <li>Preencha as informações básicas (nome, descrição)</li>
                      <li>Faça upload do logo do clube</li>
                      <li>Configure documentos como estatuto e hino (opcional)</li>
                      <li>Configure modelos de convite para novos sócios</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="team-configuration">
                  <AccordionTrigger className="text-lg font-medium">Configuração de Times</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para configurar times para os jogos:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Configurações"</li>
                      <li>Vá até a seção "Configuração de Times"</li>
                      <li>Adicione novos times definindo nome e cor</li>
                      <li>Estes times serão utilizados na formação automática durante os jogos</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="admin-settings">
                  <AccordionTrigger className="text-lg font-medium">Administradores do Clube</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Para gerenciar administradores:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Acesse o menu "Configurações"</li>
                      <li>Vá até a seção "Administradores do Clube"</li>
                      <li>Adicione novos administradores selecionando um sócio existente</li>
                      <li>Os administradores terão acesso completo à gestão do clube</li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-2">
                      É recomendável ter pelo menos dois administradores por clube.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Precisa de mais ajuda?</h3>
        <p className="text-blue-600">
          Se você precisar de suporte adicional ou tiver dúvidas sobre como utilizar o FutConnect,
          entre em contato com nossa equipe de suporte através do e-mail support@futconnect.com
          ou pelo WhatsApp (11) 99999-9999.
        </p>
      </div>
    </div>
  );
};

export default UserGuide;
