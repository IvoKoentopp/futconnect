
export type MonthlyFeeStatus = 'pending' | 'paid' | 'late' | 'cancelled' | 'paid_late';
export type MonthlyFeePaymentMethod = 'pix' | 'cash' | 'transfer' | 'credit_card' | 'debit_card';

export interface MonthlyFee {
  id: string;
  clubId: string;
  memberId: string;
  memberName?: string; // Add this for UI display
  referenceMonth: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: MonthlyFeeStatus;
  paymentMethod?: MonthlyFeePaymentMethod;
  bankAccountId?: string;
  transactionId?: string;
}

export interface MonthlyFeeSetting {
  id: string;
  clubId: string;
  category: string;
  amount: number;
  dueDay: number;
  chartOfAccountId?: string;
  active: boolean;
}
