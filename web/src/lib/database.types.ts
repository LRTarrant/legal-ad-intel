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
    };
  };
}
