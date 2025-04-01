export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [_ in string]: any
    }
    Views: {
      [_ in string]: any
    }
    Functions: {
      get_member_stats: {
        Args: { club_id: string }
        Returns: {
          total_members: number
          active_members: number
          inactive_members: number
          activity_rate: number
        }
      }
      get_category_distribution: {
        Args: { club_id: string }
        Returns: Array<{
          category: string
          count: number
          percentage: number
          members: Array<{
            id: string
            name: string
            nickname: string | null
          }>
        }>
      }
      get_age_distribution: {
        Args: { club_id: string }
        Returns: Array<{
          age_range: string
          count: number
          percentage: number
          order_num: number
          members: Array<{
            id: string
            name: string
            nickname: string | null
          }>
          average_age: number
        }>
      }
      daily_maintenance: {
        Args: Record<string, never>
        Returns: void
      }
      record_game_event: {
        Args: { game_id: string; event_type: string; player_id: string }
        Returns: void
      }
      update_late_monthly_fees: {
        Args: Record<string, never>
        Returns: void
      }
      vote_for_game_highlight: {
        Args: { game_id: string; player_id: string }
        Returns: void
      }
    }
    Enums: {
      [_ in string]: any
    }
  }
}
