import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = 'admin_token'

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const token = request.cookies.get(ADMIN_COOKIE)?.value

	const isLoggedIn = Boolean(token)
	const isAuthRoute = pathname.startsWith('/login')
	const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/api/private')
	const isRoot = pathname === '/'

	// Redireciona a raiz baseado no estado de autenticação
	if (isRoot) {
		const url = request.nextUrl.clone()
		url.pathname = isLoggedIn ? '/dashboard' : '/login'
		return NextResponse.redirect(url)
	}

	if (isProtected && !isLoggedIn) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		return NextResponse.redirect(url)
	}

	if (isAuthRoute && isLoggedIn) {
		const url = request.nextUrl.clone()
		url.pathname = '/dashboard'
		return NextResponse.redirect(url)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/', '/dashboard/:path*', '/login', '/api/private/:path*'],
}



