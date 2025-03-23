
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: string;
  billingPeriod: string;
}

// Estrutura para armazenar dados do formulário
interface FormData {
  name: string;
  email: string;
  clubName: string;
  password: string;
}

const SubscriptionModal = ({ 
  isOpen, 
  onClose, 
  planName, 
  planPrice,
  billingPeriod
}: SubscriptionModalProps) => {
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Estado para armazenar os dados do formulário
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    clubName: '',
    password: ''
  });
  
  // Manipular as mudanças nos campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  const handleNext = () => {
    if (step === 'details') {
      // Validação básica dos campos
      if (!formData.name || !formData.email || !formData.clubName || !formData.password) {
        toast({
          variant: "destructive",
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos para continuar.",
        });
        return;
      }
      
      // Se os dados estiverem preenchidos, prosseguir para o pagamento
      setStep('payment');
    } else if (step === 'payment') {
      setIsLoading(true);
      
      // Simular processamento de pagamento e criação do clube
      setTimeout(() => {
        // Simular criação do clube e administrador no banco de dados
        const newClub = {
          id: `club-${Date.now()}`,
          name: formData.clubName,
          plan: planName,
          adminEmail: formData.email,
          adminName: formData.name,
          createdAt: new Date().toISOString()
        };
        
        // Aqui seria o local para salvar no banco de dados real
        // Como exemplo, vamos salvar no localStorage para demonstração
        const clubs = JSON.parse(localStorage.getItem('futconnect_clubs') || '[]');
        clubs.push(newClub);
        localStorage.setItem('futconnect_clubs', JSON.stringify(clubs));
        
        // Criar um usuário administrador automaticamente
        const adminUser = {
          email: formData.email,
          name: formData.name,
          role: 'admin',
          clubs: [
            {
              id: newClub.id,
              name: formData.clubName, 
              isAdmin: true
            }
          ],
          activeClub: {
            id: newClub.id,
            name: formData.clubName,
            isAdmin: true
          }
        };
        
        // Salvar no localStorage (em produção seria no banco de dados)
        localStorage.setItem('futconnect_user_' + formData.email, JSON.stringify({
          ...adminUser,
          password: formData.password // NUNCA fazer isso em produção, apenas para demonstração
        }));
        
        setIsLoading(false);
        setStep('confirmation');
        
        toast({
          title: "Assinatura realizada!",
          description: `Sua assinatura do plano ${planName} foi confirmada e seu clube foi criado.`,
        });
      }, 2000);
    } else if (step === 'confirmation') {
      // Redirecionar para o login
      onClose();
      navigate('/login');
      setStep('details'); // Reset para próxima abertura
      
      // Limpar o formulário
      setFormData({
        name: '',
        email: '',
        clubName: '',
        password: ''
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          {step === 'details' && (
            <>
              <DialogTitle>Assinar plano {planName}</DialogTitle>
              <DialogDescription>
                {billingPeriod === 'monthly' 
                  ? `Cobrança mensal de ${planPrice}.` 
                  : `Cobrança anual com desconto.`}
              </DialogDescription>
            </>
          )}
          
          {step === 'payment' && (
            <>
              <DialogTitle>Dados de pagamento</DialogTitle>
              <DialogDescription>
                Informe os dados do seu cartão para finalizar a assinatura.
              </DialogDescription>
            </>
          )}
          
          {step === 'confirmation' && (
            <>
              <DialogTitle>Assinatura confirmada!</DialogTitle>
              <DialogDescription>
                Seu plano {planName} foi ativado com sucesso.
              </DialogDescription>
            </>
          )}
        </DialogHeader>
        
        {step === 'details' && (
          <div className="py-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input 
                  id="name" 
                  placeholder="Seu nome completo" 
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clubName">Nome do clube</Label>
                <Input 
                  id="clubName" 
                  placeholder="Nome do seu clube" 
                  value={formData.clubName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Crie uma senha segura" 
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        )}
        
        {step === 'payment' && (
          <div className="py-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="card-number">Número do cartão</Label>
                <Input id="card-number" placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expiry">Validade</Label>
                  <Input id="expiry" placeholder="MM/AA" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="card-name">Nome no cartão</Label>
                <Input id="card-name" placeholder="Nome no cartão" />
              </div>
            </div>
          </div>
        )}
        
        {step === 'confirmation' && (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-medium">Parabéns! Seu clube foi criado.</p>
            <p className="text-sm text-gray-500 mt-2">
              Você agora tem acesso a todos os recursos do plano {planName}.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Use o email e senha cadastrados para acessar sua conta.
            </p>
          </div>
        )}
        
        <DialogFooter>
          {step === 'details' && (
            <Button onClick={handleNext}>Continuar para pagamento</Button>
          )}
          
          {step === 'payment' && (
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Confirmar pagamento
                </>
              )}
            </Button>
          )}
          
          {step === 'confirmation' && (
            <Button onClick={handleNext}>Ir para login</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
