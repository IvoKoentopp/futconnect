
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Goal, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getTeamDisplayName } from '@/types/game';

interface PlayerActionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  player: { id: string, nickname: string, team: string } | null;
  onAction: (eventType: 'goal' | 'own_goal' | 'save') => void;
}

export const PlayerActionsPopup = ({ isOpen, onClose, player, onAction }: PlayerActionsPopupProps) => {
  const handleAction = (eventType: 'goal' | 'own_goal' | 'save') => {
    onAction(eventType);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            Ações para {player?.nickname || 'Jogador'} ({getTeamDisplayName(player?.team || '')})
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 py-4">
          <Button 
            className="h-20 flex flex-col items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => handleAction('goal')}
          >
            <Goal className="h-6 w-6" />
            <span className="text-xs">Gol</span>
          </Button>
          
          <Button 
            className="h-20 flex flex-col items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
            onClick={() => handleAction('own_goal')}
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-xs">Gol Contra</span>
          </Button>
          
          <Button 
            className="h-20 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => handleAction('save')}
          >
            <ShieldAlert className="h-6 w-6" />
            <span className="text-xs">Defesa</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
