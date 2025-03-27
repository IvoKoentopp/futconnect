import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthlyFee, MonthlyFeePaymentMethod } from '@/types/monthlyFee';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthorization } from '@/hooks/useAuthorization';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BankAccount {
  id: string;
  bank: string;
  branch: string;
}

interface MonthlyFeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: MonthlyFee | null;
  onRecordPayment: (feeId: string, paymentDate: string, paymentMethod: MonthlyFeePaymentMethod, bankAccountId: string) => void;
}

export function MonthlyFeePaymentModal({ 
  isOpen, 
  onClose, 
  fee,
  onRecordPayment
}: MonthlyFeePaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<MonthlyFeePaymentMethod>('pix');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isClubAdmin } = useAuthorization();

  useEffect(() => {
    const checkPermissions = async () => {
      if (user?.activeClub?.id) {
        const hasPermission = await isClubAdmin(user.activeClub.id);
        if (!hasPermission) {
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Você não tem permissão para registrar pagamentos.",
          });
          onClose();
        }
      }
    };
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen, user?.activeClub?.id, isClubAdmin, onClose, toast]);

  // Fetch bank accounts when modal is opened
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!user?.activeClub?.id || !isOpen) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('bank_accounts')
          .select('id, bank, branch')
          .eq('club_id', user.activeClub.id);
        
        if (error) {
          throw error;
        }
        
        setBankAccounts(data || []);
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as contas bancárias",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBankAccounts();
  }, [user?.activeClub?.id, isOpen, toast]);

  const handleRecordPayment = () => {
    if (fee && paymentDate && bankAccountId) {
      onRecordPayment(
        fee.id, 
        paymentDate.toISOString().split('T')[0], 
        paymentMethod,
        bankAccountId
      );
      onClose();
    }
  };

  // Format reference month
  const formatReferenceMonth = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date());
      setBankAccountId('');
      setPaymentMethod('pix');
    }
  }, [isOpen]);

  // Format bank account name for display
  const formatBankAccountName = (bank: string, branch: string) => {
    return `${bank} - Ag. ${branch}`;
  };

  if (!fee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Informe a data de pagamento e conta bancária para a mensalidade de {fee.memberName} referente a {formatReferenceMonth(fee.referenceMonth)}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentDate">Data de Pagamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="paymentDate"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? (
                    format(paymentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione a data de pagamento</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
            <Select 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as MonthlyFeePaymentMethod)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="debit_card">Cartão de Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bankAccount">Conta Bancária</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Carregando contas bancárias...</span>
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-sm text-red-500 py-2">
                Nenhuma conta bancária cadastrada. Cadastre uma conta bancária no menu Finanças.
              </div>
            ) : (
              <Select 
                value={bankAccountId} 
                onValueChange={setBankAccountId}
              >
                <SelectTrigger id="bankAccount">
                  <SelectValue placeholder="Selecione uma conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {formatBankAccountName(account.bank, account.branch)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="confirm"
            onClick={handleRecordPayment}
            disabled={!paymentDate || !bankAccountId || isLoading || bankAccounts.length === 0 || isSubmitting}
          >
            Registrar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
