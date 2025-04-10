import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  PlusCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { DateInput } from '@/components/ui/date-input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization, Permission } from '@/hooks/useAuthorization';
import { useMembers } from '@/hooks/useMembers';
import { formatDisplayDate, parseExactDate } from '@/lib/utils';
import { format } from 'date-fns';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from '@/contexts/ClubContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define types
interface Absence {
  id: string;
  member_id: string;
  start_date: string;
  end_date: string;
  reason: 'INJURY' | 'VACATION' | 'WORK_TRIP' | 'OTHER';
  description: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  member: {
    name: string;
    nickname: string | null;
    status: string;
  };
}

// Schema for form validation
const absenceSchema = z.object({
  member_id: z.string().min(1, 'Selecione um sócio'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de fim é obrigatória'),
  reason: z.enum(['INJURY', 'VACATION', 'WORK_TRIP', 'OTHER'], {
    required_error: 'Selecione um motivo'
  }),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).default('ACTIVE')
}).superRefine((data, ctx) => {
  // Validar datas apenas se ambas estiverem preenchidas
  if (data.start_date && data.end_date) {
    // Criar datas UTC para comparação
    const start = new Date(data.start_date + 'T12:00:00Z');
    const end = new Date(data.end_date + 'T12:00:00Z');

    if (isNaN(start.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de início inválida',
        path: ['start_date']
      });
    }

    if (isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de fim inválida',
        path: ['end_date']
      });
    }

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A data de fim deve ser maior ou igual à data de início',
        path: ['end_date']
      });
    }
  }
});

type AbsenceFormData = z.infer<typeof absenceSchema>;

const ABSENCE_REASONS = [
  { value: 'INJURY', label: 'Lesão' },
  { value: 'VACATION', label: 'Férias' },
  { value: 'WORK_TRIP', label: 'Viagem de Trabalho' },
  { value: 'OTHER', label: 'Outro' }
] as const;

const STATUS_BADGES = {
  ACTIVE: { label: 'Ativo', variant: 'warning' },
  COMPLETED: { label: 'Concluído', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' }
} as const;

export default function Absences() {
  const { toast } = useToast();
  const { hasPermission } = useAuthorization();
  const canManageAbsences = hasPermission(Permission.MANAGE_ABSENCES);
  const { members } = useMembers();
  const { currentClub } = useClub();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const defaultValues = {
    member_id: '',
    start_date: '',
    end_date: '',
    reason: 'INJURY' as const,
    description: '',
    status: 'ACTIVE' as const
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
    defaultValues
  });
  
  // Buscar lista de afastamentos
  const { 
    data: absences = [], 
    isLoading,
    isError: isAbsencesError 
  } = useQuery({
    queryKey: ['absences', currentClub?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_absences')
        .select('*, member:members(name, nickname, status)')
        .eq('club_id', currentClub?.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as Absence[];
    },
    enabled: !!currentClub?.id
  });

  // Mutation para criar afastamento
  const createAbsence = useMutation({
    mutationFn: async (data: AbsenceFormData) => {
      if (!canManageAbsences) {
        throw new Error('Apenas administradores podem registrar afastamentos.');
      }

      if (!currentClub?.id) {
        throw new Error('Clube não selecionado');
      }

      const { error } = await supabase
        .from('member_absences')
        .insert({
          member_id: data.member_id,
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason,
          status: data.status,
          description: data.description || null,
          club_id: currentClub.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['absences']);
      toast({
        title: 'Sucesso',
        description: 'Afastamento registrado com sucesso'
      });
      setIsModalOpen(false);
      reset();
    },
    onError: (error) => {
      console.error('Error creating absence:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao registrar afastamento',
        variant: 'destructive'
      });
    }
  });

  // Mutation para atualizar status
  const updateAbsenceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'COMPLETED' | 'CANCELLED' }) => {
      if (!canManageAbsences) {
        throw new Error('Apenas administradores podem atualizar afastamentos.');
      }

      const { error } = await supabase
        .from('member_absences')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['absences']);
      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso'
      });
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar status',
        variant: 'destructive'
      });
    }
  });

  // Handler para criar novo afastamento
  const onSubmit = handleSubmit(async (data) => {
    await createAbsence.mutateAsync(data);
  });

  // Handler para atualizar status
  const handleStatusUpdate = async (id: string, status: 'COMPLETED' | 'CANCELLED') => {
    await updateAbsenceStatus.mutateAsync({ id, status });
  };

  return (
    <AdminLayout appMode="club">
      <div className="space-y-4 p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Afastamentos</h2>
          <Button
            onClick={() => setIsModalOpen(true)}
            disabled={!canManageAbsences}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Afastamento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Afastamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isAbsencesError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Erro ao carregar afastamentos
                </p>
              </div>
            ) : absences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum afastamento registrado
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sócio</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((absence) => (
                    <TableRow key={absence.id}>
                      <TableCell>{absence.member.nickname || absence.member.name}</TableCell>
                      <TableCell>{formatDisplayDate(absence.start_date)}</TableCell>
                      <TableCell>{formatDisplayDate(absence.end_date)}</TableCell>
                      <TableCell>
                        {ABSENCE_REASONS.find(r => r.value === absence.reason)?.label}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGES[absence.status].variant as any}>
                          {STATUS_BADGES[absence.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {absence.status === 'ACTIVE' && canManageAbsences && (
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusUpdate(absence.id, 'COMPLETED')}
                              title="Marcar como concluído"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusUpdate(absence.id, 'CANCELLED')}
                              title="Cancelar afastamento"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Afastamento</DialogTitle>
              <DialogDescription>
                Registre um período de afastamento para um sócio.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member_id">Sócio</Label>
                <Controller
                  name="member_id"
                  control={control}
                  defaultValue={defaultValues.member_id}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      value={value}
                      onValueChange={onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um sócio" />
                      </SelectTrigger>
                      <SelectContent>
                        {members?.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            Nenhum sócio ativo encontrado
                          </SelectItem>
                        ) : members?.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.nickname || member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.member_id && (
                  <p className="text-sm text-destructive">{errors.member_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início</Label>
                  <Controller
                    name="start_date"
                    control={control}
                    defaultValue={defaultValues.start_date}
                    render={({ field: { onChange, value } }) => (
                      <DateInput
                        value={value ? new Date(value) : undefined}
                        onChange={(date) => {
                          if (date) {
                            // Converter para UTC e formatar como YYYY-MM-DD
                            const utcDate = new Date(Date.UTC(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate(),
                              12, 0, 0
                            ));
                            const formattedDate = format(utcDate, 'yyyy-MM-dd');
                            onChange(formattedDate);
                          } else {
                            onChange('');
                          }
                        }}
                      />
                    )}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-destructive">{errors.start_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Fim</Label>
                  <Controller
                    name="end_date"
                    control={control}
                    defaultValue={defaultValues.end_date}
                    render={({ field: { onChange, value } }) => (
                      <DateInput
                        value={value ? new Date(value) : undefined}
                        onChange={(date) => {
                          if (date) {
                            // Converter para UTC e formatar como YYYY-MM-DD
                            const utcDate = new Date(Date.UTC(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate(),
                              12, 0, 0
                            ));
                            const formattedDate = format(utcDate, 'yyyy-MM-dd');
                            onChange(formattedDate);
                          } else {
                            onChange('');
                          }
                        }}
                      />
                    )}
                  />
                  {errors.end_date && (
                    <p className="text-sm text-destructive">{errors.end_date.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Controller
                  name="reason"
                  control={control}
                  defaultValue={defaultValues.reason}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      value={value}
                      onValueChange={onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {ABSENCE_REASONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.reason && (
                  <p className="text-sm text-destructive">{errors.reason.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  {...register('description')}
                  placeholder="Detalhes adicionais sobre o afastamento..."
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
