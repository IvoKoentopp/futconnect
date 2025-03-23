
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MemberFormModal } from '@/components/MemberFormModal';
import { useIsMobile } from '@/hooks/use-mobile';
import * as XLSX from 'xlsx';
import { 
  Search, 
  User, 
  Calendar, 
  Tag, 
  Users, 
  BadgeCheck, 
  X,
  Phone,
  Mail,
  Download,
  ClipboardList,
  Edit,
  Trash2,
  MoreVertical,
  Save,
  Upload,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let className = '';
  
  switch (status) {
    case 'Ativo':
      className = 'bg-green-100 text-green-800';
      break;
    case 'Suspenso':
      className = 'bg-yellow-100 text-yellow-800';
      break;
    case 'Inativo':
      className = 'bg-red-100 text-red-800';
      break;
    case 'Sistema':
      className = 'bg-blue-100 text-blue-800';
      break;
    default:
      className = 'bg-gray-100 text-gray-800';
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {status}
    </span>
  );
};

const ListaSocios = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedMember, setEditedMember] = useState<any>(null);
  const [availableSponsors, setAvailableSponsors] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  // Parse date from YYYY-MM-DD string without timezone conversion
  const parseExactDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    
    // Parse directly from YYYY-MM-DD format to day, month, year components
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Important: Don't construct a Date object with new Date() directly
    // as it will apply timezone offsets. Instead, create a Date object
    // with year, month, day components using UTC to avoid shifting
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  };
  
  // Format date to display in DD/MM/YYYY without timezone issues
  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '-';
    return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
  };
  
  // Fetch members data
  const fetchMembers = useCallback(async () => {
    if (!user?.activeClub?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*, sponsor:sponsor_id(name, nickname)')
        .eq('club_id', user.activeClub.id)
        .order('name');
      
      if (error) throw error;
      
      // Format the data for display - ensuring dates are handled correctly
      const formattedMembers = data.map(member => {
        return {
          id: member.id,
          name: member.name,
          nickname: member.nickname || '-',
          // Parse dates directly without timezone conversion
          birthDate: parseExactDate(member.birth_date),
          category: member.category,
          status: member.status,
          sponsorName: member.sponsor?.name || '-',
          sponsorNickname: member.sponsor?.nickname || '-',
          sponsorId: member.sponsor_id,
          email: member.email,
          phone: member.phone || '-',
          photo: member.photo_url,
          registrationDate: parseExactDate(member.registration_date),
          paymentStartDate: parseExactDate(member.payment_start_date),
          positions: member.positions || []
        };
      });
      
      setMembers(formattedMembers);
    } catch (error: any) {
      console.error("Error loading members:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao carregar sócios: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.activeClub?.id, toast]);
  
  // Fetch sponsors (other members who can be sponsors)
  const fetchSponsors = useCallback(async () => {
    if (!user?.activeClub?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, nickname')
        .eq('club_id', user.activeClub.id)
        .order('name');
      
      if (error) throw error;
      
      setAvailableSponsors(data);
    } catch (error: any) {
      console.error("Error loading sponsors:", error);
    }
  }, [user?.activeClub?.id]);
  
  // Load members and sponsors on component mount
  useEffect(() => {
    fetchMembers();
    fetchSponsors();
  }, [fetchMembers, fetchSponsors]);
  
  // Filter members based on search query
  const filteredMembers = members.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      (member.nickname && member.nickname.toLowerCase().includes(searchLower)) ||
      member.category.toLowerCase().includes(searchLower)
    );
  });
  
  // Handle opening member detail view
  const handleOpenDetail = (member: any) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
  };
  
  // Handle closing detail view
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedMember(null);
    setIsEditMode(false);
  };

  // Handle toggling edit mode
  const handleToggleEditMode = () => {
    if (!isEditMode && selectedMember) {
      setEditedMember({...selectedMember});
    }
    setIsEditMode(!isEditMode);
  };

  // Handle input change
  const handleInputChange = (field: string, value: any) => {
    setEditedMember(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview the image
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditedMember(prev => ({
          ...prev,
          photo: event.target.result as string
        }));
      }
    };
    reader.readAsDataURL(file);
    setPhotoFile(file);
  };

  // Handle saving changes
  const handleSaveChanges = async () => {
    if (!editedMember) return;
    
    try {
      // Format dates for the database
      const formatDateForDB = (date: Date | null | undefined) => {
        if (!date) return null;
        return date instanceof Date ? date.toISOString() : date;
      };

      const updateData = {
        name: editedMember.name,
        nickname: editedMember.nickname === '-' ? null : editedMember.nickname,
        email: editedMember.email,
        phone: editedMember.phone === '-' ? null : editedMember.phone,
        birth_date: formatDateForDB(editedMember.birthDate),
        registration_date: formatDateForDB(editedMember.registrationDate),
        payment_start_date: formatDateForDB(editedMember.paymentStartDate),
        category: editedMember.category,
        status: editedMember.status,
        sponsor_id: editedMember.sponsorId || null,
        positions: editedMember.positions || [],
        photo_url: editedMember.photo || null
      };
      
      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', editedMember.id);
      
      if (error) throw error;
      
      toast({
        title: "Sócio atualizado",
        description: `${editedMember.name} foi atualizado com sucesso.`,
      });
      
      fetchMembers();
      setSelectedMember(editedMember);
      setIsEditMode(false);
    } catch (error: any) {
      console.error("Erro ao atualizar sócio:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao atualizar sócio: ${error.message}`,
      });
    }
  };

  // Handle opening delete confirmation dialog
  const handleOpenDeleteDialog = (e: React.MouseEvent, member: any) => {
    e.stopPropagation();
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle member deletion
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberToDelete.id);
      
      if (error) throw error;
      
      setMembers(members.filter(m => m.id !== memberToDelete.id));
      
      toast({
        title: "Sócio excluído",
        description: `${memberToDelete.name} foi excluído com sucesso.`,
      });
      
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
      
      if (selectedMember && selectedMember.id === memberToDelete.id) {
        handleCloseDetail();
      }
    } catch (error: any) {
      console.error("Erro ao excluir sócio:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao excluir sócio: ${error.message}`,
      });
    }
  };
  
  // Handle export members to Excel
  const handleExportToExcel = () => {
    try {
      // Create data array for Excel export
      const exportData = members.map(member => {
        return {
          'Nome': member.name,
          'Data de Nascimento': member.birthDate ? formatDisplayDate(member.birthDate) : '-',
          'Apelido': member.nickname !== '-' ? member.nickname : '',
          'Email': member.email || '-',
          'Telefone': member.phone !== '-' ? member.phone : '',
          'Categoria': member.category,
          'Status': member.status,
          'Padrinho': member.sponsorNickname !== '-' ? member.sponsorNickname : member.sponsorName,
          'Data de Cadastro': member.registrationDate ? formatDisplayDate(member.registrationDate) : '-',
          'Início de Pagamento': member.paymentStartDate ? formatDisplayDate(member.paymentStartDate) : '-',
          'Posições': member.positions && member.positions.length > 0 
            ? member.positions.map((pos: string) => pos.charAt(0).toUpperCase() + pos.slice(1)).join(', ')
            : '-'
        };
      });

      // Create worksheet from data
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sócios');
      
      // Generate Excel file and download
      const clubName = user?.activeClub?.name || 'clube';
      const fileName = `socios_${clubName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Exportação concluída",
        description: `Lista de sócios exportada com sucesso para ${fileName}`,
      });
    } catch (error: any) {
      console.error("Erro ao exportar sócios:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao exportar lista de sócios: ${error.message}`,
      });
    }
  };
  
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lista de Sócios</h1>
        <p className="text-gray-500">
          Visualize os sócios do clube {user?.activeClub?.name}
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Buscar por nome ou apelido..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="h-10"
                onClick={handleExportToExcel}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar para Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">
              Carregando sócios...
            </div>
          ) : filteredMembers.length > 0 ? (
            <>
              {isMobile ? (
                // Mobile card view
                <div className="grid grid-cols-1 gap-4">
                  {filteredMembers.map((member) => (
                    <div 
                      key={member.id}
                      className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleOpenDetail(member)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          {member.photo ? (
                            <AvatarImage src={member.photo} alt={member.name} />
                          ) : (
                            <AvatarFallback className="bg-futconnect-100 text-futconnect-600">
                              {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{member.name}</h3>
                          <p className="text-sm text-gray-500">{member.nickname !== '-' ? member.nickname : ''}</p>
                        </div>
                        <StatusBadge status={member.status} />
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Data de Nasc.:</span>
                          <p>
                            {formatDisplayDate(member.birthDate)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Padrinho:</span>
                          <p>{member.sponsorNickname !== '-' ? member.sponsorNickname : member.sponsorName}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteDialog(e, member);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop table view
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Foto</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data de Nascimento</TableHead>
                        <TableHead>Apelido</TableHead>
                        <TableHead>Padrinho</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow 
                          key={member.id} 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleOpenDetail(member)}
                        >
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              {member.photo ? (
                                <AvatarImage src={member.photo} alt={member.name} />
                              ) : (
                                <AvatarFallback className="bg-futconnect-100 text-futconnect-600">
                                  {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>
                            {formatDisplayDate(member.birthDate)}
                          </TableCell>
                          <TableCell>{member.nickname}</TableCell>
                          <TableCell>{member.sponsorNickname !== '-' ? member.sponsorNickname : member.sponsorName}</TableCell>
                          <TableCell>
                            <StatusBadge status={member.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={(e) => handleOpenDeleteDialog(e, member)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-gray-500">
              Nenhum sócio encontrado com os filtros atuais.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Member Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedMember && (
            <>
              <DialogHeader className="pb-4">
                <DialogTitle className="text-2xl">Detalhes do Sócio</DialogTitle>
                <DialogDescription>
                  Informações completas do sócio
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Member header with photo */}
                <div className="flex flex-col items-center text-center">
                  {isEditMode ? (
                    <div className="mb-3">
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <Avatar className="h-28 w-28 mb-2 relative group">
                          {editedMember.photo ? (
                            <AvatarImage src={editedMember.photo} alt={editedMember.name} />
                          ) : (
                            <AvatarFallback className="bg-futconnect-100 text-futconnect-600 text-3xl">
                              {editedMember.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-8 w-8 text-white" />
                          </div>
                        </Avatar>
                        <p className="text-xs text-gray-500">Clique para alterar a foto</p>
                      </label>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </div>
                  ) : (
                    <Avatar className="h-28 w-28 mb-3">
                      {selectedMember.photo ? (
                        <AvatarImage src={selectedMember.photo} alt={selectedMember.name} />
                      ) : (
                        <AvatarFallback className="bg-futconnect-100 text-futconnect-600 text-3xl">
                          {selectedMember.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  
                  {isEditMode ? (
                    <Input 
                      className="text-center font-bold text-xl mb-1" 
                      value={editedMember.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  ) : (
                    <h2 className="text-xl font-bold">{selectedMember.name}</h2>
                  )}
                  {isEditMode ? (
                    <Input 
                      className="text-center text-gray-500 mb-1" 
                      value={editedMember.nickname !== '-' ? editedMember.nickname : ''}
                      onChange={(e) => handleInputChange('nickname', e.target.value || '-')}
                      placeholder="Apelido"
                    />
                  ) : (
                    <p className="text-gray-500">{selectedMember.nickname !== '-' ? selectedMember.nickname : ''}</p>
                  )}
                  {isEditMode ? (
                    <Select 
                      value={editedMember.status} 
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Suspenso">Suspenso</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Sistema">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge status={selectedMember.status} />
                  )}
                </div>
                
                {/* Member details in sections */}
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-gray-900 flex items-center mb-3">
                      <User className="mr-2 h-4 w-4" />
                      Informações Pessoais
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Nome:</span>
                        {isEditMode ? (
                          <Input 
                            className="h-8 text-sm" 
                            value={editedMember.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm font-medium">{selectedMember.name}</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Apelido:</span>
                        {isEditMode ? (
                          <Input 
                            className="h-8 text-sm" 
                            value={editedMember.nickname !== '-' ? editedMember.nickname : ''}
                            onChange={(e) => handleInputChange('nickname', e.target.value || '-')}
                          />
                        ) : (
                          <span className="text-sm font-medium">{selectedMember.nickname}</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Data de Nascimento:</span>
                        {isEditMode ? (
                          <DateInput 
                            value={editedMember.birthDate}
                            onChange={date => handleInputChange('birthDate', date)}
                            placeholder="DD/MM/AAAA"
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {formatDisplayDate(selectedMember.birthDate)}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Posições:</span>
                        {isEditMode ? (
                          <div className="flex flex-wrap gap-2">
                            {['Goleiro', 'Defensor', 'Meio', 'Atacante'].map(position => {
                              const positionKey = position.toLowerCase();
                              const isSelected = editedMember.positions?.includes(positionKey);
                              
                              return (
                                <Button
                                  key={positionKey}
                                  type="button"
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    const updatedPositions = isSelected
                                      ? editedMember.positions.filter((p: string) => p !== positionKey)
                                      : [...(editedMember.positions || []), positionKey];
                                    
                                    // Limit to 2 positions
                                    if (!isSelected && updatedPositions.length > 2) {
                                      toast({
                                        title: "Limite de posições",
                                        description: "Máximo de 2 posições permitidas",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    handleInputChange('positions', updatedPositions);
                                  }}
                                >
                                  {position}
                                </Button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm font-medium">
                            {selectedMember.positions && selectedMember.positions.length > 0 
                              ? selectedMember.positions
                                  .map((pos: string) => pos.charAt(0).toUpperCase() + pos.slice(1))
                                  .join(', ') 
                              : '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Information */}
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-gray-900 flex items-center mb-3">
                      <Mail className="mr-2 h-4 w-4" />
                      Contato
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Email:</span>
                        {isEditMode ? (
                          <Input 
                            className="h-8 text-sm" 
                            value={editedMember.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            type="email"
                          />
                        ) : (
                          <span className="text-sm font-medium">{selectedMember.email}</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Telefone:</span>
                        {isEditMode ? (
                          <Input 
                            className="h-8 text-sm" 
                            value={editedMember.phone !== '-' ? editedMember.phone : ''}
                            onChange={(e) => handleInputChange('phone', e.target.value || '-')}
                          />
                        ) : (
                          <span className="text-sm font-medium">{selectedMember.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Membership Information */}
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-gray-900 flex items-center mb-3">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Informações de Associação
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Categoria:</span>
                        {isEditMode ? (
                          <Select 
                            value={editedMember.category} 
                            onValueChange={(value) => handleInputChange('category', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Colaborador">Colaborador</SelectItem>
                              <SelectItem value="Contribuinte">Contribuinte</SelectItem>
                              <SelectItem value="Convidado">Convidado</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm font-medium">{selectedMember.category}</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Data de Cadastro:</span>
                        {isEditMode ? (
                          <DateInput 
                            value={editedMember.registrationDate} 
                            onChange={(date) => handleInputChange('registrationDate', date)}
                            placeholder="DD/MM/AAAA"
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {formatDisplayDate(selectedMember.registrationDate)}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Início de Pagamento:</span>
                        {isEditMode ? (
                          <DateInput 
                            value={editedMember.paymentStartDate} 
                            onChange={(date) => handleInputChange('paymentStartDate', date)}
                            placeholder="DD/MM/AAAA"
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {formatDisplayDate(selectedMember.paymentStartDate)}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Status:</span>
                        {isEditMode ? (
                          <Select 
                            value={editedMember.status} 
                            onValueChange={(value) => handleInputChange('status', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ativo">Ativo</SelectItem>
                              <SelectItem value="Suspenso">Suspenso</SelectItem>
                              <SelectItem value="Inativo">Inativo</SelectItem>
                              <SelectItem value="Sistema">Sistema</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm font-medium">
                            <StatusBadge status={selectedMember.status} />
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-gray-500">Padrinho:</span>
                        {isEditMode ? (
                          <Select 
                            value={editedMember.sponsorId || "none"} 
                            onValueChange={(value) => handleInputChange('sponsorId', value === "none" ? null : value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Selecione um padrinho" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {availableSponsors
                                .filter(sponsor => sponsor.id !== editedMember.id) // Can't sponsor self
                                .map(sponsor => (
                                  <SelectItem key={sponsor.id} value={sponsor.id}>
                                    {sponsor.nickname || sponsor.name}
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm font-medium">
                            {selectedMember.sponsorNickname !== '-' 
                              ? selectedMember.sponsorNickname 
                              : selectedMember.sponsorName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end gap-2">
                  {isEditMode ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditMode(false)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveChanges}
                        disabled={!editedMember?.name || !editedMember?.email}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={handleCloseDetail}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Fechar
                      </Button>
                      <Button 
                        onClick={handleToggleEditMode}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Sócio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {memberToDelete?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMember}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ListaSocios;
