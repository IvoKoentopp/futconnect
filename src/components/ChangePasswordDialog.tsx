import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordDialog({ isOpen, onClose, memberId }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<PasswordFormData>();
  const newPassword = watch("newPassword");

  const onSubmit = async (data: PasswordFormData) => {
    try {
      // Verificar senha atual
      const { data: memberData, error: verifyError } = await supabase
        .from('members')
        .select('id')
        .eq('id', memberId)
        .eq('password', data.currentPassword)
        .single();

      if (verifyError || !memberData) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Senha atual incorreta",
        });
        return;
      }

      // Atualizar para nova senha
      const { error: updateError } = await supabase
        .from('members')
        .update({ password: data.newPassword })
        .eq('id', memberId);

      if (updateError) throw updateError;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso",
      });

      reset();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Digite sua senha atual e a nova senha desejada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Senha atual"
              {...register("currentPassword", { required: "Senha atual é obrigatória" })}
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Nova senha"
              {...register("newPassword", { 
                required: "Nova senha é obrigatória",
                minLength: {
                  value: 6,
                  message: "A senha deve ter no mínimo 6 caracteres"
                }
              })}
            />
            {errors.newPassword && (
              <p className="text-sm text-red-500">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Confirmar nova senha"
              {...register("confirmPassword", { 
                required: "Confirmação de senha é obrigatória",
                validate: value => value === newPassword || "As senhas não conferem"
              })}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
