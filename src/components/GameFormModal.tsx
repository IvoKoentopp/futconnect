
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';

// Esquema de validação do formulário com status e motivo de cancelamento
const formSchema = z.object({
  date: z.date({ required_error: 'Por favor selecione uma data para o jogo' }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Formato de hora inválido (ex: 15:30)' }),
  location: z.string().min(2, { message: 'Por favor informe o local do jogo' }),
  description: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'canceled'], { 
    required_error: 'Por favor selecione o status do jogo'
  }),
  cancelReason: z.string().optional()
}).refine((data) => {
  // Verifica se o motivo de cancelamento está preenchido quando o status é "canceled"
  if (data.status === 'canceled' && (!data.cancelReason || data.cancelReason.length < 3)) {
    return false;
  }
  return true;
}, {
  message: 'Por favor informe o motivo do cancelamento',
  path: ['cancelReason'] // Especifica qual campo terá a mensagem de erro
});

type FormData = z.infer<typeof formSchema>;

interface GameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  gameToEdit?: {
    id: string;
    date: string;
    location: string;
    status: string;
    description?: string;
    cancelReason?: string;
  } | null;
}

export function GameFormModal({ isOpen, onClose, onSave, gameToEdit }: GameFormModalProps) {
  const isEditing = !!gameToEdit;
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: undefined,
      time: '',
      location: '',
      description: '',
      status: 'scheduled',
      cancelReason: '',
    },
  });
  
  // Preencher o formulário quando estiver editando
  useEffect(() => {
    if (gameToEdit) {
      const gameDate = new Date(gameToEdit.date);
      const hours = gameDate.getHours().toString().padStart(2, '0');
      const minutes = gameDate.getMinutes().toString().padStart(2, '0');
      
      form.reset({
        date: gameDate,
        time: `${hours}:${minutes}`,
        location: gameToEdit.location,
        description: gameToEdit.description || '',
        status: gameToEdit.status as 'scheduled' | 'completed' | 'canceled',
        cancelReason: gameToEdit.cancelReason || '',
      });
    } else {
      form.reset({
        date: undefined,
        time: '',
        location: '',
        description: '',
        status: 'scheduled',
        cancelReason: '',
      });
    }
  }, [gameToEdit, form]);

  const handleSubmit = (data: FormData) => {
    onSave(data);
    form.reset();
  };

  // Observar mudanças no status para controlar o campo de motivo de cancelamento
  const watchStatus = form.watch('status');
  const showCancelReason = watchStatus === 'canceled';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Jogo' : 'Novo Jogo'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edite as informações do jogo selecionado.' 
              : 'Preencha as informações para agendar um novo jogo.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Campo de Data */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo de Hora */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="15:30" 
                        autoComplete="off"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo de Local (Campo) */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome ou local do campo" 
                        autoComplete="off"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo de Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="completed">Realizado</SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo de Motivo do Cancelamento (condicional) */}
              {showCancelReason && (
                <FormField
                  control={form.control}
                  name="cancelReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo do Cancelamento</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Informe o motivo do cancelamento do jogo" 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo de Descrição (opcional) */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Informações adicionais sobre o jogo" 
                        autoComplete="off"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-futconnect-600 hover:bg-futconnect-700">
                {isEditing ? 'Salvar Alterações' : 'Agendar Jogo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
