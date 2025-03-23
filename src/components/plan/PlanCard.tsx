
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Trash2, X, DollarSign } from "lucide-react";
import PlanFeaturesList from "./PlanFeaturesList";
import { PlanType } from "@/services/planService";

interface PlanCardProps {
  plan: PlanType;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: (plan: PlanType) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  editedPlan: PlanType | null;
  onEditPlanChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFeature: (feature: string) => void;
  onRemoveFeature: (index: number) => void;
  onChangeFeature: (index: number, value: string) => void;
}

const PlanCard = ({
  plan,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  editedPlan,
  onEditPlanChange,
  onAddFeature,
  onRemoveFeature,
  onChangeFeature,
}: PlanCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const handleDeleteClick = () => {
    if (showDeleteConfirm) {
      onDelete(plan.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };
  
  return (
    <Card className={`${plan.highlighted ? 'border-futconnect-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          {isEditing ? (
            <Input 
              name="name"
              value={editedPlan?.name || ''}
              onChange={onEditPlanChange}
              className="font-bold text-xl"
            />
          ) : (
            <CardTitle>{plan.name}</CardTitle>
          )}
          
          {!isEditing && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEdit(plan)}
                className="h-8 w-8 p-0"
                disabled={isSaving}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-pencil"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
                <span className="sr-only">Editar</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDeleteClick}
                className={`h-8 w-8 p-0 ${showDeleteConfirm ? "text-white bg-red-500 hover:bg-red-700" : "text-red-500 hover:text-red-700 hover:bg-red-50"}`}
                disabled={isSaving}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">{showDeleteConfirm ? "Confirmar exclusão" : "Deletar"}</span>
              </Button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <>
            <div className="flex items-center gap-2 mt-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <Input 
                name="price"
                value={editedPlan?.price || ''}
                onChange={onEditPlanChange}
                className="font-semibold"
              />
            </div>
            <Input 
              name="description"
              value={editedPlan?.description || ''}
              onChange={onEditPlanChange}
              className="mt-2"
            />
          </>
        ) : (
          <>
            <div className="font-semibold text-xl text-futconnect-600 mt-2">{plan.price}</div>
            <CardDescription>{plan.description}</CardDescription>
          </>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <PlanFeaturesList 
            features={isEditing ? (editedPlan?.features || []) : plan.features}
            isEditing={isEditing}
            onAddFeature={onAddFeature}
            onRemoveFeature={onRemoveFeature}
            onChangeFeature={onChangeFeature}
          />
          
          {isEditing && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor={`cta-${plan.id}`}>Texto do botão</Label>
                <Input 
                  id={`cta-${plan.id}`}
                  name="cta"
                  value={editedPlan?.cta || ''}
                  onChange={onEditPlanChange}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`highlighted-${plan.id}`}
                    name="highlighted"
                    checked={editedPlan?.highlighted || false}
                    onChange={onEditPlanChange}
                  />
                  <Label htmlFor={`highlighted-${plan.id}`}>Destacado</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`mostPopular-${plan.id}`}
                    name="mostPopular"
                    checked={editedPlan?.mostPopular || false}
                    onChange={onEditPlanChange}
                  />
                  <Label htmlFor={`mostPopular-${plan.id}`}>Mais Popular</Label>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {isEditing ? (
          <div className="flex gap-2 w-full">
            <Button 
              onClick={onSave}
              className="flex-1 bg-futconnect-600 hover:bg-futconnect-700"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
            <Button 
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        ) : (
          <Button 
            variant={plan.highlighted ? "default" : "outline"}
            className={plan.highlighted 
              ? "w-full bg-futconnect-600 hover:bg-futconnect-700" 
              : "w-full border-futconnect-600 text-futconnect-600 hover:bg-futconnect-50"
            }
            disabled
          >
            {plan.cta}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PlanCard;
