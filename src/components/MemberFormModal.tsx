import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberForm } from './MemberForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing?: boolean;
  isViewOnly?: boolean;
  defaultValues?: any;
}

export function MemberFormModal({ 
  isOpen, 
  onClose, 
  isEditing = false,
  isViewOnly = false,
  defaultValues 
}: MemberFormModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  
  // Fetch club members for sponsor dropdown
  useEffect(() => {
    if (isOpen && user?.activeClub?.id) {
      fetchClubMembers();
    }
  }, [isOpen, user?.activeClub?.id]);
  
  const fetchClubMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, nickname')
        .eq('club_id', user?.activeClub?.id)
        .in('status', ['Ativo', 'Inativo', 'Suspenso'])
        .order('name');
      
      if (error) throw error;
      
      setClubMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching club members:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar sócios",
        description: `Não foi possível carregar a lista de sócios: ${error.message}`,
      });
    }
  };
  
  const handleSave = async (data: any) => {
    try {
      if (!user?.activeClub?.id) {
        throw new Error('Nenhum clube ativo selecionado');
      }

      console.log('Data to save:', data);

      // Helper function to format dates properly for Supabase storage
      // This ensures dates are stored as YYYY-MM-DD without any timezone adjustments
      const formatDateForDB = (date: Date | undefined) => {
        if (!date) return null;
        
        // Extract date components directly from the Date object
        // and create a YYYY-MM-DD string (not using toISOString() which applies timezone offset)
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Prepare member data for Supabase
      const memberData = {
        club_id: user.activeClub.id,
        name: data.name,
        nickname: data.nickname || null,
        email: data.email,
        password: data.password,
        phone: data.phone || null,
        birth_date: formatDateForDB(data.birthDate),
        photo_url: data.photo || null,
        registration_date: formatDateForDB(data.registrationDate),
        category: data.category,
        payment_start_date: formatDateForDB(data.paymentStartDate),
        status: data.status,
        sponsor_id: data.sponsorId || null,
        positions: data.positions || []
      };

      console.log('Member data for Supabase:', memberData);

      let result;

      if (isEditing && defaultValues?.id) {
        // Update an existing member
        console.log(`Updating member with ID: ${defaultValues.id}`);
        const { data: updatedData, error } = await supabase
          .from('members')
          .update(memberData)
          .eq('id', defaultValues.id)
          .select();
          
        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        
        console.log('Update successful, updated data:', updatedData);
        result = { data: updatedData, error: null };
      } else {
        // Insert a new member
        console.log('Creating new member');
        const { data: insertedData, error } = await supabase
          .from('members')
          .insert(memberData)
          .select();
          
        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }
        
        console.log('Insert successful, inserted data:', insertedData);
        result = { data: insertedData, error: null };
      }

      console.log('Member saved successfully:', result.data);

      toast({
        title: isEditing ? "Sócio atualizado" : "Sócio cadastrado",
        description: `${data.name} foi ${isEditing ? "atualizado" : "cadastrado"} com sucesso!`,
      });
      
      // Close modal and force refresh
      onClose();

    } catch (error: any) {
      console.error('Erro ao salvar sócio:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao salvar sócio: ${error.message || error}`,
      });
    }
  };
  
  // Função para garantir que o modal seja fechado adequadamente
  const handleCloseModal = () => {
    console.log('Closing modal and forcing page refresh');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Use the parent's close function to properly clean up state
        handleCloseModal();
      }
    }}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isViewOnly 
              ? "Detalhes do Sócio" 
              : isEditing 
                ? "Editar Sócio" 
                : "Novo Sócio"
            }
          </DialogTitle>
          <DialogDescription>
            {isViewOnly 
              ? "Visualize as informações completas do sócio."
              : isEditing 
                ? "Edite as informações do sócio abaixo." 
                : "Preencha as informações para cadastrar um novo sócio."
            }
          </DialogDescription>
        </DialogHeader>
        
        <MemberForm 
          defaultValues={defaultValues}
          onSave={handleSave}
          onCancel={handleCloseModal} // Utiliza a função atualizada para fechar o modal
          isEditing={isEditing}
          isViewOnly={isViewOnly}
          clubMembers={clubMembers}
        />
      </DialogContent>
    </Dialog>
  );
}
