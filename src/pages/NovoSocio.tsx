import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { MemberForm } from '@/components/MemberForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const NovoSocio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  
  // Fetch club members for sponsor dropdown
  useEffect(() => {
    if (user?.activeClub?.id) {
      fetchClubMembers();
    }
  }, [user?.activeClub?.id]);
  
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
        status: data.status || 'Ativo',
        sponsor_id: data.sponsorId || null,
        positions: data.positions || []
      };

      console.log('Member data for Supabase:', memberData);

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

      toast({
        title: "Sócio cadastrado",
        description: `${data.name} foi cadastrado com sucesso!`,
      });
      
      // Navigate to members list page - updated to members/list
      navigate('/members/list');

    } catch (error: any) {
      console.error('Erro ao salvar sócio:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao salvar sócio: ${error.message || error}`,
      });
    }
  };
  
  const handleCancel = () => {
    navigate('/members/list');
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Sócio</h1>
        <p className="text-gray-500">
          Cadastre um novo sócio para o clube {user?.activeClub?.name}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Formulário de Cadastro</CardTitle>
          <CardDescription>
            Preencha as informações para cadastrar um novo sócio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm 
            onSave={handleSave}
            onCancel={handleCancel}
            clubMembers={clubMembers}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NovoSocio;
