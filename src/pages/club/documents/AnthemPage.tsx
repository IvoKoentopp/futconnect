import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClubDocuments } from "@/hooks/useClubDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { Button } from "@/components/ui/button";
import { Download, FileWarning, Loader2, ExternalLink } from "lucide-react";

export function AnthemPage() {
  const { user } = useAuth();
  const { canEdit } = useAuthorization();
  const { document, isLoading, downloadDocument } = useClubDocuments("anthem");

  const openAudioUrl = () => {
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
              <CardTitle>Hino do Clube</CardTitle>
              <CardDescription>Hino oficial do {user?.activeClub?.name || 'clube'}</CardDescription>
            </div>
            <div className="flex gap-2">
              {document?.link_url && (
                <Button
                  onClick={openAudioUrl}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvir Hino
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
                  Baixar Partitura
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
              title="Visualização da Partitura do Hino"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-gray-50">
              <FileWarning className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 text-center">
                {canEdit 
                  ? "A partitura do hino ainda não foi cadastrada. Acesse as configurações do clube para fazer o upload."
                  : "A partitura do hino ainda não foi cadastrada pelo administrador do clube."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
