import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseClient'

const ADMIN_EMAIL = 'admin@yopmail.com'
const ADMIN_PASSWORD = '147258'
const ADMIN_COOKIE = 'admin_token'

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({}))
	const { email, password } = body as { email?: string; password?: string }

	if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
		const token = process.env.ADMIN_STATIC_TOKEN || 'admin_token'
		const cookieStore = await cookies()
		cookieStore.set(ADMIN_COOKIE, token, {
			httpOnly: true,
			secure: true,
			path: '/',
			maxAge: 60 * 60 * 24 * 7, // 7 dias
		})
		return NextResponse.json({ ok: true })
	}

	// Tenta autenticação via Supabase
	if (email && password) {
		try {
			const supabase = createServerClient()
			const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
			if (!signInError && signInData?.user) {
				const user = signInData.user
				// regra: email admin fixo OU profiles.tipo_usuario = 'admin'
				let isAdmin = (user.email || '').toLowerCase() === ADMIN_EMAIL
				if (!isAdmin) {
					const { data: profile } = await supabase.from('profiles').select('tipo_usuario').eq('id', user.id).single()
					isAdmin = (profile?.tipo_usuario || '').toLowerCase() === 'admin'
				}
				if (isAdmin) {
					const token = process.env.ADMIN_STATIC_TOKEN || 'admin_token'
					const cookieStore = await cookies()
					cookieStore.set(ADMIN_COOKIE, token, {
						httpOnly: true,
						secure: true,
						path: '/',
						maxAge: 60 * 60 * 24 * 7,
					})
					return NextResponse.json({ ok: true })
				}
			}
		} catch {}
	}

	return NextResponse.json({ ok: false, message: 'Credenciais inválidas' }, { status: 401 })
}


