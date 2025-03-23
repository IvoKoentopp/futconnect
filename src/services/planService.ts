import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PlanType {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
  mostPopular: boolean;
}

// Default plans to show if we can't fetch from the database
const defaultPlans: PlanType[] = [
  {
    id: 'default-1',
    name: 'Basic Plan',
    price: 'R$99',
    description: 'Perfect for small clubs and starting teams',
    features: ['Basic member management', 'Game scheduling', 'Simple finances'],
    highlighted: false,
    cta: 'Get Started',
    mostPopular: false
  },
  {
    id: 'default-2',
    name: 'Pro Plan',
    price: 'R$199',
    description: 'Advanced features for growing clubs',
    features: ['Advanced member tracking', 'Team formations', 'Financial reports', 'Email notifications'],
    highlighted: true,
    cta: 'Try Pro',
    mostPopular: true
  },
  {
    id: 'default-3',
    name: 'Enterprise',
    price: 'R$399',
    description: 'Complete solution for professional clubs',
    features: ['Unlimited members', 'Advanced analytics', 'Priority support', 'Custom branding', 'API access'],
    highlighted: false,
    cta: 'Contact Sales',
    mostPopular: false
  }
];

export async function fetchPlans(): Promise<PlanType[]> {
  try {
    console.log("Starting fetchPlans service");
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('most_popular', { ascending: false });
    
    if (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error loading plans",
        description: "Could not fetch plans. Using default plans instead.",
        variant: "destructive",
      });
      console.log("Returning default plans due to fetch error");
      return defaultPlans; // Return default plans instead of empty array
    } 
    
    if (!data || data.length === 0) {
      console.log("No plans found in database, using default plans");
      return defaultPlans; // Return default plans instead of empty array
    }
    
    console.log("Raw data received:", data);
    
    // Convert from snake_case to camelCase and ensure price format
    const formattedPlans = data.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price.startsWith('R$') ? plan.price : `R$${plan.price}`,
      description: plan.description || '',
      features: Array.isArray(plan.features) ? plan.features : [],
      highlighted: Boolean(plan.highlighted),
      cta: plan.cta || 'Assinar',
      mostPopular: Boolean(plan.most_popular),
    }));
    
    console.log("Formatted plans:", formattedPlans);
    return formattedPlans;
  } catch (error) {
    console.error('Error in fetchPlans service:', error);
    toast({
      title: "Error loading plans",
      description: "Could not fetch plans. Using default plans instead.",
      variant: "destructive",
    });
    console.log("Returning default plans due to exception");
    return defaultPlans; // Return default plans instead of empty array
  }
}

export async function savePlan(plan: PlanType) {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({
        name: plan.name,
        price: plan.price,
        description: plan.description,
        features: plan.features,
        highlighted: plan.highlighted,
        cta: plan.cta,
        most_popular: plan.mostPopular,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id);
    
    if (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erro ao salvar plano",
        description: "Não foi possível salvar as alterações. Tente novamente mais tarde.",
        variant: "destructive",
      });
      throw error;
    }
    
    toast({
      title: "Plano atualizado",
      description: "As alterações foram salvas com sucesso.",
    });
    
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function createPlan() {
  const newPlan = {
    name: "Novo Plano",
    price: "R$0",
    description: "Descrição do novo plano",
    features: ["Recurso 1", "Recurso 2"],
    highlighted: false,
    cta: "Assinar",
    most_popular: false
  };
  
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(newPlan)
      .select();
    
    if (error) {
      console.error('Error adding plan:', error);
      toast({
        title: "Erro ao criar plano",
        description: "Não foi possível criar o novo plano. Tente novamente mais tarde.",
        variant: "destructive",
      });
      throw error;
    }
    
    toast({
      title: "Plano criado",
      description: "O novo plano foi criado com sucesso.",
    });
    
    if (data && data.length > 0) {
      return {
        id: data[0].id,
        name: data[0].name,
        price: data[0].price,
        description: data[0].description || '',
        features: data[0].features || [],
        highlighted: data[0].highlighted,
        cta: data[0].cta,
        mostPopular: data[0].most_popular,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function deletePlan(id: string) {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Erro ao excluir plano",
        description: "Não foi possível excluir o plano. Tente novamente mais tarde.",
        variant: "destructive",
      });
      throw error;
    }
    
    toast({
      title: "Plano excluído",
      description: "O plano foi excluído com sucesso.",
    });
    
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
