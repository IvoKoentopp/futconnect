import React, { useState, useEffect } from 'react';
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MonthlyFee } from '@/types/monthlyFee';
import { DateInput } from '@/components/ui/date-input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';

interface MonthlyFeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: MonthlyFee | null;
  onSave: (updatedFee: MonthlyFee) => Promise<boolean>;
}

export function MonthlyFeeEditModal({ 
  isOpen, 
  onClose, 
  fee,
  onSave
}: MonthlyFeeEditModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
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
            description: "Você não tem permissão para editar mensalidades.",
          });
          onClose();
        }
      }
    };
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen, user?.activeClub?.id, isClubAdmin, onClose, toast]);

  useEffect(() => {
    if (isOpen && fee) {
      setAmount(fee.amount);
      
      // Converter YYYY-MM-DD para Date sem considerar timezone
      if (fee.dueDate) {
        const [year, month, day] = fee.dueDate.split('T')[0].split('-').map(Number);
        const dueDateObj = new Date(year, month - 1, day);
        setDueDate(dueDateObj);
      } else {
        setDueDate(new Date());
      }
    }
  }, [isOpen, fee]);

  const handleSubmit = async () => {
    if (!fee || !dueDate) return;
    
    setIsSubmitting(true);
    try {
      // Formatar a data como YYYY-MM-DD
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, '0');
      const day = String(dueDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const updatedFee: MonthlyFee = {
        ...fee,
        amount,
        dueDate: dateString
      };
      
      const success = await onSave(updatedFee);
      
      if (success) {
        toast({
          title: "Mensalidade atualizada",
          description: "A mensalidade foi atualizada com sucesso.",
        });
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar",
          description: "Tente novamente mais tarde.",
        });
      }
    } catch (error) {
      console.error('Error updating monthly fee:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format reference month
  const formatReferenceMonth = (dateString: string) => {
    if (!dateString) return '';
    
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  if (!fee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Ensure we're using the parent's close function to properly clean up state
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Mensalidade</DialogTitle>
          <DialogDescription>
            Altere os dados da mensalidade de {fee.memberName} referente a {formatReferenceMonth(fee.referenceMonth)}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dueDate">Data de Vencimento</Label>
            <DateInput
              value={dueDate}
              onChange={(newDate) => setDueDate(newDate)}
              placeholder="Selecione a data de vencimento"
            />
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 justify-end">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </DialogClose>
          <Button 
            variant="confirm"
            onClick={handleSubmit}
            disabled={isSubmitting || !dueDate || amount <= 0}
          >
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
