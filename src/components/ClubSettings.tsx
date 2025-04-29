import { useState, useRef, ChangeEvent, useEffect } from "react";
import { 
  Building2, 
  FileText, 
  Music, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  FileUp,
  Mail,
  Loader2,
  Users,
  ShieldAlert
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { resizeImage } from "@/utils/imageResizer";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { ClubAdminSettings } from "./ClubAdminSettings";
import { TeamConfigurationSettings } from "./TeamConfigurationSettings";

export const ClubSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canEdit } = useAuthorization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statuteInputRef = useRef<HTMLInputElement>(null);
  const anthemInputRef = useRef<HTMLInputElement>(null);
  const invitationInputRef = useRef<HTMLInputElement>(null);
  
  const [clubForm, setClubForm] = useState({
    name: user?.activeClub?.name || "",
    description: "",
    logoUrl: "",
    statuteUrl: "",
    anthemUrl: "",
    invitationUrl: "",
    anthemLinkUrl: "",
    invitationLinkUrl: ""
  });
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [statuteFile, setStatuteFile] = useState<File | null>(null);
  const [anthemFile, setAnthemFile] = useState<File | null>(null);
  const [invitationFile, setInvitationFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  useEffect(() => {
    if (user?.activeClub?.id) {
      fetchClubSettings();
    } else {
      setIsFetching(false);
    }
  }, [user]);
  
  const fetchClubSettings = async () => {
    try {
      // Buscar as configurações do clube ativo
      const { data: settings, error } = await supabase
        .from('club_settings')
        .select('*')
        .eq('club_id', user?.activeClub?.id)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      if (settings) {
        setClubForm({
          name: user?.activeClub?.name || "",
          description: settings.description || "",
          logoUrl: settings.logo_url || "",
          statuteUrl: settings.statute_url || "",
          anthemUrl: settings.anthem_url || "",
          invitationUrl: settings.invitation_url || "",
          anthemLinkUrl: settings.anthem_link_url || "",
          invitationLinkUrl: settings.invitation_link_url || ""
        });
        
        if (settings.logo_url) {
          setLogoPreview(settings.logo_url);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar configurações do clube:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações do clube.",
      });
    } finally {
      setIsFetching(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem editar as configurações do clube.",
      });
      return;
    }

    const { name, value } = e.target;
    setClubForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>, type: 'logo' | 'statute' | 'anthem' | 'invitation') => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem editar as configurações do clube.",
      });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      let fileToUpload = file;
      let filePath = '';
      
      // Se for uma logo, redimensionar para 200x200 pixels
      if (type === 'logo') {
        try {
          // Redimensionar a imagem antes do upload (200x200 pixels)
          fileToUpload = await resizeImage(file, 200, 200);
          // Sempre usar jpg para padronizar e garantir melhor compressão
          filePath = `${user?.activeClub?.id}/${type}/logo.jpg`;
        } catch (resizeError) {
          console.error('Erro ao redimensionar logo:', resizeError);
          toast({
            title: 'Erro ao processar imagem',
            description: 'Não foi possível redimensionar a logo. Tente novamente.',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }
      } else {
        // Para outros tipos de arquivo (não imagens), manter o processamento original
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        filePath = `${user?.activeClub?.id}/${type}/${fileName}`;
      }
      
      // Upload do arquivo para o storage
      const { error: uploadError } = await supabase.storage
        .from('club-files')
        .upload(filePath, fileToUpload, { upsert: true });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Obter a URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('club-files')
        .getPublicUrl(filePath);
      
      // Atualizar o estado com a URL do arquivo
      if (type === 'logo') {
        setLogoPreview(publicUrl);
        setClubForm(prev => ({ ...prev, logoUrl: publicUrl }));
      } else if (type === 'statute') {
        setStatuteFile(file);
        setClubForm(prev => ({ ...prev, statuteUrl: publicUrl }));
      } else if (type === 'anthem') {
        setAnthemFile(file);
        setClubForm(prev => ({ ...prev, anthemUrl: publicUrl }));
      } else if (type === 'invitation') {
        setInvitationFile(file);
        setClubForm(prev => ({ ...prev, invitationUrl: publicUrl }));
      }
      
      toast({
        title: "Arquivo enviado com sucesso",
        description: "O arquivo foi enviado e salvo com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar arquivo",
        description: "Não foi possível fazer o upload do arquivo.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem editar as configurações do clube.",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Primeiro verifica se já existe um registro para o clube
      const { data: existingSettings } = await supabase
        .from('club_settings')
        .select('id')
        .eq('club_id', user?.activeClub?.id)
        .maybeSingle();
      
      // Se existe, atualiza. Se não, insere.
      const { error } = await supabase
        .from('club_settings')
        .upsert({
          ...(existingSettings?.id ? { id: existingSettings.id } : {}),
          club_id: user?.activeClub?.id,
          description: clubForm.description,
          logo_url: clubForm.logoUrl,
          statute_url: clubForm.statuteUrl,
          anthem_url: clubForm.anthemUrl,
          invitation_url: clubForm.invitationUrl,
          anthem_link_url: clubForm.anthemLinkUrl,
          invitation_link_url: clubForm.invitationLinkUrl,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Configurações salvas",
        description: "As configurações do clube foram atualizadas com sucesso.",
      });

      // Atualiza os dados após salvar
      fetchClubSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações do clube.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user?.activeClub?.id) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-muted-foreground">Selecione um clube para ver as configurações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Informações básicas e arquivos do clube
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEdit && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-md mb-4">
              <ShieldAlert className="h-5 w-5" />
              <p>Você está no modo visualização. Apenas administradores podem editar as configurações.</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Clube</Label>
            <Textarea
              id="description"
              name="description"
              value={clubForm.description}
              onChange={handleInputChange}
              placeholder="Digite uma descrição para o clube..."
              className="resize-none"
              rows={4}
              disabled={!canEdit}
            />
          </div>

          {/* Logo do Clube */}
          <div className="space-y-2">
            <Label>Logo do Clube</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo do clube"
                  className="h-20 w-20 object-cover rounded-md"
                />
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEdit || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Alterar Logo
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'logo')}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Estatuto do Clube */}
          <div className="space-y-2">
            <Label>Estatuto do Clube</Label>
            <div className="flex items-center gap-4">
              {statuteFile && (
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">{statuteFile.name}</span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => statuteInputRef.current?.click()}
                disabled={!canEdit || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    {clubForm.statuteUrl ? 'Alterar Estatuto' : 'Upload do Estatuto'}
                  </>
                )}
              </Button>
              <input
                ref={statuteInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'statute')}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Hino do Clube */}
          <div className="space-y-2">
            <Label>Hino do Clube</Label>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {anthemFile && (
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    <span className="text-sm">{anthemFile.name}</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => anthemInputRef.current?.click()}
                  disabled={!canEdit || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      {clubForm.anthemUrl ? 'Alterar Hino' : 'Upload do Hino'}
                    </>
                  )}
                </Button>
                <input
                  ref={anthemInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'anthem')}
                  disabled={!canEdit}
                />
              </div>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  name="anthemLinkUrl"
                  value={clubForm.anthemLinkUrl}
                  onChange={handleInputChange}
                  placeholder="Ou cole um link do YouTube/SoundCloud..."
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>

          {/* Convite do Clube */}
          <div className="space-y-2">
            <Label>Convite do Clube</Label>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {invitationFile && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    <span className="text-sm">{invitationFile.name}</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => invitationInputRef.current?.click()}
                  disabled={!canEdit || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      {clubForm.invitationUrl ? 'Alterar Convite' : 'Upload do Convite'}
                    </>
                  )}
                </Button>
                <input
                  ref={invitationInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'invitation')}
                  disabled={!canEdit}
                />
              </div>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  name="invitationLinkUrl"
                  value={clubForm.invitationLinkUrl}
                  onChange={handleInputChange}
                  placeholder="Ou cole um link para o convite..."
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canEdit || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Configurações de Times */}
      <TeamConfigurationSettings />

      {/* Configurações de Administradores */}
      <ClubAdminSettings />
    </div>
  );
};
