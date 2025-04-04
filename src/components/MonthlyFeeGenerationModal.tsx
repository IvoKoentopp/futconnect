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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, AlertCircleIcon, SettingsIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { fetchMonthlyFeeSettings, fetchActiveContributingMembers } from '@/utils/monthlyFees';
import { MonthlyFeeSetting } from '@/types/monthlyFee';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CheckIcon } from "lucide-react";

interface MonthlyFeeGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (referenceMonth: Date, selectedMembers?: string[]) => Promise<boolean>;
  onOpenSettings: () => void;
}

export function MonthlyFeeGenerationModal({ 
  isOpen, 
  onClose,
  onGenerate,
  onOpenSettings
}: MonthlyFeeGenerationModalProps) {
  const [referenceMonth, setReferenceMonth] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<MonthlyFeeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generationType, setGenerationType] = useState<'all' | 'specific'>('all');
  const [members, setMembers] = useState<Array<{id: string, name: string, nickname?: string}>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
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
            description: "Você não tem permissão para gerar mensalidades.",
          });
          onClose();
        }
      }
    };
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen, user?.activeClub?.id, isClubAdmin, onClose, toast]);

  // Fetch settings when modal opens
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.activeClub?.id || !isOpen) return;
      
      setIsLoading(true);
      try {
        const feeSettings = await fetchMonthlyFeeSettings(user.activeClub.id);
        setSettings(feeSettings);
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [user?.activeClub?.id, isOpen]);

  // Fetch members when modal opens or generation type changes to specific
  useEffect(() => {
    const loadMembers = async () => {
      if (!user?.activeClub?.id || !isOpen || generationType !== 'specific') return;
      
      setMembersLoading(true);
      try {
        const activeMembers = await fetchActiveContributingMembers(user.activeClub.id);
        setMembers(activeMembers);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      } finally {
        setMembersLoading(false);
      }
    };
    
    loadMembers();
  }, [user?.activeClub?.id, isOpen, generationType]);

  const handleGenerationTypeChange = (value: string) => {
    setGenerationType(value as 'all' | 'specific');
    setSelectedMembers([]); // Clear selections when changing type
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(current => 
      current.includes(memberId) 
        ? current.filter(id => id !== memberId)
        : [...current, memberId]
    );
  };

  const handleGenerate = async () => {
    if (!user?.activeClub?.id) return;
    
    // Check if there are any active settings
    if (settings.length === 0) {
      setError("Nenhuma configuração de mensalidade encontrada. Configure as mensalidades primeiro.");
      return;
    }
    
    // For specific generation, require at least one member to be selected
    if (generationType === 'specific' && selectedMembers.length === 0) {
      setError("Selecione pelo menos um sócio para gerar mensalidades.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Pass selected members only for specific generation
      const result = await onGenerate(
        referenceMonth, 
        generationType === 'specific' ? selectedMembers : undefined
      );
      
      // Se o resultado for true, significa que a operação foi bem sucedida
      // O toast de sucesso será mostrado pela função chamadora
      if (result) {
        onClose();
      }
    } catch (error: any) {
      // Apenas define o erro no estado, não mostra toast
      console.error("Erro ao gerar mensalidades:", error);
      setError(error.message || "Não foi possível gerar as mensalidades.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar Mensalidades</DialogTitle>
          <DialogDescription>
            Selecione o mês de referência e o tipo de geração para criar mensalidades.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <p>Carregando configurações...</p>
            </div>
          ) : settings.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md flex items-start mb-4">
              <AlertCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Nenhuma configuração encontrada</p>
                <p className="text-sm mt-1">
                  É necessário configurar os valores das mensalidades antes de gerá-las.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Configurar Mensalidades
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="referenceMonth">Mês de Referência</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="referenceMonth"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left",
                        !referenceMonth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {referenceMonth ? (
                        format(referenceMonth, "MMMM 'de' yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione o mês de referência</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={referenceMonth}
                      onSelect={(date) => date && setReferenceMonth(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="generationType">Tipo de Geração</Label>
                <Select 
                  value={generationType} 
                  onValueChange={handleGenerationTypeChange}
                >
                  <SelectTrigger id="generationType">
                    <SelectValue placeholder="Selecione o tipo de geração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Sócios</SelectItem>
                    <SelectItem value="specific">Sócios Específicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {generationType === 'specific' && (
                <div className="grid gap-2">
                  <Label>Selecione os Sócios</Label>
                  {membersLoading ? (
                    <div className="text-sm text-muted-foreground">Carregando sócios...</div>
                  ) : members.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum sócio Contribuinte e Ativo encontrado</div>
                  ) : (
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                      {members.map(member => (
                        <div 
                          key={member.id}
                          className={cn(
                            "flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-muted",
                            selectedMembers.includes(member.id) && "bg-muted"
                          )}
                          onClick={() => toggleMemberSelection(member.id)}
                        >
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{member.name}{member.nickname ? ` (${member.nickname})` : ''}</span>
                          </div>
                          {selectedMembers.includes(member.id) && (
                            <CheckIcon className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {selectedMembers.length} {selectedMembers.length === 1 ? 'sócio selecionado' : 'sócios selecionados'}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                  <AlertCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  {generationType === 'all' 
                    ? "Essa operação irá gerar mensalidades para todos os sócios com status Ativo e categoria Contribuinte."
                    : "Essa operação irá gerar mensalidades apenas para os sócios selecionados."
                  }
                </Label>
                <Label className="text-sm text-muted-foreground">
                  Mensalidades já existentes para o mês selecionado serão ignoradas.
                </Label>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {settings.length > 0 && (
            <Button 
              variant="confirm"
              onClick={handleGenerate}
              disabled={!referenceMonth || isGenerating || settings.length === 0 || 
                (generationType === 'specific' && selectedMembers.length === 0)}
            >
              {isGenerating ? "Gerando..." : "Gerar Mensalidades"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
