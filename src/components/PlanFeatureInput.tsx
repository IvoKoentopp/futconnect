
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface PlanFeatureInputProps {
  onAddFeature: (feature: string) => void;
}

const PlanFeatureInput = ({ onAddFeature }: PlanFeatureInputProps) => {
  const [newFeature, setNewFeature] = useState('');
  
  const handleAddFeature = () => {
    if (newFeature.trim()) {
      onAddFeature(newFeature.trim());
      setNewFeature('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFeature();
    }
  };
  
  return (
    <div className="flex gap-2 mt-3">
      <Input
        value={newFeature}
        onChange={(e) => setNewFeature(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Adicionar novo recurso"
        className="flex-1"
      />
      <Button 
        onClick={handleAddFeature}
        variant="outline"
        className="border-futconnect-600 text-futconnect-600 hover:bg-futconnect-50"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PlanFeatureInput;
