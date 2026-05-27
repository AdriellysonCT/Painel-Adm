"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useChat } from "@/lib/chat-context"

type Tab = 'dashboard' | 'breakdown' | 'pagamentos' | 'receita' | 'fechamentos' | 'cupons' | 'banners' | 'cadastrados' | 'ledger'

const navItems: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'dashboard' },
  { id: 'cadastrados',  label: 'Cadastrados',  icon: 'group' },
  { id: 'breakdown',    label: 'Breakdown',    icon: 'pie_chart' },
  { id: 'pagamentos',   label: 'Pagamentos',   icon: 'payments' },
  { id: 'receita',      label: 'Receita',      icon: 'trending_up' },
  { id: 'fechamentos',  label: 'Fechamentos',  icon: 'receipt_long' },
  { id: 'cupons',       label: 'Cupons',       icon: 'confirmation_number' },
  { id: 'ledger',       label: 'Ledger',        icon: 'account_balance' },
  { id: 'banners',      label: 'Banners',      icon: 'image' },
]

export default function Sidebar() {
  const { isOpen, setIsOpen } = useChat()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab) || 'dashboard'

  const handleNavigate = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#f8fafc] border-r border-[#cbd5e1] flex flex-col p-3 z-50">
      <div className="mb-5 px-2">
        <h1 className="text-lg font-bold text-[#2563eb]">FomeNinja</h1>
        <p className="text-xs text-[#64748b]">Admin Panel</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-200",
                isActive
                  ? "bg-[#d3e4fe] text-[#0b1c30] font-semibold"
                  : "text-[#64748b] hover:bg-[#e2e8f0]"
              )}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="pt-4 border-t border-[#cbd5e1] space-y-1">
        <button onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-200 relative",
            isOpen
              ? "bg-gradient-to-r from-blue-600 to-purple-700 text-white font-semibold"
              : "text-[#64748b] hover:bg-[#e2e8f0]"
          )}
        >
          <span className="material-symbols-outlined text-[20px]">smart_toy</span>
          <span>Agente IA</span>
          {!isOpen && (
            <span className="ml-auto flex items-center">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </span>
          )}
        </button>
        <a href="/admin/cockpit-financeiro" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748b] hover:bg-[#e2e8f0] transition-all duration-200">
          <span className="material-symbols-outlined text-[20px]">monitoring</span>
          <span>Cockpit Financeiro</span>
        </a>
      </div>
    </aside>
  )
}
