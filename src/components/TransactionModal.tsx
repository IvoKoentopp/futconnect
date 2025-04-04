import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  AlertCircleIcon, 
  ArrowUpIcon, 
  ArrowDownIcon
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Transaction, TransactionType, PaymentMethod, TransactionStatus } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { DateInput } from '@/components/ui/date-input';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: () => void;
  transactionToEdit?: Transaction | null;
  bankAccounts: {id: string, name: string}[];
  chartOfAccounts: {id: string, description: string}[];
}

export function TransactionModal({ 
  isOpen, 
  onClose,
  onTransactionCreated,
  transactionToEdit,
  bankAccounts,
  chartOfAccounts
}: TransactionModalProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<TransactionType>('income');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [beneficiary, setBeneficiary] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { isClubAdmin } = useAuthorization();

  useEffect(() => {
    const checkPermissions = async () => {
      if (user?.activeClub?.id) {
        const hasPermission = await isClubAdmin(user.activeClub.id);
        if (!hasPermission) {
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Você não tem permissão para gerenciar transações.",
          });
          onClose();
        }
      }
    };
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen, user?.activeClub?.id, isClubAdmin, onClose, toast]);


  // Load transaction data if editing
  useEffect(() => {
    if (transactionToEdit && isOpen) {
      // Verificar se a transação pertence ao clube atual
      if (transactionToEdit.club_id !== user?.activeClub?.id) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Esta transação não pertence ao clube selecionado.",
        });
        onClose();
        return;
      }
      setType(transactionToEdit.type);
      setDescription(transactionToEdit.description);
      setAmount(transactionToEdit.amount.toString());
      setCategory(transactionToEdit.category);
      setPaymentMethod(transactionToEdit.paymentMethod);
      setBeneficiary(transactionToEdit.beneficiary);
      setBankAccountId(transactionToEdit.bankAccountId);
      setStatus(transactionToEdit.status);
      
      if (transactionToEdit.date) {
        // Parse date string directly without timezone conversion
        const dateStr = transactionToEdit.date;
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
        setDate(new Date(year, month - 1, day));
      }
    } else if (isOpen) {
      // Reset form when opening for new transaction
      resetForm();
    }
  }, [transactionToEdit, isOpen]);

  // Reset form when opening for new transaction or closing
  useEffect(() => {
    if (isOpen && !transactionToEdit) {
      resetForm();
    }
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, transactionToEdit]);

  const resetForm = () => {
    setType('income');
    setDescription('');
    setAmount('');
    setCategory('');
    setPaymentMethod('pix');
    setBeneficiary('');
    setBankAccountId('');
    setStatus('completed');
    setDate(new Date());
    setError(null);
    
    // Força limpeza do DOM para garantir que não há sugestões
    const descriptionInput = document.getElementById('description') as HTMLInputElement;
    const beneficiaryInput = document.getElementById('beneficiary') as HTMLInputElement;
    if (descriptionInput) {
      descriptionInput.value = '';
      descriptionInput.setAttribute('autocomplete', 'off');
    }
    if (beneficiaryInput) {
      beneficiaryInput.value = '';
      beneficiaryInput.setAttribute('autocomplete', 'off');
    }
  };

  const handleSubmit = async () => {
    if (!user?.activeClub?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um clube antes de realizar esta operação.",
      });
      return;
    }
    
    // Validate inputs
    if (!description || !amount || !category || !bankAccountId) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T00:00:00.000Z`;
      
      const parsedAmount = parseFloat(amount.replace(',', '.'));
      
      if (isNaN(parsedAmount)) {
        throw new Error("Valor inválido");
      }
      
      // Prepare data with proper date format
      const transactionData = {
        type,
        description,
        amount: parsedAmount,
        date: formattedDate, // Use standardized format
        category,
        payment_method: paymentMethod,
        status,
        beneficiary,
        bank_account_id: bankAccountId,
        club_id: user.activeClub.id
      };
      
      if (transactionToEdit) {
        // Update existing transaction
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionToEdit.id);
        
        if (error) throw error;
        
        toast({
          title: "Transação atualizada",
          description: "A transação foi atualizada com sucesso.",
        });
      } else {
        // Create new transaction
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);
        
        if (error) throw error;
        
        toast({
          title: "Transação criada",
          description: "A transação foi criada com sucesso.",
        });
      }
      
      // Reset form and close modal
      resetForm();
      onClose();
      
      // Notify parent about the update
      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (error: any) {
      console.error("Erro ao processar transação:", error);
      setError(error.message || "Não foi possível processar a transação.");
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível processar a transação.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {transactionToEdit ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
          <DialogDescription>
            {transactionToEdit ? 
              "Edite os detalhes da transação selecionada." : 
              "Preencha os detalhes para criar uma nova transação."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <p>Carregando dados...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={type} onValueChange={(value: TransactionType) => setType(value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="income">
                        <div className="flex items-center">
                          <ArrowUpIcon className="mr-2 h-4 w-4 text-green-600" />
                          Receita
                        </div>
                      </SelectItem>
                      <SelectItem value="expense">
                        <div className="flex items-center">
                          <ArrowDownIcon className="mr-2 h-4 w-4 text-red-600" />
                          Despesa
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="date">Data</Label>
                  <DateInput
                    value={date}
                    onChange={(newDate) => newDate && setDate(newDate)}
                    placeholder="Selecione a data"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="bankAccount">Conta Bancária</Label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger id="bankAccount">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {chartOfAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.description}>
                          {account.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pagamento de aluguel"
                  autoComplete="off"
                  key="description-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    type="text"
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="beneficiary">Favorecido</Label>
                  <Input
                    id="beneficiary"
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    placeholder="Ex: Fornecedor XYZ"
                    autoComplete="off"
                    key="beneficiary-input"
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: TransactionStatus) => setStatus(value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                  <AlertCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
        
        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="confirm"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting 
              ? "Processando..." 
              : transactionToEdit 
                ? "Atualizar Transação" 
                : "Criar Transação"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
