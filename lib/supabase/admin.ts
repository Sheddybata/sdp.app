import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for admin operations.
 * Use only on the server (Server Actions, API routes).
 * Never expose to the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}
