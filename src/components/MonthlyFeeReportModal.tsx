
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MonthlyFee } from '@/types/monthlyFee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportElementToPdf } from '@/utils/exportToPdf';
import { FileText, Printer, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyFeeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyFees: MonthlyFee[];
  clubName: string;
}

// Status badge component
const StatusBadge = ({ status }: { status: MonthlyFee['status'] }) => {
  let className = '';
  let label = '';
  
  switch (status) {
    case 'paid':
      className = 'bg-green-100 text-green-800';
      label = 'Pago';
      break;
    case 'paid_late':
      className = 'bg-orange-100 text-orange-800';
      label = 'Pago em Atraso';
      break;
    case 'pending':
      className = 'bg-yellow-100 text-yellow-800';
      label = 'Pendente';
      break;
    case 'late':
      className = 'bg-red-100 text-red-800';
      label = 'Atrasado';
      break;
    case 'cancelled':
      className = 'bg-gray-100 text-gray-800';
      label = 'Cancelado';
      break;
    default:
      className = 'bg-gray-100 text-gray-800';
      label = status;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para formatar mês sem conversão de timezone
const formatMonth = (dateString: string) => {
  if (!dateString) return '';
  
  // Pegando apenas a parte da data (YYYY-MM-DD)
  const dateParts = dateString.split('T')[0].split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // Mês é 0-indexed em JS
  
  // Criando um objeto Date local sem conversão de timezone
  const date = new Date(year, month, 1);
  
  // Formatando para exibição
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// Função para formatar data sem conversão de timezone
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  
  // Extraindo apenas a parte da data (YYYY-MM-DD)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Formatando para o formato brasileiro DD/MM/YYYY
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

const MonthlyFeeReportModal = ({ isOpen, onClose, monthlyFees, clubName }: MonthlyFeeReportModalProps) => {
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Filtrar mensalidades
  const filteredFees = monthlyFees.filter(fee => {
    if (statusFilter === 'all') return true;
    return fee.status === statusFilter;
  });
  
  // Calcular totais
  const totalPending = filteredFees
    .filter(fee => fee.status === 'pending')
    .reduce((sum, fee) => sum + fee.amount, 0);
    
  const totalLate = filteredFees
    .filter(fee => fee.status === 'late')
    .reduce((sum, fee) => sum + fee.amount, 0);
    
  const totalPaid = filteredFees
    .filter(fee => fee.status === 'paid' || fee.status === 'paid_late')
    .reduce((sum, fee) => sum + fee.amount, 0);
    
  const totalCancelled = filteredFees
    .filter(fee => fee.status === 'cancelled')
    .reduce((sum, fee) => sum + fee.amount, 0);
    
  const total = filteredFees.reduce((sum, fee) => sum + fee.amount, 0);
  
  // Handle PDF export
  const handleExportPDF = () => {
    exportElementToPdf('monthly-fees-report', `Relatório_Mensalidades_${format(new Date(), 'dd-MM-yyyy')}`, 'l');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Relatório de Mensalidades</DialogTitle>
          <DialogDescription>
            Visualize e exporte as informações de mensalidades
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="late">Atrasadas</SelectItem>
                <SelectItem value="paid">Pagas</SelectItem>
                <SelectItem value="paid_late">Pagas em Atraso</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto" id="monthly-fees-report">
          {/* PDF header section (hidden until print) */}
          <div className="pdf-header-section hidden mb-6">
            <h1 className="text-xl font-bold text-center">{clubName}</h1>
            <h2 className="text-lg font-medium text-center">Relatório de Mensalidades</h2>
            <p className="text-sm text-center text-gray-500">
              Gerado em {format(new Date(), 'PPP', { locale: ptBR })}
            </p>
          </div>
          
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Pendente</p>
              <p className="text-lg font-bold">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-gray-500">
                {filteredFees.filter(fee => fee.status === 'pending').length} mensalidades
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Atrasado</p>
              <p className="text-lg font-bold">{formatCurrency(totalLate)}</p>
              <p className="text-xs text-gray-500">
                {filteredFees.filter(fee => fee.status === 'late').length} mensalidades
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Pago</p>
              <p className="text-lg font-bold">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-gray-500">
                {filteredFees.filter(fee => fee.status === 'paid' || fee.status === 'paid_late').length} mensalidades
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Geral</p>
              <p className="text-lg font-bold">{formatCurrency(total)}</p>
              <p className="text-xs text-gray-500">
                {filteredFees.length} mensalidades
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sócio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mês de referência
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagamento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFees.length > 0 ? (
                  filteredFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {fee.memberName}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatMonth(fee.referenceMonth)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(fee.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(fee.dueDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={fee.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {fee.paymentDate 
                          ? formatDate(fee.paymentDate)
                          : '-'
                        }
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma mensalidade encontrada com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-medium">
                    Total: {filteredFees.length} mensalidades
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatCurrency(total)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyFeeReportModal;
