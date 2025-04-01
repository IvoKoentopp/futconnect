import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClubDocuments } from "@/hooks/useClubDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { Button } from "@/components/ui/button";
import { Download, FileWarning, Loader2, ExternalLink } from "lucide-react";

export function InvitationPage() {
  const { user } = useAuth();
  const { canEdit } = useAuthorization();
  const { document, isLoading, downloadDocument } = useClubDocuments("invitation");

  const openPresentationUrl = () => {
    if (document?.link_url) {
      window.open(document.link_url, '_blank');
    }
  };

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
              <CardTitle>Convite do Clube</CardTitle>
              <CardDescription>Convite oficial do {user?.activeClub?.name || 'clube'}</CardDescription>
            </div>
            <div className="flex gap-2">
              {document?.link_url && (
                <Button
                  onClick={openPresentationUrl}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver Apresentação
                </Button>
              )}
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
          </div>
        </CardHeader>
        <CardContent>
          {document?.url ? (
            <iframe
              src={document.url}
              className="w-full h-[600px] border-0 rounded-lg"
              title="Visualização do Convite"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-gray-50">
              <FileWarning className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 text-center">
                {canEdit 
                  ? "O convite ainda não foi cadastrado. Acesse as configurações do clube para fazer o upload."
                  : "O convite ainda não foi cadastrado pelo administrador do clube."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
