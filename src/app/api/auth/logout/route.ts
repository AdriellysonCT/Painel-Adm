import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin_token'

export async function POST() {
	const cookieStore = await cookies()
	cookieStore.delete(ADMIN_COOKIE)
	return NextResponse.json({ ok: true })
}


