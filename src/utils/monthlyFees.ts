import { supabase } from '@/integrations/supabase/client';
import { MonthlyFee, MonthlyFeeSetting, MonthlyFeeStatus, MonthlyFeePaymentMethod } from '@/types/monthlyFee';

// Fetch monthly fees for a specific club
export const fetchMonthlyFees = async (clubId: string): Promise<MonthlyFee[]> => {
  try {
    const { data, error } = await supabase
      .from('monthly_fees')
      .select(`
        *,
        members:member_id (name, nickname)
      `)
      .eq('club_id', clubId)
      .order('reference_month', { ascending: false });

    if (error) {
      console.error('Error fetching monthly fees:', error);
      return [];
    }
    
    // Get current date for status check
    const currentDate = new Date().toISOString().split('T')[0];

    return data.map(item => {
      // Determine the status based on due date, payment date, and current date
      let status = item.status as MonthlyFeeStatus;
      
      // If status is 'pending' and due date has passed, update to 'late'
      if (status === 'pending' && item.due_date < currentDate) {
        status = 'late';
        
        // Update the status in the database
        updateFeeStatusToLate(item.id).catch(err => 
          console.error('Error updating fee status to late:', err)
        );
      }
      
      // If status is 'paid' but was paid after due date, update to 'paid_late'
      if (status === 'paid' && item.payment_date && item.payment_date > item.due_date) {
        status = 'paid_late';
        
        // Update the status in the database
        updateFeeStatusToPaidLate(item.id).catch(err => 
          console.error('Error updating fee status to paid_late:', err)
        );
      }

      return {
        id: item.id,
        clubId: item.club_id,
        memberId: item.member_id,
        memberName: item.members?.name,
        memberNickname: item.members?.nickname,
        referenceMonth: item.reference_month,
        amount: item.amount,
        dueDate: item.due_date,
        paymentDate: item.payment_date,
        status: status,
        paymentMethod: item.payment_method as MonthlyFeePaymentMethod,
        bankAccountId: item.bank_account_id,
        transactionId: item.transaction_id
      };
    });
  } catch (error) {
    console.error('Error fetching monthly fees:', error);
    return [];
  }
};

// Helper function to update fee status to 'late' in the database
const updateFeeStatusToLate = async (feeId: string): Promise<void> => {
  try {
    await supabase
      .from('monthly_fees')
      .update({ status: 'late', updated_at: new Date().toISOString() })
      .eq('id', feeId);
  } catch (error) {
    console.error('Error updating fee status to late:', error);
    throw error;
  }
};

// Helper function to update fee status to 'paid_late' in the database
// Note: This function is kept for future use, but we're not using it currently
// since the database doesn't support 'paid_late' status yet
const updateFeeStatusToPaidLate = async (feeId: string): Promise<void> => {
  try {
    await supabase
      .from('monthly_fees')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', feeId);
  } catch (error) {
    console.error('Error updating fee status to paid_late:', error);
    throw error;
  }
};

// Fetch monthly fee settings for a specific club
export const fetchMonthlyFeeSettings = async (clubId: string): Promise<MonthlyFeeSetting[]> => {
  try {
    const { data, error } = await supabase
      .from('monthly_fee_settings')
      .select('*')
      .eq('club_id', clubId)
      .eq('active', true);

    if (error) {
      console.error('Error fetching monthly fee settings:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      clubId: item.club_id,
      category: item.category,
      amount: item.amount,
      dueDay: item.due_day,
      chartOfAccountId: item.chart_of_account_id,
      active: item.active
    }));
  } catch (error) {
    console.error('Error fetching monthly fee settings:', error);
    return [];
  }
};

// Create or update monthly fee setting
export const saveMonthlyFeeSetting = async (
  setting: Omit<MonthlyFeeSetting, 'id'> & { id?: string }
): Promise<MonthlyFeeSetting | null> => {
  try {
    const { id, clubId, category, amount, dueDay, chartOfAccountId, active } = setting;

    // If updating an existing setting
    if (id) {
      const { data, error } = await supabase
        .from('monthly_fee_settings')
        .update({
          category,
          amount,
          due_day: dueDay,
          chart_of_account_id: chartOfAccountId,
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating monthly fee setting:', error);
        return null;
      }

      return {
        id: data.id,
        clubId: data.club_id,
        category: data.category,
        amount: data.amount,
        dueDay: data.due_day,
        chartOfAccountId: data.chart_of_account_id,
        active: data.active
      };
    } 
    // If creating a new setting
    else {
      const { data, error } = await supabase
        .from('monthly_fee_settings')
        .insert([
          {
            club_id: clubId,
            category,
            amount,
            due_day: dueDay,
            chart_of_account_id: chartOfAccountId,
            active
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating monthly fee setting:', error);
        return null;
      }

      return {
        id: data.id,
        clubId: data.club_id,
        category: data.category,
        amount: data.amount,
        dueDay: data.due_day,
        chartOfAccountId: data.chart_of_account_id,
        active: data.active
      };
    }
  } catch (error) {
    console.error('Error saving monthly fee setting:', error);
    return null;
  }
};

// Fetch active and contributing members
export const fetchActiveContributingMembers = async (clubId: string): Promise<Array<{id: string, name: string, nickname?: string}>> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, nickname')
      .eq('club_id', clubId)
      .eq('status', 'Ativo')
      .eq('category', 'Contribuinte')
      .order('name');
      
    if (error) {
      console.error('Error fetching active contributing members:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching active contributing members:', error);
    return [];
  }
};

// Function to generate monthly fees for active and contributing members
export const generateMonthlyFees = async (
  clubId: string,
  referenceMonth: Date,
  selectedMembers?: string[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Fetch fee settings first to check if they exist
    const { data: settings, error: settingsError } = await supabase
      .from('monthly_fee_settings')
      .select('*')
      .eq('club_id', clubId)
      .eq('active', true);
      
    if (settingsError) {
      console.error('Error fetching fee settings:', settingsError);
      return { success: false, count: 0, error: 'Erro ao buscar configurações de mensalidades' };
    }
    
    if (!settings || settings.length === 0) {
      return { success: false, count: 0, error: 'Nenhuma configuração de mensalidade encontrada. Configure as mensalidades primeiro.' };
    }
    
    // Create a map of category to fee setting for easier lookup
    const categorySettings = settings.reduce((acc, setting) => {
      acc[setting.category] = setting;
      return acc;
    }, {} as Record<string, any>);

    // Fetch only 'Contribuinte' and 'Ativo' status members
    const membersQuery = supabase
      .from('members')
      .select('id, category')
      .eq('club_id', clubId)
      .eq('status', 'Ativo')
      .eq('category', 'Contribuinte');
    
    // If specific members were selected, filter by them
    if (selectedMembers && selectedMembers.length > 0) {
      membersQuery.in('id', selectedMembers);
    }
    
    const { data: members, error: membersError } = await membersQuery;
    
    if (membersError) {
      console.error('Error fetching members:', membersError);
      return { success: false, count: 0, error: 'Erro ao buscar sócios' };
    }
    
    if (!members || members.length === 0) {
      return { success: false, count: 0, error: 'Nenhum sócio Contribuinte e Ativo encontrado' };
    }
    
    // Format reference month to first day of month - USE DATE STRING WITHOUT TIME
    const year = referenceMonth.getFullYear();
    const month = referenceMonth.getMonth();
    const formattedRefMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // Prepare monthly fees to generate
    const feesToGenerate = [];
    const existingFees = [];
    
    for (const member of members) {
      // Skip member if no setting for their category
      if (!categorySettings[member.category]) {
        console.log(`No fee setting found for category: ${member.category}`);
        continue;
      }
      
      const setting = categorySettings[member.category];
      
      // Calculate due date based on the reference month and due day
      // FORMAT DATE AS YYYY-MM-DD without timezone conversion
      const dueDay = setting.due_day;
      const dueMonth = month;
      const dueYear = year;
      let dueDateStr = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
      
      // Check if a fee already exists for this member and month
      const { data: existingFeesForMember } = await supabase
        .from('monthly_fees')
        .select('id')
        .eq('member_id', member.id)
        .eq('reference_month', formattedRefMonth);
        
      if (existingFeesForMember && existingFeesForMember.length > 0) {
        existingFees.push(member.id);
        continue; // Skip if fee already exists
      }
      
      feesToGenerate.push({
        club_id: clubId,
        member_id: member.id,
        reference_month: formattedRefMonth,
        amount: setting.amount,
        due_date: dueDateStr,
        status: 'pending'
      });
    }
    
    // If all selected members already have fees for this month, return with info message
    if (feesToGenerate.length === 0) {
      if (existingFees.length > 0) {
        return { 
          success: true, 
          count: 0, 
          error: 'Todas as mensalidades para o período selecionado já foram geradas anteriormente.' 
        };
      }
      return { 
        success: false, 
        count: 0, 
        error: 'Nenhuma mensalidade para gerar. Verifique se existem configurações para as categorias dos sócios.' 
      };
    }
    
    // Insert the fees in batches to avoid hitting size limits
    const batchSize = 100;
    let successCount = 0;
    
    for (let i = 0; i < feesToGenerate.length; i += batchSize) {
      const batch = feesToGenerate.slice(i, i + batchSize);
      const { error: insertError, count } = await supabase
        .from('monthly_fees')
        .insert(batch);
        
      if (insertError) {
        console.error('Error generating fees:', insertError);
      } else {
        successCount += count || 0;
      }
    }
    
    // Consider it a success even if some existed already
    const isSuccess = successCount > 0 || existingFees.length > 0;
    
    return {
      success: isSuccess,
      count: successCount,
      error: isSuccess ? undefined : 'Não foi possível gerar as mensalidades'
    };
  } catch (error: any) {
    console.error('Error generating monthly fees:', error);
    return { success: false, count: 0, error: error.message };
  }
};

// Update a monthly fee payment - modified to handle payment date vs due date
export const updateMonthlyFeePayment = async (
  feeId: string,
  paymentDate: string,
  paymentMethod: MonthlyFeePaymentMethod,
  bankAccountId: string
): Promise<boolean> => {
  try {
    // Get the fee to check the due date
    const { data: fee, error: feeError } = await supabase
      .from('monthly_fees')
      .select('due_date')
      .eq('id', feeId)
      .single();
      
    if (feeError) {
      console.error('Error getting fee for payment:', feeError);
      return false;
    }
    
    // Determine status based on payment date vs due date
    // Usando apenas 'paid' para evitar problemas com a restrição de check no banco de dados
    // Posteriormente, podemos adicionar uma migração para permitir o status 'paid_late'
    const status: MonthlyFeeStatus = 'paid';
    
    const { error } = await supabase
      .from('monthly_fees')
      .update({
        payment_date: paymentDate,
        payment_method: paymentMethod,
        bank_account_id: bankAccountId,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', feeId);
      
    if (error) {
      console.error('Error updating monthly fee payment:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating monthly fee payment:', error);
    return false;
  }
};

// Cancel a monthly fee
export const cancelMonthlyFee = async (feeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('monthly_fees')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', feeId);
      
    if (error) {
      console.error('Error cancelling monthly fee:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error cancelling monthly fee:', error);
    return false;
  }
};

// Delete a monthly fee
export const deleteMonthlyFee = async (feeId: string): Promise<boolean> => {
  try {
    // Check if fee is already paid
    const { data: fee, error: checkError } = await supabase
      .from('monthly_fees')
      .select('status, transaction_id')
      .eq('id', feeId)
      .single();
      
    if (checkError) {
      console.error('Error checking monthly fee:', checkError);
      return false;
    }
    
    // If the fee is paid and has a transaction, we need to prevent deletion
    if (fee.status === 'paid' && fee.transaction_id) {
      console.error('Cannot delete a paid fee with an associated transaction');
      return false;
    }
    
    // Delete the monthly fee
    const { error } = await supabase
      .from('monthly_fees')
      .delete()
      .eq('id', feeId);
      
    if (error) {
      console.error('Error deleting monthly fee:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting monthly fee:', error);
    return false;
  }
};

// Update a monthly fee
export const updateMonthlyFee = async (fee: MonthlyFee): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('monthly_fees')
      .update({
        amount: fee.amount,
        due_date: fee.dueDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', fee.id);
      
    if (error) {
      console.error('Error updating monthly fee:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating monthly fee:', error);
    return false;
  }
};
