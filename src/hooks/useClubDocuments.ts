import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ClubDocument {
  url: string | null;
  type: 'statute' | 'anthem' | 'invitation';
  link_url?: string | null;
}

export function useClubDocuments(type: 'statute' | 'anthem' | 'invitation') {
  const { user } = useAuth();
  const { toast } = useToast();
  const [document, setDocument] = useState<ClubDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user?.activeClub?.id) {
      fetchDocument();
    }
  }, [user?.activeClub?.id, type]);

  const fetchDocument = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const urlField = type === 'statute' ? 'statute_url' : 
                      type === 'anthem' ? 'anthem_url' : 
                      'invitation_url';
      
      const linkField = type === 'anthem' ? 'anthem_link_url' : 
                       type === 'invitation' ? 'invitation_link_url' : 
                       null;

      const selectFields = [urlField];
      if (linkField) selectFields.push(linkField);

      const { data, error: fetchError } = await supabase
        .from('club_settings')
        .select(selectFields.join(','))
        .eq('club_id', user?.activeClub?.id)
        .single();

      if (fetchError) throw fetchError;

      setDocument({
        url: data?.[urlField] || null,
        type,
        link_url: linkField ? data?.[linkField] || null : null
      });
    } catch (err) {
      console.error('Erro ao buscar documento:', err);
      setError(err as Error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documento",
        description: "Não foi possível carregar o documento solicitado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocument = async () => {
    if (!document?.url) {
      toast({
        variant: "destructive",
        title: "Documento não disponível",
        description: "Este documento ainda não foi cadastrado.",
      });
      return;
    }

    try {
      const response = await fetch(document.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${type}-${user?.activeClub?.name}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao baixar documento:', err);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: "Não foi possível baixar o documento.",
      });
    }
  };

  return {
    document,
    isLoading,
    error,
    downloadDocument,
    refetch: fetchDocument
  };
}
