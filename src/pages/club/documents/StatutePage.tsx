import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClubDocuments } from "@/hooks/useClubDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { Button } from "@/components/ui/button";
import { Download, FileWarning, Loader2 } from "lucide-react";

export function StatutePage() {
  const { user } = useAuth();
  const { canEdit } = useAuthorization();
  const { document, isLoading, downloadDocument } = useClubDocuments("statute");

  if (isLoading) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estatuto do Clube</CardTitle>
              <CardDescription>Estatuto oficial do {user?.activeClub?.name || 'clube'}</CardDescription>
            </div>
            {document?.url && (
              <Button
                onClick={downloadDocument}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {document?.url ? (
            <iframe
              src={document.url}
              className="w-full h-[600px] border-0 rounded-lg"
              title="Visualização do Estatuto"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-gray-50">
              <FileWarning className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 text-center">
                {canEdit 
                  ? "O estatuto ainda não foi cadastrado. Acesse as configurações do clube para fazer o upload."
                  : "O estatuto ainda não foi cadastrado pelo administrador do clube."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
