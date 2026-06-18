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
      activity_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "advertiser_firms"
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
      ad_observations_normalized: {
        Row: {
          ad_format: string
          advertiser_id: string
          created_at: string
          earliest_seen: string | null
          estimated_spend: number | null
          geo_target_id: string
          id: string
          impressions: number | null
          latest_seen: string | null
          observation_count: number
          source_mix: string[] | null
          tort_id: string
          unique_creatives: number
          updated_at: string
          week_start: string
        }
        Insert: {
          ad_format: string
          advertiser_id: string
          created_at?: string
          earliest_seen?: string | null
          estimated_spend?: number | null
          geo_target_id: string
          id?: string
          impressions?: number | null
          latest_seen?: string | null
          observation_count?: number
          source_mix?: string[] | null
          tort_id: string
          unique_creatives?: number
          updated_at?: string
          week_start: string
        }
        Update: {
          ad_format?: string
          advertiser_id?: string
          created_at?: string
          earliest_seen?: string | null
          estimated_spend?: number | null
          geo_target_id?: string
          id?: string
          impressions?: number | null
          latest_seen?: string | null
          observation_count?: number
          source_mix?: string[] | null
          tort_id?: string
          unique_creatives?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_observations_normalized_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_observations_normalized_geo_target_id_fkey"
            columns: ["geo_target_id"]
            isOneToOne: false
            referencedRelation: "geo_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_observations_normalized_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_observations_raw: {
        Row: {
          ad_format: string | null
          advertiser_id: string | null
          advertiser_raw: string
          creative_text: string | null
          creative_url: string | null
          estimated_spend_high: number | null
          estimated_spend_low: number | null
          first_seen: string
          geo_raw: string | null
          geo_target_id: string | null
          id: string
          impression_count: number | null
          ingested_at: string
          last_seen: string
          raw_json: Json | null
          source: string
          source_id: string | null
          tort_id: string | null
          tort_raw: string | null
        }
        Insert: {
          ad_format?: string | null
          advertiser_id?: string | null
          advertiser_raw: string
          creative_text?: string | null
          creative_url?: string | null
          estimated_spend_high?: number | null
          estimated_spend_low?: number | null
          first_seen: string
          geo_raw?: string | null
          geo_target_id?: string | null
          id?: string
          impression_count?: number | null
          ingested_at?: string
          last_seen: string
          raw_json?: Json | null
          source?: string
          source_id?: string | null
          tort_id?: string | null
          tort_raw?: string | null
        }
        Update: {
          ad_format?: string | null
          advertiser_id?: string | null
          advertiser_raw?: string
          creative_text?: string | null
          creative_url?: string | null
          estimated_spend_high?: number | null
          estimated_spend_low?: number | null
          first_seen?: string
          geo_raw?: string | null
          geo_target_id?: string | null
          id?: string
          impression_count?: number | null
          ingested_at?: string
          last_seen?: string
          raw_json?: Json | null
          source?: string
          source_id?: string | null
          tort_id?: string | null
          tort_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_observations_raw_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_observations_raw_geo_target_id_fkey"
            columns: ["geo_target_id"]
            isOneToOne: false
            referencedRelation: "geo_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_observations_raw_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_saturation_scores: {
        Row: {
          computed_at: string
          estimated_impressions: number | null
          estimated_spend: number | null
          format_breakdown: Json | null
          geo_target_id: string
          id: string
          period_end: string
          period_start: string
          saturation_score: number | null
          spend_rank: number | null
          top_advertisers: Json | null
          tort_id: string
          total_advertisers: number
          total_creatives: number
          total_observations: number
        }
        Insert: {
          computed_at?: string
          estimated_impressions?: number | null
          estimated_spend?: number | null
          format_breakdown?: Json | null
          geo_target_id: string
          id?: string
          period_end: string
          period_start: string
          saturation_score?: number | null
          spend_rank?: number | null
          top_advertisers?: Json | null
          tort_id: string
          total_advertisers?: number
          total_creatives?: number
          total_observations?: number
        }
        Update: {
          computed_at?: string
          estimated_impressions?: number | null
          estimated_spend?: number | null
          format_breakdown?: Json | null
          geo_target_id?: string
          id?: string
          period_end?: string
          period_start?: string
          saturation_score?: number | null
          spend_rank?: number | null
          top_advertisers?: Json | null
          tort_id?: string
          total_advertisers?: number
          total_creatives?: number
          total_observations?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_saturation_scores_geo_target_id_fkey"
            columns: ["geo_target_id"]
            isOneToOne: false
            referencedRelation: "geo_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_saturation_scores_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_entities: {
        Row: {
          aliases: string[] | null
          canonical_name: string
          created_at: string
          entity_type: string
          id: string
          notes: string | null
          segment: Database["public"]["Enums"]["advertiser_segment"]
          tort_slugs: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          aliases?: string[] | null
          canonical_name: string
          created_at?: string
          entity_type?: string
          id?: string
          notes?: string | null
          segment?: Database["public"]["Enums"]["advertiser_segment"]
          tort_slugs?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          aliases?: string[] | null
          canonical_name?: string
          created_at?: string
          entity_type?: string
          id?: string
          notes?: string | null
          segment?: Database["public"]["Enums"]["advertiser_segment"]
          tort_slugs?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      advertiser_firms: {
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
      ai_search_log: {
        Row: {
          actions: Json | null
          answer: string | null
          created_at: string
          entities: Json | null
          id: string
          intent: string | null
          latency_ms: number | null
          model: string | null
          question: string
          user_id: string | null
        }
        Insert: {
          actions?: Json | null
          answer?: string | null
          created_at?: string
          entities?: Json | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          model?: string | null
          question: string
          user_id?: string | null
        }
        Update: {
          actions?: Json | null
          answer?: string | null
          created_at?: string
          entities?: Json | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          model?: string | null
          question?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_suicide_adverse_events: {
        Row: {
          category: string
          detail: string
          id: number
          severity: string
          source: string | null
          year: number | null
        }
        Insert: {
          category: string
          detail: string
          id?: number
          severity: string
          source?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          detail?: string
          id?: number
          severity?: string
          source?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ai_suicide_qualifying_criteria_tiers: {
        Row: {
          criteria: string
          estimated_cpl_band: string
          id: number
          intake_signal: string
          label: string
          notes: string | null
          tier: string
        }
        Insert: {
          criteria: string
          estimated_cpl_band: string
          id?: number
          intake_signal: string
          label: string
          notes?: string | null
          tier: string
        }
        Update: {
          criteria?: string
          estimated_cpl_band?: string
          id?: number
          intake_signal?: string
          label?: string
          notes?: string | null
          tier?: string
        }
        Relationships: []
      }
      ai_suicide_settlement_projections: {
        Row: {
          comparable_litigation: string | null
          high_estimate: number
          id: number
          injury_tier: string
          low_estimate: number
          rationale: string | null
        }
        Insert: {
          comparable_litigation?: string | null
          high_estimate: number
          id?: number
          injury_tier: string
          low_estimate: number
          rationale?: string | null
        }
        Update: {
          comparable_litigation?: string | null
          high_estimate?: number
          id?: number
          injury_tier?: string
          low_estimate?: number
          rationale?: string | null
        }
        Relationships: []
      }
      ai_suicide_timeline: {
        Row: {
          event: string
          event_date: string
          id: number
          is_future: boolean | null
          significance: string | null
        }
        Insert: {
          event: string
          event_date: string
          id?: number
          is_future?: boolean | null
          significance?: string | null
        }
        Update: {
          event?: string
          event_date?: string
          id?: number
          is_future?: boolean | null
          significance?: string | null
        }
        Relationships: []
      }
      ai_suicide_volume_signals_by_state: {
        Row: {
          ai_chatbot_adoption_index: string | null
          composite_signal_rank: number
          id: number
          state: string
          youth_suicide_rate_per_100k: number | null
        }
        Insert: {
          ai_chatbot_adoption_index?: string | null
          composite_signal_rank: number
          id?: number
          state: string
          youth_suicide_rate_per_100k?: number | null
        }
        Update: {
          ai_chatbot_adoption_index?: string | null
          composite_signal_rank?: number
          id?: number
          state?: string
          youth_suicide_rate_per_100k?: number | null
        }
        Relationships: []
      }
      alert_configs: {
        Row: {
          alert_name: string
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          is_active: boolean | null
          state_code: string | null
          tenant_id: string
          tort_slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_name: string
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          is_active?: boolean | null
          state_code?: string | null
          tenant_id: string
          tort_slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_name?: string
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          is_active?: boolean | null
          state_code?: string | null
          tenant_id?: string
          tort_slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          alert_config_id: string
          created_at: string | null
          description: string | null
          email_sent: boolean | null
          event_type: string
          id: string
          is_read: boolean | null
          metadata: Json | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          alert_config_id: string
          created_at?: string | null
          description?: string | null
          email_sent?: boolean | null
          event_type?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          alert_config_id?: string
          created_at?: string | null
          description?: string | null
          email_sent?: boolean | null
          event_type?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_known_advertisers: {
        Row: {
          ad_count: number | null
          advertiser_id: string
          advertiser_name: string
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          metadata: Json | null
          platform: string
          state_code: string | null
          tort_slug: string
        }
        Insert: {
          ad_count?: number | null
          advertiser_id: string
          advertiser_name: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          platform?: string
          state_code?: string | null
          tort_slug: string
        }
        Update: {
          ad_count?: number | null
          advertiser_id?: string
          advertiser_name?: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          platform?: string
          state_code?: string | null
          tort_slug?: string
        }
        Relationships: []
      }
      api_pricing_config: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          monthly_quota_units: number | null
          notes: string | null
          plan_name: string | null
          provider: Database["public"]["Enums"]["api_provider"]
          rate_per_unit_usd: number
          unit_type: Database["public"]["Enums"]["api_unit_type"]
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          monthly_quota_units?: number | null
          notes?: string | null
          plan_name?: string | null
          provider: Database["public"]["Enums"]["api_provider"]
          rate_per_unit_usd: number
          unit_type: Database["public"]["Enums"]["api_unit_type"]
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          monthly_quota_units?: number | null
          notes?: string | null
          plan_name?: string | null
          provider?: Database["public"]["Enums"]["api_provider"]
          rate_per_unit_usd?: number
          unit_type?: Database["public"]["Enums"]["api_unit_type"]
        }
        Relationships: []
      }
      api_usage_log: {
        Row: {
          called_from: string
          cost_usd: number
          created_at: string
          id: string
          metadata: Json
          model_or_actor: string
          operation: string
          provider: Database["public"]["Enums"]["api_provider"]
          request_id: string | null
          tenant_id: string | null
          unit_type: Database["public"]["Enums"]["api_unit_type"]
          units_consumed: number
        }
        Insert: {
          called_from: string
          cost_usd?: number
          created_at?: string
          id?: string
          metadata?: Json
          model_or_actor: string
          operation: string
          provider: Database["public"]["Enums"]["api_provider"]
          request_id?: string | null
          tenant_id?: string | null
          unit_type: Database["public"]["Enums"]["api_unit_type"]
          units_consumed?: number
        }
        Update: {
          called_from?: string
          cost_usd?: number
          created_at?: string
          id?: string
          metadata?: Json
          model_or_actor?: string
          operation?: string
          provider?: Database["public"]["Enums"]["api_provider"]
          request_id?: string | null
          tenant_id?: string | null
          unit_type?: Database["public"]["Enums"]["api_unit_type"]
          units_consumed?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      bard_adverse_events: {
        Row: {
          category: string
          detail: string
          id: number
          severity: string
          source: string | null
          year: number | null
        }
        Insert: {
          category: string
          detail: string
          id?: number
          severity: string
          source?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          detail?: string
          id?: number
          severity?: string
          source?: string | null
          year?: number | null
        }
        Relationships: []
      }
      bard_bellwether_schedule: {
        Row: {
          case_name: string
          id: number
          injury_type: string
          status: string
          trial_date: string
          trial_number: number
        }
        Insert: {
          case_name: string
          id?: number
          injury_type: string
          status?: string
          trial_date: string
          trial_number: number
        }
        Update: {
          case_name?: string
          id?: number
          injury_type?: string
          status?: string
          trial_date?: string
          trial_number?: number
        }
        Relationships: []
      }
      bard_device_failure_timeline: {
        Row: {
          event: string
          event_date: string
          id: number
          is_future: boolean | null
          significance: string | null
        }
        Insert: {
          event: string
          event_date: string
          id?: number
          is_future?: boolean | null
          significance?: string | null
        }
        Update: {
          event?: string
          event_date?: string
          id?: number
          is_future?: boolean | null
          significance?: string | null
        }
        Relationships: []
      }
      boating_accidents: {
        Row: {
          accident_date: string | null
          body_of_water: string | null
          cause_of_accident: string | null
          county_fips: number | null
          county_name: string | null
          damage_amount: number | null
          deaths: number | null
          id: number
          injuries: number | null
          latitude: number | null
          longitude: number | null
          numbering_id: string | null
          state: string | null
          state_fips: number | null
          vessel_type: string | null
          waterbody_id: number | null
          year: number
        }
        Insert: {
          accident_date?: string | null
          body_of_water?: string | null
          cause_of_accident?: string | null
          county_fips?: number | null
          county_name?: string | null
          damage_amount?: number | null
          deaths?: number | null
          id?: never
          injuries?: number | null
          latitude?: number | null
          longitude?: number | null
          numbering_id?: string | null
          state?: string | null
          state_fips?: number | null
          vessel_type?: string | null
          waterbody_id?: number | null
          year: number
        }
        Update: {
          accident_date?: string | null
          body_of_water?: string | null
          cause_of_accident?: string | null
          county_fips?: number | null
          county_name?: string | null
          damage_amount?: number | null
          deaths?: number | null
          id?: never
          injuries?: number | null
          latitude?: number | null
          longitude?: number | null
          numbering_id?: string | null
          state?: string | null
          state_fips?: number | null
          vessel_type?: string | null
          waterbody_id?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "boating_accidents_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "waterbodies"
            referencedColumns: ["id"]
          },
        ]
      }
      boating_pois: {
        Row: {
          address: string | null
          category: string
          city: string | null
          county: string | null
          created_at: string | null
          id: number
          lat: number
          lng: number
          name: string | null
          osm_id: number | null
          phone: string | null
          state: string
          subcategory: string | null
          tags: Json | null
          updated_at: string | null
          waterbody_id: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          city?: string | null
          county?: string | null
          created_at?: string | null
          id?: never
          lat: number
          lng: number
          name?: string | null
          osm_id?: number | null
          phone?: string | null
          state: string
          subcategory?: string | null
          tags?: Json | null
          updated_at?: string | null
          waterbody_id?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          county?: string | null
          created_at?: string | null
          id?: never
          lat?: number
          lng?: number
          name?: string | null
          osm_id?: number | null
          phone?: string | null
          state?: string
          subcategory?: string | null
          tags?: Json | null
          updated_at?: string | null
          waterbody_id?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boating_pois_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "waterbodies"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_stations: {
        Row: {
          active: boolean | null
          band: string | null
          call_sign: string
          community_city: string
          community_state: string
          created_at: string | null
          facility_id: string
          id: string
          last_synced_at: string | null
          license_expiration: string | null
          network_affil: string | null
          nielsen_dma: string | null
          party_address: string | null
          party_city: string | null
          party_email: string | null
          party_name: string | null
          party_phone: string | null
          party_state: string | null
          party_zip: string | null
          rf_channel: string | null
          service_type: string
          status: string | null
          virtual_channel: string | null
        }
        Insert: {
          active?: boolean | null
          band?: string | null
          call_sign: string
          community_city: string
          community_state: string
          created_at?: string | null
          facility_id: string
          id?: string
          last_synced_at?: string | null
          license_expiration?: string | null
          network_affil?: string | null
          nielsen_dma?: string | null
          party_address?: string | null
          party_city?: string | null
          party_email?: string | null
          party_name?: string | null
          party_phone?: string | null
          party_state?: string | null
          party_zip?: string | null
          rf_channel?: string | null
          service_type: string
          status?: string | null
          virtual_channel?: string | null
        }
        Update: {
          active?: boolean | null
          band?: string | null
          call_sign?: string
          community_city?: string
          community_state?: string
          created_at?: string | null
          facility_id?: string
          id?: string
          last_synced_at?: string | null
          license_expiration?: string | null
          network_affil?: string | null
          nielsen_dma?: string | null
          party_address?: string | null
          party_city?: string | null
          party_email?: string | null
          party_name?: string | null
          party_phone?: string | null
          party_state?: string | null
          party_zip?: string | null
          rf_channel?: string | null
          service_type?: string
          status?: string | null
          virtual_channel?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          config: Json
          created_at: string
          firm_id: string
          id: string
          market_display_name: string | null
          market_dma_code: string | null
          name: string | null
          pi_category: string | null
          practice_area: string
          severity_modifiers: string[] | null
          state: string | null
          status: string
          tort_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          firm_id: string
          id?: string
          market_display_name?: string | null
          market_dma_code?: string | null
          name?: string | null
          pi_category?: string | null
          practice_area: string
          severity_modifiers?: string[] | null
          state?: string | null
          status?: string
          tort_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          firm_id?: string
          id?: string
          market_display_name?: string | null
          market_dma_code?: string | null
          name?: string | null
          pi_category?: string | null
          practice_area?: string
          severity_modifiers?: string[] | null
          state?: string | null
          status?: string
          tort_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_market_dma_code_fkey"
            columns: ["market_dma_code"]
            isOneToOne: false
            referencedRelation: "dma_markets"
            referencedColumns: ["dma_code"]
          },
        ]
      }
      cancer_incidence: {
        Row: {
          average_annual_count: number | null
          cancer_site: string
          county_name: string
          created_at: string
          fips: string
          id: string
          incidence_rate: number
          latitude: number | null
          longitude: number | null
          lower_ci: number | null
          recent_trend: number | null
          rural_urban: string | null
          source_url: string | null
          state: string
          trend_direction: string
          trend_lower_ci: number | null
          trend_upper_ci: number | null
          updated_at: string
          upper_ci: number | null
        }
        Insert: {
          average_annual_count?: number | null
          cancer_site: string
          county_name: string
          created_at?: string
          fips: string
          id?: string
          incidence_rate: number
          latitude?: number | null
          longitude?: number | null
          lower_ci?: number | null
          recent_trend?: number | null
          rural_urban?: string | null
          source_url?: string | null
          state: string
          trend_direction?: string
          trend_lower_ci?: number | null
          trend_upper_ci?: number | null
          updated_at?: string
          upper_ci?: number | null
        }
        Update: {
          average_annual_count?: number | null
          cancer_site?: string
          county_name?: string
          created_at?: string
          fips?: string
          id?: string
          incidence_rate?: number
          latitude?: number | null
          longitude?: number | null
          lower_ci?: number | null
          recent_trend?: number | null
          rural_urban?: string | null
          source_url?: string | null
          state?: string
          trend_direction?: string
          trend_lower_ci?: number | null
          trend_upper_ci?: number | null
          updated_at?: string
          upper_ci?: number | null
        }
        Relationships: []
      }
      census_demographics: {
        Row: {
          acs_vintage: number
          county_name: string
          created_at: string | null
          fips_full: string
          id: number
          mean_commute_minutes: number | null
          median_age: number | null
          median_gross_rent: number | null
          median_home_value: number | null
          median_household_income: number | null
          pct_asian: number | null
          pct_bachelors_or_higher: number | null
          pct_black: number | null
          pct_disability: number | null
          pct_employed: number | null
          pct_english_only: number | null
          pct_foreign_born: number | null
          pct_high_school_or_higher: number | null
          pct_hispanic: number | null
          pct_native: number | null
          pct_owner_occupied: number | null
          pct_poverty: number | null
          pct_renter_occupied: number | null
          pct_two_or_more: number | null
          pct_uninsured: number | null
          pct_veterans: number | null
          pct_white: number | null
          pct_with_computer: number | null
          pct_with_health_insurance: number | null
          pct_with_internet: number | null
          per_capita_income: number | null
          pop_18_to_24: number | null
          pop_25_to_34: number | null
          pop_35_to_44: number | null
          pop_45_to_54: number | null
          pop_5_to_17: number | null
          pop_55_to_64: number | null
          pop_65_to_74: number | null
          pop_75_plus: number | null
          pop_female: number | null
          pop_male: number | null
          pop_under_5: number | null
          state_abbr: string
          total_housing_units: number | null
          total_population: number | null
          updated_at: string | null
        }
        Insert: {
          acs_vintage?: number
          county_name: string
          created_at?: string | null
          fips_full: string
          id?: number
          mean_commute_minutes?: number | null
          median_age?: number | null
          median_gross_rent?: number | null
          median_home_value?: number | null
          median_household_income?: number | null
          pct_asian?: number | null
          pct_bachelors_or_higher?: number | null
          pct_black?: number | null
          pct_disability?: number | null
          pct_employed?: number | null
          pct_english_only?: number | null
          pct_foreign_born?: number | null
          pct_high_school_or_higher?: number | null
          pct_hispanic?: number | null
          pct_native?: number | null
          pct_owner_occupied?: number | null
          pct_poverty?: number | null
          pct_renter_occupied?: number | null
          pct_two_or_more?: number | null
          pct_uninsured?: number | null
          pct_veterans?: number | null
          pct_white?: number | null
          pct_with_computer?: number | null
          pct_with_health_insurance?: number | null
          pct_with_internet?: number | null
          per_capita_income?: number | null
          pop_18_to_24?: number | null
          pop_25_to_34?: number | null
          pop_35_to_44?: number | null
          pop_45_to_54?: number | null
          pop_5_to_17?: number | null
          pop_55_to_64?: number | null
          pop_65_to_74?: number | null
          pop_75_plus?: number | null
          pop_female?: number | null
          pop_male?: number | null
          pop_under_5?: number | null
          state_abbr: string
          total_housing_units?: number | null
          total_population?: number | null
          updated_at?: string | null
        }
        Update: {
          acs_vintage?: number
          county_name?: string
          created_at?: string | null
          fips_full?: string
          id?: number
          mean_commute_minutes?: number | null
          median_age?: number | null
          median_gross_rent?: number | null
          median_home_value?: number | null
          median_household_income?: number | null
          pct_asian?: number | null
          pct_bachelors_or_higher?: number | null
          pct_black?: number | null
          pct_disability?: number | null
          pct_employed?: number | null
          pct_english_only?: number | null
          pct_foreign_born?: number | null
          pct_high_school_or_higher?: number | null
          pct_hispanic?: number | null
          pct_native?: number | null
          pct_owner_occupied?: number | null
          pct_poverty?: number | null
          pct_renter_occupied?: number | null
          pct_two_or_more?: number | null
          pct_uninsured?: number | null
          pct_veterans?: number | null
          pct_white?: number | null
          pct_with_computer?: number | null
          pct_with_health_insurance?: number | null
          pct_with_internet?: number | null
          per_capita_income?: number | null
          pop_18_to_24?: number | null
          pop_25_to_34?: number | null
          pop_35_to_44?: number | null
          pop_45_to_54?: number | null
          pop_5_to_17?: number | null
          pop_55_to_64?: number | null
          pop_65_to_74?: number | null
          pop_75_plus?: number | null
          pop_female?: number | null
          pop_male?: number | null
          pop_under_5?: number | null
          state_abbr?: string
          total_housing_units?: number | null
          total_population?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      channel_competition_scores: {
        Row: {
          channel: string
          competition_score: number
          id: number
          market_id: string
          tort_id: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          competition_score: number
          id?: never
          market_id: string
          tort_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          competition_score?: number
          id?: never
          market_id?: string
          tort_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      channel_roles: {
        Row: {
          channel: string
          cost_pressure: Database["public"]["Enums"]["cost_pressure_level"]
          mass_tort_priority: Database["public"]["Enums"]["mass_tort_priority_level"]
          performance_orientation: Database["public"]["Enums"]["performance_orientation_type"]
          role: Database["public"]["Enums"]["channel_role"]
        }
        Insert: {
          channel: string
          cost_pressure?: Database["public"]["Enums"]["cost_pressure_level"]
          mass_tort_priority?: Database["public"]["Enums"]["mass_tort_priority_level"]
          performance_orientation?: Database["public"]["Enums"]["performance_orientation_type"]
          role?: Database["public"]["Enums"]["channel_role"]
        }
        Update: {
          channel?: string
          cost_pressure?: Database["public"]["Enums"]["cost_pressure_level"]
          mass_tort_priority?: Database["public"]["Enums"]["mass_tort_priority_level"]
          performance_orientation?: Database["public"]["Enums"]["performance_orientation_type"]
          role?: Database["public"]["Enums"]["channel_role"]
        }
        Relationships: []
      }
      cl_docket_map: {
        Row: {
          case_name: string | null
          cl_court: string | null
          cl_docket_id: number
          created_at: string | null
          docket_number: string | null
          id: number
          mdl_number: number
        }
        Insert: {
          case_name?: string | null
          cl_court?: string | null
          cl_docket_id: number
          created_at?: string | null
          docket_number?: string | null
          id?: never
          mdl_number: number
        }
        Update: {
          case_name?: string | null
          cl_court?: string | null
          cl_docket_id?: number
          created_at?: string | null
          docket_number?: string | null
          id?: never
          mdl_number?: number
        }
        Relationships: []
      }
      construction_demographics: {
        Row: {
          category: string
          created_at: string | null
          data_note: string | null
          data_source: string
          dimension: string
          fatalities: number | null
          fatality_rate: number | null
          id: number
          pct_of_total: number | null
          year: number
        }
        Insert: {
          category: string
          created_at?: string | null
          data_note?: string | null
          data_source?: string
          dimension: string
          fatalities?: number | null
          fatality_rate?: number | null
          id?: number
          pct_of_total?: number | null
          year: number
        }
        Update: {
          category?: string
          created_at?: string | null
          data_note?: string | null
          data_source?: string
          dimension?: string
          fatalities?: number | null
          fatality_rate?: number | null
          id?: number
          pct_of_total?: number | null
          year?: number
        }
        Relationships: []
      }
      construction_fatalities: {
        Row: {
          contact: number | null
          created_at: string | null
          data_source: string | null
          exposure: number | null
          falls: number | null
          fatality_rate: number | null
          fires: number | null
          id: number
          industry_level: number
          industry_name: string
          naics_code: string
          state_abbr: string
          state_name: string
          total_fatalities: number | null
          transportation: number | null
          violence: number | null
          year: number
        }
        Insert: {
          contact?: number | null
          created_at?: string | null
          data_source?: string | null
          exposure?: number | null
          falls?: number | null
          fatality_rate?: number | null
          fires?: number | null
          id?: number
          industry_level: number
          industry_name: string
          naics_code: string
          state_abbr: string
          state_name: string
          total_fatalities?: number | null
          transportation?: number | null
          violence?: number | null
          year: number
        }
        Update: {
          contact?: number | null
          created_at?: string | null
          data_source?: string | null
          exposure?: number | null
          falls?: number | null
          fatality_rate?: number | null
          fires?: number | null
          id?: number
          industry_level?: number
          industry_name?: string
          naics_code?: string
          state_abbr?: string
          state_name?: string
          total_fatalities?: number | null
          transportation?: number | null
          violence?: number | null
          year?: number
        }
        Relationships: []
      }
      construction_fatalities_staging: {
        Row: {
          contact: number | null
          exposure: number | null
          falls: number | null
          fatality_rate: number | null
          fires: number | null
          industry_level: number
          industry_name: string
          naics_code: string
          state_abbr: string
          state_name: string
          total_fatalities: number | null
          transportation: number | null
          violence: number | null
          year: number
        }
        Insert: {
          contact?: number | null
          exposure?: number | null
          falls?: number | null
          fatality_rate?: number | null
          fires?: number | null
          industry_level: number
          industry_name: string
          naics_code: string
          state_abbr: string
          state_name: string
          total_fatalities?: number | null
          transportation?: number | null
          violence?: number | null
          year: number
        }
        Update: {
          contact?: number | null
          exposure?: number | null
          falls?: number | null
          fatality_rate?: number | null
          fires?: number | null
          industry_level?: number
          industry_name?: string
          naics_code?: string
          state_abbr?: string
          state_name?: string
          total_fatalities?: number | null
          transportation?: number | null
          violence?: number | null
          year?: number
        }
        Relationships: []
      }
      construction_state_intel: {
        Row: {
          all_industry_fatalities_2023: number | null
          all_industry_fatalities_2024: number | null
          construction_employment_est: number | null
          construction_fatalities_est: number | null
          construction_fatality_rate_2024: number | null
          created_at: string | null
          id: number
          overall_fatality_rate_2024: number | null
          priority_tier: string | null
          small_sample_flag: boolean | null
          state_abbr: string
          state_name: string
          volume_tier: string | null
        }
        Insert: {
          all_industry_fatalities_2023?: number | null
          all_industry_fatalities_2024?: number | null
          construction_employment_est?: number | null
          construction_fatalities_est?: number | null
          construction_fatality_rate_2024?: number | null
          created_at?: string | null
          id?: number
          overall_fatality_rate_2024?: number | null
          priority_tier?: string | null
          small_sample_flag?: boolean | null
          state_abbr: string
          state_name: string
          volume_tier?: string | null
        }
        Update: {
          all_industry_fatalities_2023?: number | null
          all_industry_fatalities_2024?: number | null
          construction_employment_est?: number | null
          construction_fatalities_est?: number | null
          construction_fatality_rate_2024?: number | null
          created_at?: string | null
          id?: number
          overall_fatality_rate_2024?: number | null
          priority_tier?: string | null
          small_sample_flag?: boolean | null
          state_abbr?: string
          state_name?: string
          volume_tier?: string | null
        }
        Relationships: []
      }
      county_msa_crosswalk: {
        Row: {
          cbsa_code: string | null
          cbsa_title: string | null
          cbsa_type: string | null
          central_outlying: string | null
          county_name: string
          created_at: string | null
          csa_code: string | null
          csa_title: string | null
          fips_county: string
          fips_full: string
          fips_state: string
          id: number
          metro_division_code: string | null
          metro_division_title: string | null
          state_abbr: string
        }
        Insert: {
          cbsa_code?: string | null
          cbsa_title?: string | null
          cbsa_type?: string | null
          central_outlying?: string | null
          county_name: string
          created_at?: string | null
          csa_code?: string | null
          csa_title?: string | null
          fips_county: string
          fips_full: string
          fips_state: string
          id?: number
          metro_division_code?: string | null
          metro_division_title?: string | null
          state_abbr: string
        }
        Update: {
          cbsa_code?: string | null
          cbsa_title?: string | null
          cbsa_type?: string | null
          central_outlying?: string | null
          county_name?: string
          created_at?: string | null
          csa_code?: string | null
          csa_title?: string | null
          fips_county?: string
          fips_full?: string
          fips_state?: string
          id?: number
          metro_division_code?: string | null
          metro_division_title?: string | null
          state_abbr?: string
        }
        Relationships: []
      }
      cpsc_manufacturer_aliases: {
        Row: {
          alias_text: string
          created_at: string
          manufacturer_id: string
          notes: string | null
          role: string
        }
        Insert: {
          alias_text: string
          created_at?: string
          manufacturer_id: string
          notes?: string | null
          role?: string
        }
        Update: {
          alias_text?: string
          created_at?: string
          manufacturer_id?: string
          notes?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpsc_manufacturer_aliases_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "recall_manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      cpsc_recall_hazards: {
        Row: {
          hazard_type_id: number | null
          id: string
          name: string
          recall_id: string
        }
        Insert: {
          hazard_type_id?: number | null
          id?: string
          name: string
          recall_id: string
        }
        Update: {
          hazard_type_id?: number | null
          id?: string
          name?: string
          recall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpsc_recall_hazards_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "cpsc_recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      cpsc_recall_images: {
        Row: {
          id: string
          recall_id: string
          url: string
        }
        Insert: {
          id?: string
          recall_id: string
          url: string
        }
        Update: {
          id?: string
          recall_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpsc_recall_images_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "cpsc_recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      cpsc_recall_manufacturers: {
        Row: {
          country: string | null
          id: string
          manufacturer_id: string | null
          raw_name: string
          recall_id: string
          role: string
        }
        Insert: {
          country?: string | null
          id?: string
          manufacturer_id?: string | null
          raw_name: string
          recall_id: string
          role: string
        }
        Update: {
          country?: string | null
          id?: string
          manufacturer_id?: string | null
          raw_name?: string
          recall_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpsc_recall_manufacturers_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "recall_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpsc_recall_manufacturers_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "cpsc_recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      cpsc_recall_products: {
        Row: {
          category_id: number | null
          description: string | null
          id: string
          model: string | null
          name: string | null
          recall_id: string
          type: string | null
          units_text: string | null
        }
        Insert: {
          category_id?: number | null
          description?: string | null
          id?: string
          model?: string | null
          name?: string | null
          recall_id: string
          type?: string | null
          units_text?: string | null
        }
        Update: {
          category_id?: number | null
          description?: string | null
          id?: string
          model?: string | null
          name?: string | null
          recall_id?: string
          type?: string | null
          units_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cpsc_recall_products_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "cpsc_recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      cpsc_recall_remedies: {
        Row: {
          id: string
          name: string
          recall_id: string
        }
        Insert: {
          id?: string
          name: string
          recall_id: string
        }
        Update: {
          id?: string
          name?: string
          recall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpsc_recall_remedies_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "cpsc_recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      cpsc_recall_retailers: {
        Row: {
          id: string
          raw_company_id: string | null
          raw_name: string
          recall_id: string
        }
        Insert: {
          id?: string
          raw_company_id?: string | null
          raw_name: string
          recall_id: string
        }
        Update: {
          id?: string
          raw_company_id?: string | null
          raw_name?: string
          recall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpsc_recall_retailers_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "cpsc_recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      cpsc_recalls: {
        Row: {
          consumer_contact: string | null
          cpsc_recall_id: number
          cpsc_url: string | null
          created_at: string
          death_count: number | null
          description: string | null
          id: string
          ingested_at: string
          injury_count: number | null
          is_warning_only: boolean
          last_publish_date: string | null
          raw_json: Json
          recall_date: string
          recall_number: string
          severity_tier: string | null
          source: string
          title: string
          units_recalled_int: number | null
          units_recalled_text: string | null
          updated_at: string
        }
        Insert: {
          consumer_contact?: string | null
          cpsc_recall_id: number
          cpsc_url?: string | null
          created_at?: string
          death_count?: number | null
          description?: string | null
          id?: string
          ingested_at?: string
          injury_count?: number | null
          is_warning_only?: boolean
          last_publish_date?: string | null
          raw_json: Json
          recall_date: string
          recall_number: string
          severity_tier?: string | null
          source?: string
          title: string
          units_recalled_int?: number | null
          units_recalled_text?: string | null
          updated_at?: string
        }
        Update: {
          consumer_contact?: string | null
          cpsc_recall_id?: number
          cpsc_url?: string | null
          created_at?: string
          death_count?: number | null
          description?: string | null
          id?: string
          ingested_at?: string
          injury_count?: number | null
          is_warning_only?: boolean
          last_publish_date?: string | null
          raw_json?: Json
          recall_date?: string
          recall_number?: string
          severity_tier?: string | null
          source?: string
          title?: string
          units_recalled_int?: number | null
          units_recalled_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diabetes_prevalence: {
        Row: {
          created_at: string | null
          data_year: number | null
          diabetes_prevalence_pct: number
          id: number
          state: string
        }
        Insert: {
          created_at?: string | null
          data_year?: number | null
          diabetes_prevalence_pct: number
          id?: number
          state: string
        }
        Update: {
          created_at?: string | null
          data_year?: number | null
          diabetes_prevalence_pct?: number
          id?: number
          state?: string
        }
        Relationships: []
      }
      disease_mortality: {
        Row: {
          change_pct: number | null
          change_period: string | null
          created_at: string
          deaths_count: number | null
          disease: string
          id: string
          mortality_rate: number
          source_url: string | null
          state_fips: string
          state_name: string
          updated_at: string
          year: number
        }
        Insert: {
          change_pct?: number | null
          change_period?: string | null
          created_at?: string
          deaths_count?: number | null
          disease: string
          id?: string
          mortality_rate: number
          source_url?: string | null
          state_fips: string
          state_name: string
          updated_at?: string
          year: number
        }
        Update: {
          change_pct?: number | null
          change_period?: string | null
          created_at?: string
          deaths_count?: number | null
          disease?: string
          id?: string
          mortality_rate?: number
          source_url?: string | null
          state_fips?: string
          state_name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      dma_markets: {
        Row: {
          created_at: string | null
          display_name: string
          dma_code: string
          full_name: string
          population: number | null
          primary_state: string
          rank: number | null
          searchapi_location: string | null
          states_covered: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          dma_code: string
          full_name: string
          population?: number | null
          primary_state: string
          rank?: number | null
          searchapi_location?: string | null
          states_covered: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          dma_code?: string
          full_name?: string
          population?: number | null
          primary_state?: string
          rank?: number | null
          searchapi_location?: string | null
          states_covered?: string[]
          updated_at?: string | null
        }
        Relationships: []
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
      domain_classifications: {
        Row: {
          classified_at: string
          classifier_source: Database["public"]["Enums"]["landing_page_classifier_source"]
          confidence: Database["public"]["Enums"]["landing_page_classifier_confidence"]
          expires_at: string
          is_law_firm: boolean
          last_error: string | null
          matched_signals: Json
          registered_domain: string
          signal_score: number | null
        }
        Insert: {
          classified_at?: string
          classifier_source: Database["public"]["Enums"]["landing_page_classifier_source"]
          confidence: Database["public"]["Enums"]["landing_page_classifier_confidence"]
          expires_at: string
          is_law_firm: boolean
          last_error?: string | null
          matched_signals?: Json
          registered_domain: string
          signal_score?: number | null
        }
        Update: {
          classified_at?: string
          classifier_source?: Database["public"]["Enums"]["landing_page_classifier_source"]
          confidence?: Database["public"]["Enums"]["landing_page_classifier_confidence"]
          expires_at?: string
          is_law_firm?: boolean
          last_error?: string | null
          matched_signals?: Json
          registered_domain?: string
          signal_score?: number | null
        }
        Relationships: []
      }
      drug_adverse_event_drugs: {
        Row: {
          actiondrug: number | null
          activesubstance_name: string | null
          created_at: string
          drug_id: string | null
          drug_seq: number
          drugadditional: number | null
          drugadministrationroute: string | null
          drugauthorizationnumb: string | null
          drugcharacterization: number | null
          drugdosageform: string | null
          drugdosagetext: string | null
          drugenddate: string | null
          drugindication: string | null
          drugstartdate: string | null
          id: string
          medicinalproduct: string | null
          openfda_application_number: string[] | null
          openfda_brand_name: string[] | null
          openfda_generic_name: string[] | null
          openfda_manufacturer_name: string[] | null
          openfda_pharm_class_cs: string[] | null
          openfda_pharm_class_epc: string[] | null
          openfda_pharm_class_moa: string[] | null
          openfda_pharm_class_pe: string[] | null
          openfda_product_ndc: string[] | null
          openfda_product_type: string[] | null
          openfda_route: string[] | null
          openfda_rxcui: string[] | null
          openfda_spl_id: string[] | null
          openfda_spl_set_id: string[] | null
          openfda_substance_name: string[] | null
          openfda_unii: string[] | null
          report_id: string
        }
        Insert: {
          actiondrug?: number | null
          activesubstance_name?: string | null
          created_at?: string
          drug_id?: string | null
          drug_seq: number
          drugadditional?: number | null
          drugadministrationroute?: string | null
          drugauthorizationnumb?: string | null
          drugcharacterization?: number | null
          drugdosageform?: string | null
          drugdosagetext?: string | null
          drugenddate?: string | null
          drugindication?: string | null
          drugstartdate?: string | null
          id?: string
          medicinalproduct?: string | null
          openfda_application_number?: string[] | null
          openfda_brand_name?: string[] | null
          openfda_generic_name?: string[] | null
          openfda_manufacturer_name?: string[] | null
          openfda_pharm_class_cs?: string[] | null
          openfda_pharm_class_epc?: string[] | null
          openfda_pharm_class_moa?: string[] | null
          openfda_pharm_class_pe?: string[] | null
          openfda_product_ndc?: string[] | null
          openfda_product_type?: string[] | null
          openfda_route?: string[] | null
          openfda_rxcui?: string[] | null
          openfda_spl_id?: string[] | null
          openfda_spl_set_id?: string[] | null
          openfda_substance_name?: string[] | null
          openfda_unii?: string[] | null
          report_id: string
        }
        Update: {
          actiondrug?: number | null
          activesubstance_name?: string | null
          created_at?: string
          drug_id?: string | null
          drug_seq?: number
          drugadditional?: number | null
          drugadministrationroute?: string | null
          drugauthorizationnumb?: string | null
          drugcharacterization?: number | null
          drugdosageform?: string | null
          drugdosagetext?: string | null
          drugenddate?: string | null
          drugindication?: string | null
          drugstartdate?: string | null
          id?: string
          medicinalproduct?: string | null
          openfda_application_number?: string[] | null
          openfda_brand_name?: string[] | null
          openfda_generic_name?: string[] | null
          openfda_manufacturer_name?: string[] | null
          openfda_pharm_class_cs?: string[] | null
          openfda_pharm_class_epc?: string[] | null
          openfda_pharm_class_moa?: string[] | null
          openfda_pharm_class_pe?: string[] | null
          openfda_product_ndc?: string[] | null
          openfda_product_type?: string[] | null
          openfda_route?: string[] | null
          openfda_rxcui?: string[] | null
          openfda_spl_id?: string[] | null
          openfda_spl_set_id?: string[] | null
          openfda_substance_name?: string[] | null
          openfda_unii?: string[] | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_adverse_event_drugs_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_adverse_event_drugs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "drug_adverse_events"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_adverse_event_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_seq: number
          reactionmeddrapt: string
          reactionmeddraversionpt: string | null
          reactionoutcome: number | null
          report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_seq: number
          reactionmeddrapt: string
          reactionmeddraversionpt?: string | null
          reactionoutcome?: number | null
          report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_seq?: number
          reactionmeddrapt?: string
          reactionmeddraversionpt?: string | null
          reactionoutcome?: number | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_adverse_event_reactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "drug_adverse_events"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_adverse_events: {
        Row: {
          companynumb: string | null
          created_at: string
          duplicate: boolean | null
          fulfillexpeditecriteria: number | null
          id: string
          ingested_at: string
          occurcountry: string | null
          patient_death_date: string | null
          patient_died: boolean | null
          patient_onset_age: number | null
          patient_onset_age_unit: number | null
          patient_sex: number | null
          patient_weight: number | null
          primarysource_qualification: number | null
          primarysource_reportercountry: string | null
          raw_payload: Json | null
          receiptdate: string | null
          receivedate: string | null
          reporttype: number | null
          safetyreportid: string
          safetyreportversion: string | null
          sender_organization: string | null
          sender_type: number | null
          serious: boolean | null
          seriousness_congenital: boolean | null
          seriousness_death: boolean | null
          seriousness_disabling: boolean | null
          seriousness_hospitalization: boolean | null
          seriousness_lifethreatening: boolean | null
          seriousness_other: boolean | null
          transmissiondate: string | null
          updated_at: string
        }
        Insert: {
          companynumb?: string | null
          created_at?: string
          duplicate?: boolean | null
          fulfillexpeditecriteria?: number | null
          id?: string
          ingested_at?: string
          occurcountry?: string | null
          patient_death_date?: string | null
          patient_died?: boolean | null
          patient_onset_age?: number | null
          patient_onset_age_unit?: number | null
          patient_sex?: number | null
          patient_weight?: number | null
          primarysource_qualification?: number | null
          primarysource_reportercountry?: string | null
          raw_payload?: Json | null
          receiptdate?: string | null
          receivedate?: string | null
          reporttype?: number | null
          safetyreportid: string
          safetyreportversion?: string | null
          sender_organization?: string | null
          sender_type?: number | null
          serious?: boolean | null
          seriousness_congenital?: boolean | null
          seriousness_death?: boolean | null
          seriousness_disabling?: boolean | null
          seriousness_hospitalization?: boolean | null
          seriousness_lifethreatening?: boolean | null
          seriousness_other?: boolean | null
          transmissiondate?: string | null
          updated_at?: string
        }
        Update: {
          companynumb?: string | null
          created_at?: string
          duplicate?: boolean | null
          fulfillexpeditecriteria?: number | null
          id?: string
          ingested_at?: string
          occurcountry?: string | null
          patient_death_date?: string | null
          patient_died?: boolean | null
          patient_onset_age?: number | null
          patient_onset_age_unit?: number | null
          patient_sex?: number | null
          patient_weight?: number | null
          primarysource_qualification?: number | null
          primarysource_reportercountry?: string | null
          raw_payload?: Json | null
          receiptdate?: string | null
          receivedate?: string | null
          reporttype?: number | null
          safetyreportid?: string
          safetyreportversion?: string | null
          sender_organization?: string | null
          sender_type?: number | null
          serious?: boolean | null
          seriousness_congenital?: boolean | null
          seriousness_death?: boolean | null
          seriousness_disabling?: boolean | null
          seriousness_hospitalization?: boolean | null
          seriousness_lifethreatening?: boolean | null
          seriousness_other?: boolean | null
          transmissiondate?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      drug_manufacturer_aliases: {
        Row: {
          alias_text: string
          canonical_name: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          alias_text: string
          canonical_name: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          alias_text?: string
          canonical_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      drugs: {
        Row: {
          brand_names: string[]
          canonical_name: string
          created_at: string
          display_name: string | null
          generic_names: string[]
          id: string
          primary_application_number: string | null
          primary_brand_name: string | null
          primary_generic_name: string | null
          primary_rxcui: string | null
          primary_unii: string | null
          substance_names: string[]
          unique_match_key: string
          updated_at: string
        }
        Insert: {
          brand_names?: string[]
          canonical_name: string
          created_at?: string
          display_name?: string | null
          generic_names?: string[]
          id?: string
          primary_application_number?: string | null
          primary_brand_name?: string | null
          primary_generic_name?: string | null
          primary_rxcui?: string | null
          primary_unii?: string | null
          substance_names?: string[]
          unique_match_key: string
          updated_at?: string
        }
        Update: {
          brand_names?: string[]
          canonical_name?: string
          created_at?: string
          display_name?: string | null
          generic_names?: string[]
          id?: string
          primary_application_number?: string | null
          primary_brand_name?: string | null
          primary_generic_name?: string | null
          primary_rxcui?: string | null
          primary_unii?: string | null
          substance_names?: string[]
          unique_match_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      fars_fatalities: {
        Row: {
          county_fips: number | null
          county_name: string | null
          crash_date: string | null
          created_at: string | null
          drunk_drivers: number | null
          fatalities: number | null
          has_large_truck: boolean | null
          has_motorcycle: boolean | null
          id: number
          latitude: number | null
          longitude: number | null
          persons: number | null
          rur_urb: number | null
          st_case: number
          state: string | null
          state_fips: number | null
          vehicles: number | null
          year: number
        }
        Insert: {
          county_fips?: number | null
          county_name?: string | null
          crash_date?: string | null
          created_at?: string | null
          drunk_drivers?: number | null
          fatalities?: number | null
          has_large_truck?: boolean | null
          has_motorcycle?: boolean | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          persons?: number | null
          rur_urb?: number | null
          st_case: number
          state?: string | null
          state_fips?: number | null
          vehicles?: number | null
          year: number
        }
        Update: {
          county_fips?: number | null
          county_name?: string | null
          crash_date?: string | null
          created_at?: string | null
          drunk_drivers?: number | null
          fatalities?: number | null
          has_large_truck?: boolean | null
          has_motorcycle?: boolean | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          persons?: number | null
          rur_urb?: number | null
          st_case?: number
          state?: string | null
          state_fips?: number | null
          vehicles?: number | null
          year?: number
        }
        Relationships: []
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
      firm_managers: {
        Row: {
          added_at: string
          added_by_user_id: string | null
          firm_id: string
          id: string
          manager_user_id: string
          role: string
        }
        Insert: {
          added_at?: string
          added_by_user_id?: string | null
          firm_id: string
          id?: string
          manager_user_id: string
          role?: string
        }
        Update: {
          added_at?: string
          added_by_user_id?: string | null
          firm_id?: string
          id?: string
          manager_user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_managers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          default_dma_codes: string[] | null
          default_state: string | null
          differentiators: string[] | null
          extracted_at: string | null
          extraction_source: string
          id: string
          label: string
          logo_path: string | null
          logo_url: string | null
          notes: string | null
          partner_names: string[] | null
          pronunciation_overrides: Json
          service_areas: string[] | null
          signature_phrases: string[] | null
          social_handles: Json | null
          tagline: string | null
          updated_at: string
          voice_descriptors: string[] | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          default_dma_codes?: string[] | null
          default_state?: string | null
          differentiators?: string[] | null
          extracted_at?: string | null
          extraction_source?: string
          id?: string
          label: string
          logo_path?: string | null
          logo_url?: string | null
          notes?: string | null
          partner_names?: string[] | null
          pronunciation_overrides?: Json
          service_areas?: string[] | null
          signature_phrases?: string[] | null
          social_handles?: Json | null
          tagline?: string | null
          updated_at?: string
          voice_descriptors?: string[] | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          default_dma_codes?: string[] | null
          default_state?: string | null
          differentiators?: string[] | null
          extracted_at?: string | null
          extraction_source?: string
          id?: string
          label?: string
          logo_path?: string | null
          logo_url?: string | null
          notes?: string | null
          partner_names?: string[] | null
          pronunciation_overrides?: Json
          service_areas?: string[] | null
          signature_phrases?: string[] | null
          social_handles?: Json | null
          tagline?: string | null
          updated_at?: string
          voice_descriptors?: string[] | null
          website_url?: string | null
        }
        Relationships: []
      }
      generation_costs: {
        Row: {
          campaign_id: string | null
          characters_synth: number | null
          cost_cents: number
          created_at: string
          firm_id: string | null
          id: string
          image_count: number | null
          input_tokens: number | null
          latency_ms: number | null
          meta: Json | null
          model: string
          output_tokens: number | null
          provider: string
          purpose: string
          seconds_audio: number | null
          seconds_video: number | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          characters_synth?: number | null
          cost_cents: number
          created_at?: string
          firm_id?: string | null
          id?: string
          image_count?: number | null
          input_tokens?: number | null
          latency_ms?: number | null
          meta?: Json | null
          model: string
          output_tokens?: number | null
          provider: string
          purpose: string
          seconds_audio?: number | null
          seconds_video?: number | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          characters_synth?: number | null
          cost_cents?: number
          created_at?: string
          firm_id?: string | null
          id?: string
          image_count?: number | null
          input_tokens?: number | null
          latency_ms?: number | null
          meta?: Json | null
          model?: string
          output_tokens?: number | null
          provider?: string
          purpose?: string
          seconds_audio?: number | null
          seconds_video?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_costs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_costs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_targets: {
        Row: {
          created_at: string
          geo_code: string
          geo_name: string
          geo_type: string
          id: string
          population: number | null
          state_abbr: string | null
        }
        Insert: {
          created_at?: string
          geo_code: string
          geo_name: string
          geo_type: string
          id?: string
          population?: number | null
          state_abbr?: string | null
        }
        Update: {
          created_at?: string
          geo_code?: string
          geo_name?: string
          geo_type?: string
          id?: string
          population?: number | null
          state_abbr?: string | null
        }
        Relationships: []
      }
      glp1_prescriptions: {
        Row: {
          created_at: string | null
          id: number
          state: string
          statewide_usage_pct: number | null
          total_prescriptions_2024: number
          yoy_change_pct: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          state: string
          statewide_usage_pct?: number | null
          total_prescriptions_2024: number
          yoy_change_pct?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          state?: string
          statewide_usage_pct?: number | null
          total_prescriptions_2024?: number
          yoy_change_pct?: number | null
        }
        Relationships: []
      }
      google_trends_observations: {
        Row: {
          created_at: string
          data_type: string
          id: string
          interest_value: number | null
          keyword: string
          observed_at: string
          period_label: string | null
          raw_json: string | null
          region_code: string
          region_name: string
          tort_id: string | null
          tort_slug: string
        }
        Insert: {
          created_at?: string
          data_type: string
          id?: string
          interest_value?: number | null
          keyword: string
          observed_at?: string
          period_label?: string | null
          raw_json?: string | null
          region_code?: string
          region_name?: string
          tort_id?: string | null
          tort_slug: string
        }
        Update: {
          created_at?: string
          data_type?: string
          id?: string
          interest_value?: number | null
          keyword?: string
          observed_at?: string
          period_label?: string | null
          raw_json?: string | null
          region_code?: string
          region_name?: string
          tort_id?: string | null
          tort_slug?: string
        }
        Relationships: []
      }
      google_trends_related_queries: {
        Row: {
          created_at: string
          display_value: string | null
          extracted_value: number | null
          id: string
          keyword: string
          link: string | null
          observed_at: string
          position: number | null
          query_text: string
          query_type: string
          tort_id: string | null
          tort_slug: string
        }
        Insert: {
          created_at?: string
          display_value?: string | null
          extracted_value?: number | null
          id?: string
          keyword: string
          link?: string | null
          observed_at: string
          position?: number | null
          query_text: string
          query_type: string
          tort_id?: string | null
          tort_slug: string
        }
        Update: {
          created_at?: string
          display_value?: string | null
          extracted_value?: number | null
          id?: string
          keyword?: string
          link?: string | null
          observed_at?: string
          position?: number | null
          query_text?: string
          query_type?: string
          tort_id?: string | null
          tort_slug?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          tenant_id: string
          token: string
          trial_days: number | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          tenant_id: string
          token?: string
          trial_days?: number | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          tenant_id?: string
          token?: string
          trial_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      jpml_snapshots: {
        Row: {
          case_name: string
          created_at: string
          date_closed: string | null
          date_filed: string | null
          date_transferred: string | null
          district: string | null
          id: string
          jpml_type: string
          master_docket: string | null
          mdl_number: number
          report_date: string
          transferee_judge: string | null
        }
        Insert: {
          case_name: string
          created_at?: string
          date_closed?: string | null
          date_filed?: string | null
          date_transferred?: string | null
          district?: string | null
          id?: string
          jpml_type: string
          master_docket?: string | null
          mdl_number: number
          report_date: string
          transferee_judge?: string | null
        }
        Update: {
          case_name?: string
          created_at?: string
          date_closed?: string | null
          date_filed?: string | null
          date_transferred?: string | null
          district?: string | null
          id?: string
          jpml_type?: string
          master_docket?: string | null
          mdl_number?: number
          report_date?: string
          transferee_judge?: string | null
        }
        Relationships: []
      }
      jpml_type_summaries: {
        Row: {
          created_at: string
          id: string
          mdl_count: number
          mdl_type: string
          pct_of_total: number | null
          report_date: string
          total_active_mdls: number
        }
        Insert: {
          created_at?: string
          id?: string
          mdl_count: number
          mdl_type: string
          pct_of_total?: number | null
          report_date: string
          total_active_mdls: number
        }
        Update: {
          created_at?: string
          id?: string
          mdl_count?: number
          mdl_type?: string
          pct_of_total?: number | null
          report_date?: string
          total_active_mdls?: number
        }
        Relationships: []
      }
      judicial_profiles: {
        Row: {
          county_name: string
          created_at: string | null
          fips: number
          id: number
          judicial_profile: string
          state: string
        }
        Insert: {
          county_name: string
          created_at?: string | null
          fips: number
          id?: number
          judicial_profile: string
          state: string
        }
        Update: {
          county_name?: string
          created_at?: string | null
          fips?: number
          id?: number
          judicial_profile?: string
          state?: string
        }
        Relationships: []
      }
      legal_news: {
        Row: {
          category: string
          created_at: string | null
          id: string
          published_at: string | null
          query_bucket: string
          query_term: string | null
          raw: Json | null
          source_name: string
          source_url: string
          summary: string | null
          title: string
          tort_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          published_at?: string | null
          query_bucket: string
          query_term?: string | null
          raw?: Json | null
          source_name: string
          source_url: string
          summary?: string | null
          title: string
          tort_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          published_at?: string | null
          query_bucket?: string
          query_term?: string | null
          raw?: Json | null
          source_name?: string
          source_url?: string
          summary?: string | null
          title?: string
          tort_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_news_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["id"]
          },
        ]
      }
      lyft_account_sharing: {
        Row: {
          category: string
          detail: string
          id: number
          severity: string
          source: string | null
          year: number | null
        }
        Insert: {
          category: string
          detail: string
          id?: number
          severity: string
          source?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          detail?: string
          id?: number
          severity?: string
          source?: string | null
          year?: number | null
        }
        Relationships: []
      }
      lyft_safety_gap: {
        Row: {
          assault_rate_per_million_rides: number | null
          attempted_penetration: number | null
          categories_reported: number | null
          id: number
          kissing_non_sexual_body_part: number | null
          kissing_sexual_body_part: number | null
          non_consensual_penetration: number | null
          report_period: string
          total_raliance_categories: number | null
          total_rides_billions: number | null
          total_sexual_assaults: number | null
          touching_sexual_body_part: number | null
        }
        Insert: {
          assault_rate_per_million_rides?: number | null
          attempted_penetration?: number | null
          categories_reported?: number | null
          id?: number
          kissing_non_sexual_body_part?: number | null
          kissing_sexual_body_part?: number | null
          non_consensual_penetration?: number | null
          report_period: string
          total_raliance_categories?: number | null
          total_rides_billions?: number | null
          total_sexual_assaults?: number | null
          touching_sexual_body_part?: number | null
        }
        Update: {
          assault_rate_per_million_rides?: number | null
          attempted_penetration?: number | null
          categories_reported?: number | null
          id?: number
          kissing_non_sexual_body_part?: number | null
          kissing_sexual_body_part?: number | null
          non_consensual_penetration?: number | null
          report_period?: string
          total_raliance_categories?: number | null
          total_rides_billions?: number | null
          total_sexual_assaults?: number | null
          touching_sexual_body_part?: number | null
        }
        Relationships: []
      }
      manufacturer_tort_map: {
        Row: {
          alt_slugs: string[]
          confidence: string
          created_at: string
          id: string
          manufacturer_id: string
          notes: string | null
          source: string
          tort_id: string
          tort_slug: string
          updated_at: string
        }
        Insert: {
          alt_slugs?: string[]
          confidence: string
          created_at?: string
          id?: string
          manufacturer_id: string
          notes?: string | null
          source?: string
          tort_id: string
          tort_slug: string
          updated_at?: string
        }
        Update: {
          alt_slugs?: string[]
          confidence?: string
          created_at?: string
          id?: string
          manufacturer_id?: string
          notes?: string | null
          source?: string
          tort_id?: string
          tort_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturer_tort_map_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "recall_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturer_tort_map_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
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
          advertising_page_slug: string | null
          canonical_url: string | null
          category: string | null
          cost_benchmark_name: string | null
          created_at: string
          disease_or_injury: string | null
          end_date: string | null
          has_advertising_page: boolean
          id: string
          name: string
          notes: string | null
          product_or_exposure: string | null
          slug: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          advertising_page_slug?: string | null
          canonical_url?: string | null
          category?: string | null
          cost_benchmark_name?: string | null
          created_at?: string
          disease_or_injury?: string | null
          end_date?: string | null
          has_advertising_page?: boolean
          id?: string
          name: string
          notes?: string | null
          product_or_exposure?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          advertising_page_slug?: string | null
          canonical_url?: string | null
          category?: string | null
          cost_benchmark_name?: string | null
          created_at?: string
          disease_or_injury?: string | null
          end_date?: string | null
          has_advertising_page?: boolean
          id?: string
          name?: string
          notes?: string | null
          product_or_exposure?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      mdl_attorneys: {
        Row: {
          attorney_name: string
          cl_attorney_id: number | null
          cl_docket_id: number | null
          cl_org_id: number | null
          created_at: string | null
          email: string | null
          fetched_at: string | null
          firm_name: string | null
          id: number
          is_leadership: boolean | null
          mdl_number: number
          member_docket_count: number | null
          party_name: string | null
          party_type: string | null
          phone: string | null
          role: string | null
          sample_docket_ids: number[] | null
          source_url: string | null
        }
        Insert: {
          attorney_name: string
          cl_attorney_id?: number | null
          cl_docket_id?: number | null
          cl_org_id?: number | null
          created_at?: string | null
          email?: string | null
          fetched_at?: string | null
          firm_name?: string | null
          id?: never
          is_leadership?: boolean | null
          mdl_number: number
          member_docket_count?: number | null
          party_name?: string | null
          party_type?: string | null
          phone?: string | null
          role?: string | null
          sample_docket_ids?: number[] | null
          source_url?: string | null
        }
        Update: {
          attorney_name?: string
          cl_attorney_id?: number | null
          cl_docket_id?: number | null
          cl_org_id?: number | null
          created_at?: string | null
          email?: string | null
          fetched_at?: string | null
          firm_name?: string | null
          id?: never
          is_leadership?: boolean | null
          mdl_number?: number
          member_docket_count?: number | null
          party_name?: string | null
          party_type?: string | null
          phone?: string | null
          role?: string | null
          sample_docket_ids?: number[] | null
          source_url?: string | null
        }
        Relationships: []
      }
      mdl_developments: {
        Row: {
          created_at: string | null
          event_date: string
          event_type: string
          id: string
          mdl_number: number
          source_name: string | null
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          event_date: string
          event_type: string
          id?: string
          mdl_number: number
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          mdl_number?: number
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
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
          cl_docket_id: number | null
          closed_date: string | null
          court: string | null
          created_at: string
          district: string | null
          filed_date: string | null
          id: string
          is_priority: boolean | null
          judge_name: string | null
          mass_tort_id: string | null
          mdl_number: number
          source_url: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cl_docket_id?: number | null
          closed_date?: string | null
          court?: string | null
          created_at?: string
          district?: string | null
          filed_date?: string | null
          id?: string
          is_priority?: boolean | null
          judge_name?: string | null
          mass_tort_id?: string | null
          mdl_number: number
          source_url?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cl_docket_id?: number | null
          closed_date?: string | null
          court?: string | null
          created_at?: string
          district?: string | null
          filed_date?: string | null
          id?: string
          is_priority?: boolean | null
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
      meddra_terms: {
        Row: {
          created_at: string
          first_seen_meddra_version: string | null
          id: string
          pt_name: string
          pt_name_canonical: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_seen_meddra_version?: string | null
          id?: string
          pt_name: string
          pt_name_canonical: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_seen_meddra_version?: string | null
          id?: string
          pt_name?: string
          pt_name_canonical?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_outlets: {
        Row: {
          call_sign: string
          created_at: string | null
          format_genre: string | null
          id: string
          market: string
          media_category: string | null
          media_company: string
          media_format: string
          media_type: string
        }
        Insert: {
          call_sign: string
          created_at?: string | null
          format_genre?: string | null
          id?: string
          market: string
          media_category?: string | null
          media_company: string
          media_format: string
          media_type: string
        }
        Update: {
          call_sign?: string
          created_at?: string | null
          format_genre?: string | null
          id?: string
          market?: string
          media_category?: string | null
          media_company?: string
          media_format?: string
          media_type?: string
        }
        Relationships: []
      }
      media_profiles: {
        Row: {
          age_band: string
          ctv_streaming_index: number | null
          facebook_index: number | null
          id: string
          instagram_index: number | null
          market_id: string
          podcast_index: number | null
          print_index: number | null
          radio_index: number | null
          search_index: number | null
          source: string
          tiktok_index: number | null
          tv_linear_index: number | null
          updated_at: string | null
          youtube_index: number | null
        }
        Insert: {
          age_band: string
          ctv_streaming_index?: number | null
          facebook_index?: number | null
          id?: string
          instagram_index?: number | null
          market_id: string
          podcast_index?: number | null
          print_index?: number | null
          radio_index?: number | null
          search_index?: number | null
          source: string
          tiktok_index?: number | null
          tv_linear_index?: number | null
          updated_at?: string | null
          youtube_index?: number | null
        }
        Update: {
          age_band?: string
          ctv_streaming_index?: number | null
          facebook_index?: number | null
          id?: string
          instagram_index?: number | null
          market_id?: string
          podcast_index?: number | null
          print_index?: number | null
          radio_index?: number | null
          search_index?: number | null
          source?: string
          tiktok_index?: number | null
          tv_linear_index?: number | null
          updated_at?: string | null
          youtube_index?: number | null
        }
        Relationships: []
      }
      motor_vehicle_pois: {
        Row: {
          category: string
          county_fips: number | null
          county_name: string | null
          created_at: string | null
          id: number
          lat: number
          lng: number
          name: string | null
          osm_id: number | null
          phone: string | null
          state: string
          tags: Json | null
          website: string | null
        }
        Insert: {
          category: string
          county_fips?: number | null
          county_name?: string | null
          created_at?: string | null
          id?: never
          lat: number
          lng: number
          name?: string | null
          osm_id?: number | null
          phone?: string | null
          state: string
          tags?: Json | null
          website?: string | null
        }
        Update: {
          category?: string
          county_fips?: number | null
          county_name?: string | null
          created_at?: string | null
          id?: never
          lat?: number
          lng?: number
          name?: string | null
          osm_id?: number | null
          phone?: string | null
          state?: string
          tags?: Json | null
          website?: string | null
        }
        Relationships: []
      }
      obesity_prevalence: {
        Row: {
          created_at: string | null
          data_year: number | null
          id: number
          obesity_prevalence_pct: number
          state: string
        }
        Insert: {
          created_at?: string | null
          data_year?: number | null
          id?: number
          obesity_prevalence_pct: number
          state: string
        }
        Update: {
          created_at?: string | null
          data_year?: number | null
          id?: number
          obesity_prevalence_pct?: number
          state?: string
        }
        Relationships: []
      }
      olympus_adverse_events: {
        Row: {
          category: string
          detail: string
          id: number
          severity: string
          source: string | null
          year: number | null
        }
        Insert: {
          category: string
          detail: string
          id?: number
          severity: string
          source?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          detail?: string
          id?: number
          severity?: string
          source?: string | null
          year?: number | null
        }
        Relationships: []
      }
      olympus_device_failure_timeline: {
        Row: {
          event: string
          event_date: string
          id: number
          is_future: boolean | null
          significance: string | null
        }
        Insert: {
          event: string
          event_date: string
          id?: number
          is_future?: boolean | null
          significance?: string | null
        }
        Update: {
          event?: string
          event_date?: string
          id?: number
          is_future?: boolean | null
          significance?: string | null
        }
        Relationships: []
      }
      olympus_ercp_volume_by_state: {
        Row: {
          annual_ercp_estimate: number
          id: number
          rank: number
          state: string
        }
        Insert: {
          annual_ercp_estimate: number
          id?: number
          rank: number
          state: string
        }
        Update: {
          annual_ercp_estimate?: number
          id?: number
          rank?: number
          state?: string
        }
        Relationships: []
      }
      olympus_qualifying_criteria_tiers: {
        Row: {
          criteria: string
          estimated_cpl_band: string
          id: number
          intake_signal: string
          label: string
          notes: string | null
          tier: string
        }
        Insert: {
          criteria: string
          estimated_cpl_band: string
          id?: number
          intake_signal: string
          label: string
          notes?: string | null
          tier: string
        }
        Update: {
          criteria?: string
          estimated_cpl_band?: string
          id?: number
          intake_signal?: string
          label?: string
          notes?: string | null
          tier?: string
        }
        Relationships: []
      }
      olympus_settlement_projections: {
        Row: {
          comparable_litigation: string | null
          high_estimate: number
          id: number
          injury_tier: string
          low_estimate: number
          rationale: string | null
        }
        Insert: {
          comparable_litigation?: string | null
          high_estimate: number
          id?: number
          injury_tier: string
          low_estimate: number
          rationale?: string | null
        }
        Update: {
          comparable_litigation?: string | null
          high_estimate?: number
          id?: number
          injury_tier?: string
          low_estimate?: number
          rationale?: string | null
        }
        Relationships: []
      }
      pesticide_usage: {
        Row: {
          compound: string
          county_fips: string
          county_name: string | null
          created_at: string
          epest_high_kg: number | null
          epest_low_kg: number | null
          fips: string
          id: string
          source_url: string | null
          state_fips: string
          state_name: string
          updated_at: string
          year: number
        }
        Insert: {
          compound: string
          county_fips: string
          county_name?: string | null
          created_at?: string
          epest_high_kg?: number | null
          epest_low_kg?: number | null
          fips: string
          id?: string
          source_url?: string | null
          state_fips: string
          state_name: string
          updated_at?: string
          year: number
        }
        Update: {
          compound?: string
          county_fips?: string
          county_name?: string | null
          created_at?: string
          epest_high_kg?: number | null
          epest_low_kg?: number | null
          fips?: string
          id?: string
          source_url?: string | null
          state_fips?: string
          state_name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      pfas_contamination_sites: {
        Row: {
          created_at: string | null
          data_year: number | null
          id: string
          installation_name: string
          pfas_ppt: number
          severity: string | null
          source: string | null
          state: string
        }
        Insert: {
          created_at?: string | null
          data_year?: number | null
          id?: string
          installation_name: string
          pfas_ppt: number
          severity?: string | null
          source?: string | null
          state: string
        }
        Update: {
          created_at?: string | null
          data_year?: number | null
          id?: string
          installation_name?: string
          pfas_ppt?: number
          severity?: string | null
          source?: string | null
          state?: string
        }
        Relationships: []
      }
      pi_competitor_profiles: {
        Row: {
          advertiser_domain: string
          advertiser_name: string | null
          avg_ad_position: number | null
          case_types_active: string[] | null
          created_at: string | null
          first_seen: string | null
          id: string
          last_seen: string | null
          metros_active: string[] | null
          presence_score: number | null
          state_abbr: string
          total_observations: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          advertiser_domain: string
          advertiser_name?: string | null
          avg_ad_position?: number | null
          case_types_active?: string[] | null
          created_at?: string | null
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          metros_active?: string[] | null
          presence_score?: number | null
          state_abbr: string
          total_observations?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          advertiser_domain?: string
          advertiser_name?: string | null
          avg_ad_position?: number | null
          case_types_active?: string[] | null
          created_at?: string | null
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          metros_active?: string[] | null
          presence_score?: number | null
          state_abbr?: string
          total_observations?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pi_keyword_clusters: {
        Row: {
          case_label: string
          case_type: string
          created_at: string | null
          id: string
          keywords: Json
        }
        Insert: {
          case_label: string
          case_type: string
          created_at?: string | null
          id?: string
          keywords: Json
        }
        Update: {
          case_label?: string
          case_type?: string
          created_at?: string | null
          id?: string
          keywords?: Json
        }
        Relationships: []
      }
      pi_metros: {
        Row: {
          created_at: string | null
          id: string
          metro_label: string
          metro_name: string
          population: number | null
          searchapi_location: string | null
          state_abbr: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metro_label: string
          metro_name: string
          population?: number | null
          searchapi_location?: string | null
          state_abbr: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metro_label?: string
          metro_name?: string
          population?: number | null
          searchapi_location?: string | null
          state_abbr?: string
        }
        Relationships: []
      }
      pi_search_observations: {
        Row: {
          ad_description: string | null
          ad_link: string | null
          ad_position: number | null
          ad_title: string | null
          advertiser_domain: string
          advertiser_name: string | null
          case_type: string
          created_at: string | null
          id: string
          keyword_used: string
          metro_id: string
          observed_at: string | null
          observed_date: string
          raw_json: Json | null
          source: string | null
        }
        Insert: {
          ad_description?: string | null
          ad_link?: string | null
          ad_position?: number | null
          ad_title?: string | null
          advertiser_domain: string
          advertiser_name?: string | null
          case_type: string
          created_at?: string | null
          id?: string
          keyword_used: string
          metro_id: string
          observed_at?: string | null
          observed_date?: string
          raw_json?: Json | null
          source?: string | null
        }
        Update: {
          ad_description?: string | null
          ad_link?: string | null
          ad_position?: number | null
          ad_title?: string | null
          advertiser_domain?: string
          advertiser_name?: string | null
          case_type?: string
          created_at?: string | null
          id?: string
          keyword_used?: string
          metro_id?: string
          observed_at?: string | null
          observed_date?: string
          raw_json?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pi_search_observations_metro_id_fkey"
            columns: ["metro_id"]
            isOneToOne: false
            referencedRelation: "pi_metros"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_viability_scores: {
        Row: {
          avg_jury_verdict: string | null
          composite_score: number | null
          id: number
          med_mal_cap: string | null
          med_mal_score: number | null
          negligence_rule: string | null
          negligence_score: number | null
          non_economic_cap: string | null
          non_economic_score: number | null
          punitive_cap: string | null
          punitive_score: number | null
          sol_score: number | null
          state: string
          statute_of_limitations: string | null
          updated_at: string | null
          verdict_score: number | null
        }
        Insert: {
          avg_jury_verdict?: string | null
          composite_score?: number | null
          id?: never
          med_mal_cap?: string | null
          med_mal_score?: number | null
          negligence_rule?: string | null
          negligence_score?: number | null
          non_economic_cap?: string | null
          non_economic_score?: number | null
          punitive_cap?: string | null
          punitive_score?: number | null
          sol_score?: number | null
          state: string
          statute_of_limitations?: string | null
          updated_at?: string | null
          verdict_score?: number | null
        }
        Update: {
          avg_jury_verdict?: string | null
          composite_score?: number | null
          id?: never
          med_mal_cap?: string | null
          med_mal_score?: number | null
          negligence_rule?: string | null
          negligence_score?: number | null
          non_economic_cap?: string | null
          non_economic_score?: number | null
          punitive_cap?: string | null
          punitive_score?: number | null
          sol_score?: number | null
          state?: string
          statute_of_limitations?: string | null
          updated_at?: string | null
          verdict_score?: number | null
        }
        Relationships: []
      }
      pipeline_configs: {
        Row: {
          alert_channel: string
          alert_on_failure: boolean
          created_at: string
          description: string | null
          enabled: boolean
          expected_cron: string | null
          id: string
          max_runtime_minutes: number
          owner: string | null
          pipeline_name: string
          retry_limit: number
          source_domain: string
          step_definitions: Json
          updated_at: string
        }
        Insert: {
          alert_channel?: string
          alert_on_failure?: boolean
          created_at?: string
          description?: string | null
          enabled?: boolean
          expected_cron?: string | null
          id?: string
          max_runtime_minutes?: number
          owner?: string | null
          pipeline_name: string
          retry_limit?: number
          source_domain: string
          step_definitions?: Json
          updated_at?: string
        }
        Update: {
          alert_channel?: string
          alert_on_failure?: boolean
          created_at?: string
          description?: string | null
          enabled?: boolean
          expected_cron?: string | null
          id?: string
          max_runtime_minutes?: number
          owner?: string | null
          pipeline_name?: string
          retry_limit?: number
          source_domain?: string
          step_definitions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_run_steps: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json
          rows_in: number
          rows_out: number
          rows_rejected: number
          run_id: string
          started_at: string | null
          status: string
          step_name: string
          step_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          rows_in?: number
          rows_out?: number
          rows_rejected?: number
          run_id: string
          started_at?: string | null
          status?: string
          step_name: string
          step_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          rows_in?: number
          rows_out?: number
          rows_rejected?: number
          run_id?: string
          started_at?: string | null
          status?: string
          step_name?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          attempt_number: number
          created_at: string
          duration_ms: number | null
          error_summary: string | null
          finished_at: string | null
          id: string
          metadata: Json
          pipeline_name: string
          retry_of: string | null
          rows_ingested: number
          rows_normalized: number
          rows_rejected: number
          rows_scored: number
          source_domain: string
          started_at: string | null
          status: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          pipeline_name: string
          retry_of?: string | null
          rows_ingested?: number
          rows_normalized?: number
          rows_rejected?: number
          rows_scored?: number
          source_domain: string
          started_at?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          pipeline_name?: string
          retry_of?: string | null
          rows_ingested?: number
          rows_normalized?: number
          rows_rejected?: number
          rows_scored?: number
          source_domain?: string
          started_at?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_pipeline_name_fkey"
            columns: ["pipeline_name"]
            isOneToOne: false
            referencedRelation: "pipeline_configs"
            referencedColumns: ["pipeline_name"]
          },
          {
            foreignKeyName: "pipeline_runs_retry_of_fkey"
            columns: ["retry_of"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          digest_frequency: string | null
          email_digest_enabled: boolean
          firm_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          last_seen_at: string | null
          role: string
          tenant_id: string
          trial_expires_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          digest_frequency?: string | null
          email_digest_enabled?: boolean
          firm_name?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          last_seen_at?: string | null
          role?: string
          tenant_id: string
          trial_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          digest_frequency?: string | null
          email_digest_enabled?: boolean
          firm_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_seen_at?: string | null
          role?: string
          tenant_id?: string
          trial_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pronunciation_dictionary: {
        Row: {
          category: string | null
          created_at: string
          id: string
          notes: string | null
          spoken: string
          updated_at: string
          written: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          spoken: string
          updated_at?: string
          written: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          spoken?: string
          updated_at?: string
          written?: string
        }
        Relationships: []
      }
      proposal_blocks: {
        Row: {
          block_data: Json
          block_type: string
          created_at: string
          id: string
          order: number
          proposal_id: string
          updated_at: string
        }
        Insert: {
          block_data?: Json
          block_type: string
          created_at?: string
          id?: string
          order: number
          proposal_id: string
          updated_at?: string
        }
        Update: {
          block_data?: Json
          block_type?: string
          created_at?: string
          id?: string
          order?: number
          proposal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_blocks_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_cases: {
        Row: {
          case_filed_date: string | null
          case_name: string | null
          court_id: string | null
          court_name: string | null
          created_at: string
          defendants: string[] | null
          device_family_id: string | null
          docket_url: string | null
          external_id: string
          id: string
          is_specialty_firm: boolean
          plaintiff_firm_name: string | null
          raw_payload: Json | null
          recall_id: string | null
          source: string
          state_code: string | null
          updated_at: string
        }
        Insert: {
          case_filed_date?: string | null
          case_name?: string | null
          court_id?: string | null
          court_name?: string | null
          created_at?: string
          defendants?: string[] | null
          device_family_id?: string | null
          docket_url?: string | null
          external_id: string
          id?: string
          is_specialty_firm?: boolean
          plaintiff_firm_name?: string | null
          raw_payload?: Json | null
          recall_id?: string | null
          source?: string
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          case_filed_date?: string | null
          case_name?: string | null
          court_id?: string | null
          court_name?: string | null
          created_at?: string
          defendants?: string[] | null
          device_family_id?: string | null
          docket_url?: string | null
          external_id?: string
          id?: string
          is_specialty_firm?: boolean
          plaintiff_firm_name?: string | null
          raw_payload?: Json | null
          recall_id?: string | null
          source?: string
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_cases_device_family_id_fkey"
            columns: ["device_family_id"]
            isOneToOne: false
            referencedRelation: "recall_device_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_cases_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_device_families: {
        Row: {
          created_at: string
          description: string | null
          family_name: string
          id: string
          manufacturer_id: string | null
          product_category: string | null
          product_codes: string[] | null
          slug: string | null
          tort_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          family_name: string
          id?: string
          manufacturer_id?: string | null
          product_category?: string | null
          product_codes?: string[] | null
          slug?: string | null
          tort_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          family_name?: string
          id?: string
          manufacturer_id?: string | null
          product_category?: string | null
          product_codes?: string[] | null
          slug?: string | null
          tort_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_device_families_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "recall_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_device_families_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_manufacturers: {
        Row: {
          aliases: string[] | null
          canonical_name: string
          country: string | null
          created_at: string
          domicile_state: string | null
          id: string
          notes: string | null
          parent_name: string | null
          slug: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          aliases?: string[] | null
          canonical_name: string
          country?: string | null
          created_at?: string
          domicile_state?: string | null
          id?: string
          notes?: string | null
          parent_name?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          aliases?: string[] | null
          canonical_name?: string
          country?: string | null
          created_at?: string
          domicile_state?: string | null
          id?: string
          notes?: string | null
          parent_name?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      recall_specialty_firms: {
        Row: {
          active: boolean
          aliases: string[] | null
          created_at: string
          firm_name: string
          id: string
          notes: string | null
          primary_state: string | null
          slug: string | null
        }
        Insert: {
          active?: boolean
          aliases?: string[] | null
          created_at?: string
          firm_name: string
          id?: string
          notes?: string | null
          primary_state?: string | null
          slug?: string | null
        }
        Update: {
          active?: boolean
          aliases?: string[] | null
          created_at?: string
          firm_name?: string
          id?: string
          notes?: string | null
          primary_state?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      recall_stage_history: {
        Row: {
          case_count_at_transition: number | null
          from_label: string | null
          from_stage: number | null
          id: string
          notes: string | null
          recall_id: string
          to_label: string
          to_stage: number
          transitioned_at: string
          trigger_reason: string | null
        }
        Insert: {
          case_count_at_transition?: number | null
          from_label?: string | null
          from_stage?: number | null
          id?: string
          notes?: string | null
          recall_id: string
          to_label: string
          to_stage: number
          transitioned_at?: string
          trigger_reason?: string | null
        }
        Update: {
          case_count_at_transition?: number | null
          from_label?: string | null
          from_stage?: number | null
          id?: string
          notes?: string | null
          recall_id?: string
          to_label?: string
          to_stage?: number
          transitioned_at?: string
          trigger_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recall_stage_history_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      recalls: {
        Row: {
          case_count: number
          created_at: string
          device_family_id: string | null
          distribution_pattern: string | null
          event_date_initiated: string | null
          event_date_posted: string | null
          event_date_terminated: string | null
          external_id: string
          first_case_filed_at: string | null
          id: string
          k_numbers: string[] | null
          last_case_filed_at: string | null
          last_scored_at: string | null
          manufacturer_id: string | null
          mdl_formed: boolean
          mdl_petition_filed: boolean
          product_code: string | null
          product_description: string | null
          raw_payload: Json | null
          reason_for_recall: string | null
          recall_class: string | null
          root_cause_description: string | null
          source: string
          specialty_firm_count: number
          stage: number
          stage_label: string | null
          state_count: number
          status: string | null
          updated_at: string
        }
        Insert: {
          case_count?: number
          created_at?: string
          device_family_id?: string | null
          distribution_pattern?: string | null
          event_date_initiated?: string | null
          event_date_posted?: string | null
          event_date_terminated?: string | null
          external_id: string
          first_case_filed_at?: string | null
          id?: string
          k_numbers?: string[] | null
          last_case_filed_at?: string | null
          last_scored_at?: string | null
          manufacturer_id?: string | null
          mdl_formed?: boolean
          mdl_petition_filed?: boolean
          product_code?: string | null
          product_description?: string | null
          raw_payload?: Json | null
          reason_for_recall?: string | null
          recall_class?: string | null
          root_cause_description?: string | null
          source?: string
          specialty_firm_count?: number
          stage?: number
          stage_label?: string | null
          state_count?: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          case_count?: number
          created_at?: string
          device_family_id?: string | null
          distribution_pattern?: string | null
          event_date_initiated?: string | null
          event_date_posted?: string | null
          event_date_terminated?: string | null
          external_id?: string
          first_case_filed_at?: string | null
          id?: string
          k_numbers?: string[] | null
          last_case_filed_at?: string | null
          last_scored_at?: string | null
          manufacturer_id?: string | null
          mdl_formed?: boolean
          mdl_petition_filed?: boolean
          product_code?: string | null
          product_description?: string | null
          raw_payload?: Json | null
          reason_for_recall?: string | null
          recall_class?: string | null
          root_cause_description?: string | null
          source?: string
          specialty_firm_count?: number
          stage?: number
          stage_label?: string | null
          state_count?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recalls_device_family_id_fkey"
            columns: ["device_family_id"]
            isOneToOne: false
            referencedRelation: "recall_device_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "recall_manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      rideshare_penetration: {
        Row: {
          data_source: string | null
          data_year: number | null
          estimated_daily_trips: number
          id: number
          rideshare_market_share_pct: number
          state: string
          top_metros: string | null
        }
        Insert: {
          data_source?: string | null
          data_year?: number | null
          estimated_daily_trips: number
          id?: number
          rideshare_market_share_pct: number
          state: string
          top_metros?: string | null
        }
        Update: {
          data_source?: string | null
          data_year?: number | null
          estimated_daily_trips?: number
          id?: number
          rideshare_market_share_pct?: number
          state?: string
          top_metros?: string | null
        }
        Relationships: []
      }
      rideshare_regulatory: {
        Row: {
          background_check_type: string
          data_source: string | null
          fingerprint_required: boolean | null
          id: number
          independent_review: boolean | null
          regulatory_body: string | null
          sol_adult_sexual_assault_years: number | null
          sol_notes: string | null
          state: string
        }
        Insert: {
          background_check_type: string
          data_source?: string | null
          fingerprint_required?: boolean | null
          id?: number
          independent_review?: boolean | null
          regulatory_body?: string | null
          sol_adult_sexual_assault_years?: number | null
          sol_notes?: string | null
          state: string
        }
        Update: {
          background_check_type?: string
          data_source?: string | null
          fingerprint_required?: boolean | null
          id?: number
          independent_review?: boolean | null
          regulatory_body?: string | null
          sol_adult_sexual_assault_years?: number | null
          sol_notes?: string | null
          state?: string
        }
        Relationships: []
      }
      roblox_parental_concern: {
        Row: {
          concern_score: number
          created_at: string | null
          data_year: number | null
          download_requests_per_10k: number
          google_search_volume: number
          id: string
          lawsuits_filed: number
          media_mentions: number
          national_rank: number
          source: string | null
          state: string
        }
        Insert: {
          concern_score: number
          created_at?: string | null
          data_year?: number | null
          download_requests_per_10k: number
          google_search_volume: number
          id?: string
          lawsuits_filed?: number
          media_mentions: number
          national_rank: number
          source?: string | null
          state: string
        }
        Update: {
          concern_score?: number
          created_at?: string | null
          data_year?: number | null
          download_requests_per_10k?: number
          google_search_volume?: number
          id?: string
          lawsuits_filed?: number
          media_mentions?: number
          national_rank?: number
          source?: string | null
          state?: string
        }
        Relationships: []
      }
      roblox_state_enforcement: {
        Row: {
          ag_action_detail: string | null
          ag_action_type: string | null
          criminal_case_detail: string | null
          enforcement_score: number | null
          has_ag_action: boolean | null
          has_criminal_cases: boolean | null
          id: string
          source: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          ag_action_detail?: string | null
          ag_action_type?: string | null
          criminal_case_detail?: string | null
          enforcement_score?: number | null
          has_ag_action?: boolean | null
          has_criminal_cases?: boolean | null
          id?: string
          source?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          ag_action_detail?: string | null
          ag_action_type?: string | null
          criminal_case_detail?: string | null
          enforcement_score?: number | null
          has_ag_action?: boolean | null
          has_criminal_cases?: boolean | null
          id?: string
          source?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      serp_results_normalized: {
        Row: {
          advertiser_entity_id: string | null
          created_at: string
          domain: string
          fetched_at: string
          id: string
          link: string | null
          page: number | null
          position: number | null
          query: string
          raw_id: string | null
          result_type: string
          snippet: string | null
          title: string | null
          tort_slug: string | null
        }
        Insert: {
          advertiser_entity_id?: string | null
          created_at?: string
          domain: string
          fetched_at: string
          id?: string
          link?: string | null
          page?: number | null
          position?: number | null
          query: string
          raw_id?: string | null
          result_type: string
          snippet?: string | null
          title?: string | null
          tort_slug?: string | null
        }
        Update: {
          advertiser_entity_id?: string | null
          created_at?: string
          domain?: string
          fetched_at?: string
          id?: string
          link?: string | null
          page?: number | null
          position?: number | null
          query?: string
          raw_id?: string | null
          result_type?: string
          snippet?: string | null
          title?: string | null
          tort_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serp_results_normalized_advertiser_entity_id_fkey"
            columns: ["advertiser_entity_id"]
            isOneToOne: false
            referencedRelation: "advertiser_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_results_normalized_raw_id_fkey"
            columns: ["raw_id"]
            isOneToOne: false
            referencedRelation: "serp_results_raw"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_results_normalized_tort_slug_fkey"
            columns: ["tort_slug"]
            isOneToOne: false
            referencedRelation: "ad_saturation_summary"
            referencedColumns: ["tort_slug"]
          },
          {
            foreignKeyName: "serp_results_normalized_tort_slug_fkey"
            columns: ["tort_slug"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["slug"]
          },
        ]
      }
      serp_results_raw: {
        Row: {
          created_at: string
          displayed_link: string | null
          domain: string | null
          fetched_at: string
          id: string
          link: string | null
          page: number | null
          position: number | null
          query: string
          raw_payload: Json | null
          result_type: string
          rich_attributes: Json | null
          sitelinks: Json | null
          snippet: string | null
          source: string
          title: string | null
          tort_slug: string | null
        }
        Insert: {
          created_at?: string
          displayed_link?: string | null
          domain?: string | null
          fetched_at?: string
          id?: string
          link?: string | null
          page?: number | null
          position?: number | null
          query: string
          raw_payload?: Json | null
          result_type: string
          rich_attributes?: Json | null
          sitelinks?: Json | null
          snippet?: string | null
          source?: string
          title?: string | null
          tort_slug?: string | null
        }
        Update: {
          created_at?: string
          displayed_link?: string | null
          domain?: string | null
          fetched_at?: string
          id?: string
          link?: string | null
          page?: number | null
          position?: number | null
          query?: string
          raw_payload?: Json | null
          result_type?: string
          rich_attributes?: Json | null
          sitelinks?: Json | null
          snippet?: string | null
          source?: string
          title?: string | null
          tort_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serp_results_raw_tort_slug_fkey"
            columns: ["tort_slug"]
            isOneToOne: false
            referencedRelation: "ad_saturation_summary"
            referencedColumns: ["tort_slug"]
          },
          {
            foreignKeyName: "serp_results_raw_tort_slug_fkey"
            columns: ["tort_slug"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["slug"]
          },
        ]
      }
      serp_visibility_scores: {
        Row: {
          advertiser_entity_id: string | null
          avg_position: number | null
          created_at: string
          domain: string
          featured_snippet_count: number | null
          id: string
          local_pack_count: number | null
          organic_appearances: number | null
          paid_appearances: number | null
          period_end: string
          period_start: string
          queries_tracked: number | null
          top_10_count: number | null
          top_3_count: number | null
          tort_slug: string | null
          total_appearances: number | null
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          advertiser_entity_id?: string | null
          avg_position?: number | null
          created_at?: string
          domain: string
          featured_snippet_count?: number | null
          id?: string
          local_pack_count?: number | null
          organic_appearances?: number | null
          paid_appearances?: number | null
          period_end: string
          period_start: string
          queries_tracked?: number | null
          top_10_count?: number | null
          top_3_count?: number | null
          tort_slug?: string | null
          total_appearances?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          advertiser_entity_id?: string | null
          avg_position?: number | null
          created_at?: string
          domain?: string
          featured_snippet_count?: number | null
          id?: string
          local_pack_count?: number | null
          organic_appearances?: number | null
          paid_appearances?: number | null
          period_end?: string
          period_start?: string
          queries_tracked?: number | null
          top_10_count?: number | null
          top_3_count?: number | null
          tort_slug?: string | null
          total_appearances?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "serp_visibility_scores_advertiser_entity_id_fkey"
            columns: ["advertiser_entity_id"]
            isOneToOne: false
            referencedRelation: "advertiser_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_visibility_scores_tort_slug_fkey"
            columns: ["tort_slug"]
            isOneToOne: false
            referencedRelation: "ad_saturation_summary"
            referencedColumns: ["tort_slug"]
          },
          {
            foreignKeyName: "serp_visibility_scores_tort_slug_fkey"
            columns: ["tort_slug"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["slug"]
          },
        ]
      }
      sexual_assault_rates: {
        Row: {
          data_source: string | null
          data_year: number | null
          id: number
          population_2024: number
          rape_rate_per_100k: number
          state: string
          total_rapes_2024: number
        }
        Insert: {
          data_source?: string | null
          data_year?: number | null
          id?: number
          population_2024: number
          rape_rate_per_100k: number
          state: string
          total_rapes_2024: number
        }
        Update: {
          data_source?: string | null
          data_year?: number | null
          id?: number
          population_2024?: number
          rape_rate_per_100k?: number
          state?: string
          total_rapes_2024?: number
        }
        Relationships: []
      }
      social_media_state_regulatory: {
        Row: {
          ag_action_detail: string | null
          has_ag_action: boolean | null
          has_law_enacted: boolean | null
          id: string
          law_name: string | null
          law_status: string | null
          regulatory_score: number | null
          source: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          ag_action_detail?: string | null
          has_ag_action?: boolean | null
          has_law_enacted?: boolean | null
          id?: string
          law_name?: string | null
          law_status?: string | null
          regulatory_score?: number | null
          source?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          ag_action_detail?: string | null
          has_ag_action?: boolean | null
          has_law_enacted?: boolean | null
          id?: string
          law_name?: string | null
          law_status?: string | null
          regulatory_score?: number | null
          source?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      state_crash_statistics: {
        Row: {
          alcohol_related_fatalities: number | null
          data_source: string | null
          id: number
          is_preliminary: boolean
          last_updated: string | null
          motorcycle_fatalities: number | null
          pedestrian_fatalities: number | null
          rural_fatalities: number | null
          speeding_related_fatalities: number | null
          state_code: string
          total_fatalities: number | null
          unrestrained_occupant_fatalities: number | null
          urban_fatalities: number | null
          year: number
        }
        Insert: {
          alcohol_related_fatalities?: number | null
          data_source?: string | null
          id?: number
          is_preliminary?: boolean
          last_updated?: string | null
          motorcycle_fatalities?: number | null
          pedestrian_fatalities?: number | null
          rural_fatalities?: number | null
          speeding_related_fatalities?: number | null
          state_code: string
          total_fatalities?: number | null
          unrestrained_occupant_fatalities?: number | null
          urban_fatalities?: number | null
          year: number
        }
        Update: {
          alcohol_related_fatalities?: number | null
          data_source?: string | null
          id?: number
          is_preliminary?: boolean
          last_updated?: string | null
          motorcycle_fatalities?: number | null
          pedestrian_fatalities?: number | null
          rural_fatalities?: number | null
          speeding_related_fatalities?: number | null
          state_code?: string
          total_fatalities?: number | null
          unrestrained_occupant_fatalities?: number | null
          urban_fatalities?: number | null
          year?: number
        }
        Relationships: []
      }
      state_data_sources: {
        Row: {
          contact: string | null
          cost: string | null
          created_at: string
          data_table_ref: string | null
          id: string
          last_refreshed_at: string | null
          notes: string | null
          owner: string | null
          refresh_cadence: string | null
          source_name: string
          source_type: string
          state_code: string
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          contact?: string | null
          cost?: string | null
          created_at?: string
          data_table_ref?: string | null
          id?: string
          last_refreshed_at?: string | null
          notes?: string | null
          owner?: string | null
          refresh_cadence?: string | null
          source_name: string
          source_type: string
          state_code: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          contact?: string | null
          cost?: string | null
          created_at?: string
          data_table_ref?: string | null
          id?: string
          last_refreshed_at?: string | null
          notes?: string | null
          owner?: string | null
          refresh_cadence?: string | null
          source_name?: string
          source_type?: string
          state_code?: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "state_data_sources_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "state_rollout"
            referencedColumns: ["state_code"]
          },
          {
            foreignKeyName: "state_data_sources_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "v_states_to_build_next"
            referencedColumns: ["state_code"]
          },
        ]
      }
      state_rollout: {
        Row: {
          blockers: string | null
          created_at: string
          data_coverage_pct: number | null
          deep_data_count: number
          has_ad_data: boolean | null
          has_judicial_data: boolean | null
          has_mdl_data: boolean | null
          has_serp_data: boolean | null
          last_activity_at: string | null
          launched_at: string | null
          notes: string | null
          owner: string | null
          population_rank: number | null
          priority_score: number | null
          priority_tier: string | null
          region: string | null
          state_code: string
          state_name: string
          status: string
          target_launch_date: string | null
          updated_at: string
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          data_coverage_pct?: number | null
          deep_data_count?: number
          has_ad_data?: boolean | null
          has_judicial_data?: boolean | null
          has_mdl_data?: boolean | null
          has_serp_data?: boolean | null
          last_activity_at?: string | null
          launched_at?: string | null
          notes?: string | null
          owner?: string | null
          population_rank?: number | null
          priority_score?: number | null
          priority_tier?: string | null
          region?: string | null
          state_code: string
          state_name: string
          status?: string
          target_launch_date?: string | null
          updated_at?: string
        }
        Update: {
          blockers?: string | null
          created_at?: string
          data_coverage_pct?: number | null
          deep_data_count?: number
          has_ad_data?: boolean | null
          has_judicial_data?: boolean | null
          has_mdl_data?: boolean | null
          has_serp_data?: boolean | null
          last_activity_at?: string | null
          launched_at?: string | null
          notes?: string | null
          owner?: string | null
          population_rank?: number | null
          priority_score?: number | null
          priority_tier?: string | null
          region?: string | null
          state_code?: string
          state_name?: string
          status?: string
          target_launch_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      storm_events: {
        Row: {
          begin_date_time: string | null
          begin_lat: number | null
          begin_lon: number | null
          county_fips: number | null
          county_name: string | null
          created_at: string | null
          damage_crops: number | null
          damage_property: number | null
          deaths_direct: number | null
          deaths_indirect: number | null
          end_date_time: string | null
          event_id: number
          event_type: string | null
          flood_cause: string | null
          id: number
          injuries_direct: number | null
          injuries_indirect: number | null
          month_name: string | null
          source: string | null
          state: string | null
          state_fips: number | null
          tor_f_scale: string | null
          year: number | null
        }
        Insert: {
          begin_date_time?: string | null
          begin_lat?: number | null
          begin_lon?: number | null
          county_fips?: number | null
          county_name?: string | null
          created_at?: string | null
          damage_crops?: number | null
          damage_property?: number | null
          deaths_direct?: number | null
          deaths_indirect?: number | null
          end_date_time?: string | null
          event_id: number
          event_type?: string | null
          flood_cause?: string | null
          id?: never
          injuries_direct?: number | null
          injuries_indirect?: number | null
          month_name?: string | null
          source?: string | null
          state?: string | null
          state_fips?: number | null
          tor_f_scale?: string | null
          year?: number | null
        }
        Update: {
          begin_date_time?: string | null
          begin_lat?: number | null
          begin_lon?: number | null
          county_fips?: number | null
          county_name?: string | null
          created_at?: string | null
          damage_crops?: number | null
          damage_property?: number | null
          deaths_direct?: number | null
          deaths_indirect?: number | null
          end_date_time?: string | null
          event_id?: number
          event_type?: string | null
          flood_cause?: string | null
          id?: never
          injuries_direct?: number | null
          injuries_indirect?: number | null
          month_name?: string | null
          source?: string | null
          state?: string | null
          state_fips?: number | null
          tor_f_scale?: string | null
          year?: number | null
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          active_tort_addons: string[] | null
          billing_cycle: string
          buyer_type: string
          campaign_builder_api_access: boolean
          campaign_builder_mass_tort: boolean
          campaign_builder_monthly_cap: number | null
          campaign_builder_pi: boolean
          campaign_builder_white_label: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          geo_scope_states: string[] | null
          geo_scope_unlimited: boolean
          seats_included: number
          seats_used: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_tort_addons?: string[] | null
          billing_cycle?: string
          buyer_type: string
          campaign_builder_api_access?: boolean
          campaign_builder_mass_tort?: boolean
          campaign_builder_monthly_cap?: number | null
          campaign_builder_pi?: boolean
          campaign_builder_white_label?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          geo_scope_states?: string[] | null
          geo_scope_unlimited?: boolean
          seats_included?: number
          seats_used?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_tort_addons?: string[] | null
          billing_cycle?: string
          buyer_type?: string
          campaign_builder_api_access?: boolean
          campaign_builder_mass_tort?: boolean
          campaign_builder_monthly_cap?: number | null
          campaign_builder_pi?: boolean
          campaign_builder_white_label?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          geo_scope_states?: string[] | null
          geo_scope_unlimited?: boolean
          seats_included?: number
          seats_used?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teen_screen_time: {
        Row: {
          avg_daily_minutes: number
          created_at: string | null
          data_year: number | null
          id: string
          national_rank: number
          source: string | null
          state: string
        }
        Insert: {
          avg_daily_minutes: number
          created_at?: string | null
          data_year?: number | null
          id?: string
          national_rank: number
          source?: string | null
          state: string
        }
        Update: {
          avg_daily_minutes?: number
          created_at?: string | null
          data_year?: number | null
          id?: string
          national_rank?: number
          source?: string | null
          state?: string
        }
        Relationships: []
      }
      tenant_branding: {
        Row: {
          accent_color: string
          background_color: string
          company_name: string
          created_at: string
          dark_accent_color: string | null
          dark_background_color: string | null
          dark_primary_color: string | null
          dark_surface_color: string | null
          dark_text_color: string | null
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          footer_text: string | null
          id: string
          login_headline: string | null
          logo_dark_url: string | null
          logo_url: string | null
          primary_color: string
          product_name: string | null
          surface_color: string
          tagline: string | null
          tenant_id: string
          text_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          company_name: string
          created_at?: string
          dark_accent_color?: string | null
          dark_background_color?: string | null
          dark_primary_color?: string | null
          dark_surface_color?: string | null
          dark_text_color?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          footer_text?: string | null
          id?: string
          login_headline?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string
          product_name?: string | null
          surface_color?: string
          tagline?: string | null
          tenant_id: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          company_name?: string
          created_at?: string
          dark_accent_color?: string | null
          dark_background_color?: string | null
          dark_primary_color?: string | null
          dark_surface_color?: string | null
          dark_text_color?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          footer_text?: string | null
          id?: string
          login_headline?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string
          product_name?: string | null
          surface_color?: string
          tagline?: string | null
          tenant_id?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          config: Json | null
          created_at: string
          enabled: boolean
          expires_at: string | null
          feature_key: string
          tenant_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          feature_key: string
          tenant_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          feature_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          notes: string | null
          slug: string
          status: string
          tier: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          notes?: string | null
          slug: string
          status?: string
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          notes?: string | null
          slug?: string
          status?: string
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tort_audience_profiles: {
        Row: {
          age_band_weights: Json
          created_at: string | null
          id: string
          notes: string | null
          profile_name: string
          source: string
          tort_id: string
          updated_at: string | null
        }
        Insert: {
          age_band_weights: Json
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_name?: string
          source: string
          tort_id: string
          updated_at?: string | null
        }
        Update: {
          age_band_weights?: Json
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_name?: string
          source?: string
          tort_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tort_cost_benchmarks: {
        Row: {
          attrition_pct: number | null
          cpa_high: number | null
          cpa_low: number | null
          cpk_high: number | null
          cpk_low: number | null
          cpl_high: number | null
          cpl_low: number | null
          created_at: string
          criteria_tier: string
          id: string
          lead_to_retainer_pct: number | null
          lifecycle_phase: string | null
          mass_tort_id: string | null
          observed_date: string
          settlement_avg: number | null
          settlement_high: number | null
          settlement_low: number | null
          source_name: string | null
          source_notes: string | null
          source_url: string | null
          tort_name: string
          updated_at: string
        }
        Insert: {
          attrition_pct?: number | null
          cpa_high?: number | null
          cpa_low?: number | null
          cpk_high?: number | null
          cpk_low?: number | null
          cpl_high?: number | null
          cpl_low?: number | null
          created_at?: string
          criteria_tier?: string
          id?: string
          lead_to_retainer_pct?: number | null
          lifecycle_phase?: string | null
          mass_tort_id?: string | null
          observed_date?: string
          settlement_avg?: number | null
          settlement_high?: number | null
          settlement_low?: number | null
          source_name?: string | null
          source_notes?: string | null
          source_url?: string | null
          tort_name: string
          updated_at?: string
        }
        Update: {
          attrition_pct?: number | null
          cpa_high?: number | null
          cpa_low?: number | null
          cpk_high?: number | null
          cpk_low?: number | null
          cpl_high?: number | null
          cpl_low?: number | null
          created_at?: string
          criteria_tier?: string
          id?: string
          lead_to_retainer_pct?: number | null
          lifecycle_phase?: string | null
          mass_tort_id?: string | null
          observed_date?: string
          settlement_avg?: number | null
          settlement_high?: number | null
          settlement_low?: number | null
          source_name?: string | null
          source_notes?: string | null
          source_url?: string | null
          tort_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tort_cost_benchmarks_mass_tort_id_fkey"
            columns: ["mass_tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
      }
      tort_images: {
        Row: {
          created_at: string | null
          demographic_notes: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          license_note: string | null
          pi_category: string | null
          practice_area: string
          public_url: string
          source_url: string | null
          storage_path: string
          tags: string[] | null
          tort_slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          demographic_notes?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          license_note?: string | null
          pi_category?: string | null
          practice_area?: string
          public_url: string
          source_url?: string | null
          storage_path: string
          tags?: string[] | null
          tort_slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          demographic_notes?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          license_note?: string | null
          pi_category?: string | null
          practice_area?: string
          public_url?: string
          source_url?: string | null
          storage_path?: string
          tags?: string[] | null
          tort_slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tort_landing_pages: {
        Row: {
          classification_attempts: number
          classification_status: Database["public"]["Enums"]["landing_page_classification_status"]
          confidence:
            | Database["public"]["Enums"]["landing_page_confidence"]
            | null
          dma_code: string | null
          first_seen_at: string
          h1: string | null
          html_hash: string | null
          id: string
          is_law_firm: boolean
          last_classification_error: string | null
          last_seen_at: string
          rank: number | null
          raw_serp: Json
          registered_domain: string
          serp_feature: Database["public"]["Enums"]["landing_page_serp_feature"]
          slugified_path_tort_match: string
          snapshot_path: string | null
          title: string | null
          tort_id: string
          url: string
        }
        Insert: {
          classification_attempts?: number
          classification_status?: Database["public"]["Enums"]["landing_page_classification_status"]
          confidence?:
            | Database["public"]["Enums"]["landing_page_confidence"]
            | null
          dma_code?: string | null
          first_seen_at?: string
          h1?: string | null
          html_hash?: string | null
          id?: string
          is_law_firm?: boolean
          last_classification_error?: string | null
          last_seen_at?: string
          rank?: number | null
          raw_serp?: Json
          registered_domain: string
          serp_feature: Database["public"]["Enums"]["landing_page_serp_feature"]
          slugified_path_tort_match?: string
          snapshot_path?: string | null
          title?: string | null
          tort_id: string
          url: string
        }
        Update: {
          classification_attempts?: number
          classification_status?: Database["public"]["Enums"]["landing_page_classification_status"]
          confidence?:
            | Database["public"]["Enums"]["landing_page_confidence"]
            | null
          dma_code?: string | null
          first_seen_at?: string
          h1?: string | null
          html_hash?: string | null
          id?: string
          is_law_firm?: boolean
          last_classification_error?: string | null
          last_seen_at?: string
          rank?: number | null
          raw_serp?: Json
          registered_domain?: string
          serp_feature?: Database["public"]["Enums"]["landing_page_serp_feature"]
          slugified_path_tort_match?: string
          snapshot_path?: string | null
          title?: string | null
          tort_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tort_landing_pages_dma_code_fkey"
            columns: ["dma_code"]
            isOneToOne: false
            referencedRelation: "dma_markets"
            referencedColumns: ["dma_code"]
          },
          {
            foreignKeyName: "tort_landing_pages_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
      }
      tort_lifecycle_cpa_ranges: {
        Row: {
          cpa_high: number
          cpa_low: number
          created_at: string
          description: string | null
          id: string
          label: string
          lifecycle_phase: string
          source_name: string | null
          source_url: string | null
        }
        Insert: {
          cpa_high: number
          cpa_low: number
          created_at?: string
          description?: string | null
          id?: string
          label: string
          lifecycle_phase: string
          source_name?: string | null
          source_url?: string | null
        }
        Update: {
          cpa_high?: number
          cpa_low?: number
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          lifecycle_phase?: string
          source_name?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      tort_recommended_markets: {
        Row: {
          created_at: string
          id: string
          primary_signal: string
          rank: number
          rationale: string | null
          score: number | null
          signals: string[] | null
          state: string
          state_name: string
          tort_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          primary_signal: string
          rank: number
          rationale?: string | null
          score?: number | null
          signals?: string[] | null
          state: string
          state_name: string
          tort_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          primary_signal?: string
          rank?: number
          rationale?: string | null
          score?: number | null
          signals?: string[] | null
          state?: string
          state_name?: string
          tort_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tort_synonyms: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          synonym: string
          tort_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          synonym: string
          tort_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          synonym?: string
          tort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tort_synonyms_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
      }
      tort_traction: {
        Row: {
          closed_deals: number | null
          created_at: string
          criteria_strictness: string | null
          data_freshness_days: number | null
          est_cpa_usd: number | null
          est_cpk_usd: number | null
          est_cpl_usd: number | null
          firm_interest_count: number | null
          fraud_risk: string | null
          has_cost_benchmarks: boolean | null
          has_creative: boolean | null
          has_intake_script: boolean | null
          has_landing_page: boolean | null
          inventory_committed: number | null
          last_reviewed_at: string | null
          lifecycle_stage: string
          mdl_stage: string | null
          notes: string | null
          outreach_reply_rate: number | null
          owner: string | null
          payout_per_case_usd: number | null
          pipeline_deals: number | null
          priority_score: number | null
          priority_tier: string | null
          tort_id: string
          tort_slug: string | null
          updated_at: string
        }
        Insert: {
          closed_deals?: number | null
          created_at?: string
          criteria_strictness?: string | null
          data_freshness_days?: number | null
          est_cpa_usd?: number | null
          est_cpk_usd?: number | null
          est_cpl_usd?: number | null
          firm_interest_count?: number | null
          fraud_risk?: string | null
          has_cost_benchmarks?: boolean | null
          has_creative?: boolean | null
          has_intake_script?: boolean | null
          has_landing_page?: boolean | null
          inventory_committed?: number | null
          last_reviewed_at?: string | null
          lifecycle_stage?: string
          mdl_stage?: string | null
          notes?: string | null
          outreach_reply_rate?: number | null
          owner?: string | null
          payout_per_case_usd?: number | null
          pipeline_deals?: number | null
          priority_score?: number | null
          priority_tier?: string | null
          tort_id: string
          tort_slug?: string | null
          updated_at?: string
        }
        Update: {
          closed_deals?: number | null
          created_at?: string
          criteria_strictness?: string | null
          data_freshness_days?: number | null
          est_cpa_usd?: number | null
          est_cpk_usd?: number | null
          est_cpl_usd?: number | null
          firm_interest_count?: number | null
          fraud_risk?: string | null
          has_cost_benchmarks?: boolean | null
          has_creative?: boolean | null
          has_intake_script?: boolean | null
          has_landing_page?: boolean | null
          inventory_committed?: number | null
          last_reviewed_at?: string | null
          lifecycle_stage?: string
          mdl_stage?: string | null
          notes?: string | null
          outreach_reply_rate?: number | null
          owner?: string | null
          payout_per_case_usd?: number | null
          pipeline_deals?: number | null
          priority_score?: number | null
          priority_tier?: string | null
          tort_id?: string
          tort_slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tort_traction_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: true
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
      }
      torts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          label: string
          slug: string
          slug_alias: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          label: string
          slug: string
          slug_alias?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          label?: string
          slug?: string
          slug_alias?: string | null
        }
        Relationships: []
      }
      uber_mdl_filing_concentration: {
        Row: {
          data_source: string | null
          estimated_plaintiff_count: number
          id: number
          includes_state_court: boolean | null
          pct_of_total: number
          state: string
          state_court_cases: number | null
        }
        Insert: {
          data_source?: string | null
          estimated_plaintiff_count: number
          id?: number
          includes_state_court?: boolean | null
          pct_of_total: number
          state: string
          state_court_cases?: number | null
        }
        Update: {
          data_source?: string | null
          estimated_plaintiff_count?: number
          id?: number
          includes_state_court?: boolean | null
          pct_of_total?: number
          state?: string
          state_court_cases?: number | null
        }
        Relationships: []
      }
      uber_safety_gap: {
        Row: {
          categories_reported_publicly: number | null
          categories_tracked_internally: number | null
          data_source: string | null
          id: number
          internal_reports_estimated: number
          public_disclosed_incidents: number
          report_period: string
          trips_billions: number | null
        }
        Insert: {
          categories_reported_publicly?: number | null
          categories_tracked_internally?: number | null
          data_source?: string | null
          id?: number
          internal_reports_estimated: number
          public_disclosed_incidents: number
          report_period: string
          trips_billions?: number | null
        }
        Update: {
          categories_reported_publicly?: number | null
          categories_tracked_internally?: number | null
          data_source?: string | null
          id?: number
          internal_reports_estimated?: number
          public_disclosed_incidents?: number
          report_period?: string
          trips_billions?: number | null
        }
        Relationships: []
      }
      waterbodies: {
        Row: {
          canonical_name: string
          canonical_slug: string
          created_at: string | null
          id: number
          state_primary: string | null
          updated_at: string | null
          waterbody_type: string | null
        }
        Insert: {
          canonical_name: string
          canonical_slug: string
          created_at?: string | null
          id?: number
          state_primary?: string | null
          updated_at?: string | null
          waterbody_type?: string | null
        }
        Update: {
          canonical_name?: string
          canonical_slug?: string
          created_at?: string | null
          id?: number
          state_primary?: string | null
          updated_at?: string | null
          waterbody_type?: string | null
        }
        Relationships: []
      }
      waterbody_name_map: {
        Row: {
          id: number
          raw_name: string
          source: string | null
          waterbody_id: number
        }
        Insert: {
          id?: number
          raw_name: string
          source?: string | null
          waterbody_id: number
        }
        Update: {
          id?: number
          raw_name?: string
          source?: string | null
          waterbody_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "waterbody_name_map_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "waterbodies"
            referencedColumns: ["id"]
          },
        ]
      }
      waterbody_state_map: {
        Row: {
          id: number
          state_code: string
          waterbody_id: number
        }
        Insert: {
          id?: number
          state_code: string
          waterbody_id: number
        }
        Update: {
          id?: number
          state_code?: string
          waterbody_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "waterbody_state_map_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "waterbodies"
            referencedColumns: ["id"]
          },
        ]
      }
      youth_mental_health: {
        Row: {
          created_at: string | null
          data_year: number | null
          id: string
          mde_count: number
          mde_percentage: number
          overall_youth_rank: number
          source: string | null
          state: string
        }
        Insert: {
          created_at?: string | null
          data_year?: number | null
          id?: string
          mde_count: number
          mde_percentage: number
          overall_youth_rank: number
          source?: string | null
          state: string
        }
        Update: {
          created_at?: string | null
          data_year?: number | null
          id?: string
          mde_count?: number
          mde_percentage?: number
          overall_youth_rank?: number
          source?: string | null
          state?: string
        }
        Relationships: []
      }
    }
    Views: {
      ad_saturation_summary: {
        Row: {
          computed_at: string | null
          estimated_impressions: number | null
          estimated_spend: number | null
          format_breakdown: Json | null
          geo_code: string | null
          geo_name: string | null
          geo_population: number | null
          geo_target_id: string | null
          geo_type: string | null
          id: string | null
          period_end: string | null
          period_start: string | null
          saturation_score: number | null
          spend_rank: number | null
          state_abbr: string | null
          top_advertisers: Json | null
          tort_category: string | null
          tort_id: string | null
          tort_label: string | null
          tort_slug: string | null
          total_advertisers: number | null
          total_creatives: number | null
          total_observations: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_saturation_scores_geo_target_id_fkey"
            columns: ["geo_target_id"]
            isOneToOne: false
            referencedRelation: "geo_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_saturation_scores_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "torts"
            referencedColumns: ["id"]
          },
        ]
      }
      msa_demographics: {
        Row: {
          cbsa_code: string | null
          cbsa_title: string | null
          cbsa_type: string | null
          county_count: number | null
          median_age: number | null
          median_gross_rent: number | null
          median_home_value: number | null
          median_household_income: number | null
          pct_asian: number | null
          pct_bachelors_or_higher: number | null
          pct_black: number | null
          pct_employed: number | null
          pct_high_school_or_higher: number | null
          pct_hispanic: number | null
          pct_owner_occupied: number | null
          pct_poverty: number | null
          pct_uninsured: number | null
          pct_white: number | null
          pct_with_internet: number | null
          per_capita_income: number | null
          total_housing_units: number | null
          total_population: number | null
        }
        Relationships: []
      }
      storm_events_summary: {
        Row: {
          event_count: number | null
          event_type: string | null
          month: string | null
          state: string | null
          total_crop_damage: number | null
          total_deaths: number | null
          total_injuries: number | null
          total_property_damage: number | null
          year: number | null
        }
        Relationships: []
      }
      tort_landing_page_velocity: {
        Row: {
          dma_code_key: string | null
          new_pages_count: number | null
          tort_id: string | null
          trailing_4w_avg: number | null
          week_start: string | null
          z_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tort_landing_pages_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: false
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_state_data_sources_to_pursue: {
        Row: {
          contact: string | null
          cost: string | null
          id: string | null
          notes: string | null
          owner: string | null
          population_rank: number | null
          priority_tier: string | null
          rank_score: number | null
          source_name: string | null
          source_status: string | null
          source_type: string | null
          state_code: string | null
          state_name: string | null
          state_priority_score: number | null
          state_status: string | null
          updated_at: string | null
          url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "state_data_sources_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "state_rollout"
            referencedColumns: ["state_code"]
          },
          {
            foreignKeyName: "state_data_sources_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "v_states_to_build_next"
            referencedColumns: ["state_code"]
          },
        ]
      }
      v_states_to_build_next: {
        Row: {
          blockers: string | null
          data_coverage_pct: number | null
          has_ad_data: boolean | null
          has_judicial_data: boolean | null
          has_mdl_data: boolean | null
          has_serp_data: boolean | null
          owner: string | null
          population_rank: number | null
          priority_score: number | null
          priority_tier: string | null
          rank_score: number | null
          region: string | null
          state_code: string | null
          state_name: string | null
          status: string | null
          target_launch_date: string | null
        }
        Insert: {
          blockers?: string | null
          data_coverage_pct?: number | null
          has_ad_data?: boolean | null
          has_judicial_data?: boolean | null
          has_mdl_data?: boolean | null
          has_serp_data?: boolean | null
          owner?: string | null
          population_rank?: number | null
          priority_score?: number | null
          priority_tier?: string | null
          rank_score?: never
          region?: string | null
          state_code?: string | null
          state_name?: string | null
          status?: string | null
          target_launch_date?: string | null
        }
        Update: {
          blockers?: string | null
          data_coverage_pct?: number | null
          has_ad_data?: boolean | null
          has_judicial_data?: boolean | null
          has_mdl_data?: boolean | null
          has_serp_data?: boolean | null
          owner?: string | null
          population_rank?: number | null
          priority_score?: number | null
          priority_tier?: string | null
          rank_score?: never
          region?: string | null
          state_code?: string | null
          state_name?: string | null
          status?: string | null
          target_launch_date?: string | null
        }
        Relationships: []
      }
      v_torts_to_prioritize_next: {
        Row: {
          category: string | null
          closed_deals: number | null
          est_cpk_usd: number | null
          est_margin_per_case: number | null
          firm_interest_count: number | null
          fraud_risk: string | null
          has_cost_benchmarks: boolean | null
          has_creative: boolean | null
          has_intake_script: boolean | null
          has_landing_page: boolean | null
          inventory_committed: number | null
          last_reviewed_at: string | null
          lifecycle_stage: string | null
          mass_tort_status: string | null
          mdl_stage: string | null
          outreach_reply_rate: number | null
          owner: string | null
          payout_per_case_usd: number | null
          pipeline_deals: number | null
          priority_score: number | null
          priority_tier: string | null
          rank_score: number | null
          tort_id: string | null
          tort_name: string | null
          tort_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tort_traction_tort_id_fkey"
            columns: ["tort_id"]
            isOneToOne: true
            referencedRelation: "mass_torts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advertiser_rematch_by_domain: {
        Args: { p_dry_run?: boolean; p_limit?: number }
        Returns: {
          by_source: Json
          eligible_count: number
          matched_count: number
          scanned_count: number
        }[]
      }
      batch_insert_construction_fatalities: { Args: never; Returns: number }
      current_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          digest_frequency: string | null
          email_digest_enabled: boolean
          firm_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          last_seen_at: string | null
          role: string
          tenant_id: string
          trial_expires_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      estimate_tort_cpa: {
        Args: {
          p_criteria_breadth?: string
          p_geo_scope?: string
          p_lifecycle_phase?: string
          p_tort_name: string
        }
        Returns: {
          base_cpa_high: number
          base_cpa_low: number
          confidence: string
          criteria_multiplier: number
          estimated_cpa_high: number
          estimated_cpa_low: number
          geo_multiplier: number
          lifecycle_phase: string
          tort_name: string
        }[]
      }
      faers_drug_breakdown_by_reactions: {
        Args: { p_brand_map: Json; p_reaction_pts: string[] }
        Returns: {
          brand: string
          consumer_reports: number
          deaths: number
          hospitalizations: number
          lawyer_reports: number
          max_receivedate: string
          top_reactions: Json
          total_events: number
        }[]
      }
      faers_monthly_trend_by_reactions: {
        Args: { p_brand_map: Json; p_reaction_pts: string[] }
        Returns: {
          brand: string
          event_count: number
          month: string
        }[]
      }
      get_activity_user_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          event_count: number
          last_event_at: string
          login_count: number
          page_view_count: number
          tenant_id: string
          user_id: string
        }[]
      }
      get_ad_saturation_windowed: {
        Args: {
          p_source?: string
          p_state?: string
          p_tort_slug?: string
          p_window_end: string
          p_window_start: string
        }
        Returns: {
          estimated_spend: number
          geo_code: string
          geo_name: string
          geo_population: number
          geo_target_id: string
          geo_type: string
          saturation_score: number
          state_abbr: string
          tort_category: string
          tort_id: string
          tort_label: string
          tort_slug: string
          total_advertisers: number
          total_creatives: number
          total_observations: number
        }[]
      }
      get_advertiser_competitive_summary: {
        Args: { p_source?: string; p_state_abbr?: string; p_tort_slug?: string }
        Returns: {
          advertiser_name: string
          entity_type: string
          market_count: number
          segment: string
          tort_count: number
          total_creatives: number
          total_observations: number
          total_spend: number
        }[]
      }
      get_advertiser_platforms: {
        Args: { p_source?: string; p_state_abbr?: string; p_tort_slug?: string }
        Returns: {
          advertiser_name: string
          platforms: string[]
        }[]
      }
      get_advertiser_segments: {
        Args: { p_tort_slug?: string }
        Returns: {
          advertiser_name: string
          entity_type: string
          geo_name: string
          market_count: number
          segment: string
          tort_slug: string
          total_creatives: number
          total_spend: number
        }[]
      }
      get_boating_counties_by_state: {
        Args: { state_abbr: string }
        Returns: {
          county_fips: number
          county_name: string
        }[]
      }
      get_boating_counties_by_state_name: {
        Args: { state_abbr: string }
        Returns: {
          county_name: string
          total_accidents: number
        }[]
      }
      get_boating_county_trend: {
        Args: { filter_county_name: string; filter_state: string }
        Returns: {
          total_accidents: number
          total_deaths: number
          total_injuries: number
          year: number
        }[]
      }
      get_boating_distinct_states: {
        Args: never
        Returns: {
          state: string
        }[]
      }
      get_boating_hotspot_counties: {
        Args: { filter_state?: string; top_n?: number }
        Returns: {
          avg_lat: number
          avg_lng: number
          county_name: string
          state: string
          total_accidents: number
          total_deaths: number
          total_injuries: number
        }[]
      }
      get_boating_hotspot_waterbodies: {
        Args: { filter_state?: string; top_n?: number }
        Returns: {
          avg_lat: number
          avg_lng: number
          total_accidents: number
          total_deaths: number
          total_injuries: number
          waterbody_id: number
          waterbody_name: string
          waterbody_type: string
        }[]
      }
      get_boating_poi_categories: {
        Args: { p_state?: string }
        Returns: {
          category: string
          count: number
        }[]
      }
      get_boating_poi_counts_by_state: {
        Args: never
        Returns: {
          boat_ramps: number
          fuel_docks: number
          marinas: number
          marine_dealers: number
          state: string
          total_pois: number
        }[]
      }
      get_boating_poi_targets: {
        Args: {
          p_category?: string
          p_limit?: number
          p_state?: string
          p_year_end?: number
          p_year_start?: number
        }
        Returns: {
          ad_value_score: number
          category: string
          lat: number
          lng: number
          nearby_fatalities: number
          nearby_incidents: number
          nearby_injuries: number
          poi_id: number
          poi_name: string
          state: string
          website: string
        }[]
      }
      get_boating_pois_by_state: {
        Args: { p_category?: string; p_limit?: number; p_state: string }
        Returns: {
          category: string
          id: number
          lat: number
          lng: number
          name: string
          phone: string
          state: string
          tags: Json
          waterbody_id: number
          website: string
        }[]
      }
      get_boating_pois_near_waterbody: {
        Args: {
          p_category?: string
          p_limit?: number
          p_radius_deg?: number
          p_waterbody_id: number
        }
        Returns: {
          category: string
          distance_approx: number
          id: number
          lat: number
          lng: number
          name: string
          phone: string
          state: string
          website: string
        }[]
      }
      get_boating_severity_stats:
        | {
            Args: { filter_county_name?: string; filter_state?: string }
            Returns: {
              avg_deaths_per_accident: number
              avg_injuries_per_accident: number
              fatality_rate: number
              pct_fatal: number
              total_accidents: number
              total_deaths: number
              total_injuries: number
            }[]
          }
        | {
            Args: {
              filter_county_name?: string
              filter_state?: string
              filter_waterbody_id?: number
            }
            Returns: {
              avg_deaths_per_accident: number
              avg_injuries_per_accident: number
              fatality_rate: number
              pct_fatal: number
              total_accidents: number
              total_deaths: number
              total_injuries: number
            }[]
          }
      get_boating_severity_stats_by_waterbody: {
        Args: { filter_waterbody_id: number }
        Returns: {
          avg_deaths_per_accident: number
          avg_injuries_per_accident: number
          fatality_rate: number
          pct_fatal: number
          total_accidents: number
          total_deaths: number
          total_injuries: number
        }[]
      }
      get_boating_totals:
        | {
            Args: { filter_county_name?: string; filter_state?: string }
            Returns: {
              total_accidents: number
              total_deaths: number
              total_injuries: number
            }[]
          }
        | {
            Args: {
              filter_county_name?: string
              filter_state?: string
              filter_waterbody_id?: number
            }
            Returns: {
              total_accidents: number
              total_deaths: number
              total_injuries: number
            }[]
          }
      get_boating_trend_by_year:
        | {
            Args: { filter_county_name?: string; filter_state?: string }
            Returns: {
              total_accidents: number
              total_deaths: number
              total_injuries: number
              year: number
            }[]
          }
        | {
            Args: {
              filter_county_name?: string
              filter_state?: string
              filter_waterbody_id?: number
            }
            Returns: {
              total_accidents: number
              total_deaths: number
              total_injuries: number
              year: number
            }[]
          }
      get_boating_waterbodies_by_state: {
        Args: { state_abbr: string }
        Returns: {
          total_accidents: number
          waterbody_id: number
          waterbody_name: string
          waterbody_type: string
        }[]
      }
      get_boating_waterbody_trend: {
        Args: { filter_waterbody_id: number }
        Returns: {
          total_accidents: number
          total_deaths: number
          total_injuries: number
          year: number
        }[]
      }
      get_cancer_by_site: {
        Args: {
          filter_cancer_site?: string
          filter_cancer_sites?: string[]
          filter_state?: string
        }
        Returns: {
          average_incidence_rate: number
          avg_trend: number
          cancer_site: string
          total_annual_cases: number
        }[]
      }
      get_cancer_by_state: {
        Args: {
          filter_cancer_site?: string
          filter_cancer_sites?: string[]
          filter_state?: string
        }
        Returns: {
          average_incidence_rate: number
          avg_trend: number
          counties_reporting: number
          highest_rate: number
          highest_rate_county: string
          state: string
          total_annual_cases: number
        }[]
      }
      get_cancer_counties_by_state: {
        Args: {
          filter_cancer_site?: string
          filter_cancer_sites?: string[]
          p_state: string
        }
        Returns: {
          average_annual_count: number
          cancer_site: string
          county_name: string
          fips: string
          incidence_rate: number
          recent_trend: number
          rural_urban: string
          state: string
          trend_direction: string
        }[]
      }
      get_cancer_distinct_sites: {
        Args: never
        Returns: {
          cancer_site: string
        }[]
      }
      get_cancer_distinct_states: {
        Args: never
        Returns: {
          state: string
        }[]
      }
      get_cancer_heatmap: {
        Args: { filter_cancer_site?: string; filter_state?: string }
        Returns: {
          intensity: number
          latitude: number
          longitude: number
        }[]
      }
      get_cancer_totals: {
        Args: {
          filter_cancer_site?: string
          filter_cancer_sites?: string[]
          filter_state?: string
        }
        Returns: {
          average_incidence_rate: number
          counties_reporting: number
          total_annual_cases: number
        }[]
      }
      get_cancer_trending_sites: {
        Args: {
          filter_cancer_site?: string
          filter_cancer_sites?: string[]
          filter_state?: string
        }
        Returns: {
          average_incidence_rate: number
          avg_trend: number
          cancer_site: string
          total_annual_cases: number
        }[]
      }
      get_channel_fit_scores: {
        Args: {
          p_market_id?: string
          p_profile_name?: string
          p_tort_id: string
        }
        Returns: {
          channel: string
          cost_pressure: string
          market_id: string
          mass_tort_priority: string
          normalized_score: number
          performance_orientation: string
          profile_name: string
          raw_score: number
          role: string
          tort_id: string
        }[]
      }
      get_construction_demographic_trend: {
        Args: { p_category?: string; p_dimension?: string }
        Returns: {
          category: string
          fatalities: number
          fatality_rate: number
          pct_of_total: number
          year: number
        }[]
      }
      get_construction_demographics: {
        Args: { p_dimension?: string; p_year?: number }
        Returns: {
          category: string
          data_note: string
          data_source: string
          dimension: string
          fatalities: number
          fatality_rate: number
          pct_of_total: number
          year: number
        }[]
      }
      get_construction_event_breakdown: {
        Args: { p_year?: number }
        Returns: {
          event_type: string
          fatality_count: number
          pct: number
        }[]
      }
      get_construction_industry_detail: {
        Args: { p_max_level?: number; p_min_level?: number; p_year?: number }
        Returns: {
          contact: number
          exposure: number
          falls: number
          fires: number
          industry_level: number
          industry_name: string
          naics_code: string
          total_fatalities: number
          transportation: number
          violence: number
        }[]
      }
      get_construction_national_summary: {
        Args: { p_year?: number }
        Returns: {
          contact: number
          exposure: number
          falls: number
          fatality_rate: number
          fires: number
          total_fatalities: number
          transportation: number
          violence: number
          year: number
          yoy_change: number
        }[]
      }
      get_construction_state_priority: {
        Args: never
        Returns: {
          all_industry_fatalities_2024: number
          construction_fatality_rate_2024: number
          overall_fatality_rate_2024: number
          priority_tier: string
          rate_vs_national: number
          state_abbr: string
          state_name: string
        }[]
      }
      get_construction_state_priority_v2: {
        Args: never
        Returns: {
          all_industry_fatalities_2024: number
          construction_employment_est: number
          construction_fatalities_est: number
          construction_fatality_rate_2024: number
          overall_fatality_rate_2024: number
          priority_tier: string
          rate_vs_national: number
          small_sample_flag: boolean
          state_abbr: string
          state_name: string
          volume_tier: string
        }[]
      }
      get_construction_state_ranking: {
        Args: { p_year?: number }
        Returns: {
          fatality_rate: number
          prev_year_fatalities: number
          state_abbr: string
          state_name: string
          total_fatalities: number
          yoy_change: number
        }[]
      }
      get_construction_subsector_breakdown: {
        Args: { p_year?: number }
        Returns: {
          contact: number
          exposure: number
          falls: number
          industry_name: string
          naics_code: string
          total_fatalities: number
          transportation: number
        }[]
      }
      get_construction_trend: {
        Args: { p_state?: string }
        Returns: {
          fatality_rate: number
          total_fatalities: number
          year: number
        }[]
      }
      get_fars_counties_by_state: {
        Args: { state_abbr: string }
        Returns: {
          county_fips: number
          county_name: string
        }[]
      }
      get_fars_county_hotspots: {
        Args: {
          p_limit?: number
          p_state: string
          p_year_end?: number
          p_year_start?: number
        }
        Returns: {
          avg_fatalities_per_crash: number
          county_fips: number
          county_name: string
          drunk_driving_crashes: number
          pct_drunk: number
          state: string
          total_crashes: number
          total_fatalities: number
        }[]
      }
      get_fars_county_trend: {
        Args: {
          p_county_fips?: number
          p_early_end?: number
          p_early_start?: number
          p_late_end?: number
          p_late_start?: number
          p_state: string
        }
        Returns: {
          county_fips: number
          county_name: string
          crash_pct_change: number
          early_crashes: number
          early_fatalities: number
          fatality_pct_change: number
          late_crashes: number
          late_fatalities: number
        }[]
      }
      get_fars_distinct_states: {
        Args: never
        Returns: {
          state: string
        }[]
      }
      get_fars_drunk_driving_stats: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          drunk_crashes: number
          percentage: number
          total_crashes: number
        }[]
      }
      get_fars_fatality_trend_by_year: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_crashes: number
          total_fatalities: number
          year: number
        }[]
      }
      get_fars_heatmap: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          intensity: number
          latitude: number
          longitude: number
        }[]
      }
      get_fars_large_truck_heatmap: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          intensity: number
          latitude: number
          longitude: number
        }[]
      }
      get_fars_large_truck_totals: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_crashes: number
          total_fatalities: number
        }[]
      }
      get_fars_large_truck_trend_by_year: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_crashes: number
          total_fatalities: number
          year: number
        }[]
      }
      get_fars_motorcycle_heatmap: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          intensity: number
          latitude: number
          longitude: number
        }[]
      }
      get_fars_motorcycle_totals: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_crashes: number
          total_fatalities: number
        }[]
      }
      get_fars_motorcycle_trend_by_year: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_crashes: number
          total_fatalities: number
          year: number
        }[]
      }
      get_fars_state_fatality_trend_by_year: {
        Args: {
          filter_county?: number
          filter_state?: string
          state_abbr: string
        }
        Returns: {
          total_crashes: number
          total_fatalities: number
          year: number
        }[]
      }
      get_fars_state_summary: {
        Args: { p_state: string; p_year_end?: number; p_year_start?: number }
        Returns: {
          avg_fatalities_per_crash: number
          drunk_driving_crashes: number
          large_truck_crashes: number
          motorcycle_crashes: number
          pct_drunk: number
          total_crashes: number
          total_fatalities: number
          total_persons: number
        }[]
      }
      get_fars_top_states_by_fatalities: {
        Args: {
          filter_county?: number
          filter_state?: string
          result_limit?: number
        }
        Returns: {
          drunk_driving_crashes: number
          state: string
          total_crashes: number
          total_fatalities: number
        }[]
      }
      get_fars_totals: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_crashes: number
          total_fatalities: number
        }[]
      }
      get_fars_urban_rural_stats: {
        Args: {
          filter_county?: number
          filter_large_truck?: boolean
          filter_motorcycle?: boolean
          filter_state?: string
        }
        Returns: {
          classification: string
          total_crashes: number
          total_fatalities: number
        }[]
      }
      get_judicial_profile_summary: {
        Args: { filter_state?: string }
        Returns: {
          count: number
          profile: string
        }[]
      }
      get_judicial_profiles: {
        Args: { filter_state?: string }
        Returns: {
          county_name: string
          fips: number
          judicial_profile: string
          state: string
        }[]
      }
      get_judicial_states: {
        Args: never
        Returns: {
          state: string
        }[]
      }
      get_market_recommendations: {
        Args: { p_profile_name?: string; p_tort_id: string }
        Returns: {
          avg_competition: number
          avg_fit: number
          market_id: string
          market_label: string
          opportunity_score: number
          rationale: string
          top_channel_1: string
          top_channel_1_comp: number
          top_channel_1_cost_pressure: string
          top_channel_1_fit: number
          top_channel_1_perf: string
          top_channel_1_role: string
          top_channel_1_tort_priority: string
          top_channel_2: string
          top_channel_2_comp: number
          top_channel_2_cost_pressure: string
          top_channel_2_fit: number
          top_channel_2_perf: string
          top_channel_2_role: string
          top_channel_2_tort_priority: string
        }[]
      }
      get_mdl_attorney_scorecard: {
        Args: { p_mdl_number: number }
        Returns: {
          plaintiff_firms: number
          total_attorneys: number
          total_firms: number
          total_parties: number
        }[]
      }
      get_mdl_firm_summary: {
        Args: { p_mdl_number: number }
        Returns: {
          attorney_count: number
          attorneys: string[]
          firm_name: string
          party_count: number
          roles: string[]
          sample_parties: string[]
        }[]
      }
      get_mv_poi_categories: {
        Args: { p_state?: string }
        Returns: {
          category: string
          count: number
        }[]
      }
      get_mv_poi_targets: {
        Args: {
          p_category?: string
          p_limit?: number
          p_state?: string
          p_year_end?: number
          p_year_start?: number
        }
        Returns: {
          ad_value_score: number
          category: string
          county_name: string
          lat: number
          lng: number
          nearby_crashes: number
          nearby_drunk: number
          nearby_fatalities: number
          poi_id: number
          poi_name: string
          state: string
          website: string
        }[]
      }
      get_pesticide_county_by_year: {
        Args: { filter_state?: string }
        Returns: {
          compound: string
          county_name: string
          fips: string
          high_lbs: number
          low_lbs: number
          state_name: string
          year: number
        }[]
      }
      get_pesticide_county_summary: {
        Args: { filter_state?: string }
        Returns: {
          avg_high_lbs: number
          avg_low_lbs: number
          compound: string
          county_name: string
          fips: string
          state_name: string
          years_active: number
        }[]
      }
      get_pesticide_state_by_year: {
        Args: { filter_state?: string }
        Returns: {
          compound: string
          county_count: number
          state_fips: string
          state_name: string
          total_high_lbs: number
          total_low_lbs: number
          year: number
        }[]
      }
      get_pesticide_state_summary: {
        Args: { filter_state?: string }
        Returns: {
          avg_high_lbs: number
          avg_low_lbs: number
          compound: string
          county_count: number
          state_fips: string
          state_name: string
          total_high_lbs: number
          year_count: number
        }[]
      }
      get_pfas_contamination_summary: {
        Args: { filter_state?: string }
        Returns: {
          data_year: number
          id: string
          installation_name: string
          pfas_ppt: number
          source: string
          state: string
        }[]
      }
      get_pi_advertising_summary: { Args: { p_state: string }; Returns: Json }
      get_pi_case_type_competition: {
        Args: { p_state: string }
        Returns: {
          avg_position: number
          case_label: string
          case_type: string
          competitor_count: number
          saturation_level: string
          total_observations: number
        }[]
      }
      get_pi_competitors: {
        Args: { p_state: string }
        Returns: {
          advertiser_domain: string
          advertiser_name: string | null
          avg_ad_position: number | null
          case_types_active: string[] | null
          created_at: string | null
          first_seen: string | null
          id: string
          last_seen: string | null
          metros_active: string[] | null
          presence_score: number | null
          state_abbr: string
          total_observations: number | null
          updated_at: string | null
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "pi_competitor_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pi_metro_saturation: {
        Args: { p_state: string }
        Returns: {
          competitor_count: number
          metro_label: string
          metro_name: string
          saturation_level: string
          top_competitor: string
          total_observations: number
        }[]
      }
      get_pi_viability_scores: {
        Args: { filter_state?: string }
        Returns: {
          avg_jury_verdict: string | null
          composite_score: number | null
          id: number
          med_mal_cap: string | null
          med_mal_score: number | null
          negligence_rule: string | null
          negligence_score: number | null
          non_economic_cap: string | null
          non_economic_score: number | null
          punitive_cap: string | null
          punitive_score: number | null
          sol_score: number | null
          state: string
          statute_of_limitations: string | null
          updated_at: string | null
          verdict_score: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "pi_viability_scores"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recent_storm_events: {
        Args: {
          filter_days?: number
          filter_event_type?: string
          filter_state?: string
          impactful_only?: boolean
          result_limit?: number
        }
        Returns: {
          begin_date_time: string
          begin_lat: number
          begin_lon: number
          county_name: string
          damage_property: number
          event_type: string
          state: string
          tor_f_scale: string
          total_deaths: number
          total_injuries: number
        }[]
      }
      get_segment_summary: {
        Args: { p_source?: string; p_tort_slug?: string }
        Returns: {
          advertiser_count: number
          avg_spend_per_advertiser: number
          segment: string
          total_creatives: number
          total_spend: number
        }[]
      }
      get_serp_visibility_windowed: {
        Args: { p_end_date: string; p_start_date: string; p_tort_slug?: string }
        Returns: {
          advertiser_entity_id: string
          advertiser_name: string
          avg_position: number
          domain: string
          featured_snippet_count: number
          local_pack_count: number
          organic_appearances: number
          paid_appearances: number
          queries_tracked: number
          top_10_count: number
          top_3_count: number
          tort_slug: string
          total_appearances: number
          visibility_score: number
        }[]
      }
      get_state_accident_summary: {
        Args: { p_state: string }
        Returns: {
          county: string
          deaths_per_100k: number
          drunk_driver_crashes: number
          fatal_crashes: number
          judicial_profile: string
          moto_deaths: number
          rural_pct: number
          total_deaths: number
          total_population: number
          truck_deaths: number
        }[]
      }
      get_state_boating_summary: {
        Args: { p_state: string }
        Returns: {
          accident_count: number
          county: string
          top_causes: string
          total_deaths: number
          total_injuries: number
        }[]
      }
      get_state_opportunity_scores: {
        Args: never
        Returns: {
          composite_rank: number
          incident_trend_pct: number
          negligence_rule: string
          opportunity_score: number
          pi_viability_score: number
          state: string
          total_incidents: number
        }[]
      }
      get_state_rural_urban_comparison: {
        Args: { p_state: string }
        Returns: {
          avg_internet_pct: number
          avg_median_income: number
          avg_poverty_pct: number
          avg_uninsured_pct: number
          category: string
          fatal_crashes: number
          total_deaths: number
        }[]
      }
      get_state_storm_summary: {
        Args: { p_state: string }
        Returns: {
          event_count: number
          event_type: string
          total_deaths: number
          total_injuries: number
        }[]
      }
      get_storm_counties_by_state: {
        Args: {
          filter_days?: number
          filter_event_type?: string
          filter_state: string
          filter_year?: number
        }
        Returns: {
          county_fips: number
          county_name: string
          total_events: number
          total_property_damage: number
        }[]
      }
      get_storm_data_freshness: {
        Args: never
        Returns: {
          latest_date: string
          total_rows: number
        }[]
      }
      get_storm_distinct_event_types: {
        Args: never
        Returns: {
          event_type: string
        }[]
      }
      get_storm_distinct_states: {
        Args: never
        Returns: {
          state: string
        }[]
      }
      get_storm_distinct_years: {
        Args: never
        Returns: {
          year: number
        }[]
      }
      get_storm_event_totals: {
        Args: {
          filter_days?: number
          filter_event_type?: string
          filter_state?: string
          filter_year?: number
        }
        Returns: {
          total_deaths: number
          total_events: number
          total_injuries: number
          total_property_damage: number
        }[]
      }
      get_storm_event_trend_by_year: {
        Args: { filter_event_type?: string; filter_state?: string }
        Returns: {
          total_events: number
          total_property_damage: number
          year: number
        }[]
      }
      get_storm_events_by_state: {
        Args: {
          filter_days?: number
          filter_event_type?: string
          filter_state?: string
          filter_year?: number
        }
        Returns: {
          state: string
          total_crop_damage: number
          total_deaths: number
          total_events: number
          total_injuries: number
          total_property_damage: number
        }[]
      }
      get_storm_events_by_type: {
        Args: {
          filter_days?: number
          filter_state?: string
          filter_year?: number
        }
        Returns: {
          event_type: string
          total_events: number
          total_property_damage: number
        }[]
      }
      get_storm_heatmap_points: {
        Args: {
          filter_days?: number
          filter_event_type?: string
          filter_state?: string
          filter_year?: number
        }
        Returns: {
          latitude: number
          longitude: number
        }[]
      }
      get_top_advertisers_by_segment: {
        Args: { p_limit?: number; p_source?: string; p_tort_slug?: string }
        Returns: {
          advertiser_name: string
          entity_type: string
          market_count: number
          segment: string
          total_creatives: number
          total_spend: number
        }[]
      }
      get_tort_advertising_heatmap: {
        Args: {
          p_geo_level?: string
          p_tort_slug: string
          p_window_days?: number
        }
        Returns: {
          advertiser_count: number
          geo_code: string
          geo_name: string
          observation_count: number
        }[]
      }
      get_tort_cost_benchmarks: {
        Args: { p_criteria_tier?: string; p_tort_name?: string }
        Returns: {
          attrition_pct: number
          cpa_high: number
          cpa_low: number
          cpk_high: number
          cpk_low: number
          cpl_high: number
          cpl_low: number
          criteria_tier: string
          lead_to_retainer_pct: number
          lifecycle_phase: string
          observed_date: string
          settlement_avg: number
          settlement_high: number
          settlement_low: number
          source_name: string
          source_url: string
          tort_name: string
        }[]
      }
      get_tort_market_advertisers: {
        Args: { p_geo_target_id: string; p_tort_id: string }
        Returns: {
          advertiser_id: string
          advertiser_name: string
          entity_type: string
          segment: string
          spend_share_pct: number
          total_creatives: number
          total_observations: number
          total_spend: number
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: never; Returns: boolean }
      is_tenant_manager: { Args: never; Returns: boolean }
      my_tenant_id: { Args: never; Returns: string }
      refresh_ad_aggregates: { Args: never; Returns: Json }
      refresh_competition_scores: { Args: never; Returns: undefined }
      refresh_storm_events_summary: { Args: never; Returns: undefined }
      refresh_tort_landing_page_velocity: { Args: never; Returns: undefined }
      sync_ad_events_from_raw: { Args: never; Returns: Json }
    }
    Enums: {
      advertiser_segment: "on_docket" | "off_docket" | "aggregator"
      api_provider: "openai" | "searchapi" | "apify"
      api_unit_type:
        | "tokens"
        | "searches"
        | "compute_units"
        | "characters"
        | "seconds"
        | "images"
      channel_role: "lead_gen" | "brand" | "hybrid"
      cost_pressure_level: "low" | "medium" | "high"
      landing_page_classification_status:
        | "confirmed"
        | "candidate"
        | "denied"
        | "pending"
        | "error"
      landing_page_classifier_confidence: "low" | "medium" | "high"
      landing_page_classifier_source:
        | "allow_list"
        | "deny_list"
        | "heuristic"
        | "openai"
      landing_page_confidence: "candidate" | "confirmed"
      landing_page_serp_feature: "organic" | "local_pack" | "ads"
      mass_tort_priority_level: "core" | "secondary" | "situational"
      performance_orientation_type: "direct_response" | "mixed" | "brand_heavy"
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
    Enums: {
      advertiser_segment: ["on_docket", "off_docket", "aggregator"],
      api_provider: ["openai", "searchapi", "apify"],
      api_unit_type: [
        "tokens",
        "searches",
        "compute_units",
        "characters",
        "seconds",
        "images",
      ],
      channel_role: ["lead_gen", "brand", "hybrid"],
      cost_pressure_level: ["low", "medium", "high"],
      landing_page_classification_status: [
        "confirmed",
        "candidate",
        "denied",
        "pending",
        "error",
      ],
      landing_page_classifier_confidence: ["low", "medium", "high"],
      landing_page_classifier_source: [
        "allow_list",
        "deny_list",
        "heuristic",
        "openai",
      ],
      landing_page_confidence: ["candidate", "confirmed"],
      landing_page_serp_feature: ["organic", "local_pack", "ads"],
      mass_tort_priority_level: ["core", "secondary", "situational"],
      performance_orientation_type: ["direct_response", "mixed", "brand_heavy"],
    },
  },
} as const
