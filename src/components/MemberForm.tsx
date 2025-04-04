import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, Mail, Key, Calendar, Phone, Users, DollarSign, 
  UserCheck, ShieldAlert, Search, Play, CheckSquare 
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateInput } from "@/components/ui/date-input";
import { parse } from "date-fns";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Player positions
const positions = [
  { id: "goleiro", label: "Goleiro" },
  { id: "defensor", label: "Defensor" },
  { id: "meio", label: "Meio" },
  { id: "atacante", label: "Atacante" }
];

// Função para criar o schema do formulário
const createMemberFormSchema = (clubId: string) => z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  nickname: z.string().min(2, {
    message: "O apelido deve ter pelo menos 2 caracteres.",
  }).superRefine(async (nickname, ctx) => {
    // Skip validation if editing and nickname hasn't changed
    const formData = ctx.path[0] === 'nickname' ? (ctx as any).parent : null;
    if (formData?.id && nickname === formData.originalNickname) {
      return;
    }

    try {
      if (!clubId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Não foi possível validar o apelido: clube não selecionado",
        });
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .select('id')
        .eq('club_id', clubId)
        .ilike('nickname', nickname) // Usa ilike para busca case-insensitive
        .maybeSingle();

      if (error) {
        console.error('Error checking nickname:', error);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Erro ao verificar apelido",
        });
        return;
      }

      if (data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Este apelido já está em uso no clube (mesmo ignorando maiúsculas/minúsculas)",
        });
      }
    } catch (error) {
      console.error('Error in nickname validation:', error);
      // Não bloqueia o formulário em caso de erro na validação
      return;
    }
  }),
  email: z.string().email({
    message: "Email inválido.",
  }).superRefine(async (email, ctx) => {
    // Pula validação se estiver editando e o email não mudou
    const formData = ctx.path[0] === 'email' ? (ctx as any).parent : null;
    if (formData?.id && email === formData.originalEmail) {
      return;
    }

    try {
      // Verifica se o email já existe em qualquer clube
      const { data, error } = await supabase
        .from('members')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error checking email:', error);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Erro ao verificar email",
        });
        return;
      }

      if (data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Este email já está cadastrado no sistema. Cada pessoa deve ter um email único.",
        });
      }
    } catch (error) {
      console.error('Error in email validation:', error);
      return;
    }
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
  birthDate: z.date().optional(),
  photo: z.string().optional(),
  phone: z.string().optional(),
  registrationDate: z.date({
    required_error: "Selecione a data de cadastro.",
  }),
  category: z.enum(["Colaborador", "Contribuinte", "Convidado"], {
    required_error: "Selecione uma categoria.",
  }),
  paymentStartDate: z.date().optional(),
  status: z.enum(["Ativo", "Inativo", "Suspenso", "Sistema"]).optional().default("Ativo"),
  sponsorId: z.string().optional(),
  positions: z.array(z.string()).optional().default([]),
  originalNickname: z.string().optional(), // Adicionado para comparação na edição
  originalEmail: z.string().optional(), // Adicionado para comparação na edição
});

type MemberFormValues = z.infer<ReturnType<typeof createMemberFormSchema>>;

interface MemberFormProps {
  defaultValues?: Partial<MemberFormValues>;
  onSave?: (data: MemberFormValues) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  isViewOnly?: boolean;
  clubMembers?: { id: string; name: string; nickname?: string }[];
}

export function MemberForm({ 
  defaultValues, 
  onSave, 
  onCancel,
  isEditing = false,
  isViewOnly = false,
  clubMembers = []
}: MemberFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [photoPreview, setPhotoPreview] = useState<string | null>(defaultValues?.photo || null);
  
  // Set default form values
  const memberFormSchema = createMemberFormSchema(user.activeClub.id);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      nickname: defaultValues?.nickname || "",
      originalNickname: defaultValues?.nickname, // Adicionado para comparação na edição
      email: defaultValues?.email || "",
      password: defaultValues?.password || "",
      birthDate: defaultValues?.birthDate,
      photo: defaultValues?.photo || "",
      phone: defaultValues?.phone || "",
      registrationDate: defaultValues?.registrationDate || new Date(),
      category: defaultValues?.category || "Contribuinte",
      paymentStartDate: defaultValues?.paymentStartDate,
      status: defaultValues?.status || "Ativo",
      sponsorId: defaultValues?.sponsorId || "",
      positions: defaultValues?.positions || [],
    },
  });

  // Watch for changes in the category field
  const category = form.watch("category");

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnly) return; // Prevent photo upload if view only
    
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoPreview(result);
      form.setValue("photo", result);
    };
    reader.readAsDataURL(file);
  };

  // Submit handler
  const onSubmit = (data: MemberFormValues) => {
    console.log("Form submitted:", data);
    
    // Additional validation for paymentStartDate when category is "Contribuinte"
    if (data.category === "Contribuinte" && !data.paymentStartDate) {
      form.setError("paymentStartDate", {
        message: "Data de início de pagamento obrigatória para Contribuintes.",
      });
      return;
    }

    if (onSave) {
      onSave(data);
    } else {
      // If no onSave handler is provided, just show a success toast
      toast({
        title: isEditing ? "Sócio atualizado" : "Sócio cadastrado",
        description: `${data.name} foi ${isEditing ? "atualizado" : "cadastrado"} com sucesso!`,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-0 mb-4 h-auto">
            <TabsTrigger value="personal" className="w-full text-sm sm:text-base whitespace-nowrap py-2 px-4">
              <span className="truncate">Informações Pessoais</span>
            </TabsTrigger>
            <TabsTrigger value="membership" className="w-full text-sm sm:text-base whitespace-nowrap py-2 px-4">
              <span className="truncate">Dados de Associação</span>
            </TabsTrigger>
            <TabsTrigger value="football" className="w-full text-sm sm:text-base whitespace-nowrap py-2 px-4">
              <span className="truncate">Futebol</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left column */}
              <div className="flex-1 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input className="pl-9" {...field} disabled={isViewOnly} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apelido</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input className="pl-9" {...field} disabled={isViewOnly} />
                        </div>
                      </FormControl>
                      <FormDescription>
                        O apelido não pode ser repetido dentro do mesmo clube (não diferencia maiúsculas/minúsculas).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input className="pl-9" type="email" {...field} disabled={isViewOnly} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input className="pl-9" type="password" {...field} disabled={isViewOnly} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input className="pl-9" {...field} disabled={isViewOnly} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Right column */}
              <div className="flex-1 space-y-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Nascimento</FormLabel>
                      {isViewOnly ? (
                        <div className="p-2 border rounded-md bg-gray-50">
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Não informada"}
                        </div>
                      ) : (
                        <FormControl>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="DD/MM/AAAA"
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="photo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto</FormLabel>
                      <div className="flex flex-col items-center space-y-4">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={photoPreview || ""} alt="Foto do membro" />
                          <AvatarFallback className="text-lg">
                            {form.getValues("name")
                              .split(" ")
                              .map(n => n[0])
                              .join("")
                              .toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {!isViewOnly && (
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="photo-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg
                                  className="w-8 h-8 mb-3 text-gray-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  ></path>
                                </svg>
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG ou GIF (Máx. 2MB)</p>
                              </div>
                              <input
                                id="photo-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                              />
                            </label>
                          </div>
                        )}
                        <input type="hidden" {...field} />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Membership Tab */}
          <TabsContent value="membership" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left column */}
              <div className="flex-1 space-y-4">
                <FormField
                  control={form.control}
                  name="registrationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Cadastro</FormLabel>
                      {isViewOnly ? (
                        <div className="p-2 border rounded-md bg-gray-50">
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Não informada"}
                        </div>
                      ) : (
                        <FormControl>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="DD/MM/AAAA"
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      {isViewOnly ? (
                        <div className="p-2 border rounded-md bg-gray-50">
                          {field.value || "Não informada"}
                        </div>
                      ) : (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Colaborador">Colaborador</SelectItem>
                            <SelectItem value="Contribuinte">Contribuinte</SelectItem>
                            <SelectItem value="Convidado">Convidado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {category === "Contribuinte" && (
                  <FormField
                    control={form.control}
                    name="paymentStartDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Início de Pagamento</FormLabel>
                        {isViewOnly ? (
                          <div className="p-2 border rounded-md bg-gray-50">
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Não informada"}
                          </div>
                        ) : (
                          <FormControl>
                            <DateInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="DD/MM/AAAA"
                            />
                          </FormControl>
                        )}
                        <FormDescription>
                          Obrigatório apenas para categoria Contribuinte.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              {/* Right column */}
              <div className="flex-1 space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      {isViewOnly ? (
                        <div className="p-2 border rounded-md bg-gray-50">
                          {field.value || "Não informado"}
                        </div>
                      ) : (
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Ativo" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Ativo
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Inativo" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Inativo
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Suspenso" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Suspenso
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Sistema" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Sistema
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sponsorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Padrinho</FormLabel>
                      {isViewOnly ? (
                        <div className="p-2 border rounded-md bg-gray-50">
                          {clubMembers.find(m => m.id === field.value)?.nickname || 
                           clubMembers.find(m => m.id === field.value)?.name || 
                          "Não informado"}
                        </div>
                      ) : (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione um padrinho (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clubMembers.length > 0 ? (
                              clubMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.nickname || member.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                Nenhum sócio disponível
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                      <FormDescription>
                        Sócio que convidou este membro.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Football Tab */}
          <TabsContent value="football" className="space-y-4">
            <FormField
              control={form.control}
              name="positions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Posições Preferidas</FormLabel>
                    <FormDescription>
                      Selecione até 2 posições em que o sócio prefere jogar.
                    </FormDescription>
                  </div>
                  {isViewOnly ? (
                    <div className="p-2 border rounded-md bg-gray-50">
                      {form.getValues("positions").length > 0 
                        ? form.getValues("positions")
                            .map(posId => positions.find(p => p.id === posId)?.label)
                            .filter(Boolean)
                            .join(", ")
                        : "Nenhuma posição selecionada"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {positions.map((position) => (
                        <FormField
                          key={position.id}
                          control={form.control}
                          name="positions"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={position.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(position.id)}
                                    onCheckedChange={(checked) => {
                                      const currentPositions = [...(field.value || [])];
                                      
                                      if (checked && !currentPositions.includes(position.id)) {
                                        // If already has 2 positions and trying to add more, show error
                                        if (currentPositions.length >= 2) {
                                          form.setError("positions", {
                                            message: "Selecione no máximo 2 posições.",
                                          });
                                          return;
                                        }
                                        field.onChange([...currentPositions, position.id]);
                                      } else {
                                        field.onChange(
                                          currentPositions.filter(
                                            (value) => value !== position.id
                                          )
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {position.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          {!isViewOnly && (
            <Button type="submit">
              {isEditing ? "Atualizar" : "Cadastrar"} Sócio
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
