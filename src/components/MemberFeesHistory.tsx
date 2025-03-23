import React from 'react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { capitalCase } from 'change-case';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { MonthlyFee } from '@/types/monthlyFee';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper function to format date
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return format(parseISO(dateStr), 'dd/MM/yyyy');
};

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Helper function to get status badge styling
const getStatusBadge = (status: string) => {
  const statusStyles: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    paid_late: 'bg-orange-100 text-orange-800',
    pending: 'bg-yellow-100 text-yellow-800',
    late: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };
  
  return statusStyles[status] || 'bg-gray-100 text-gray-800';
};

// Helper function to get payment method display name
const getPaymentMethodLabel = (method?: string) => {
  if (!method) return '-';
  
  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    cash: 'Dinheiro',
    transfer: 'Transferência',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito'
  };
  
  return methodLabels[method] || capitalCase(method);
};

// Helper function to format month reference
const formatMonthReference = (dateStr: string) => {
  const date = parseISO(dateStr);
  return format(date, "MMMM 'de' yyyy", { locale: pt });
};

// Helper function to get status text in Portuguese
const getStatusText = (status: string) => {
  const statusLabels: Record<string, string> = {
    paid: 'Pago',
    paid_late: 'Pago em Atraso',
    pending: 'Pendente',
    late: 'Atrasado',
    cancelled: 'Cancelado'
  };
  
  return statusLabels[status] || capitalCase(status);
};

interface MemberFeesHistoryProps {
  fees: MonthlyFee[];
  isLoading: boolean;
  error: Error | null;
  memberName?: string;
}

const MemberFeesHistory: React.FC<MemberFeesHistoryProps> = ({ 
  fees, 
  isLoading, 
  error,
  memberName = 'Sócio'
}) => {
  // Function to generate PDF
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Histórico Financeiro - ${memberName}`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
      
      // Set up table data
      const tableColumn = ["Referência", "Valor", "Vencimento", "Pagamento", "Método", "Status"];
      const tableRows = fees.map(fee => [
        formatMonthReference(fee.referenceMonth),
        formatCurrency(fee.amount),
        formatDate(fee.dueDate),
        formatDate(fee.paymentDate),
        getPaymentMethodLabel(fee.paymentMethod),
        getStatusText(fee.status)
      ]);
      
      // Generate table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 15 }
      });
      
      // Calculate summary
      const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
      const paidAmount = fees
        .filter(fee => fee.status === 'paid')
        .reduce((sum, fee) => sum + fee.amount, 0);
      const pendingAmount = fees
        .filter(fee => fee.status === 'pending' || fee.status === 'late')
        .reduce((sum, fee) => sum + fee.amount, 0);
      
      // Add summary after the table
      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFontSize(10);
      doc.text(`Total de mensalidades: ${formatCurrency(totalAmount)}`, 14, finalY + 10);
      doc.text(`Total pago: ${formatCurrency(paidAmount)}`, 14, finalY + 16);
      doc.text(`Pendente de pagamento: ${formatCurrency(pendingAmount)}`, 14, finalY + 22);
      
      // Save PDF
      doc.save(`historico-financeiro-${memberName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        <p>Erro ao carregar mensalidades: {error.message}</p>
      </div>
    );
  }
  
  if (fees.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma mensalidade encontrada para este sócio.</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={generatePDF}
          className="flex items-center gap-2"
        >
          <FileText size={16} />
          Exportar PDF
        </Button>
      </div>
      
      <Table>
        <TableCaption>Histórico de mensalidades</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Referência</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fees.map((fee) => (
            <TableRow key={fee.id}>
              <TableCell className="font-medium">
                {formatMonthReference(fee.referenceMonth)}
              </TableCell>
              <TableCell>{formatCurrency(fee.amount)}</TableCell>
              <TableCell>{formatDate(fee.dueDate)}</TableCell>
              <TableCell>{formatDate(fee.paymentDate)}</TableCell>
              <TableCell>{getPaymentMethodLabel(fee.paymentMethod)}</TableCell>
              <TableCell>
                <Badge className={getStatusBadge(fee.status)}>
                  {fee.status === 'paid' && 'Pago'}
                  {fee.status === 'paid_late' && 'Pago em Atraso'}
                  {fee.status === 'pending' && 'Pendente'}
                  {fee.status === 'late' && 'Atrasado'}
                  {fee.status === 'cancelled' && 'Cancelado'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MemberFeesHistory;
