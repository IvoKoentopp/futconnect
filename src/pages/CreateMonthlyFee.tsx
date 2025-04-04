
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MonthlyFeeGenerationModal } from '@/components/MonthlyFeeGenerationModal';
import { MonthlyFeeSettingsModal } from '@/components/MonthlyFeeSettingsModal';
import { generateMonthlyFees } from '@/utils/monthlyFees';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ArrowLeft, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateMonthlyFee = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Handler para gerar mensalidades
  const handleGenerateMonthlyFees = async (
    referenceMonth: Date, 
    selectedMembers?: string[]
  ): Promise<boolean> => {
    if (!user?.activeClub?.id) return false;
    
    try {
      const result = await generateMonthlyFees(user.activeClub.id, referenceMonth, selectedMembers);
      
      // Se teve sucesso ou gerou alguma mensalidade, consideramos sucesso
      if (result.success || result.count > 0) {
        toast({
          title: "Mensalidades geradas",
          description: `${result.count} mensalidades foram geradas com sucesso para sócios Contribuinte e Ativo.`,
        });
        return true;
      }
      
      // Se não gerou nenhuma mensalidade, retorna false sem mostrar erro
      // O erro será mostrado pelo modal
      return false;
    } catch (error: any) {
      // Apenas loga o erro e retorna false
      // O erro será mostrado pelo modal
      console.error("Erro ao gerar mensalidades:", error);
      return false;
    }
  };

  // Handler for settings saved
  const handleSettingsSaved = async () => {
    toast({
      title: "Configurações salvas",
      description: "As configurações de mensalidade foram salvas com sucesso."
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Link to="/monthly-fees" className="text-gray-500 hover:text-futconnect-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Gerar Mensalidades</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Crie e gerencie mensalidades para os sócios do {user?.activeClub?.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurações de Mensalidades
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-1 gap-6">
        <Card className="border-2 border-futconnect-100 hover:border-futconnect-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-futconnect-600" />
              Geração de Mensalidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 mb-4">
              Gere mensalidades para todos os sócios ativos para um mês específico. 
              Útil para a cobrança mensal regular.
            </p>
            <Button 
              className="w-full bg-futconnect-600 hover:bg-futconnect-700"
              onClick={() => setIsGenerationModalOpen(true)}
            >
              Gerar Mensalidades
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-futconnect-100 text-futconnect-600 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Configure as Mensalidades</h3>
                <p className="text-gray-500">
                  Antes de gerar mensalidades, configure os valores padrão e categorias nas configurações de mensalidades.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-futconnect-100 text-futconnect-600 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Selecione o Mês de Referência</h3>
                <p className="text-gray-500">
                  Escolha o mês para o qual deseja gerar as mensalidades. O sistema verificará se já existem mensalidades para este mês.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-futconnect-100 text-futconnect-600 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Gere as Mensalidades</h3>
                <p className="text-gray-500">
                  Após confirmar, as mensalidades serão geradas e estarão disponíveis para acompanhamento e cobrança na lista de mensalidades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Modais */}
      <MonthlyFeeGenerationModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        onGenerate={handleGenerateMonthlyFees}
        onOpenSettings={() => {
          setIsGenerationModalOpen(false);
          setIsSettingsModalOpen(true);
        }}
      />
      
      {/* Add the settings modal */}
      <MonthlyFeeSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSettingsSaved}
      />
    </div>
  );
};

export default CreateMonthlyFee;
