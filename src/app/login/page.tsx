"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data?.message || 'Falha no login')
			}
			router.replace('/dashboard')
		} catch (err: any) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-dvh grid place-items-center bg-background">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="w-full max-w-md rounded-xl border p-6 shadow-sm bg-card"
			>
				<div className="mb-6">
					<h1 className="text-2xl font-semibold">Painel Administrativo</h1>
					<p className="text-sm text-muted-foreground">Acesse com suas credenciais</p>
				</div>
				<form onSubmit={handleSubmit} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="email">E-mail</Label>
						<Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@yopmail.com" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="password">Senha</Label>
						<Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="147258" />
					</div>
					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}
					<Button type="submit" disabled={loading} className="gap-2">
						<LogIn className="size-4" />
						{loading ? 'Entrando...' : 'Entrar'}
					</Button>
				</form>
			</motion.div>
		</div>
	)
}



