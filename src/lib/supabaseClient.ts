import { createClient } from "@supabase/supabase-js";

// Cliente para uso no browser (Client Components)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

// Cliente para uso no servidor (Server Components e API Routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

// Cliente com privilégios de admin para bypass de RLS
export function createAdminClient() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "⚠️ SUPABASE_SERVICE_ROLE_KEY não encontrada. Usando anon key (sujeito a RLS).",
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    serviceRoleKey as string,
    {
      auth: {
        persistSession: false,
      },
    },
  );
}
