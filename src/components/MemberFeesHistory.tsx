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
import { Card, CardContent } from "@/components/ui/card";
import { CircleDollarSign, Clock, AlertCircle } from "lucide-react";

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card - Total Pago */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CircleDollarSign className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="text-lg font-medium">Total Pago</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(fees.filter(fee => fee.status === 'paid' || fee.status === 'paid_late')
                  .reduce((sum, fee) => sum + fee.amount, 0))}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {fees.filter(fee => fee.status === 'paid' || fee.status === 'paid_late').length} mensalidades
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card - Total Pendente */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-8 w-8 text-yellow-500 mb-2" />
              <h3 className="text-lg font-medium">Total Pendente</h3>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {formatCurrency(fees.filter(fee => fee.status === 'pending')
                  .reduce((sum, fee) => sum + fee.amount, 0))}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {fees.filter(fee => fee.status === 'pending').length} mensalidades
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card - Total em Atraso */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <h3 className="text-lg font-medium">Total em Atraso</h3>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(fees.filter(fee => fee.status === 'late')
                  .reduce((sum, fee) => sum + fee.amount, 0))}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {fees.filter(fee => fee.status === 'late').length} mensalidades
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
          {/* Cabeçalho para Desktop */}
          <TableRow className="hidden md:table-row">
            <TableHead>Referência</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
          {/* Cabeçalho para Mobile */}
          <TableRow className="md:hidden">
            <TableHead>Referência</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fees.map((fee, index) => {
            return [
              // Linha para Desktop
              <TableRow key={`desktop-${index}`} className="hidden md:table-row">
                <TableCell>{formatMonthReference(fee.referenceMonth)}</TableCell>
                <TableCell>{formatCurrency(fee.amount)}</TableCell>
                <TableCell>{formatDate(fee.dueDate)}</TableCell>
                <TableCell>{formatDate(fee.paymentDate)}</TableCell>
                <TableCell>{getPaymentMethodLabel(fee.paymentMethod)}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(fee.status)}>
                    {getStatusText(fee.status)}
                  </Badge>
                </TableCell>
              </TableRow>,
              // Linha para Mobile
              <TableRow key={`mobile-${index}`} className="md:hidden">
                <TableCell>{formatMonthReference(fee.referenceMonth)}</TableCell>
                <TableCell>{formatCurrency(fee.amount)}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(fee.status)}>
                    {getStatusText(fee.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ];
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default MemberFeesHistory;
