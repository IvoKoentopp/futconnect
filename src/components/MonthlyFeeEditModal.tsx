
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MonthlyFee } from '@/types/monthlyFee';
import { DateInput } from '@/components/ui/date-input';

interface MonthlyFeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: MonthlyFee | null;
  onSave: (updatedFee: MonthlyFee) => void;
}

export function MonthlyFeeEditModal({ 
  isOpen, 
  onClose, 
  fee,
  onSave
}: MonthlyFeeEditModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  
  // Reset form and populate with fee data when modal is opened
  useEffect(() => {
    if (isOpen && fee) {
      setAmount(fee.amount);
      
      // Parse date without timezone issues
      if (fee.dueDate) {
        const [year, month, day] = fee.dueDate.split('T')[0].split('-').map(Number);
        // Create date with the exact day without timezone adjustments
        const dueDateObj = new Date(Date.UTC(year, month - 1, day));
        setDueDate(dueDateObj);
      } else {
        setDueDate(new Date());
      }
    }
  }, [isOpen, fee]);

  const handleSave = () => {
    if (fee && dueDate) {
      // Format the date as YYYY-MM-DDT00:00:00.000Z
      const year = dueDate.getUTCFullYear();
      const month = String(dueDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dueDate.getUTCDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}T00:00:00.000Z`;
      
      const updatedFee: MonthlyFee = {
        ...fee,
        amount,
        dueDate: dateString
      };
      onSave(updatedFee);
      onClose();
    }
  };

  // Format reference month
  const formatReferenceMonth = (dateString: string) => {
    if (!dateString) return '';
    
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    
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
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="confirm"
            onClick={handleSave}
            disabled={!dueDate || amount <= 0}
          >
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
