"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export type DashboardFilters = {
  status: string
  fromDate: string
  toDate: string
}

export default function DashboardFiltersClient({ onChange }: { onChange?: (f: DashboardFilters) => void }) {
  const [status, setStatus] = useState('todos')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  function emit(next: Partial<DashboardFilters>) {
    const f = { status, fromDate, toDate, ...next }
    onChange?.(f)
  }

  return (
    <div className="grid gap-3 md:grid-cols-4 items-end">
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Período (de)</label>
        <Input type="date" value={fromDate} onChange={(e)=>{ setFromDate(e.target.value); emit({ fromDate: e.target.value }) }} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Período (até)</label>
        <Input type="date" value={toDate} onChange={(e)=>{ setToDate(e.target.value); emit({ toDate: e.target.value }) }} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <Select value={status} onValueChange={(v)=>{ setStatus(v); emit({ status: v }) }}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}


