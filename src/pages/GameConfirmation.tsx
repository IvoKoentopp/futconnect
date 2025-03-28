import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// The GameConfirmation component must be the default export
const GameConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameDetails, setGameDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const gameId = searchParams.get('gameId');
  
  useEffect(() => {
    const fetchGameDetails = async () => {
      if (!gameId) {
        setError('ID do jogo não encontrado');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Jogo não encontrado');

        setGameDetails(data);
      } catch (err: any) {
        console.error('Erro ao buscar detalhes do jogo:', err);
        setError(err.message || 'Erro ao buscar detalhes do jogo');
      } finally {
        setLoading(false);
      }
    };

    fetchGameDetails();
  }, [gameId]);

  const handleConfirmation = async (willPlay: boolean) => {
    if (!nickname.trim()) {
      toast.error('Por favor, informe seu apelido ou nome');
      return;
    }

    if (!gameId) {
      toast.error('ID do jogo não encontrado');
      return;
    }

    setIsSubmitting(true);

    try {
      // First, find the member by nickname
      const { data: members, error: memberError } = await supabase
        .from('members')
        .select('id')
        .ilike('nickname', nickname)
        .limit(1);

      if (memberError) throw memberError;

      if (!members || members.length === 0) {
        toast.error('Apelido não encontrado. Verifique se digitou corretamente.');
        setIsSubmitting(false);
        return;
      }

      const memberId = members[0].id;

      // Check if there's already a participant record
      const { data: existingParticipant, error: participantError } = await supabase
        .from('game_participants')
        .select('id, status')
        .eq('game_id', gameId)
        .eq('member_id', memberId)
        .single();

      if (participantError && participantError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is fine
        throw participantError;
      }

      // Set the appropriate status based on user choice
      const status = willPlay ? 'confirmed' : 'declined';

      if (existingParticipant) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('game_participants')
          .update({ status })
          .eq('id', existingParticipant.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('game_participants')
          .insert([{
            game_id: gameId,
            member_id: memberId,
            status
          }]);

        if (insertError) throw insertError;
      }

      toast.success(willPlay 
        ? 'Presença confirmada com sucesso!' 
        : 'Ausência registrada com sucesso!'
      );
      
      // Redirect after short delay to allow toast to be seen
      setTimeout(() => {
        navigate(`/confirmation-success?gameId=${gameId}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Erro ao processar confirmação:', err);
      toast.error(err.message || 'Erro ao processar sua confirmação');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Carregando...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !gameDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error || 'Não foi possível carregar os detalhes do jogo'}</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/')}>
              Voltar para o início
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Format the date without timezone issues
  const formattedDate = (() => {
    const [year, month, day] = gameDetails.date.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  })();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Confirmação de Jogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-lg">Detalhes do Jogo:</h3>
            <p><strong>Data:</strong> {formattedDate}</p>
            <p><strong>Local:</strong> {gameDetails.location}</p>
            {gameDetails.description && (
              <p><strong>Descrição:</strong> {gameDetails.description}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nickname">Informe seu apelido ou nome</Label>
            <Input
              id="nickname"
              placeholder="Seu apelido como está registrado no clube"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium">Você vai jogar?</p>
            <div className="flex gap-4 pt-2">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700" 
                onClick={() => handleConfirmation(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Sim, vou jogar
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700" 
                onClick={() => handleConfirmation(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                Não vou jogar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameConfirmation;
