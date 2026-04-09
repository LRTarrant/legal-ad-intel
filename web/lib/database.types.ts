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
      };
      mdl_developments: {
        Row: {
          id: string;
          mdl_number: number;
          title: string;
          summary: string | null;
          source_name: string | null;
          source_url: string | null;
          event_date: string;
          event_type: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          mdl_number: number;
          title: string;
          summary?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          event_date: string;
          event_type: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          mdl_number?: number;
          title?: string;
          summary?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          event_date?: string;
          event_type?: string;
          created_at?: string | null;
        };
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
      };
      fars_fatalities: {
        Row: {
          id: number;
          st_case: number;
          state: string;
          state_fips: number;
          county_fips: number;
          county_name: string | null;
          crash_date: string;
          fatalities: number;
          drunk_drivers: number;
          latitude: number | null;
          longitude: number | null;
          year: number;
          persons: number;
          vehicles: number;
          has_motorcycle: boolean | null;
          has_large_truck: boolean | null;
          rur_urb: number | null;
        };
        Insert: {
          id?: number;
          st_case: number;
          state: string;
          state_fips: number;
          county_fips: number;
          county_name?: string | null;
          crash_date: string;
          fatalities: number;
          drunk_drivers?: number;
          latitude?: number | null;
          longitude?: number | null;
          year: number;
          persons?: number;
          vehicles?: number;
          has_motorcycle?: boolean | null;
          has_large_truck?: boolean | null;
          rur_urb?: number | null;
        };
        Update: {
          id?: number;
          st_case?: number;
          state?: string;
          state_fips?: number;
          county_fips?: number;
          county_name?: string | null;
          crash_date?: string;
          fatalities?: number;
          drunk_drivers?: number;
          latitude?: number | null;
          longitude?: number | null;
          year?: number;
          persons?: number;
          vehicles?: number;
          has_motorcycle?: boolean | null;
          has_large_truck?: boolean | null;
          rur_urb?: number | null;
        };
      };
      pi_viability_scores: {
        Row: {
          id: number;
          state: string;
          negligence_rule: string | null;
          negligence_score: number | null;
          non_economic_cap: string | null;
          non_economic_score: number | null;
          punitive_cap: string | null;
          punitive_score: number | null;
          med_mal_cap: string | null;
          med_mal_score: number | null;
          statute_of_limitations: string | null;
          sol_score: number | null;
          avg_jury_verdict: string | null;
          verdict_score: number | null;
          composite_score: number | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          state: string;
          negligence_rule?: string | null;
          negligence_score?: number | null;
          non_economic_cap?: string | null;
          non_economic_score?: number | null;
          punitive_cap?: string | null;
          punitive_score?: number | null;
          med_mal_cap?: string | null;
          med_mal_score?: number | null;
          statute_of_limitations?: string | null;
          sol_score?: number | null;
          avg_jury_verdict?: string | null;
          verdict_score?: number | null;
          composite_score?: number | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          state?: string;
          negligence_rule?: string | null;
          negligence_score?: number | null;
          non_economic_cap?: string | null;
          non_economic_score?: number | null;
          punitive_cap?: string | null;
          punitive_score?: number | null;
          med_mal_cap?: string | null;
          med_mal_score?: number | null;
          statute_of_limitations?: string | null;
          sol_score?: number | null;
          avg_jury_verdict?: string | null;
          verdict_score?: number | null;
          composite_score?: number | null;
          updated_at?: string | null;
        };
      };
      boating_accidents: {
        Row: {
          id: number;
          state: string;
          county_fips: number | null;
          county_name: string | null;
          year: number;
          deaths: number;
          injuries: number;
          accidents: number;
          latitude: number | null;
          longitude: number | null;
        };
        Insert: {
          id?: number;
          state: string;
          county_fips?: number | null;
          county_name?: string | null;
          year: number;
          deaths?: number;
          injuries?: number;
          accidents?: number;
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: {
          id?: number;
          state?: string;
          county_fips?: number | null;
          county_name?: string | null;
          year?: number;
          deaths?: number;
          injuries?: number;
          accidents?: number;
          latitude?: number | null;
          longitude?: number | null;
        };
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
      };
      jpml_snapshots: {
        Row: {
          id: string;
          report_date: string;
          mdl_number: number;
          case_name: string;
          jpml_type: string;
          transferee_judge: string | null;
          district: string | null;
          master_docket: string | null;
          date_filed: string | null;
          date_transferred: string | null;
          date_closed: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_date: string;
          mdl_number: number;
          case_name: string;
          jpml_type: string;
          transferee_judge?: string | null;
          district?: string | null;
          master_docket?: string | null;
          date_filed?: string | null;
          date_transferred?: string | null;
          date_closed?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_date?: string;
          mdl_number?: number;
          case_name?: string;
          jpml_type?: string;
          transferee_judge?: string | null;
          district?: string | null;
          master_docket?: string | null;
          date_filed?: string | null;
          date_transferred?: string | null;
          date_closed?: string | null;
          created_at?: string;
        };
      };
      jpml_type_summaries: {
        Row: {
          id: string;
          report_date: string;
          mdl_type: string;
          mdl_count: number;
          pct_of_total: number | null;
          total_active_mdls: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_date: string;
          mdl_type: string;
          mdl_count: number;
          pct_of_total?: number | null;
          total_active_mdls: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_date?: string;
          mdl_type?: string;
          mdl_count?: number;
          pct_of_total?: number | null;
          total_active_mdls?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_fars_counties_by_state: {
        Args: {
          state_abbr: string;
        };
        Returns: {
          county_fips: number;
          county_name: string;
        }[];
      };
      get_fars_distinct_states: {
        Args: Record<PropertyKey, never>;
        Returns: {
          state: string;
        }[];
      };
      get_fars_drunk_driving_stats: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          drunk_crashes: number;
          percentage: number;
          total_crashes: number;
        }[];
      };
      get_fars_fatality_trend_by_year: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_crashes: number;
          total_fatalities: number;
          year: number;
        }[];
      };
      get_fars_state_fatality_trend_by_year: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
          state_abbr: string;
        };
        Returns: {
          total_crashes: number;
          total_fatalities: number;
          year: number;
        }[];
      };
      get_fars_top_states_by_fatalities: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
          result_limit?: number | null;
        };
        Returns: {
          drunk_driving_crashes: number;
          state: string;
          total_crashes: number;
          total_fatalities: number;
        }[];
      };
      get_fars_totals: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_crashes: number;
          total_fatalities: number;
        }[];
      };
      get_fars_motorcycle_totals: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_crashes: number;
          total_fatalities: number;
        }[];
      };
      get_fars_motorcycle_trend_by_year: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_crashes: number;
          total_fatalities: number;
          year: number;
        }[];
      };
      get_fars_large_truck_totals: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_crashes: number;
          total_fatalities: number;
        }[];
      };
      get_fars_large_truck_trend_by_year: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_crashes: number;
          total_fatalities: number;
          year: number;
        }[];
      };
      get_boating_totals: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_accidents: number;
          total_deaths: number;
          total_injuries: number;
        }[];
      };
      get_boating_trend_by_year: {
        Args: {
          filter_county?: number | null;
          filter_state?: string | null;
        };
        Returns: {
          total_accidents: number;
          total_deaths: number;
          total_injuries: number;
          year: number;
        }[];
      };
      get_boating_distinct_states: {
        Args: Record<PropertyKey, never>;
        Returns: {
          state: string;
        }[];
      };
      get_boating_counties_by_state: {
        Args: {
          state_abbr: string;
        };
        Returns: {
          county_fips: number;
          county_name: string;
        }[];
      };
      get_fars_urban_rural_stats: {
        Args: {
          filter_state?: string | null;
          filter_county?: number | null;
          filter_motorcycle?: boolean | null;
          filter_large_truck?: boolean | null;
        };
        Returns: {
          classification: string;
          total_fatalities: number;
          total_crashes: number;
        }[];
      };
      get_pi_viability_scores: {
        Args: {
          filter_state?: string | null;
        };
        Returns: {
          id: number;
          state: string;
          negligence_rule: string | null;
          negligence_score: number | null;
          non_economic_cap: string | null;
          non_economic_score: number | null;
          punitive_cap: string | null;
          punitive_score: number | null;
          med_mal_cap: string | null;
          med_mal_score: number | null;
          statute_of_limitations: string | null;
          sol_score: number | null;
          avg_jury_verdict: string | null;
          verdict_score: number | null;
          composite_score: number | null;
          updated_at: string | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
