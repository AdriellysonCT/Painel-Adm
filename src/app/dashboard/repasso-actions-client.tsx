"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Rep = {
	id: number
	status: string | null
}

export default function RepassoActionsClient({ repasse }: { repasse: Rep }) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	async function setStatus(status: string) {
		setLoading(true)
		await supabase.from('repasses_restaurantes').update({ status }).eq('id', repasse.id)
		setLoading(false)
		router.refresh()
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={loading}>Ações</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={() => setStatus('pendente')}>Marcar pendente</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setStatus('concluido')}>Marcar concluído</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setStatus('falha')}>Marcar falha</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}



