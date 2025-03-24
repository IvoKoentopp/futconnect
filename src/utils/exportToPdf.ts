
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

    // Apply enhanced no-break styles to tables for PDF generation
    const tableElements = element.querySelectorAll('table');
    tableElements.forEach(table => {
      table.classList.add('pdf-table-no-break');
      (table as HTMLElement).style.pageBreakInside = 'avoid';
      (table as HTMLElement).style.breakInside = 'avoid';
    });
    
    // Apply PDF-specific styles to table rows - enhanced settings
    const tableRows = element.querySelectorAll('tr');
    tableRows.forEach(row => {
      row.classList.add('pdf-table-row');
      (row as HTMLElement).style.pageBreakInside = 'avoid';
      (row as HTMLElement).style.breakInside = 'avoid';
    });
    
    // Specific handling for player ranking tables
    const rankingTables = element.querySelectorAll('.player-ranking-table');
    rankingTables.forEach(table => {
      table.setAttribute('data-html2canvas-ignore-children', 'false');
      (table as HTMLElement).style.pageBreakInside = 'avoid';
      (table as HTMLElement).style.breakInside = 'avoid';
      (table as HTMLElement).style.display = 'table';
    });

    // Wait longer for styles to apply
    await new Promise(resolve => setTimeout(resolve, 300));

    // Use improved canvas settings for better table handling
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Enhanced handling for tables in cloned document
        const tables = clonedDoc.querySelectorAll('table');
        tables.forEach(table => {
          (table as HTMLElement).style.width = '100%';
          (table as HTMLElement).style.pageBreakInside = 'avoid';
          (table as HTMLElement).style.breakInside = 'avoid';
          table.setAttribute('data-html2canvas-ignore-children', 'false');
        });
        
        // Special handling for player ranking tables
        const playerTables = clonedDoc.querySelectorAll('.player-ranking-table');
        playerTables.forEach(table => {
          (table as HTMLElement).style.pageBreakInside = 'avoid !important';
          (table as HTMLElement).style.breakInside = 'avoid !important';
          
          // Force table rows to stick together
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            (row as HTMLElement).style.pageBreakInside = 'avoid !important';
            (row as HTMLElement).style.breakInside = 'avoid !important';
          });
        });
        
        // Ensure the whole content is captured properly
        const content = clonedDoc.getElementById('performance-content');
        if (content) {
          (content as HTMLElement).style.overflow = 'visible';
          (content as HTMLElement).style.height = 'auto';
        }
      },
      ignoreElements: (element) => {
        // Ignore any elements with data-html2canvas-ignore attribute
        return element.hasAttribute('data-html2canvas-ignore');
      }
    });
    
    // Reset the DOM after capturing the image
    document.body.classList.remove('generating-pdf');
    pdfHeaderElements.forEach(el => (el as HTMLElement).style.display = 'none');
    footerElements.forEach(el => (el as HTMLElement).classList.add('hidden'));
    tableElements.forEach(table => {
      table.classList.remove('pdf-table-no-break');
      (table as HTMLElement).style.pageBreakInside = '';
      (table as HTMLElement).style.breakInside = '';
    });
    tableRows.forEach(row => {
      row.classList.remove('pdf-table-row');
      (row as HTMLElement).style.pageBreakInside = '';
      (row as HTMLElement).style.breakInside = '';
    });
    rankingTables.forEach(table => {
      table.removeAttribute('data-html2canvas-ignore-children');
      (table as HTMLElement).style.pageBreakInside = '';
      (table as HTMLElement).style.breakInside = '';
    });

    // Calculate the PDF dimensions based on the element aspect ratio
    const imgData = canvas.toDataURL('image/png');
    
    // Set dimensions based on orientation
    const pageWidth = orientation === 'p' ? 210 : 297; // A4 width in mm (portrait or landscape)
    const pageHeight = orientation === 'p' ? 297 : 210; // A4 height in mm (portrait or landscape)
    
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF document of A4 size with specified orientation
    const pdf = new jsPDF(orientation, 'mm', 'a4');
    
    // Split the image into multiple pages if needed
    let heightLeft = imgHeight;
    let position = 0;
    let pageNumber = 1;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if content overflows
    while (heightLeft > 0) {
      position = heightLeft - imgHeight; // top of next page
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      pageNumber++;
    }

    // Save the PDF file
    pdf.save(`${filename}.pdf`);
    toast.success('PDF gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error('Erro ao gerar o PDF. Tente novamente.');
  }
};
