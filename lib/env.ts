import "server-only";

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  GEMINI_API_KEY: required("GEMINI_API_KEY"),
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
};
