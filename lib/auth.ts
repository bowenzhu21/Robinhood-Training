import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }
}

export async function ensureProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  const fullProfilePayload = {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName
  };

  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      ...fullProfilePayload
    },
    {
      onConflict: "id"
    }
  );

  if (!error) {
    return;
  }

  // Some MVP schemas only store `id` on profiles.
  // Fall back to a minimal row so the app still works against leaner tables.
  const { error: fallbackError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id
    },
    {
      onConflict: "id"
    }
  );

  if (!fallbackError) {
    return;
  }
}
