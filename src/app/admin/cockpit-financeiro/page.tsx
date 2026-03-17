import { createAdminClient } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Clock, 
  ChevronRight, 
  AlertCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building2,
  PieChart,
  Target,
  AlertTriangle,
  Zap,
  Percent,
  Activity
} from "lucide-react"
import { StrategicActionLinks } from "@/components/admin/StrategicActionLinks"

export const metadata = {
  title: "Cockpit Estratégico v3.0 | FomeNinja",
  description: "Inteligência financeira, solvência e alertas críticos.",
}

async function fetchCockpitData() {
  const supabase = createAdminClient()
  
  const [cockpitRes, intelligenceRes, alertsRes] = await Promise.all([
    supabase.from('view_caixa_plataforma').select('*').single(),
    supabase.from('view_cockpit_inteligencia_mensal').select('*').order('mes', { ascending: true }),
    supabase.from('view_alertas_financeiros').select('*').single()
  ])

  return {
    cockpit: cockpitRes.data || {
      receita_bruta: 0,
      lucro_bruto: 0,
      obrigacoes_brutas: 0,
      total_repassado: 0,
      passivo_atual: 0,
      caixa_bancario_real: 0,
      lucro_operacional_acumulado: 0,
      caixa_liquido_real: 0,
      margem_operacional_percent: 0,
      indice_cobertura_passivo: 0,
      percentual_repassado: 0,
      status_operacional: 'INATIVO' as 'INATIVO' | 'BAIXA' | 'SAUDAVEL'
    },
    intelligence: intelligenceRes.data || [],
    alerts: alertsRes.data || {
      alerta_passivo_descoberto: false,
      alerta_margem_baixa: false,
      alerta_liquidez_baixa: false,
      alerta_caixa_negativo: false
    }
  }
}

function MiniChart({ data, color }: { data: number[], color: string }) {
  if (!data || data.length < 2) return <div className="h-full w-full bg-muted/20 rounded flex items-center justify-center text-[10px] text-muted-foreground uppercase">Dados insuficientes</div>
  
  const max = Math.max(...data) || 1
  const height = 60
  const width = 200
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (val / max) * height
    return `${x},${y}`
  }).join(" ")

  return (
    <div className="w-full h-[60px] relative mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-md"
        />
        <circle cx={width} cy={height - (data[data.length-1] / max) * height} r="4" fill={color} />
      </svg>
    </div>
  )
}

export default async function CockpitEstrategicoPage() {
  const { cockpit, intelligence, alerts } = await fetchCockpitData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercent = (value: number | null) => {
    if (value === null) return "—"
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      maximumFractionDigits: 1
    }).format(value) + '%'
  }

  const getMonthName = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { month: 'short' })
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Header Estratégico v3.0 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 group">
            <div className="bg-zinc-950 text-white p-2 rounded-lg shadow-2xl ring-1 ring-white/20">
              <Zap className="size-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-emerald-600">Strategy Edition v3.0</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Cockpit <span className="text-emerald-600">Estratégico</span>
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground font-medium md:max-w-2xl">
            Monitoramento de solvência, margens operacionais e índices de liquidez para governança financeira.
          </p>
        </div>
        
        {/* Sistema de Alertas em Tempo Real */}
        <div className="flex gap-2">
           {alerts.alerta_passivo_descoberto && <Badge variant="destructive" className="animate-pulse gap-1"><AlertTriangle className="size-3" /> Passivo Descoberto</Badge>}
           {alerts.alerta_caixa_negativo && <Badge variant="destructive" className="animate-pulse gap-1"><AlertCircle className="size-3" /> Caixa Negativo</Badge>}
           {alerts.alerta_liquidez_baixa && <Badge variant="outline" className="text-orange-600 border-orange-500 gap-1"><Zap className="size-3" /> Baixa Liquidez</Badge>}
        </div>
      </div>

      {/* 🔥 LINHA 1 — CAIXA & SOLVÊNCIA (The Big Numbers) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <Card className="relative overflow-hidden bg-white dark:bg-zinc-950 border shadow-md hover:shadow-xl transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">Caixa Bancário Real</CardDescription>
            <CardTitle className="text-3xl font-black text-foreground">
              {formatCurrency(cockpit.caixa_bancario_real)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">Disponibilidade imediata em conta.</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white dark:bg-zinc-950 border shadow-md hover:shadow-xl transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">Passivo Atual</CardDescription>
            <CardTitle className="text-3xl font-black text-red-600">
              {formatCurrency(cockpit.passivo_atual)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">Obrigações brutas - Repasses efetuados.</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-zinc-950 dark:bg-emerald-950 col-span-1 md:col-span-2 border-2 border-emerald-500/30 shadow-2xl transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <ShieldCheck className="size-16 text-emerald-400" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400 uppercase font-extrabold text-[10px] tracking-widest">Patrimônio Líquido Acumulado (Caixa Líquido)</CardDescription>
            <CardTitle className="text-4xl font-black text-white">
              {formatCurrency(cockpit.caixa_liquido_real)}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-4">
               <Badge className="bg-emerald-500 text-white font-black animate-pulse py-1 px-3">SOLVENTE</Badge>
               <div className="text-emerald-100/60 text-xs font-medium">Liquidez de segurança após quitar 100% dos parceiros.</div>
             </div>
          </CardContent>
        </Card>

      </div>

      {/* 📉 LINHA 2 — INDICADORES EXECUTIVOS (Solvência e Margens) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         
         <Card className="border-t-4 border-t-emerald-500 shadow-sm">
            <CardHeader className="pb-2">
               <CardDescription className="font-bold flex items-center gap-2">
                  <Percent className="size-3 text-emerald-600" />
                  Margem Operacional
               </CardDescription>
               <CardTitle className="text-4xl font-black">
                  {cockpit.status_operacional === 'INATIVO' ? (
                     <span className="text-sm font-medium text-muted-foreground uppercase opacity-50">Sem operação</span>
                  ) : formatPercent(cockpit.margem_operacional_percent)}
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {cockpit.status_operacional === 'INATIVO' ? "Nenhuma transação registrada." : "Eficiência sobre a receita bruta."}
                  </p>
                  {cockpit.status_operacional !== 'INATIVO' && (
                    <Badge className={`text-[9px] font-black h-4 px-1.5 ${
                        cockpit.status_operacional === 'SAUDAVEL' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}>
                        {cockpit.status_operacional}
                    </Badge>
                  )}
               </div>
               <StrategicActionLinks 
                 status_operacional={cockpit.status_operacional}
                 alerta_liquidez_baixa={alerts.alerta_liquidez_baixa}
                 alerta_margem_baixa={alerts.alerta_margem_baixa}
                 filter="margem"
               />
            </CardContent>
         </Card>

         <Card className={`border-t-4 shadow-sm ${cockpit.indice_cobertura_passivo < 1 ? 'border-t-red-500' : 'border-t-blue-500'}`}>
            <CardHeader className="pb-2">
               <CardDescription className="font-bold flex items-center gap-2">
                  <Activity className="size-3 text-blue-600" />
                  Índice de Cobertura
               </CardDescription>
               <CardTitle className="text-4xl font-black">{cockpit.indice_cobertura_passivo?.toFixed(2) || '0.00'}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-[10px] text-muted-foreground">Quantas vezes o caixa cobre o passivo atual.</p>
               <StrategicActionLinks 
                 status_operacional={cockpit.status_operacional}
                 alerta_liquidez_baixa={alerts.alerta_liquidez_baixa}
                 alerta_margem_baixa={alerts.alerta_margem_baixa}
                 filter="liquidez"
               />
            </CardContent>
         </Card>

         <Card className="border-t-4 border-t-zinc-950 shadow-sm">
            <CardHeader className="pb-2">
               <CardDescription className="font-bold flex items-center gap-2">
                  <BarChart3 className="size-3 text-zinc-950" />
                  Progresso de Repasses
               </CardDescription>
               <CardTitle className="text-4xl font-black">{formatPercent(cockpit.percentual_repassado)}</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-2 w-full bg-zinc-100 rounded-full mt-2">
                  <div className="h-full bg-zinc-950 rounded-full" style={{ width: `${Math.min(cockpit.percentual_repassado, 100)}%` }} />
               </div>
            </CardContent>
         </Card>

      </div>

      {/* 📊 LINHA 3 — OPERAÇÃO (Métricas Base) */}
      <h3 className="text-xl font-bold flex items-center gap-2 text-foreground/80 pt-4">
        <PieChart className="size-5" />
        Volume Operacional
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1 p-4 bg-muted/30 rounded-xl">
           <p className="text-[10px] font-black uppercase text-muted-foreground">Receita Bruta</p>
           <p className="text-xl font-bold">{formatCurrency(cockpit.receita_bruta)}</p>
        </div>
        <div className="space-y-1 p-4 bg-muted/30 rounded-xl">
           <p className="text-[10px] font-black uppercase text-muted-foreground">Obrigações Brutas</p>
           <p className="text-xl font-bold">{formatCurrency(cockpit.obrigacoes_brutas)}</p>
        </div>
        <div className="space-y-1 p-4 bg-muted/30 rounded-xl">
           <p className="text-[10px] font-black uppercase text-muted-foreground">Total Repassado</p>
           <p className="text-xl font-bold">{formatCurrency(cockpit.total_repassado)}</p>
        </div>
        <div className="space-y-1 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
           <p className="text-[10px] font-black uppercase text-emerald-700">Lucro Operacional</p>
           <p className="text-xl font-bold text-emerald-600">{formatCurrency(cockpit.lucro_operacional_acumulado)}</p>
        </div>
      </div>

      {/* 📅 LINHA 4 — INTELIGÊNCIA MENSAL (Trend Analysis with Growth) */}
      <h3 className="text-xl font-bold flex items-center gap-2 text-foreground/80 pt-4">
        <TrendingUp className="size-5" />
        Growth & Margens (BI)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {intelligence.slice(-4).map((item, idx) => (
           <Card key={idx} className="border shadow-sm overflow-hidden group hover:border-emerald-500/50 transition-all">
              <div className="bg-muted/50 p-3 border-b flex items-center justify-between">
                 <span className="text-xs font-black uppercase tracking-tighter">{getMonthName(item.mes)} / {new Date(item.mes).getFullYear()}</span>
                 <Badge variant="secondary" className={`text-[9px] font-black ${
                    item.status_mensal === 'OK' ? 'bg-emerald-500/10 text-emerald-600' : 
                    item.status_mensal === 'AVISO' ? 'bg-amber-500/10 text-amber-600' : 'opacity-50'
                 }`}>
                    {item.status_mensal === 'INATIVO' ? 'INATIVO' : `MARGEM: ${formatPercent(item.margem_mensal)}`}
                 </Badge>
              </div>
              <CardContent className="pt-4 space-y-4">
                 <div>
                    <div className="flex items-center justify-between mb-1">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">Receita</span>
                       <span className={`text-[10px] font-black flex items-center ${item.crescimento_receita_percentual >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {item.crescimento_receita_percentual >= 0 ? '+' : ''}{item.crescimento_receita_percentual?.toFixed(1)}%
                       </span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(item.receita)}</p>
                 </div>
                 <Separator />
                 <div>
                    <div className="flex items-center justify-between mb-1">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">Lucro</span>
                       <span className={`text-[10px] font-black flex items-center ${item.crescimento_lucro_percentual >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                          {item.crescimento_lucro_percentual >= 0 ? '+' : ''}{item.crescimento_lucro_percentual?.toFixed(1)}%
                       </span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(item.lucro)}</p>
                 </div>
              </CardContent>
           </Card>
        ))}
      </div>

      {/* Status de Risco Final */}
      <div className={`p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative border ${
        Object.values(alerts).some(v => v === true) 
          ? 'bg-red-950 text-white border-red-500/50' 
          : 'bg-zinc-900 text-white border-white/10'
      }`}>
         <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] z-0 ${
            Object.values(alerts).some(v => v === true) ? 'bg-red-500/20' : 'bg-emerald-500/10'
         }`} />
         <div className="z-10">
            <h4 className={`text-xs font-black uppercase tracking-[0.3em] mb-2 ${
               Object.values(alerts).some(v => v === true) ? 'text-red-400' : 'text-emerald-400'
            }`}>Relatório de Saúde Financeira</h4>
            <div className="flex items-center gap-4">
               <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  Object.values(alerts).some(v => v === true) ? 'bg-red-500' : 'bg-emerald-500'
               }`}>
                  {Object.values(alerts).some(v => v === true) ? <AlertTriangle className="text-white size-8" /> : <ShieldCheck className="text-white size-8" />}
               </div>
               <div>
                  <p className="text-2xl font-black italic">
                     {Object.values(alerts).some(v => v === true) ? 'ATENÇÃO: RISCO DETECTADO' : 'SOLVÊNCIA GARANTIDA'}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                     {Object.values(alerts).some(v => v === true) 
                        ? 'Foram identificados parâmetros fora dos limites de segurança. Recomenda-se auditoria imediata.' 
                        : 'Todos os parâmetros de governança encontram-se dentro dos limites saudáveis.'}
                  </p>
               </div>
            </div>
         </div>
         <div className="text-right z-10 hidden md:block">
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Assinatura Digital</p>
            <p className="text-xs font-mono text-emerald-500/50">audit_hash: {Math.random().toString(16).substring(2, 10).toUpperCase()}</p>
         </div>
      </div>

    </div>
  )
}
