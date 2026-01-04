import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
            maxAge: 60 * 60 * 24 * 7,
        })
        return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, message: 'Credenciais inválidas' }, { status: 401 })
}






