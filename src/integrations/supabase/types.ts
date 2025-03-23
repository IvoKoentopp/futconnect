export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_security_settings: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          login_notifications: boolean
          password_updated_at: string
          two_factor_auth: boolean
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          login_notifications?: boolean
          password_updated_at?: string
          two_factor_auth?: boolean
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          login_notifications?: boolean
          password_updated_at?: string
          two_factor_auth?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_security_settings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "system_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          bank: string
          branch: string
          club_id: string
          created_at: string
          current_balance: number
          id: string
          initial_balance: number
          updated_at: string
        }
        Insert: {
          bank: string
          branch: string
          club_id: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          updated_at?: string
        }
        Update: {
          bank?: string
          branch?: string
          club_id?: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_group: string
          club_id: string
          created_at: string
          description: string
          id: string
          updated_at: string
        }
        Insert: {
          account_group: string
          club_id: string
          created_at?: string
          description: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_group?: string
          club_id?: string
          created_at?: string
          description?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_admins: {
        Row: {
          club_id: string
          created_at: string
          email: string
          id: string
          name: string
          password: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          password: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          password?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_admins_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_settings: {
        Row: {
          anthem_link_url: string | null
          anthem_url: string | null
          club_id: string
          created_at: string
          description: string | null
          id: string
          invitation_link_url: string | null
          invitation_url: string | null
          logo_url: string | null
          statute_url: string | null
          updated_at: string
        }
        Insert: {
          anthem_link_url?: string | null
          anthem_url?: string | null
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          invitation_link_url?: string | null
          invitation_url?: string | null
          logo_url?: string | null
          statute_url?: string | null
          updated_at?: string
        }
        Update: {
          anthem_link_url?: string | null
          anthem_url?: string | null
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          invitation_link_url?: string | null
          invitation_url?: string | null
          logo_url?: string | null
          statute_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          admin_email: string | null
          admin_name: string | null
          admin_phone: string | null
          cnpj: string
          company_name: string
          created_at: string
          email: string
          id: string
          municipal_registration: string | null
          phone: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          cnpj: string
          company_name: string
          created_at?: string
          email: string
          id?: string
          municipal_registration?: string | null
          phone?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          cnpj?: string
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          municipal_registration?: string | null
          phone?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          last_purchase: string | null
          name: string
          phone: string | null
          plan: string
          status: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_purchase?: string | null
          name: string
          phone?: string | null
          plan: string
          status?: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_purchase?: string | null
          name?: string
          phone?: string | null
          plan?: string
          status?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_types: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_events: {
        Row: {
          created_at: string
          event_type: string
          game_id: string
          id: string
          member_id: string
          team: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          event_type: string
          game_id: string
          id?: string
          member_id: string
          team: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          game_id?: string
          id?: string
          member_id?: string
          team?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      game_highlight_votes: {
        Row: {
          created_at: string
          game_id: string
          id: string
          voted_for: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          voted_for: string
          voter_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          voted_for?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_highlight_votes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_highlight_votes_voted_for_fkey"
            columns: ["voted_for"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_highlight_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      game_highlights: {
        Row: {
          created_at: string
          game_id: string
          id: string
          is_winner: boolean | null
          member_id: string | null
          updated_at: string
          votes_count: number | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          is_winner?: boolean | null
          member_id?: string | null
          updated_at?: string
          votes_count?: number | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          is_winner?: boolean | null
          member_id?: string | null
          updated_at?: string
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_highlights_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_highlights_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      game_participants: {
        Row: {
          created_at: string
          game_id: string
          id: string
          member_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          member_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          member_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      game_voting_control: {
        Row: {
          created_at: string | null
          finalized_at: string | null
          finalized_by: string | null
          game_id: string
          id: string
          is_finalized: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          game_id: string
          id?: string
          is_finalized?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          game_id?: string
          id?: string
          is_finalized?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_voting_control_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_voting_control_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_score: number | null
          cancel_reason: string | null
          club_id: string
          created_at: string
          date: string
          description: string | null
          home_score: number | null
          id: string
          location: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          cancel_reason?: string | null
          club_id: string
          created_at?: string
          date: string
          description?: string | null
          home_score?: number | null
          id?: string
          location: string
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          cancel_reason?: string | null
          club_id?: string
          created_at?: string
          date?: string
          description?: string | null
          home_score?: number | null
          id?: string
          location?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_date: string
          category: string
          club_id: string
          created_at: string
          email: string
          id: string
          name: string
          nickname: string | null
          password: string
          payment_start_date: string | null
          phone: string | null
          photo_url: string | null
          positions: string[] | null
          registration_date: string
          sponsor_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date: string
          category: string
          club_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          nickname?: string | null
          password: string
          payment_start_date?: string | null
          phone?: string | null
          photo_url?: string | null
          positions?: string[] | null
          registration_date: string
          sponsor_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          birth_date?: string
          category?: string
          club_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          nickname?: string | null
          password?: string
          payment_start_date?: string | null
          phone?: string | null
          photo_url?: string | null
          positions?: string[] | null
          registration_date?: string
          sponsor_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_fee_settings: {
        Row: {
          active: boolean
          amount: number
          category: string
          chart_of_account_id: string | null
          club_id: string
          created_at: string
          due_day: number
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          category: string
          chart_of_account_id?: string | null
          club_id: string
          created_at?: string
          due_day: number
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string
          chart_of_account_id?: string | null
          club_id?: string
          created_at?: string
          due_day?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_fee_settings_chart_of_account_id_fkey"
            columns: ["chart_of_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fee_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_fees: {
        Row: {
          amount: number
          bank_account_id: string | null
          club_id: string
          created_at: string
          due_date: string
          id: string
          member_id: string
          payment_date: string | null
          payment_method: string | null
          reference_month: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          club_id: string
          created_at?: string
          due_date: string
          id?: string
          member_id: string
          payment_date?: string | null
          payment_method?: string | null
          reference_month: string
          status: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          club_id?: string
          created_at?: string
          due_date?: string
          id?: string
          member_id?: string
          payment_date?: string | null
          payment_method?: string | null
          reference_month?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_fees_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fees_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string
          date: string
          id: string
          payment_method: string
          product: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          date: string
          id?: string
          payment_method: string
          product: string
          status: string
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          date?: string
          id?: string
          payment_method?: string
          product?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_events: {
        Row: {
          club_id: string
          created_at: string
          date: string
          description: string | null
          event_type: string
          id: string
          sponsor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          date: string
          description?: string | null
          event_type: string
          id?: string
          sponsor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          date?: string
          description?: string | null
          event_type?: string
          id?: string
          sponsor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          cta: string
          description: string | null
          features: string[]
          highlighted: boolean
          id: string
          most_popular: boolean
          name: string
          price: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta: string
          description?: string | null
          features?: string[]
          highlighted?: boolean
          id?: string
          most_popular?: boolean
          name: string
          price: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta?: string
          description?: string | null
          features?: string[]
          highlighted?: boolean
          id?: string
          most_popular?: boolean
          name?: string
          price?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          is_super_admin: boolean
          last_login: string | null
          name: string
          password: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_super_admin?: boolean
          last_login?: string | null
          name: string
          password: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_super_admin?: boolean
          last_login?: string | null
          name?: string
          password?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_configurations: {
        Row: {
          club_id: string
          created_at: string
          id: string
          is_active: boolean
          team_color: string
          team_name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          team_color: string
          team_name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          team_color?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_configurations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_formations: {
        Row: {
          created_at: string
          game_id: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_formations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          team: string
          team_formation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          team: string
          team_formation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          team?: string
          team_formation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_formation_id_fkey"
            columns: ["team_formation_id"]
            isOneToOne: false
            referencedRelation: "team_formations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string
          beneficiary: string
          category: string
          club_id: string
          created_at: string
          date: string
          description: string
          id: string
          payment_method: string
          reference_month: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          beneficiary: string
          category: string
          club_id: string
          created_at?: string
          date: string
          description: string
          id?: string
          payment_method: string
          reference_month?: string | null
          status: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          beneficiary?: string
          category?: string
          club_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          payment_method?: string
          reference_month?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      daily_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      record_game_event: {
        Args: {
          p_game_id: string
          p_member_id: string
          p_event_type: string
          p_team: string
          p_timestamp?: string
        }
        Returns: string
      }
      update_late_monthly_fees: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      vote_for_game_highlight: {
        Args: {
          p_game_id: string
          p_voter_id: string
          p_voted_for_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
