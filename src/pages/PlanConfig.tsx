
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import PlanCard from '@/components/plan/PlanCard';
import { fetchPlans, savePlan, createPlan, deletePlan, PlanType } from '@/services/planService';

const PlanConfig = () => {
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editedPlan, setEditedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    loadPlans();
  }, []);
  
  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao carregar planos",
        description: "Não foi possível carregar os planos. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to start editing a plan
  const handleEditPlan = (plan: PlanType) => {
    setIsEditing(plan.id);
    setEditedPlan({...plan});
  };
  
  // Function to save changes to a plan
  const handleSavePlan = async () => {
    if (!editedPlan) return;
    
    setIsSaving(true);
    try {
      await savePlan(editedPlan);
      
      setPlans(plans.map(plan => 
        plan.id === editedPlan.id ? editedPlan : plan
      ));
      
      setIsEditing(null);
      setEditedPlan(null);
      
      toast({
        title: "Plano atualizado",
        description: `O plano ${editedPlan.name} foi atualizado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Erro ao atualizar plano",
        description: error.message || "Não foi possível atualizar o plano. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditedPlan(null);
  };
  
  // Function to add a new feature to a plan
  const handleAddFeature = (feature: string) => {
    if (!editedPlan) return;
    
    setEditedPlan({
      ...editedPlan,
      features: [...editedPlan.features, feature]
    });
  };
  
  // Function to remove a feature from a plan
  const handleRemoveFeature = (index: number) => {
    if (!editedPlan) return;
    
    const newFeatures = [...editedPlan.features];
    newFeatures.splice(index, 1);
    
    setEditedPlan({
      ...editedPlan,
      features: newFeatures
    });
  };
  
  // Function to change a feature value
  const handleChangeFeature = (index: number, value: string) => {
    if (!editedPlan) return;
    
    const newFeatures = [...editedPlan.features];
    newFeatures[index] = value;
    
    setEditedPlan({
      ...editedPlan,
      features: newFeatures
    });
  };
  
  // Function to update edited plan data
  const handleEditPlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedPlan) return;
    
    const { name, value, type, checked } = e.target;
    
    setEditedPlan({
      ...editedPlan,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Function to add a new plan
  const handleAddPlan = async () => {
    setIsSaving(true);
    try {
      const newPlan = await createPlan();
      
      if (newPlan) {
        setPlans([...plans, newPlan]);
        
        toast({
          title: "Plano adicionado",
          description: "Um novo plano foi adicionado. Edite-o para personalizar.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar plano",
        description: error.message || "Não foi possível adicionar o plano. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to delete a plan
  const handleDeletePlan = async (id: string) => {
    setIsSaving(true);
    try {
      await deletePlan(id);
      setPlans(plans.filter(plan => plan.id !== id));
      
      toast({
        title: "Plano removido",
        description: "O plano foi removido com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover plano",
        description: error.message || "Não foi possível remover o plano. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="container py-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuração de Planos</h1>
          <p className="text-gray-500">Gerencie os planos disponíveis para seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAddPlan}
            className="bg-futconnect-600 hover:bg-futconnect-700"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Adicionar Plano
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-futconnect-600" />
          <span className="ml-3 text-gray-600">Carregando planos...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isEditing={isEditing === plan.id}
              isSaving={isSaving}
              onEdit={handleEditPlan}
              onSave={handleSavePlan}
              onCancel={handleCancelEdit}
              onDelete={handleDeletePlan}
              editedPlan={editedPlan}
              onEditPlanChange={handleEditPlanChange}
              onAddFeature={handleAddFeature}
              onRemoveFeature={handleRemoveFeature}
              onChangeFeature={handleChangeFeature}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanConfig;
