
import { Transaction } from '@/types/transaction';

export interface FinancialStatementData {
  revenue: Record<string, number>;
  expenses: Record<string, number>;
}

/**
 * Groups transactions by categories and calculates totals
 */
export const calculateFinancialStatement = (
  transactions: Transaction[],
  year: number,
  month?: number | null
): FinancialStatementData => {
  // Filter transactions by date
  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    const txYear = txDate.getFullYear();
    
    if (year === 0) return true; // 0 indicates all years
    if (txYear !== year) return false;
    
    if (month !== undefined && month !== null) {
      const txMonth = txDate.getMonth() + 1; // JavaScript months are 0-based
      if (txMonth !== month) return false;
    }
    
    return tx.status === 'completed';
  });

  // Initialize result structure
  const result: FinancialStatementData = {
    revenue: {},
    expenses: {}
  };

  // Group transactions by category
  filteredTransactions.forEach(tx => {
    if (tx.type === 'income') {
      if (!result.revenue[tx.category]) {
        result.revenue[tx.category] = 0;
      }
      result.revenue[tx.category] += tx.amount;
    } else {
      if (!result.expenses[tx.category]) {
        result.expenses[tx.category] = 0;
      }
      result.expenses[tx.category] += tx.amount;
    }
  });

  return result;
};

/**
 * Calculate summary statistics
 */
export const calculateSummary = (data: FinancialStatementData) => {
  const totalRevenue = Object.values(data.revenue).reduce((acc, val) => acc + val, 0);
  const totalExpenses = Object.values(data.expenses).reduce((acc, val) => acc + val, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin
  };
};

/**
 * Format currency in BRL
 */
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Calculate revenue and expense trends by month
 */
export const calculateMonthlyTrends = (
  transactions: Transaction[],
  year: number
) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const monthlyRevenue = months.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {} as Record<number, number>);
  
  const monthlyExpenses = months.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {} as Record<number, number>);
  
  // Filter for the selected year and populate monthly data
  transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === year && tx.status === 'completed';
    })
    .forEach(tx => {
      const txDate = new Date(tx.date);
      const txMonth = txDate.getMonth() + 1;
      
      if (tx.type === 'income') {
        monthlyRevenue[txMonth] += tx.amount;
      } else {
        monthlyExpenses[txMonth] += tx.amount;
      }
    });
    
  return {
    monthlyRevenue,
    monthlyExpenses
  };
};
