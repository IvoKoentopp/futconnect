import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TopHighlight = {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  highlightCount: number;
  position: number;
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

        // Primeiro busca os jogos finalizados do clube
        const { data: finishedGames, error: gamesError } = await supabase
          .from('game_voting_control')
          .select(`
            game_id,
            games!inner (
              id,
              date,
              club_id
            )
          `)
          .eq('is_finalized', true)
          .eq('games.club_id', clubId);

        if (gamesError) throw gamesError;

        if (!finishedGames || finishedGames.length === 0) {
          setTopHighlights([]);
          return;
        }

        // Busca os destaques vencedores desses jogos
        const { data: highlights, error: highlightsError } = await supabase
          .from('game_highlights')
          .select(`
            id,
            member_id,
            votes_count,
            members:member_id (
              id,
              name,
              nickname,
              photo_url
            )
          `)
          .eq('is_winner', true)
          .in('game_id', finishedGames.map(g => g.game_id));

        if (highlightsError) throw highlightsError;

        if (!highlights || highlights.length === 0) {
          setTopHighlights([]);
          return;
        }

        // Agrupa e conta os destaques por membro
        const highlightCounts = highlights.reduce<Record<string, TopHighlight>>((acc, curr) => {
          const memberId = curr.member_id;
          const member = curr.members;

          if (!acc[memberId] && member) {
            acc[memberId] = {
              id: member.id,
              name: member.name,
              nickname: member.nickname,
              photoUrl: member.photo_url,
              highlightCount: 0,
              position: 0
            };
          }
          
          if (acc[memberId]) {
            acc[memberId].highlightCount++;
          }
          
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
        console.error('Error fetching highlights:', err);
        setError(err instanceof Error ? err : new Error('Erro ao buscar destaques'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopHighlights();
  }, [clubId]);

  return { topHighlights, isLoading, error };
};
