// app/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // IMPORTANT: Don't throw during module evaluation (Vercel build imports routes)
  if (!url || !serviceRole) {
    return null;
  }

  cached = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  return cached;
}