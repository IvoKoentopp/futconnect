import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, FileWarning } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StatuteSection {
  id: string;
  title: string;
  content: string;
}

interface StatuteViewerProps {
  title: string;
  description: string;
  isLoading: boolean;
  sections: StatuteSection[];
  onDownload: () => void;
  isAdmin?: boolean;
  pdfUrl?: string | null;
}

export function StatuteViewer({
  title,
  description,
  isLoading,
  sections,
  onDownload,
  isAdmin = false,
  pdfUrl
}: StatuteViewerProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const [showPdf, setShowPdf] = useState(false);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-futconnect-600" />
            {title}
          </CardTitle>
          <div className="flex gap-2">
            {pdfUrl && (
              <Button
                onClick={() => setShowPdf(!showPdf)}
                variant="outline"
                size="sm"
              >
                {showPdf ? 'Ver Texto' : 'Ver PDF'}
              </Button>
            )}
            <Button
              onClick={onDownload}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!pdfUrl}
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {showPdf ? (
          pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[600px] border-0 rounded-lg"
              title="Visualização do PDF do Estatuto"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-gray-50">
              <FileWarning className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 text-center">
                {isAdmin 
                  ? "O PDF do estatuto ainda não foi cadastrado. Acesse as configurações do clube para fazer o upload."
                  : "O PDF do estatuto ainda não foi cadastrado pelo administrador do clube."}
              </p>
            </div>
          )
        ) : (
          <Tabs
            value={activeSection}
            onValueChange={setActiveSection}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 md:grid-cols-3 h-auto gap-4 bg-transparent">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="data-[state=active]:bg-futconnect-50 data-[state=active]:text-futconnect-900"
                >
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map((section) => (
              <TabsContent
                key={section.id}
                value={section.id}
                className="mt-6 prose prose-futconnect max-w-none"
              >
                <div dangerouslySetInnerHTML={{ __html: section.content }} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
