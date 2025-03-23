
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActiveMembers = (clubId: string | undefined) => {
  const [memberCount, setMemberCount] = useState<number>(0);
  const [newMembersThisMonth, setNewMembersThisMonth] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get the first day of the current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Count all active members - making sure status is exactly "Ativo"
        const { count: totalCount, error: totalError } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', clubId)
          .eq('status', 'Ativo');
        
        if (totalError) throw totalError;
        
        // Count new members this month - making sure status is exactly "Ativo"
        const { count: newCount, error: newError } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', clubId)
          .eq('status', 'Ativo')
          .gte('registration_date', firstDayOfMonth.toISOString().split('T')[0]);
        
        if (newError) throw newError;
        
        setMemberCount(totalCount || 0);
        setNewMembersThisMonth(newCount || 0);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch members'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [clubId]);

  return { memberCount, newMembersThisMonth, isLoading, error };
};
