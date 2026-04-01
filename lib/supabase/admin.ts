import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { getPublicEnv } from "@/lib/public-env";

const publicEnv = getPublicEnv();

export const supabaseAdmin = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
