
import { supabase } from '@/integrations/supabase/client';
import { ChartOfAccount } from '@/types/transaction';

export const fetchChartOfAccounts = async (clubId?: string): Promise<ChartOfAccount[]> => {
  try {
    if (!clubId) {
      console.error('No club ID provided for fetching chart of accounts');
      return [];
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('club_id', clubId)
      .order('description', { ascending: true });

    if (error) {
      console.error('Error fetching chart of accounts:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      description: item.description,
      accountGroup: item.account_group as 'income' | 'expense',
      clubId: item.club_id
    }));
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return [];
  }
};

export const createChartOfAccount = async (
  description: string,
  accountGroup: 'income' | 'expense',
  clubId: string
): Promise<ChartOfAccount | null> => {
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert([
        {
          description,
          account_group: accountGroup,
          club_id: clubId
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating chart of account:', error);
      return null;
    }

    return {
      id: data.id,
      description: data.description,
      accountGroup: data.account_group as 'income' | 'expense',
      clubId: data.club_id
    };
  } catch (error) {
    console.error('Error creating chart of account:', error);
    return null;
  }
};
