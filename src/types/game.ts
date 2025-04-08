export interface Game {
  id: string;
  title: string;
  location: string;
  date: string;
  status: 'scheduled' | 'completed' | 'canceled';
  type?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  cancelReason?: string;
  description?: string;
  club_id: string;
  created_at: string;
  updated_at: string;
}

export interface GameParticipant {
  id: string;
  game_id: string;
  member_id: string;
  status: 'confirmed' | 'declined' | 'unconfirmed';
  team?: string;
  created_at: string;
  updated_at: string;
}

export interface GameWithParticipants extends Game {
  participants: {
    confirmed: number;
    declined: number;
    unconfirmed: number;
    confirmed_players: Array<{
      id: string;
      nickname: string;
    }>;
  };
}

export interface GameEvent {
  id: string;
  game_id: string;
  member_id: string;
  event_type: 'goal' | 'own_goal' | 'save';
  team: string; // Any team name value is now allowed
  timestamp: string;
  created_at: string;
}

export interface GameEventWithMember extends GameEvent {
  member: {
    name?: string;
    nickname?: string;
  };
}

// These mappings are kept for backward compatibility
export const teamNameMapping: Record<string, string> = {
  'Time Branco': 'white',
  'Time Verde': 'green',
  'Time Amarelo': 'yellow',
  'white': 'white',
  'green': 'green',
  'yellow': 'yellow'
};

// Reverse mapping for display purposes
export const reverseTeamMapping: Record<string, string[]> = {
  'white': ['Time Branco'],
  'green': ['Time Verde'],
  'yellow': ['Time Amarelo']
};

// Helper function to get display name based on actual team name
export function getTeamDisplayName(teamName: string, dbValue?: string): string {
  // If it's a standard value, convert to display name
  if (teamName === 'white') return 'Time Branco';
  if (teamName === 'green') return 'Time Verde';
  if (teamName === 'yellow') return 'Time Amarelo';
  
  // If it's already a display name, just return it
  if (Object.keys(teamNameMapping).includes(teamName)) {
    return teamName;
  }
  
  return teamName;
}
