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
          year?: number
        }
        Relationships: []
      }
      cancer_incidence: {
        Row: {
          age_adjusted_rate: number | null
          average_annual_count: number | null
          cancer_site: string
          county: string | null
          created_at: string | null
          data_years: string | null
          fips: string | null
          id: number
          lower_ci_rate: number | null
          recent_trend: number | null
          rural_urban: string | null
          state: string
          trend_direction: string | null
          trend_lower_ci: number | null
          trend_upper_ci: number | null
          upper_ci_rate: number | null
        }
        Insert: {
          age_adjusted_rate?: number | null
          average_annual_count?: number | null
          cancer_site: string
          county?: string | null
          created_at?: string | null
          data_years?: string | null
          fips?: string | null
          id?: number
          lower_ci_rate?: number | null
          recent_trend?: number | null
          rural_urban?: string | null
          state: string
          trend_direction?: string | null
          trend_lower_ci?: number | null
          trend_upper_ci?: number | null
          upper_ci_rate?: number | null
        }
        Update: {
          age_adjusted_rate?: number | null
          average_annual_count?: number | null
          cancer_site?: string
          county?: string | null
          created_at?: string | null
          data_years?: string | null
          fips?: string | null
          id?: number
          lower_ci_rate?: number | null
          recent_trend?: number | null
          rural_urban?: string | null
          state?: string
          trend_direction?: string | null
          trend_lower_ci?: number | null
          trend_upper_ci?: number | null
          upper_ci_rate?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_boating_counties_by_state: {
        Args: { state_abbr: string }
        Returns: {
          county_fips: number
          county_name: string
        }[]
      }
      get_boating_distinct_states: {
        Args: never
        Returns: {
          state: string
        }[]
      }
      get_boating_totals: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_accidents: number
          total_deaths: number
          total_injuries: number
        }[]
      }
      get_boating_trend_by_year: {
        Args: { filter_county?: number; filter_state?: string }
        Returns: {
          total_accidents: number
          total_deaths: number
          total_injuries: number
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
      get_storm_counties_by_state: {
        Args: {
          filter_event_type?: string | null
          filter_state: string
          filter_year?: number | null
        }
        Returns: {
          county_fips: number
          county_name: string
          total_events: number
          total_property_damage: number
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
      get_storm_event_totals: {
        Args: {
          filter_event_type?: string | null
          filter_state?: string | null
          filter_year?: number | null
        }
        Returns: {
          total_deaths: number
          total_events: number
          total_injuries: number
          total_property_damage: number
        }[]
      }
      get_storm_event_trend_by_year: {
        Args: { filter_event_type?: string | null; filter_state?: string | null }
        Returns: {
          total_events: number
          total_property_damage: number
          year: number
        }[]
      }
      get_storm_events_by_state: {
        Args: {
          filter_event_type?: string | null
          filter_state?: string | null
          filter_year?: number | null
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
        Args: { filter_state?: string | null; filter_year?: number | null }
        Returns: {
          event_type: string
          total_events: number
          total_property_damage: number
        }[]
      }
      get_storm_heatmap_points: {
        Args: {
          filter_event_type?: string | null
          filter_state?: string | null
          filter_year?: number | null
        }
        Returns: {
          latitude: number
          longitude: number
        }[]
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
