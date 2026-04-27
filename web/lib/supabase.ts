import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Hard ceiling for any single PostgREST select query.  Use this as the
 * maximum value passed to `.limit()` or `.range()`.
 *
 * WHY: The FARS fatalities table (221k rows) was being paginated in 1k-row
 * chunks via `while(true) … .range(offset, offset+999)`, firing 221+
 * sequential queries that each took 14-27 s, saturating the Supabase
 * connection pool and causing 504s on auth endpoints.
 *
 * If you need more rows than this, use a server-side RPC that aggregates
 * on the database instead of pulling raw rows to the client.
 */
export const SUPABASE_MAX_ROWS = 10_000;

let _supabase: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
    );
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
