import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount } from '@/types/transaction';

// Define the schema
const bankAccountSchema = z.object({
  bank: z.string().min(2, {
    message: 'O nome do banco deve ter pelo menos 2 caracteres.',
  }),
  branch: z.string().min(1, {
    message: 'A agência é obrigatória.',
  }),
  initialBalance: z.string()
    .min(1, { message: 'O saldo inicial é obrigatório.' })
    .transform((val) => {
      // Converte a string para número
      const numericValue = Number(val.replace ? val.replace(',', '.') : val);
      return isNaN(numericValue) ? 0 : numericValue;
    }),
});

// Define the raw form input type (before transformation)
type BankAccountFormInput = {
  bank: string;
  branch: string;
  initialBalance: string;
};

// Define the transformed type (after validation)
type BankAccountFormOutput = z.infer<typeof bankAccountSchema>;

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated?: () => void;
  accountToEdit?: BankAccount | null;
}

export function BankAccountModal({ 
  isOpen, 
  onClose, 
  onAccountCreated, 
  accountToEdit 
}: BankAccountModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isClubAdmin } = useAuthorization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<BankAccountFormInput>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank: '',
      branch: '',
      initialBalance: '',
    },
  });

  useEffect(() => {
    const checkPermissions = async () => {
      if (user?.activeClub?.id) {
        const hasPermission = await isClubAdmin(user.activeClub.id);
        if (!hasPermission) {
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Você não tem permissão para gerenciar contas bancárias.",
          });
          onClose();
        }
      }
    };
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen, user?.activeClub?.id, isClubAdmin, onClose, toast]);

  // Reset form when the modal opens/closes or when accountToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (accountToEdit) {
        // Convert number to string with comma for form display
        form.reset({
          bank: accountToEdit.bank,
          branch: accountToEdit.branch,
          initialBalance: accountToEdit.initialBalance.toString().replace('.', ','),
        });
      } else {
        form.reset({
          bank: '',
          branch: '',
          initialBalance: '',
        });
      }
    }
  }, [isOpen, accountToEdit, form]);

  const onSubmit = async (data: BankAccountFormInput) => {
    if (!user?.activeClub?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa selecionar um clube ativo.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Converte o valor para número com segurança
      let initialBalance = 0;
      if (typeof data.initialBalance === 'string') {
        initialBalance = parseFloat(data.initialBalance.replace(',', '.'));
      } else {
        initialBalance = Number(data.initialBalance);
      }
      
      if (accountToEdit) {
        // Update existing account
        const { data: updatedAccount, error } = await supabase
          .from('bank_accounts')
          .update({
            bank: data.bank,
            branch: data.branch,
            initial_balance: initialBalance,
            // Only update current_balance if initial_balance changed
            current_balance: accountToEdit.initialBalance !== initialBalance 
              ? accountToEdit.currentBalance + (initialBalance - accountToEdit.initialBalance)
              : accountToEdit.currentBalance
          })
          .eq('id', accountToEdit.id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        toast({
          title: 'Conta bancária atualizada com sucesso!',
          description: `${data.bank} - Ag. ${data.branch}`,
        });
      } else {
        // Create new account
        const { data: newAccount, error } = await supabase
          .from('bank_accounts')
          .insert([
            {
              bank: data.bank,
              branch: data.branch,
              initial_balance: initialBalance,
              current_balance: initialBalance,
              club_id: user.activeClub.id
            }
          ])
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        toast({
          title: 'Conta bancária cadastrada com sucesso!',
          description: `${data.bank} - Ag. ${data.branch}`,
        });
      }
      
      form.reset();
      
      if (onAccountCreated) {
        onAccountCreated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error with bank account:', error);
      toast({
        variant: "destructive",
        title: accountToEdit ? "Erro ao atualizar conta bancária" : "Erro ao cadastrar conta bancária",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {accountToEdit ? 'Editar Conta Bancária' : 'Cadastrar Conta Bancária'}
          </DialogTitle>
          <DialogDescription>
            {accountToEdit 
              ? 'Edite os dados da conta bancária.' 
              : 'Preencha os dados da conta bancária para cadastrá-la no sistema.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Banco do Brasil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agência</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="initialBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo Inicial</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      placeholder="0,00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                className="bg-futconnect-600 hover:bg-futconnect-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
