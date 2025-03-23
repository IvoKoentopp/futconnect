
import { useQuery } from "@tanstack/react-query";
import { fetchPlans } from "@/services/planService";
import { PlanType } from "@/services/planService";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

// Expanded schema to include club and admin details
const clubFormSchema = z.object({
  // Club details
  clubName: z.string().min(2, { message: "Nome do clube deve ter pelo menos 2 caracteres" }),
  
  // Admin details
  adminName: z.string().min(2, { message: "Nome do administrador deve ter pelo menos 2 caracteres" }),
  adminEmail: z.string().email({ message: "Email inválido" }),
  adminPhone: z.string().min(10, { message: "Telefone inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string().min(6, { message: "Confirme sua senha" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const PricingPlans = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof clubFormSchema>>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {
      clubName: "",
      adminName: "",
      adminEmail: "",
      adminPhone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
  });

  const handlePurchase = (plan: PlanType) => {
    setSelectedPlan(plan);
    setIsClubDialogOpen(true);
  };
  
  const onSubmit = async (values: z.infer<typeof clubFormSchema>) => {
    if (!selectedPlan) return;
    
    setIsSubmitting(true);
    
    try {
      console.log("Form values:", values);
      console.log("Selected plan:", selectedPlan);
      
      // Generate a unique ID for the club
      const clubId = uuidv4();
      
      // 1. Create the club record
      const { error: clubError } = await supabase
        .from('clubs')
        .insert({
          id: clubId,
          name: values.clubName,
          is_active: true,
        });
      
      if (clubError) throw clubError;
      
      // Create club settings with default values
      const { error: settingsError } = await supabase
        .from('club_settings')
        .insert({
          club_id: clubId,
          description: `Configurações iniciais para o clube ${values.clubName}`,
        });
      
      if (settingsError) throw settingsError;
      
      // Generate a unique ID for the admin member
      const adminMemberId = uuidv4();
      
      // Create admin member record in members table
      // Updated to use 'Contribuinte' instead of 'Diretor' to match the allowed values
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          id: adminMemberId,
          club_id: clubId,
          name: values.adminName,
          email: values.adminEmail,
          password: values.password,
          birth_date: new Date().toISOString(), // Default value, can be updated later
          registration_date: new Date().toISOString(),
          category: 'Contribuinte', // Changed from 'Diretor' to 'Contribuinte' to match allowed values
          status: 'Ativo',
          positions: [], // Empty positions array
          phone: values.adminPhone,
        });
      
      if (memberError) {
        console.error("Error creating member:", memberError);
        throw memberError;
      }
      
      // 2. Store admin information locally for now (in a real app, this would go to a secure backend)
      // In this example, we're just storing it in localStorage for demo purposes
      const adminData = {
        id: uuidv4(),
        name: values.adminName,
        email: values.adminEmail,
        phone: values.adminPhone,
        password: values.password, // NEVER do this in production!
        role: 'club_admin',
        clubs: [{ 
          id: clubId, 
          name: values.clubName, 
          isAdmin: true 
        }],
        activeClub: { 
          id: clubId, 
          name: values.clubName, 
          isAdmin: true 
        }
      };
      
      // Store user data for login simulation (ONLY for DEMO purposes)
      localStorage.setItem(`futconnect_user_${values.adminEmail}`, JSON.stringify(adminData));
      
      // 3. Record the subscription/purchase
      const { error: customerError } = await supabase
        .from('customers')
        .insert({
          name: values.adminName,
          email: values.adminEmail,
          phone: values.adminPhone,
          plan: selectedPlan.name,
          status: 'active',
        });
      
      if (customerError) throw customerError;
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: `Clube ${values.clubName} foi criado e o plano ${selectedPlan.name} foi assinado.`,
      });
      
      // Reset form and close dialog
      form.reset();
      setIsClubDialogOpen(false);
    } catch (error) {
      console.error("Error creating club:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro ao cadastrar o clube. Por favor, tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6 bg-white shadow-sm">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-10 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-6" />
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 w-full mb-2" />
                ))}
                <Skeleton className="h-10 w-full mt-6" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || plans.length === 0) {
    return (
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Planos Indisponíveis</h2>
          <p className="text-gray-600">Por favor, tente novamente mais tarde.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">
            Planos para Cada Estágio do Seu Clube
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Escolha o plano que melhor se adapta às necessidades do seu clube, com flexibilidade para 
            crescer conforme sua equipe evolui.
          </p>
          
          <div className="mt-8 flex justify-center">
            <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Mensal</TabsTrigger>
                <TabsTrigger value="annual" className="relative">
                  Anual
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">
                    -20%
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
              <div className="text-4xl font-bold mb-6">
                {selectedPeriod === "annual" 
                  ? `R$ ${(Number(plan.price) * 0.8 * 12).toFixed(2)}`
                  : `R$ ${plan.price}`}
                <span className="text-base font-normal text-gray-500">
                  /{selectedPeriod === "annual" ? "ano" : "mês"}
                </span>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full"
                size="lg"
                onClick={() => handlePurchase(plan)}
              >
                Começar Agora
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isClubDialogOpen} onOpenChange={setIsClubDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cadastre seu Clube</DialogTitle>
            <DialogDescription>
              Complete o cadastro do seu clube para começar a usar o {selectedPlan?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-md font-semibold">Informações do Clube</h3>
                <FormField
                  control={form.control}
                  name="clubName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Clube</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-md font-semibold">Informações do Administrador</h3>
                <FormField
                  control={form.control}
                  name="adminName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="adminPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
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
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirme a Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Cadastrando...' : 'Cadastrar e Assinar'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PricingPlans;
