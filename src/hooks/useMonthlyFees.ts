
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMonthlyFees = (clubId: string | undefined) => {
  const [paymentPercentage, setPaymentPercentage] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMonthlyFees = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get the current month and the previous month
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        // Format as YYYY-MM-01 for Supabase query
        const currentMonthStr = currentMonth.toISOString().substring(0, 8) + '01';
        const previousMonthStr = previousMonth.toISOString().substring(0, 8) + '01';
        
        // Get current month fees
        const { data: currentMonthData, error: currentMonthError } = await supabase
          .from('monthly_fees')
          .select('status')
          .eq('club_id', clubId)
          .eq('reference_month', currentMonthStr);
        
        if (currentMonthError) throw currentMonthError;
        
        // Get previous month fees
        const { data: previousMonthData, error: previousMonthError } = await supabase
          .from('monthly_fees')
          .select('status')
          .eq('club_id', clubId)
          .eq('reference_month', previousMonthStr);
        
        if (previousMonthError) throw previousMonthError;
        
        // Calculate percentages
        let currentPercentage = 0;
        let previousPercentage = 0;
        
        if (currentMonthData && currentMonthData.length > 0) {
          const paidCurrentMonth = currentMonthData.filter(fee => fee.status === 'paid').length;
          currentPercentage = (paidCurrentMonth / currentMonthData.length) * 100;
        }
        
        if (previousMonthData && previousMonthData.length > 0) {
          const paidPreviousMonth = previousMonthData.filter(fee => fee.status === 'paid').length;
          previousPercentage = (paidPreviousMonth / previousMonthData.length) * 100;
        }
        
        // Calculate change
        const change = currentPercentage - previousPercentage;
        
        setPaymentPercentage(Math.round(currentPercentage));
        setPercentageChange(Math.round(change));
      } catch (err) {
        console.error('Error fetching monthly fees:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch monthly fees'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyFees();
  }, [clubId]);

  return { paymentPercentage, percentageChange, isLoading, error };
};
