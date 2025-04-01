import { Database } from './supabase';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T];

// Tipos para as funções RPC
export interface MemberStats {
  total_members: number;
  active_members: number;
  inactive_members: number;
  activity_rate: number;
}

export interface CategoryDistributionResult {
  category: string;
  count: number;
  percentage: number;
  members: CategoryMember[];
}

export interface AgeDistributionResult {
  age_range: string;
  count: number;
  percentage: number;
  order_num: number;
  members: CategoryMember[];
  average_age: number;
}

export interface MembershipDurationResult {
  duration_range: string;
  count: number;
  percentage: number;
  order_num: number;
  members: CategoryMember[];
  average_years: number;
}

export interface TopSponsorResult {
  sponsor_id: string;
  sponsor_name: string;
  sponsor_nickname: string | null;
  count: number;
  percentage: number;
  godchildren: CategoryMember[];
}

export interface CategoryMember {
  id: string;
  name: string;
  nickname: string | null;
}

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<T = any>(
      fn: 'get_member_stats' | 'get_category_distribution' | 'get_age_distribution' | 'get_membership_duration' | 'get_top_sponsors' | 'daily_maintenance' | 'record_game_event' | 'update_late_monthly_fees' | 'vote_for_game_highlight',
      params?: object
    ): Promise<{ data: T; error: Error | null }>;
  }
}
