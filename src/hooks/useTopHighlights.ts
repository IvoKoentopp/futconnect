import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type TopHighlight = {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  highlightCount: number;
  position: number;
};

type SupabaseMember = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
};

type SupabaseHighlight = {
  member_id: string;
  members: SupabaseMember;
};

export const useTopHighlights = (clubId: string | undefined) => {
  const [topHighlights, setTopHighlights] = useState<TopHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTopHighlights = async () => {
      if (!clubId) {
        setTopHighlights([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Busca os destaques com join na tabela de membros
        const { data, error: highlightsError } = await supabase
          .from('game_highlights')
          .select('member_id, members:member_id(id, name, nickname, photo_url)')
          .eq('club_id', clubId)
          .eq('is_winner', true);

        if (highlightsError) throw highlightsError;

        if (!data || data.length === 0) {
          setTopHighlights([]);
          return;
        }

        // Agrupa e conta os destaques por membro
        const highlightCounts = (data as unknown as SupabaseHighlight[]).reduce<Record<string, TopHighlight>>((acc, curr) => {
          const memberId = curr.member_id;
          const member = curr.members;

          if (!acc[memberId]) {
            acc[memberId] = {
              id: member.id,
              name: member.name,
              nickname: member.nickname,
              photoUrl: member.photo_url,
              highlightCount: 0,
              position: 0
            };
          }
          acc[memberId].highlightCount++;
          return acc;
        }, {});

        // Converte para array e ordena
        const sortedHighlights = Object.values(highlightCounts)
          .sort((a, b) => b.highlightCount - a.highlightCount)
          .map((highlight, index) => ({
            ...highlight,
            position: index + 1
          }))
          .slice(0, 5); // Limita aos top 5

        setTopHighlights(sortedHighlights);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro ao buscar destaques'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopHighlights();
  }, [clubId]);

  return { topHighlights, isLoading, error };
};
