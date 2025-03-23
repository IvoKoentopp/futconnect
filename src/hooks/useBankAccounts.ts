
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBankAccounts = (clubId: string | undefined) => {
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [monthlyIncrease, setMonthlyIncrease] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!clubId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get all bank accounts for the club
        const { data: accounts, error: accountsError } = await supabase
          .from('bank_accounts')
          .select('current_balance, initial_balance')
          .eq('club_id', clubId);
        
        if (accountsError) throw accountsError;
        
        // Calculate total balance
        const total = accounts?.reduce((sum, account) => sum + Number(account.current_balance), 0) || 0;
        
        // Get the first day of the current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // Get transactions for this month
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('club_id', clubId)
          .gte('date', firstDayOfMonth);
        
        if (transactionsError) throw transactionsError;
        
        // Calculate net change for this month
        let monthlyChange = 0;
        if (transactions) {
          monthlyChange = transactions.reduce((sum, transaction) => {
            if (transaction.type === 'income') {
              return sum + Number(transaction.amount);
            } else if (transaction.type === 'expense') {
              return sum - Number(transaction.amount);
            }
            return sum;
          }, 0);
        }
        
        setTotalBalance(total);
        setMonthlyIncrease(monthlyChange);
      } catch (err) {
        console.error('Error fetching bank accounts:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch bank accounts'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBankAccounts();
  }, [clubId]);

  return { totalBalance, monthlyIncrease, isLoading, error };
};
