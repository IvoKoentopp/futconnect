
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PlanFeatureInput from "@/components/PlanFeatureInput";

interface PlanFeaturesListProps {
  features: string[];
  isEditing: boolean;
  onAddFeature?: (feature: string) => void;
  onRemoveFeature?: (index: number) => void;
  onChangeFeature?: (index: number, value: string) => void;
}

const PlanFeaturesList = ({
  features,
  isEditing,
  onAddFeature,
  onRemoveFeature,
  onChangeFeature
}: PlanFeaturesListProps) => {
  return (
    <div>
      <h3 className="font-medium mb-2">Recursos</h3>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            {isEditing ? (
              <>
                <Input 
                  value={feature}
                  onChange={(e) => onChangeFeature?.(index, e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onRemoveFeature?.(index)}
                  className="h-8 w-8 p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Check className="h-5 w-5 text-futconnect-600 flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      
      {isEditing && onAddFeature && (
        <PlanFeatureInput onAddFeature={onAddFeature} />
      )}
    </div>
  );
};

export default PlanFeaturesList;
