import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Configuração necessária para o worker do PDF
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  onDownload: () => void;
}

export function PDFViewer({ url, onDownload }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages));
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-sm border p-4 mb-4">
        {isLoading && (
          <Skeleton className="w-full h-[600px]" />
        )}
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            width={window.innerWidth > 768 ? 600 : window.innerWidth - 64}
            loading={null}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="outline"
          onClick={() => changePage(-1)}
          disabled={pageNumber <= 1}
          size="sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm">
          Página {pageNumber} de {numPages}
        </span>

        <Button
          variant="outline"
          onClick={() => changePage(1)}
          disabled={pageNumber >= numPages}
          size="sm"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          onClick={onDownload}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Baixar PDF
        </Button>
      </div>
    </div>
  );
}
