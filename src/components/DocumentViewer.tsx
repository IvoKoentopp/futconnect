import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, FileWarning } from "lucide-react";
import { PDFViewer } from "@/components/PDFViewer";

interface DocumentViewerProps {
  title: string;
  description: string;
  isLoading: boolean;
  hasDocument: boolean;
  onDownload: () => void;
  isAdmin?: boolean;
  document?: any;
}

export function DocumentViewer({ 
  title, 
  description, 
  isLoading, 
  hasDocument, 
  onDownload,
  isAdmin = false,
  document
}: DocumentViewerProps) {
  if (isLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
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
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-futconnect-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasDocument ? (
          <PDFViewer url={document?.url || ''} onDownload={onDownload} />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-gray-50">
            <FileWarning className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500 text-center">
              {isAdmin 
                ? "Este documento ainda não foi cadastrado. Acesse as configurações do clube para fazer o upload."
                : "Este documento ainda não foi cadastrado pelo administrador do clube."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
