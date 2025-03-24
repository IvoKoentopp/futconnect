import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

/**
 * Exports an HTML element to PDF
 * @param elementId The ID of the element to export
 * @param filename The filename for the PDF without extension
 * @param orientation Optional PDF orientation ('p' for portrait or 'l' for landscape)
 */
export const exportElementToPdf = async (
  elementId: string, 
  filename: string, 
  orientation: 'p' | 'l' = 'p'
): Promise<void> => {
  try {
    toast.info('Gerando PDF, por favor aguarde...');
    
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Elemento não encontrado para exportação.');
      return;
    }

    // Add a class to the body during PDF generation to apply PDF-specific styling
    document.body.classList.add('generating-pdf');
    
    // Make PDF-only elements visible
    const pdfHeaderElements = element.querySelectorAll('.pdf-header-section');
    pdfHeaderElements.forEach(el => (el as HTMLElement).style.display = 'block');
    
    const footerElements = document.querySelectorAll('.pdf-footer');
    footerElements.forEach(el => (el as HTMLElement).classList.remove('hidden'));

    // Prepare tables for PDF generation
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
      // Adiciona classe específica para tabelas no PDF
      table.classList.add('pdf-table');
      // Define estilos inline para garantir que a tabela não quebre
      Object.assign(table.style, {
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        display: 'table',
        width: '100%',
        marginBottom: '20px' // Espaço entre tabelas
      });

      // Força todas as células a terem a mesma largura
      const cells = table.querySelectorAll('td, th');
      const cellWidth = `${100 / table.rows[0]?.cells.length}%`;
      cells.forEach(cell => {
        (cell as HTMLElement).style.width = cellWidth;
        Object.assign((cell as HTMLElement).style, {
          whiteSpace: 'normal',
          wordBreak: 'break-word'
        });
      });

      // Adiciona bordas mais visíveis para o PDF
      table.style.borderCollapse = 'collapse';
      cells.forEach(cell => {
        (cell as HTMLElement).style.border = '1px solid #ddd';
      });
    });

    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 500));

    // Use improved canvas settings
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Ensure tables in cloned document maintain their styles
        const clonedTables = clonedDoc.querySelectorAll('table');
        clonedTables.forEach(table => {
          (table as HTMLElement).style.pageBreakInside = 'avoid !important';
          (table as HTMLElement).style.breakInside = 'avoid !important';
          (table as HTMLElement).style.marginBottom = '20px';
        });

        // Ensure content is properly captured
        const content = clonedDoc.getElementById(elementId);
        if (content) {
          content.style.overflow = 'visible';
          content.style.height = 'auto';
        }
      }
    });

    // Reset styles after capturing
    document.body.classList.remove('generating-pdf');
    pdfHeaderElements.forEach(el => (el as HTMLElement).style.display = 'none');
    footerElements.forEach(el => (el as HTMLElement).classList.add('hidden'));
    tables.forEach(table => {
      table.classList.remove('pdf-table');
      table.removeAttribute('style');
      table.querySelectorAll('td, th').forEach(cell => {
        (cell as HTMLElement).removeAttribute('style');
      });
    });

    // Calculate PDF dimensions
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = orientation === 'p' ? 210 : 297;
    const pageHeight = orientation === 'p' ? 297 : 210;
    
    // Calculate image dimensions maintaining aspect ratio
    const aspectRatio = canvas.height / canvas.width;
    const imgWidth = pageWidth - 20; // 10mm margin on each side
    const imgHeight = imgWidth * aspectRatio;

    // Create PDF
    const pdf = new jsPDF(orientation, 'mm', 'a4');
    
    // Calculate number of pages needed
    const pagesNeeded = Math.ceil(imgHeight / (pageHeight - 20)); // 10mm margin top and bottom
    
    // Add content to pages
    for (let i = 0; i < pagesNeeded; i++) {
      if (i > 0) pdf.addPage();
      
      // Calculate position and height for current page
      const sourceY = i * (pageHeight - 20) / aspectRatio;
      const sourceHeight = Math.min(
        (pageHeight - 20) / aspectRatio,
        canvas.height - sourceY
      );
      
      // Create temporary canvas for this page section
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = sourceHeight;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        const pageImgData = tempCanvas.toDataURL('image/png');
        const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
        
        pdf.addImage(
          pageImgData,
          'PNG',
          10, // left margin
          10, // top margin
          imgWidth,
          pageImgHeight
        );
      }
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
    toast.success('PDF gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error('Erro ao gerar o PDF. Tente novamente.');
  }
};
