
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Book } from 'lucide-react';
import { createChartOfAccount } from '@/utils/chartOfAccounts';
import { useAuth } from '@/contexts/AuthContext';

// Schema for form validation
const accountFormSchema = z.object({
  description: z.string().min(3, {
    message: 'A descrição deve ter pelo menos 3 caracteres.',
  }),
  accountGroup: z.enum(['income', 'expense'], {
    required_error: 'Selecione um grupo para a conta.',
  }),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface ChartOfAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated?: () => void;
}

export function ChartOfAccountsModal({ isOpen, onClose, onAccountCreated }: ChartOfAccountsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      description: '',
      accountGroup: undefined,
    },
  });

  const onSubmit = async (data: AccountFormValues) => {
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
      const result = await createChartOfAccount(
        data.description, 
        data.accountGroup, 
        user.activeClub.id
      );
      
      if (result) {
        toast({
          title: 'Conta cadastrada com sucesso!',
          description: `${data.description} (${data.accountGroup === 'income' ? 'Receita' : 'Despesa'})`,
        });
        
        form.reset();
        
        if (onAccountCreated) {
          onAccountCreated();
        }
        
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao cadastrar conta",
          description: "Tente novamente mais tarde.",
        });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar conta",
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
            <Book className="h-5 w-5" />
            Cadastrar Plano de Contas
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Mensalidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accountGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
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
