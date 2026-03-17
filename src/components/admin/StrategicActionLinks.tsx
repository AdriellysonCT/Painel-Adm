"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight, ArrowRight, Table, BarChart3, FileText } from "lucide-react"

interface StrategicActionLinksProps {
  status_operacional: 'INATIVO' | 'BAIXA' | 'SAUDAVEL'
  alerta_liquidez_baixa: boolean
  alerta_margem_baixa: boolean
  filter?: 'liquidez' | 'margem' | 'geral'
}

export function StrategicActionLinks({ 
  status_operacional, 
  alerta_liquidez_baixa,
  alerta_margem_baixa,
  filter = 'geral'
}: StrategicActionLinksProps) {
  
  return (
    <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-left-2 duration-500">
      
      {/* Ação para Liquidez Baixa */}
      {alerta_liquidez_baixa && (filter === 'liquidez' || filter === 'geral') && (
        <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold gap-1 px-2 border-emerald-500/20 hover:bg-emerald-500/5" asChild>
          <Link href="/dashboard?tab=pagamentos">
            <Table className="size-3 text-emerald-600" />
            Ver obrigações pendentes
            <ChevronRight className="size-3" />
          </Link>
        </Button>
      )}

      {/* Ação para Margem Baixa */}
      {status_operacional === 'BAIXA' && (filter === 'margem' || filter === 'geral') && (
        <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold gap-1 px-2 border-amber-500/20 hover:bg-amber-500/5" asChild>
          <Link href="/dashboard?tab=breakdown">
            <BarChart3 className="size-3 text-amber-600" />
            Analisar breakdown financeiro
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      )}

      {/* Ação para Sistema Inativo */}
      {status_operacional === 'INATIVO' && (filter === 'margem' || filter === 'geral') && (
        <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold gap-1 px-2" asChild>
          <Link href="/dashboard?tab=fechamentos">
            <FileText className="size-3" />
            Ver relatórios operacionais
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      )}

    </div>
  )
}
