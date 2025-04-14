import React from 'react';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyFee, MonthlyFeeStatus, MonthlyFeePaymentMethod } from '@/types/monthlyFee';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';

interface OverdueFeesTableProps {
  clubId: string;
}

// Extending the MonthlyFee type to include memberName and nickname
type OverdueFee = MonthlyFee & { 
  memberName?: string;
  memberNickname?: string;
};

const OverdueFeesTable: React.FC<OverdueFeesTableProps> = ({ clubId }) => {
  const [overdueFees, setOverdueFees] = React.useState<OverdueFee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchOverdueFees = async () => {
      if (!clubId) return;
      
      try {
        setIsLoading(true);
        
        // Get current date
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Query for 'late' status fees only
        const { data, error } = await supabase
          .from('monthly_fees')
          .select(`
            *,
            members:member_id (name, nickname)
          `)
          .eq('club_id', clubId)
          .eq('status', 'late')
          .order('due_date', { ascending: false });
        
        if (error) throw error;
        
        // Transform the data to match the OverdueFee type
        const transformedData: OverdueFee[] = data.map(fee => ({
          id: fee.id,
          clubId: fee.club_id,
          memberId: fee.member_id,
          memberName: fee.members?.name || 'Nome não disponível',
          memberNickname: fee.members?.nickname || 'Apelido não disponível',
          referenceMonth: fee.reference_month,
          amount: fee.amount,
          dueDate: fee.due_date,
          paymentDate: fee.payment_date,
          status: fee.status as MonthlyFeeStatus,
          paymentMethod: fee.payment_method as MonthlyFeePaymentMethod,
          bankAccountId: fee.bank_account_id,
          transactionId: fee.transaction_id
        }));
        
        setOverdueFees(transformedData);
      } catch (error) {
        console.error('Error fetching overdue fees:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as mensalidades em atraso"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOverdueFees();
  }, [clubId, toast]);

  // Calculate days overdue
  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    const diffTime = Math.abs(today.getTime() - dueDateObj.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format the reference month
  const formatMonth = (dateString: string) => {
    if (!dateString) return '';
    
    const dateParts = dateString.split('T')[0].split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
        </div>
      ) : overdueFees.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
          <Clock className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p>Nenhuma mensalidade em atraso encontrada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sócio</TableHead>
                <TableHead>Mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueFees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.memberNickname}</TableCell>
                  <TableCell>{formatMonth(fee.referenceMonth)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>
              Total de {overdueFees.length} mensalidades em atraso
            </TableCaption>
          </Table>
        </div>
      )}
      
      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <a href="/monthly-fees">Ver todas as mensalidades</a>
        </Button>
      </div>
    </div>
  );
};

export default OverdueFeesTable;
