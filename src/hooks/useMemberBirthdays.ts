
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseExactDate } from '@/lib/utils';

export interface BirthdayPerson {
  id: string;
  name: string;
  birthDate: Date;
  day: number;
  month: number;
}

export const useMemberBirthdays = (clubId: string | undefined) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [birthdays, setBirthdays] = useState<Record<string, BirthdayPerson[]>>({});

  useEffect(() => {
    const fetchBirthdays = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get current month (1-12) and year
        const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
        
        const { data, error } = await supabase
          .from('members')
          .select('id, name, birth_date')
          .eq('club_id', clubId)
          .eq('status', 'Ativo')
          .not('birth_date', 'is', null);
        
        if (error) throw error;
        
        // Group birthdays by month
        const birthdaysByMonth: Record<string, BirthdayPerson[]> = {};
        
        // Initialize months from current month to December
        for (let month = currentMonth; month <= 12; month++) {
          birthdaysByMonth[month.toString()] = [];
        }
        
        // Process birthday data
        data.forEach(member => {
          if (!member.birth_date) return;
          
          // Use parseExactDate to create a date without timezone adjustments
          const birthDate = parseExactDate(member.birth_date);
          if (!birthDate) return;
          
          // Extract month and day using getUTCMonth and getUTCDate to avoid timezone issues
          const month = birthDate.getUTCMonth() + 1; // 1-indexed month
          const day = birthDate.getUTCDate();
          
          // Only include birthdays from current month onwards
          if (month >= currentMonth) {
            const birthdayPerson: BirthdayPerson = {
              id: member.id,
              name: member.name,
              birthDate,
              day,
              month
            };
            
            // Add to the corresponding month
            if (!birthdaysByMonth[month.toString()]) {
              birthdaysByMonth[month.toString()] = [];
            }
            
            birthdaysByMonth[month.toString()].push(birthdayPerson);
          }
        });
        
        // Sort each month's birthdays by day
        Object.keys(birthdaysByMonth).forEach(month => {
          birthdaysByMonth[month].sort((a, b) => a.day - b.day);
        });
        
        setBirthdays(birthdaysByMonth);
      } catch (err) {
        console.error('Error fetching birthdays:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch birthdays'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBirthdays();
  }, [clubId]);

  return { birthdays, isLoading, error };
};
