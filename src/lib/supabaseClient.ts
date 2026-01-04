import { createClient } from '@supabase/supabase-js'

// Cliente para uso no browser (Client Components)
export const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL as string,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

// Cliente para uso no servidor (Server Components e API Routes)
export function createServerClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
		{
			auth: {
				persistSession: false,
			},
		}
	)
}



