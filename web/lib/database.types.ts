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
      mdl_attorneys: {
        Row: {
          attorney_name: string
          cl_attorney_id: number | null
          cl_docket_id: number | null
          cl_org_id: number | null
          created_at: string | null
          fetched_at: string | null
          firm_name: string | null
          id: number
          mdl_number: number
          party_name: string | null
          party_type: string | null
          role: string | null
        }
        Insert: {
          attorney_name: string
          cl_attorney_id?: number | null
          cl_docket_id?: number | null
          cl_org_id?: number | null
          created_at?: string | null
          fetched_at?: string | null
          firm_name?: string | null
          id?: never
          mdl_number: number
          party_name?: string | null
          party_type?: string | null
          role?: string | null
        }
        Update: {
          attorney_name?: string
          cl_attorney_id?: number | null
          cl_docket_id?: number | null
          cl_org_id?: number | null
          created_at?: string | null
          fetched_at?: string | null
          firm_name?: string | null
          id?: never
          mdl_number?: number
          party_name?: string | null
          party_type?: string | null
          role?: string | null
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
      torts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          label?: string
          slug?: string
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
    }
    Functions: {
      get_ad_saturation_windowed:
        | {
            Args: {
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
        | {
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
      get_advertiser_competitive_summary:
        | {
            Args: { p_state_abbr?: string; p_tort_slug?: string }
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
        | {
            Args: {
              p_source?: string
              p_state_abbr?: string
              p_tort_slug?: string
            }
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
          advertiser_id: string
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
      get_boating_severity_stats: {
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
      get_boating_waterbodies_by_state: {
        Args: { state_abbr: string }
        Returns: {
          body_of_water: string
          total_accidents: number
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
      get_segment_summary:
        | {
            Args: { p_tort_slug?: string }
            Returns: {
              advertiser_count: number
              avg_spend_per_advertiser: number
              segment: string
              total_creatives: number
              total_spend: number
            }[]
          }
        | {
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
        Args: { filter_state?: string; filter_year?: number }
        Returns: {
          event_type: string
          total_events: number
          total_property_damage: number
        }[]
      }
      get_storm_heatmap_points: {
        Args: {
          filter_event_type?: string
          filter_state?: string
          filter_year?: number
        }
        Returns: {
          latitude: number
          longitude: number
        }[]
      }
      get_top_advertisers_by_segment:
        | {
            Args: { p_limit?: number; p_tort_slug?: string }
            Returns: {
              advertiser_name: string
              entity_type: string
              market_count: number
              segment: string
              total_creatives: number
              total_spend: number
            }[]
          }
        | {
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
    }
    Enums: {
      advertiser_segment: "on_docket" | "off_docket" | "aggregator"
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
    },
  },
} as const
