
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from '@/components/ui/date-input';
import { Input } from '@/components/ui/input';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { BankAccount, ChartOfAccount, TransactionType } from '@/types/transaction';

interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  bankAccountId?: string;
  category?: string;
  beneficiary?: string;
  type?: TransactionType;
  status?: string;
}

interface TransactionFiltersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: TransactionFilters) => void;
  bankAccounts: BankAccount[];
  chartOfAccounts: ChartOfAccount[];
}

export function TransactionFiltersDialog({
  isOpen,
  onClose,
  onApplyFilters,
  bankAccounts,
  chartOfAccounts,
}: TransactionFiltersDialogProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [bankAccountId, setBankAccountId] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [beneficiary, setBeneficiary] = useState<string>();
  const [type, setType] = useState<TransactionType>();
  const [status, setStatus] = useState<string>();

  const handleApplyFilters = () => {
    onApplyFilters({
      startDate,
      endDate,
      bankAccountId,
      category,
      beneficiary,
      type,
      status,
    });
    onClose();
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setBankAccountId(undefined);
    setCategory(undefined);
    setBeneficiary(undefined);
    setType(undefined);
    setStatus(undefined);
    onApplyFilters({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                placeholder="Selecione a data"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Data Final</label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                placeholder="Selecione a data"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Conta Bancária</label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank} - Ag. {account.branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Categoria</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {chartOfAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.description}>
                    {account.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Favorecido</label>
            <Input
              placeholder="Nome do favorecido"
              value={beneficiary || ''}
              onChange={(e) => setBeneficiary(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select value={type} onValueChange={(value: TransactionType) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income" className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-green-500" />
                  Receita
                </SelectItem>
                <SelectItem value="expense" className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  Despesa
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Agendado">Agendado</SelectItem>
                <SelectItem value="Realizado">Realizado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters}>
            Aplicar Filtros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
