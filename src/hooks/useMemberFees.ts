
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyFee, MonthlyFeeStatus, MonthlyFeePaymentMethod } from '@/types/monthlyFee';

export const useMemberFees = (memberId: string | undefined) => {
  const [fees, setFees] = useState<MonthlyFee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMemberFees = async () => {
      if (!memberId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('monthly_fees')
          .select(`
            *,
            members(name)
          `)
          .eq('member_id', memberId)
          .order('reference_month', { ascending: false });
          
        if (error) throw error;
        
        // Get current date for status check
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Transform the data to match the MonthlyFee type
        const transformedData: MonthlyFee[] = data.map(fee => {
          // Determine correct status based on due dates and payment dates
          let status = validateFeeStatus(fee.status);
          
          // If status is 'pending' and due date has passed, update to 'late'
          if (status === 'pending' && fee.due_date < currentDate) {
            status = 'late';
          }
          
          // Para exibição na interface do usuário, calculamos um status visual 'paid_late'
          // mas não tentamos salvá-lo no banco de dados
          let displayStatus = status;
          if (status === 'paid' && fee.payment_date && fee.payment_date > fee.due_date) {
            displayStatus = 'paid_late' as MonthlyFeeStatus;
          }
          
          return {
            id: fee.id,
            clubId: fee.club_id,
            memberId: fee.member_id,
            memberName: fee.members?.name,
            referenceMonth: fee.reference_month,
            amount: fee.amount,
            dueDate: fee.due_date,
            paymentDate: fee.payment_date || undefined,
            status: displayStatus,
            paymentMethod: fee.payment_method ? validatePaymentMethod(fee.payment_method) : undefined,
            bankAccountId: fee.bank_account_id || undefined,
            transactionId: fee.transaction_id || undefined
          };
        });
        
        setFees(transformedData);
      } catch (err) {
        console.error('Error fetching member fees:', err);
        setError(err instanceof Error ? err : new Error('Error fetching member fees'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMemberFees();
  }, [memberId]);
  
  // Helper function to validate and convert status to MonthlyFeeStatus type
  const validateFeeStatus = (status: string): MonthlyFeeStatus => {
    const validStatuses: MonthlyFeeStatus[] = ['pending', 'paid', 'paid_late', 'late', 'cancelled'];
    return validStatuses.includes(status as MonthlyFeeStatus) 
      ? (status as MonthlyFeeStatus) 
      : 'pending'; // Default to pending if invalid status
  };
  
  // Helper function to validate and convert payment method to MonthlyFeePaymentMethod type
  const validatePaymentMethod = (method: string): MonthlyFeePaymentMethod => {
    const validMethods: MonthlyFeePaymentMethod[] = ['pix', 'cash', 'transfer', 'credit_card', 'debit_card'];
    return validMethods.includes(method as MonthlyFeePaymentMethod)
      ? (method as MonthlyFeePaymentMethod)
      : 'cash'; // Default to cash if invalid method
  };
  
  return { fees, isLoading, error };
};
