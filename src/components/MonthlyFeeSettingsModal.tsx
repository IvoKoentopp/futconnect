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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { saveMonthlyFeeSetting, fetchMonthlyFeeSettings } from '@/utils/monthlyFees';
import { MonthlyFeeSetting } from '@/types/monthlyFee';

interface MonthlyFeeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function MonthlyFeeSettingsModal({ 
  isOpen, 
  onClose,
  onSave
}: MonthlyFeeSettingsModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [dueDay, setDueDay] = useState<number>(10);
  const [isSaving, setIsSaving] = useState(false);
  const [existingSettingId, setExistingSettingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
            description: "Você não tem permissão para editar configurações.",
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
    const loadExistingSettings = async () => {
      if (!user?.activeClub?.id || !isOpen) return;
      
      setIsLoading(true);
      try {
        const settings = await fetchMonthlyFeeSettings(user.activeClub.id);
        // Find setting for 'Contribuinte' category
        const contributingSetting = settings.find(s => s.category === 'Contribuinte');
        
        if (contributingSetting) {
          setExistingSettingId(contributingSetting.id);
          setAmount(contributingSetting.amount || 0);
          setDueDay(contributingSetting.dueDay || 10);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações existentes:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as configurações existentes."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExistingSettings();
  }, [isOpen, user?.activeClub?.id, toast]);

  const handleSave = async () => {
    if (!user?.activeClub?.id) return;
    
    setIsSaving(true);
    
    try {
      // Create a new monthly fee setting for 'Contribuinte' category
      const settingData: Omit<MonthlyFeeSetting, 'id'> & { id?: string } = {
        clubId: user.activeClub.id,
        category: 'Contribuinte', // Default category for all members
        amount,
        dueDay,
        active: true
      };
      
      // If we have an existing setting ID, include it for update
      if (existingSettingId) {
        settingData.id = existingSettingId;
      }
      
      const result = await saveMonthlyFeeSetting(settingData);
      
      if (result) {
        toast({
          title: "Configuração salva",
          description: "A configuração de mensalidade foi salva com sucesso."
        });
        onSave();
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível salvar a configuração de mensalidade."
        });
      }
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível salvar a configuração."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Mensalidade</DialogTitle>
          <DialogDescription>
            Configure o valor e dia de vencimento das mensalidades para sócios Contribuintes.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <p>Carregando configurações...</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor da Mensalidade (R$)</Label>
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
              <Label htmlFor="dueDay">Dia de Vencimento</Label>
              <Input
                id="dueDay"
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                min={1}
                max={31}
              />
              <p className="text-sm text-muted-foreground">Dia do mês em que a mensalidade vence.</p>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="confirm"
            onClick={handleSave}
            disabled={amount <= 0 || dueDay < 1 || dueDay > 31 || isSaving || isLoading}
          >
            {isSaving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
