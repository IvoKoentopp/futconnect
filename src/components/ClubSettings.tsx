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
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { ClubAdminSettings } from "./ClubAdminSettings";
import { TeamConfigurationSettings } from "./TeamConfigurationSettings";

export const ClubSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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
    const { name, value } = e.target;
    setClubForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      try {
        setIsLoading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `logos/${fileName}`;
        
        // Upload do arquivo para o Supabase Storage
        const { data, error } = await supabase.storage
          .from('club-files')
          .upload(filePath, file);
        
        if (error) {
          console.error('Error uploading logo:', error);
          throw error;
        }
        
        // Obter URL pública do arquivo
        const { data: publicURL } = supabase.storage
          .from('club-files')
          .getPublicUrl(filePath);
        
        setClubForm(prev => ({ ...prev, logoUrl: publicURL.publicUrl }));
        
        toast({
          title: "Logo enviado",
          description: "A imagem foi carregada com sucesso.",
        });
      } catch (error) {
        console.error('Erro ao fazer upload do logo:', error);
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: "Não foi possível enviar o logo. Tente novamente.",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleFileUpload = async (
    file: File | null, 
    folderPath: string, 
    successMessage: string,
    updateField: string
  ) => {
    if (!file) return null;
    
    try {
      setIsLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;
      
      // Upload do arquivo para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('club-files')
        .upload(filePath, file);
      
      if (error) {
        console.error(`Error uploading file to ${folderPath}:`, error);
        throw error;
      }
      
      // Obter URL pública do arquivo
      const { data: publicURL } = supabase.storage
        .from('club-files')
        .getPublicUrl(filePath);
      
      setClubForm(prev => ({ ...prev, [updateField]: publicURL.publicUrl }));
      
      toast({
        title: "Arquivo enviado",
        description: successMessage,
      });
      
      return publicURL.publicUrl;
    } catch (error) {
      console.error(`Erro ao fazer upload do arquivo para ${folderPath}:`, error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo. Tente novamente.",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatuteFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStatuteFile(file);
      await handleFileUpload(
        file, 
        'statutes', 
        "O estatuto foi carregado com sucesso.", 
        'statuteUrl'
      );
    }
  };
  
  const handleAnthemFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnthemFile(file);
      await handleFileUpload(
        file, 
        'anthems', 
        "O hino foi carregado com sucesso.", 
        'anthemUrl'
      );
    }
  };
  
  const handleInvitationFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvitationFile(file);
      await handleFileUpload(
        file, 
        'invitations', 
        "O convite foi carregado com sucesso.", 
        'invitationUrl'
      );
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.activeClub?.id) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Nenhum clube ativo selecionado.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Verificar se já existe configuração para este clube
      const { data: existingSettings, error: checkError } = await supabase
        .from('club_settings')
        .select('id')
        .eq('club_id', user.activeClub.id)
        .maybeSingle();
      
      if (checkError) {
        throw checkError;
      }
      
      let updateError;
      
      if (existingSettings) {
        // Atualizar configurações existentes
        const { error } = await supabase
          .from('club_settings')
          .update({
            logo_url: clubForm.logoUrl,
            statute_url: clubForm.statuteUrl,
            anthem_url: clubForm.anthemUrl,
            anthem_link_url: clubForm.anthemLinkUrl,
            invitation_url: clubForm.invitationUrl,
            invitation_link_url: clubForm.invitationLinkUrl,
            updated_at: new Date().toISOString()
          })
          .eq('club_id', user.activeClub.id);
        
        updateError = error;
      } else {
        // Criar novas configurações
        const { error } = await supabase
          .from('club_settings')
          .insert({
            club_id: user.activeClub.id,
            logo_url: clubForm.logoUrl,
            statute_url: clubForm.statuteUrl,
            anthem_url: clubForm.anthemUrl,
            anthem_link_url: clubForm.anthemLinkUrl,
            invitation_url: clubForm.invitationUrl,
            invitation_link_url: clubForm.invitationLinkUrl
          });
        
        updateError = error;
      }
      
      if (updateError) throw updateError;
      
      // Atualizar o nome do clube, se necessário
      if (clubForm.name !== user.activeClub.name) {
        const { error: clubUpdateError } = await supabase
          .from('clubs')
          .update({ 
            name: clubForm.name,
            updated_at: new Date().toISOString() 
          })
          .eq('id', user.activeClub.id);
        
        if (clubUpdateError) throw clubUpdateError;
      }
      
      toast({
        title: "Configurações do clube atualizadas",
        description: "As informações do seu clube foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações do clube:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar configurações",
        description: "Ocorreu um problema ao salvar as configurações do clube.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Basic Club Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-futconnect-600" />
              Informações Básicas do Clube
            </CardTitle>
            <CardDescription>
              Configure as informações básicas do seu clube que serão exibidas para os membros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clubName">Nome do Clube</Label>
                <Input 
                  id="clubName" 
                  name="name"
                  value={clubForm.name}
                  onChange={handleInputChange}
                  placeholder="Nome do seu clube"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo">Logo do Clube</Label>
                <div className="flex items-end gap-4">
                  {logoPreview && (
                    <div className="w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          {logoPreview ? "Alterar Logo" : "Upload Logo"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Club Statute Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-futconnect-600" />
              Estatuto do Clube
            </CardTitle>
            <CardDescription>
              Defina o estatuto oficial do seu clube.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="statute">Arquivo do Estatuto (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  ref={statuteInputRef}
                  className="hidden"
                  accept=".pdf"
                  onChange={handleStatuteFileChange}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => statuteInputRef.current?.click()}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      {statuteFile ? statuteFile.name : clubForm.statuteUrl ? "Alterar Estatuto" : "Upload Estatuto (PDF)"}
                    </>
                  )}
                </Button>
                {(statuteFile || clubForm.statuteUrl) && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setStatuteFile(null);
                      setClubForm(prev => ({ ...prev, statuteUrl: "" }));
                    }}
                    className="text-red-500 hover:text-red-700"
                    disabled={isLoading}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Carregue o estatuto do seu clube em formato PDF (máx. 10MB).
              </p>
              {clubForm.statuteUrl && (
                <div className="mt-2">
                  <a 
                    href={clubForm.statuteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-futconnect-600 hover:text-futconnect-700 flex items-center"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    Visualizar estatuto
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Club Anthem Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-futconnect-600" />
              Hino do Clube
            </CardTitle>
            <CardDescription>
              Configure o hino oficial do seu clube.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anthem">Arquivo do Hino (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  ref={anthemInputRef}
                  className="hidden"
                  accept=".pdf"
                  onChange={handleAnthemFileChange}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => anthemInputRef.current?.click()}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      {anthemFile ? anthemFile.name : clubForm.anthemUrl ? "Alterar Hino" : "Upload Hino (PDF)"}
                    </>
                  )}
                </Button>
                {(anthemFile || clubForm.anthemUrl) && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setAnthemFile(null);
                      setClubForm(prev => ({ ...prev, anthemUrl: "" }));
                    }}
                    className="text-red-500 hover:text-red-700"
                    disabled={isLoading}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Carregue a letra do hino do seu clube em formato PDF (máx. 5MB).
              </p>
              {clubForm.anthemUrl && (
                <div className="mt-2">
                  <a 
                    href={clubForm.anthemUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-futconnect-600 hover:text-futconnect-700 flex items-center"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    Visualizar hino
                  </a>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="anthemLinkUrl">Link para o Hino (YouTube, SoundCloud, etc.)</Label>
              <div className="flex gap-2">
                <Input 
                  id="anthemLinkUrl" 
                  name="anthemLinkUrl"
                  value={clubForm.anthemLinkUrl}
                  onChange={handleInputChange}
                  placeholder="https://"
                  type="url"
                />
                {clubForm.anthemLinkUrl && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => window.open(clubForm.anthemLinkUrl, '_blank')}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Club Invitation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-futconnect-600" />
              Convite para Sócios
            </CardTitle>
            <CardDescription>
              Configure o modelo de convite para novos sócios do seu clube.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitationFile">Arquivo de Convite (PDF ou Imagem)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  ref={invitationInputRef}
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={handleInvitationFileChange}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => invitationInputRef.current?.click()}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      {invitationFile ? invitationFile.name : clubForm.invitationUrl ? "Alterar Convite" : "Upload Convite"}
                    </>
                  )}
                </Button>
                {(invitationFile || clubForm.invitationUrl) && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setInvitationFile(null);
                      setClubForm(prev => ({ ...prev, invitationUrl: "" }));
                    }}
                    className="text-red-500 hover:text-red-700"
                    disabled={isLoading}
                  >
                    Remover
                  </Button>
                )}
              </div>
              {clubForm.invitationUrl && (
                <div className="mt-2">
                  <a 
                    href={clubForm.invitationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-futconnect-600 hover:text-futconnect-700 flex items-center"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    Visualizar convite
                  </a>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invitationLinkUrl">Link para Convite Online</Label>
              <Input 
                id="invitationLinkUrl" 
                name="invitationLinkUrl"
                value={clubForm.invitationLinkUrl}
                onChange={handleInputChange}
                placeholder="https://"
                type="url"
              />
              <p className="text-sm text-gray-500">
                Se você tem um convite online (por exemplo, no Canva ou Google Docs), compartilhe o link aqui.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Team Configuration Settings */}
        <TeamConfigurationSettings />
        
        {/* Club Administrators Section */}
        <ClubAdminSettings />
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-futconnect-600 hover:bg-futconnect-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações do Clube"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
