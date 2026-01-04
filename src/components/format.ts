export function formatCurrencyBRL(value: number | null | undefined) {
	if (value == null) return 'R$\u00A00,00'
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}



