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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_events: {
        Row: {
          advertiser_name_raw: string | null
          aired_at: string | null
          airings_count: number | null
          campaign_name: string | null
          channel: string | null
          created_at: string
          creative_id: string | null
          creative_name: string | null
          dma_code: string | null
          estimated_reach: number | null
          event_date: string
          firm_id: string | null
          id: string
          impressions_estimate: number | null
          ingested_at: string
          market_id: string | null
          mass_tort_id: string | null
          mdl_id: string | null
          metadata: Json
          platform: string | null
          source: string
          source_event_id: string | null
          spend_estimate: number | null
          state_code: string | null
        }
        Insert: {
          advertiser_name_raw?: string | null
          aired_at?: string | null
          airings_count?: number | null
          campaign_name?: string | null
          channel?: string | null
          created_at?: string
          creative_id?: string | null
          creative_name?: string | null
          dma_code?: string | null
          estimated_reach?: number | null
          event_date: string
          firm_id?: string | null
          id?: string
          impressions_estimate?: number | null
          ingested_at?: string
          market_id?: string | null
          mass_tort_id?: string | null
          mdl_id?: string | null
          metadata?: Json
          platform?: string | null
          source: string
          source_event_id?: string | null
          spend_estimate?: number | null
          state_code?: string | null
        }
        Update: {
          advertiser_name_raw?: string | null
          aired_at?: string | null
          airings_count?: number | null
          campaign_name?: string | null
          channel?: string | null
          created_at?: string
          creative_id?: string | null
          creative_name?: string | null
          dma_code?: string | null
          estimated_reach?: number | null
          event_date?: string
          firm_id?: string | null
          id?: string
          impressions_estimate?: number | null
          ingested_at?: string
          market_id?: string | null
          mass_tort_id?: string | null
          mdl_id?: string | null
          metadata?: Json
          platform?: string | null
          source?: string
          source_event_id?: string | null
          spend_estimate?: number | null
          state_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_mass_tort_id_fkey"
            columns: ["mass_tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_mdl_id_fkey"
            columns: ["mdl_id"]
            isOneToOne: false
            referencedRelation: "mdls"
            referencedColumns: ["id"]
          },
        ]
      }
      docket_events: {
        Row: {
          created_at: string
          docket_id: string
          document_number: string | null
          event_date: string
          event_description: string | null
          event_title: string | null
          event_type: string | null
          id: string
          ingested_at: string
          metadata: Json
          source: string
          source_event_id: string | null
          source_url: string | null
        }
        Insert: {
          created_at?: string
          docket_id: string
          document_number?: string | null
          event_date: string
          event_description?: string | null
          event_title?: string | null
          event_type?: string | null
          id?: string
          ingested_at?: string
          metadata?: Json
          source?: string
          source_event_id?: string | null
          source_url?: string | null
        }
        Update: {
          created_at?: string
          docket_id?: string
          document_number?: string | null
          event_date?: string
          event_description?: string | null
          event_title?: string | null
          event_type?: string | null
          id?: string
          ingested_at?: string
          metadata?: Json
          source?: string
          source_event_id?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docket_events_docket_id_fkey"
            columns: ["docket_id"]
            isOneToOne: false
            referencedRelation: "dockets"
            referencedColumns: ["id"]
          },
        ]
      }
      dockets: {
        Row: {
          case_name: string
          court: string | null
          created_at: string
          defendants_count: number | null
          docket_number: string | null
          filed_date: string | null
          id: string
          ingested_at: string
          judge_name: string | null
          jurisdiction: string | null
          mass_tort_id: string | null
          mdl_id: string | null
          metadata: Json
          plaintiffs_count: number | null
          source: string
          source_docket_id: string | null
          source_url: string | null
          status: string | null
          terminated_date: string | null
          updated_at: string
        }
        Insert: {
          case_name: string
          court?: string | null
          created_at?: string
          defendants_count?: number | null
          docket_number?: string | null
          filed_date?: string | null
          id?: string
          ingested_at?: string
          judge_name?: string | null
          jurisdiction?: string | null
          mass_tort_id?: string | null
          mdl_id?: string | null
          metadata?: Json
          plaintiffs_count?: number | null
          source?: string
          source_docket_id?: string | null
          source_url?: string | null
          status?: string | null
          terminated_date?: string | null
          updated_at?: string
        }
        Update: {
          case_name?: string
          court?: string | null
          created_at?: string
          defendants_count?: number | null
          docket_number?: string | null
          filed_date?: string | null
          id?: string
          ingested_at?: string
          judge_name?: string | null
          jurisdiction?: string | null
          mass_tort_id?: string | null
          mdl_id?: string | null
          metadata?: Json
          plaintiffs_count?: number | null
          source?: string
          source_docket_id?: string | null
          source_url?: string | null
          status?: string | null
          terminated_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dockets_mass_tort_id_fkey"
            columns: ["mass_tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dockets_mdl_id_fkey"
            columns: ["mdl_id"]
            isOneToOne: false
            referencedRelation: "mdls"
            referencedColumns: ["id"]
          },
        ]
      }
      fatalities: {
        Row: {
          attributes: Json
          city_name: string | null
          county_name: string | null
          created_at: string
          fatality_count: number
          id: string
          incident_date: string
          ingested_at: string
          latitude: number | null
          longitude: number | null
          market_id: string | null
          source: string
          source_record_id: string | null
          state_code: string | null
          year: number
        }
        Insert: {
          attributes?: Json
          city_name?: string | null
          county_name?: string | null
          created_at?: string
          fatality_count?: number
          id?: string
          incident_date: string
          ingested_at?: string
          latitude?: number | null
          longitude?: number | null
          market_id?: string | null
          source: string
          source_record_id?: string | null
          state_code?: string | null
          year: number
        }
        Update: {
          attributes?: Json
          city_name?: string | null
          county_name?: string | null
          created_at?: string
          fatality_count?: number
          id?: string
          incident_date?: string
          ingested_at?: string
          latitude?: number | null
          longitude?: number | null
          market_id?: string | null
          source?: string
          source_record_id?: string | null
          state_code?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fatalities_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          firm_type: string | null
          headquarters_city: string | null
          headquarters_state: string | null
          id: string
          name: string
          notes: string | null
          slug: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          firm_type?: string | null
          headquarters_city?: string | null
          headquarters_state?: string | null
          id?: string
          name: string
          notes?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          firm_type?: string | null
          headquarters_city?: string | null
          headquarters_state?: string | null
          id?: string
          name?: string
          notes?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      markets: {
        Row: {
          country_code: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          market_code: string
          market_name: string
          region: string | null
          state_code: string | null
          timezone_name: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          market_code: string
          market_name: string
          region?: string | null
          state_code?: string | null
          timezone_name?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          market_code?: string
          market_name?: string
          region?: string | null
          state_code?: string | null
          timezone_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mass_torts: {
        Row: {
          category: string | null
          created_at: string
          disease_or_injury: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          product_or_exposure: string | null
          slug: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          disease_or_injury?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          product_or_exposure?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          disease_or_injury?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          product_or_exposure?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mdl_stats_monthly: {
        Row: {
          created_at: string
          id: string
          ingested_at: string
          mdl_id: string
          pending_actions: number | null
          pending_actions_change: number | null
          source_published_at: string | null
          source_url: string | null
          stats_month: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingested_at?: string
          mdl_id: string
          pending_actions?: number | null
          pending_actions_change?: number | null
          source_published_at?: string | null
          source_url?: string | null
          stats_month: string
        }
        Update: {
          created_at?: string
          id?: string
          ingested_at?: string
          mdl_id?: string
          pending_actions?: number | null
          pending_actions_change?: number | null
          source_published_at?: string | null
          source_url?: string | null
          stats_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "mdl_stats_monthly_mdl_id_fkey"
            columns: ["mdl_id"]
            isOneToOne: false
            referencedRelation: "mdls"
            referencedColumns: ["id"]
          },
        ]
      }
      mdls: {
        Row: {
          closed_date: string | null
          court: string | null
          created_at: string
          district: string | null
          filed_date: string | null
          id: string
          judge_name: string | null
          mass_tort_id: string | null
          mdl_number: number
          source_url: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          closed_date?: string | null
          court?: string | null
          created_at?: string
          district?: string | null
          filed_date?: string | null
          id?: string
          judge_name?: string | null
          mass_tort_id?: string | null
          mdl_number: number
          source_url?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          closed_date?: string | null
          court?: string | null
          created_at?: string
          district?: string | null
          filed_date?: string | null
          id?: string
          judge_name?: string | null
          mass_tort_id?: string | null
          mdl_number?: number
          source_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mdls_mass_tort_id_fkey"
            columns: ["mass_tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
      }
      storms: {
        Row: {
          attributes: Json
          begin_date: string | null
          county_name: string | null
          created_at: string
          cz_name: string | null
          damage_crops_usd: number | null
          damage_property_usd: number | null
          deaths_direct: number | null
          deaths_indirect: number | null
          end_date: string | null
          episode_id: string | null
          event_date: string | null
          event_id: string | null
          event_type: string
          id: string
          ingested_at: string
          injuries_direct: number | null
          injuries_indirect: number | null
          magnitude: number | null
          market_id: string | null
          source: string
          source_url: string | null
          state_code: string | null
        }
        Insert: {
          attributes?: Json
          begin_date?: string | null
          county_name?: string | null
          created_at?: string
          cz_name?: string | null
          damage_crops_usd?: number | null
          damage_property_usd?: number | null
          deaths_direct?: number | null
          deaths_indirect?: number | null
          end_date?: string | null
          episode_id?: string | null
          event_date?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          ingested_at?: string
          injuries_direct?: number | null
          injuries_indirect?: number | null
          magnitude?: number | null
          market_id?: string | null
          source?: string
          source_url?: string | null
          state_code?: string | null
        }
        Update: {
          attributes?: Json
          begin_date?: string | null
          county_name?: string | null
          created_at?: string
          cz_name?: string | null
          damage_crops_usd?: number | null
          damage_property_usd?: number | null
          deaths_direct?: number | null
          deaths_indirect?: number | null
          end_date?: string | null
          episode_id?: string | null
          event_date?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          ingested_at?: string
          injuries_direct?: number | null
          injuries_indirect?: number | null
          magnitude?: number | null
          market_id?: string | null
          source?: string
          source_url?: string | null
          state_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storms_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
