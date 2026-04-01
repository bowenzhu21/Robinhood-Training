function required(name: string, value: string | undefined) {

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Make sure it exists in customer-service-training/.env.local and restart the Next.js server.`
    );
  }

  return value;
}

export function getPublicEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  };
}
