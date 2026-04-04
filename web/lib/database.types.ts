export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      firms: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          firm_type: string | null;
          website: string | null;
          headquarters_city: string | null;
          headquarters_state: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          firm_type?: string | null;
          website?: string | null;
          headquarters_city?: string | null;
          headquarters_state?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          firm_type?: string | null;
          website?: string | null;
          headquarters_city?: string | null;
          headquarters_state?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      markets: {
        Row: {
          id: string;
          market_code: string;
          market_name: string;
          state_code: string | null;
          region: string | null;
          country_code: string;
          timezone_name: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          market_code: string;
          market_name: string;
          state_code?: string | null;
          region?: string | null;
          country_code?: string;
          timezone_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          market_code?: string;
          market_name?: string;
          state_code?: string | null;
          region?: string | null;
          country_code?: string;
          timezone_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mass_torts: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          category: string | null;
          status: string | null;
          disease_or_injury: string | null;
          product_or_exposure: string | null;
          start_date: string | null;
          end_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          category?: string | null;
          status?: string | null;
          disease_or_injury?: string | null;
          product_or_exposure?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          category?: string | null;
          status?: string | null;
          disease_or_injury?: string | null;
          product_or_exposure?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ad_events: {
        Row: {
          id: string;
          firm_id: string | null;
          market_id: string | null;
          mass_tort_id: string | null;
          mdl_id: string | null;
          source: string;
          source_event_id: string | null;
          event_date: string;
          aired_at: string | null;
          ingested_at: string;
          channel: string | null;
          platform: string | null;
          advertiser_name_raw: string | null;
          campaign_name: string | null;
          creative_id: string | null;
          creative_name: string | null;
          spend_estimate: number | null;
          impressions_estimate: number | null;
          airings_count: number | null;
          estimated_reach: number | null;
          state_code: string | null;
          dma_code: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          firm_id?: string | null;
          market_id?: string | null;
          mass_tort_id?: string | null;
          mdl_id?: string | null;
          source: string;
          source_event_id?: string | null;
          event_date: string;
          aired_at?: string | null;
          ingested_at?: string;
          channel?: string | null;
          platform?: string | null;
          advertiser_name_raw?: string | null;
          campaign_name?: string | null;
          creative_id?: string | null;
          creative_name?: string | null;
          spend_estimate?: number | null;
          impressions_estimate?: number | null;
          airings_count?: number | null;
          estimated_reach?: number | null;
          state_code?: string | null;
          dma_code?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string | null;
          market_id?: string | null;
          mass_tort_id?: string | null;
          mdl_id?: string | null;
          source?: string;
          source_event_id?: string | null;
          event_date?: string;
          aired_at?: string | null;
          ingested_at?: string;
          channel?: string | null;
          platform?: string | null;
          advertiser_name_raw?: string | null;
          campaign_name?: string | null;
          creative_id?: string | null;
          creative_name?: string | null;
          spend_estimate?: number | null;
          impressions_estimate?: number | null;
          airings_count?: number | null;
          estimated_reach?: number | null;
          state_code?: string | null;
          dma_code?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ad_events_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_events_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_events_mass_tort_id_fkey";
            columns: ["mass_tort_id"];
            isOneToOne: false;
            referencedRelation: "mass_torts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_events_mdl_id_fkey";
            columns: ["mdl_id"];
            isOneToOne: false;
            referencedRelation: "mdls";
            referencedColumns: ["id"];
          },
        ];
      };
      mdls: {
        Row: {
          id: string;
          mass_tort_id: string | null;
          mdl_number: number;
          title: string;
          court: string | null;
          district: string | null;
          judge_name: string | null;
          status: string | null;
          filed_date: string | null;
          closed_date: string | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mass_tort_id?: string | null;
          mdl_number: number;
          title: string;
          court?: string | null;
          district?: string | null;
          judge_name?: string | null;
          status?: string | null;
          filed_date?: string | null;
          closed_date?: string | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mass_tort_id?: string | null;
          mdl_number?: number;
          title?: string;
          court?: string | null;
          district?: string | null;
          judge_name?: string | null;
          status?: string | null;
          filed_date?: string | null;
          closed_date?: string | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mdls_mass_tort_id_fkey";
            columns: ["mass_tort_id"];
            isOneToOne: false;
            referencedRelation: "mass_torts";
            referencedColumns: ["id"];
          },
        ];
      };
      mdl_stats_monthly: {
        Row: {
          id: string;
          mdl_id: string;
          stats_month: string;
          pending_actions: number | null;
          pending_actions_change: number | null;
          source_url: string | null;
          source_published_at: string | null;
          ingested_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mdl_id: string;
          stats_month: string;
          pending_actions?: number | null;
          pending_actions_change?: number | null;
          source_url?: string | null;
          source_published_at?: string | null;
          ingested_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          mdl_id?: string;
          stats_month?: string;
          pending_actions?: number | null;
          pending_actions_change?: number | null;
          source_url?: string | null;
          source_published_at?: string | null;
          ingested_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mdl_stats_monthly_mdl_id_fkey";
            columns: ["mdl_id"];
            isOneToOne: false;
            referencedRelation: "mdls";
            referencedColumns: ["id"];
          },
        ];
      };
      fatalities: {
        Row: {
          id: string;
          market_id: string | null;
          incident_date: string;
          year: number;
          state_code: string | null;
          county_name: string | null;
          city_name: string | null;
          latitude: number | null;
          longitude: number | null;
          fatality_count: number;
          source: string;
          source_record_id: string | null;
          attributes: Json;
          ingested_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          market_id?: string | null;
          incident_date: string;
          year: number;
          state_code?: string | null;
          county_name?: string | null;
          city_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          fatality_count?: number;
          source: string;
          source_record_id?: string | null;
          attributes?: Json;
          ingested_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          market_id?: string | null;
          incident_date?: string;
          year?: number;
          state_code?: string | null;
          county_name?: string | null;
          city_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          fatality_count?: number;
          source?: string;
          source_record_id?: string | null;
          attributes?: Json;
          ingested_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fatalities_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      storms: {
        Row: {
          id: string;
          market_id: string | null;
          event_type: string;
          episode_id: string | null;
          event_id: string | null;
          begin_date: string | null;
          end_date: string | null;
          event_date: string | null;
          state_code: string | null;
          county_name: string | null;
          cz_name: string | null;
          magnitude: number | null;
          injuries_direct: number | null;
          injuries_indirect: number | null;
          deaths_direct: number | null;
          deaths_indirect: number | null;
          damage_property_usd: number | null;
          damage_crops_usd: number | null;
          source: string;
          source_url: string | null;
          attributes: Json;
          ingested_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          market_id?: string | null;
          event_type: string;
          episode_id?: string | null;
          event_id?: string | null;
          begin_date?: string | null;
          end_date?: string | null;
          state_code?: string | null;
          county_name?: string | null;
          cz_name?: string | null;
          magnitude?: number | null;
          injuries_direct?: number | null;
          injuries_indirect?: number | null;
          deaths_direct?: number | null;
          deaths_indirect?: number | null;
          damage_property_usd?: number | null;
          damage_crops_usd?: number | null;
          source?: string;
          source_url?: string | null;
          attributes?: Json;
          ingested_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          market_id?: string | null;
          event_type?: string;
          episode_id?: string | null;
          event_id?: string | null;
          begin_date?: string | null;
          end_date?: string | null;
          state_code?: string | null;
          county_name?: string | null;
          cz_name?: string | null;
          magnitude?: number | null;
          injuries_direct?: number | null;
          injuries_indirect?: number | null;
          deaths_direct?: number | null;
          deaths_indirect?: number | null;
          damage_property_usd?: number | null;
          damage_crops_usd?: number | null;
          source?: string;
          source_url?: string | null;
          attributes?: Json;
          ingested_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "storms_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      dockets: {
        Row: {
          id: string;
          mdl_id: string | null;
          mass_tort_id: string | null;
          source: string;
          source_docket_id: string | null;
          court: string | null;
          jurisdiction: string | null;
          case_name: string;
          docket_number: string | null;
          judge_name: string | null;
          filed_date: string | null;
          terminated_date: string | null;
          status: string | null;
          plaintiffs_count: number | null;
          defendants_count: number | null;
          source_url: string | null;
          metadata: Json;
          ingested_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mdl_id?: string | null;
          mass_tort_id?: string | null;
          source?: string;
          source_docket_id?: string | null;
          court?: string | null;
          jurisdiction?: string | null;
          case_name: string;
          docket_number?: string | null;
          judge_name?: string | null;
          filed_date?: string | null;
          terminated_date?: string | null;
          status?: string | null;
          plaintiffs_count?: number | null;
          defendants_count?: number | null;
          source_url?: string | null;
          metadata?: Json;
          ingested_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mdl_id?: string | null;
          mass_tort_id?: string | null;
          source?: string;
          source_docket_id?: string | null;
          court?: string | null;
          jurisdiction?: string | null;
          case_name?: string;
          docket_number?: string | null;
          judge_name?: string | null;
          filed_date?: string | null;
          terminated_date?: string | null;
          status?: string | null;
          plaintiffs_count?: number | null;
          defendants_count?: number | null;
          source_url?: string | null;
          metadata?: Json;
          ingested_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dockets_mdl_id_fkey";
            columns: ["mdl_id"];
            isOneToOne: false;
            referencedRelation: "mdls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dockets_mass_tort_id_fkey";
            columns: ["mass_tort_id"];
            isOneToOne: false;
            referencedRelation: "mass_torts";
            referencedColumns: ["id"];
          },
        ];
      };
      docket_events: {
        Row: {
          id: string;
          docket_id: string;
          source: string;
          source_event_id: string | null;
          event_date: string;
          event_type: string | null;
          event_title: string | null;
          event_description: string | null;
          document_number: string | null;
          source_url: string | null;
          metadata: Json;
          ingested_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          docket_id: string;
          source?: string;
          source_event_id?: string | null;
          event_date: string;
          event_type?: string | null;
          event_title?: string | null;
          event_description?: string | null;
          document_number?: string | null;
          source_url?: string | null;
          metadata?: Json;
          ingested_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          docket_id?: string;
          source?: string;
          source_event_id?: string | null;
          event_date?: string;
          event_type?: string | null;
          event_title?: string | null;
          event_description?: string | null;
          document_number?: string | null;
          source_url?: string | null;
          metadata?: Json;
          ingested_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "docket_events_docket_id_fkey";
            columns: ["docket_id"];
            isOneToOne: false;
            referencedRelation: "dockets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
