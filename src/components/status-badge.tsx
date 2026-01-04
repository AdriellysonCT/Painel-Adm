import { Badge } from "@/components/ui/badge"

export function StatusBadge({ status }: { status: string | null | undefined }) {
	const normalized = (status || '').toLowerCase()
	let variant: "default" | "secondary" | "destructive" | "outline" = 'secondary'

	if (normalized.includes('concl')) variant = 'default'
	else if (normalized.includes('pend')) variant = 'secondary'
	else if (normalized.includes('fal') || normalized.includes('err')) variant = 'destructive'

	return <Badge variant={variant}>{status || '—'}</Badge>
}



