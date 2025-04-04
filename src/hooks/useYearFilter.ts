import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useYearFilter = (clubId: string | undefined) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEarliestGameDate = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        // Buscar a primeira partida com eventos
        const { data: gameEventsData, error: gameEventsError } = await supabase
          .from('game_events')
          .select('game_id');
          
        if (gameEventsError) throw gameEventsError;
        
        if (!gameEventsData || gameEventsData.length === 0) {
          setAvailableYears([currentYear.toString(), "all"]);
          setIsLoading(false);
          return;
        }
        
        // Extrair IDs dos jogos com eventos
        const gameIdsWithEvents = [...new Set(gameEventsData.map(event => event.game_id))];
        
        // Buscar a data da primeira partida
        const { data: earliestGame, error: gamesError } = await supabase
          .from('games')
          .select('date')
          .eq('club_id', clubId)
          .eq('status', 'completed')
          .in('id', gameIdsWithEvents)
          .order('date', { ascending: true })
          .limit(1);
          
        if (gamesError) throw gamesError;
        
        if (!earliestGame || earliestGame.length === 0) {
          setAvailableYears([currentYear.toString(), "all"]);
          setIsLoading(false);
          return;
        }
        
        const earliestYear = new Date(earliestGame[0].date).getFullYear();
        
        // Gerar array de anos começando com o ano atual e depois os demais
        const years = [currentYear.toString(), "all"];
        for (let year = currentYear - 1; year >= earliestYear; year--) {
          years.push(year.toString());
        }
        
        setAvailableYears(years);
      } catch (error) {
        console.error('Error determining available years:', error);
        // Fallback para últimos 5 anos em caso de erro, começando com o ano atual
        const fallbackYears = [currentYear.toString(), "all", ...Array.from({ length: 4 }, (_, i) => (currentYear - (i + 1)).toString())];
        setAvailableYears(fallbackYears);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarliestGameDate();
  }, [clubId, currentYear]);

  return { selectedYear, setSelectedYear, availableYears, isLoading };
};
