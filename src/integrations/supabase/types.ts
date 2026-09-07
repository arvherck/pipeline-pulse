export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          opportunity_id: string
          owner: string | null
          text: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          opportunity_id: string
          owner?: string | null
          text: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          opportunity_id?: string
          owner?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      field_labels: {
        Row: {
          display_label: string
          field_name: string
          updated_at: string
        }
        Insert: {
          display_label: string
          field_name: string
          updated_at?: string
        }
        Update: {
          display_label?: string
          field_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lanes: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          position?: number
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          account_name: string | null
          age_days: number | null
          category: string | null
          close_date: string | null
          comment: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          custom_fields: Json
          deal_value: number | null
          fiscal_period: string | null
          id: string
          is_open: boolean
          last_stage_change: string | null
          name: string
          owner: string | null
          probability: number | null
          quality_score: number | null
          region: string | null
          segment: string | null
          stage: string | null
          stage_duration_days: number | null
          status_notes: string | null
          updated_at: string
          weighted_value: number | null
        }
        Insert: {
          account_name?: string | null
          age_days?: number | null
          category?: string | null
          close_date?: string | null
          comment?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          custom_fields?: Json
          deal_value?: number | null
          fiscal_period?: string | null
          id: string
          is_open?: boolean
          last_stage_change?: string | null
          name?: string
          owner?: string | null
          probability?: number | null
          quality_score?: number | null
          region?: string | null
          segment?: string | null
          stage?: string | null
          stage_duration_days?: number | null
          status_notes?: string | null
          updated_at?: string
          weighted_value?: number | null
        }
        Update: {
          account_name?: string | null
          age_days?: number | null
          category?: string | null
          close_date?: string | null
          comment?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          custom_fields?: Json
          deal_value?: number | null
          fiscal_period?: string | null
          id?: string
          is_open?: boolean
          last_stage_change?: string | null
          name?: string
          owner?: string | null
          probability?: number | null
          quality_score?: number | null
          region?: string | null
          segment?: string | null
          stage?: string | null
          stage_duration_days?: number | null
          status_notes?: string | null
          updated_at?: string
          weighted_value?: number | null
        }
        Relationships: []
      }
      opportunity_status: {
        Row: {
          lane_id: string | null
          notes: string | null
          opportunity_id: string
          updated_at: string
        }
        Insert: {
          lane_id?: string | null
          notes?: string | null
          opportunity_id: string
          updated_at?: string
        }
        Update: {
          lane_id?: string | null
          notes?: string | null
          opportunity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_status_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "lanes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_status_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      picklists: {
        Row: {
          created_at: string
          field_name: string
          id: string
          label: string
          position: number
          value: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          label: string
          position?: number
          value: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          label?: string
          position?: number
          value?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          created_at: string
          id: string
          label: string | null
          metric: string
          period: string
          target_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          metric?: string
          period: string
          target_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          metric?: string
          period?: string
          target_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
