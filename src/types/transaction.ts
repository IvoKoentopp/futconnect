export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'completed' | 'pending' | 'cancelled';
export type PaymentMethod = 'pix' | 'cash' | 'transfer' | 'credit_card' | 'debit_card';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  beneficiary: string;
  bankAccountId: string;
  club_id?: string;
  reference_month?: string;
  runningBalance?: number;
}

export interface ChartOfAccount {
  id: string;
  description: string;
  accountGroup: 'income' | 'expense';
  club_id?: string;
}

export interface BankAccount {
  id: string;
  bank: string;
  branch: string;
  initialBalance: number;
  currentBalance: number;
  club_id?: string;
}
