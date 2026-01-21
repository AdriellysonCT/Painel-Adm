# 💳 Adaptação do Painel Admin: Nova Lógica de Carteira e Pagamentos

## 📋 Resumo das Mudanças no App do Entregador

O app do entregador implementou um sistema de **Pagamento Ativo** com duas novas colunas na tabela `entregadores_app`:

- **`chave_pix`** (TEXT): Chave Pix preferencial do entregador
- **`frequencia_pagamento`** (INT, Default 1): Intervalo em dias para pagamento
  - `1` = Pagamento Diário
  - `5` = A cada 5 dias
  - `7` = Semanal
  - etc.

### 🔄 Mudança de Paradigma

**ANTES (Sistema Antigo):**
- Entregador solicita saque
- Admin aprova ou rejeita
- Sistema passivo (reativo)

**AGORA (Sistema Novo):**
- Admin paga ativamente com base em regras
- Entregador define frequência de pagamento
- Sistema ativo (proativo)

---

## 🎯 Adaptações Necessárias no Painel Admin

### 1️⃣ **Atualização do Schema do Banco de Dados**

#### Adicionar colunas na tabela `entregadores_app`:

```sql
-- Adicionar novas colunas
ALTER TABLE entregadores_app 
ADD COLUMN IF NOT EXISTS chave_pix TEXT,
ADD COLUMN IF NOT EXISTS frequencia_pagamento INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_ultimo_pagamento TIMESTAMPTZ;

-- Criar índice para otimizar consultas de pagamento
CREATE INDEX IF NOT EXISTS idx_entregadores_frequencia 
ON entregadores_app(frequencia_pagamento, data_ultimo_pagamento);
```

#### Atualizar dados de teste:

```sql
-- Adicionar chaves Pix de teste
UPDATE entregadores_app 
SET 
    chave_pix = CASE id
        WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN '11912345678'
        WHEN 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' THEN 'maria@email.com'
        WHEN 'cccccccc-cccc-cccc-cccc-cccccccccccc' THEN '12345678900'
        WHEN 'dddddddd-dddd-dddd-dddd-dddddddddddd' THEN 'ana.costa@pix.com'
        WHEN 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' THEN '98765432100'
    END,
    frequencia_pagamento = CASE id
        WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN 1  -- Diário
        WHEN 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' THEN 1  -- Diário
        WHEN 'cccccccc-cccc-cccc-cccc-cccccccccccc' THEN 5  -- A cada 5 dias
        WHEN 'dddddddd-dddd-dddd-dddd-dddddddddddd' THEN 7  -- Semanal
        WHEN 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' THEN 1  -- Diário
    END
WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
);
```

---

### 2️⃣ **Nova View: Entregadores Elegíveis para Pagamento**

Criar uma view que lista automaticamente quem deve receber pagamento hoje:

```sql
CREATE OR REPLACE VIEW view_entregadores_para_pagar AS
WITH saldos AS (
    SELECT 
        id_usuario as id_entregador,
        SUM(CASE WHEN tipo = 'entrada' AND status = 'confirmado' THEN valor ELSE 0 END) -
        SUM(CASE WHEN tipo = 'saida' AND status IN ('pago', 'pendente') THEN valor ELSE 0 END) as saldo_disponivel
    FROM movimentacoes_carteira
    WHERE tipo_usuario = 'entregador'
    GROUP BY id_usuario
)
SELECT 
    e.id,
    e.nome,
    e.email,
    e.telefone,
    e.chave_pix,
    e.frequencia_pagamento,
    e.data_ultimo_pagamento,
    s.saldo_disponivel,
    CASE 
        WHEN e.frequencia_pagamento = 1 THEN 'Diário'
        WHEN e.frequencia_pagamento = 5 THEN 'A cada 5 dias'
        WHEN e.frequencia_pagamento = 7 THEN 'Semanal'
        WHEN e.frequencia_pagamento = 15 THEN 'Quinzenal'
        WHEN e.frequencia_pagamento = 30 THEN 'Mensal'
        ELSE CONCAT('A cada ', e.frequencia_pagamento, ' dias')
    END as descricao_frequencia,
    COALESCE(e.data_ultimo_pagamento, e.criado_em) + (e.frequencia_pagamento || ' days')::INTERVAL as proxima_data_pagamento,
    CASE 
        WHEN COALESCE(e.data_ultimo_pagamento, e.criado_em) + (e.frequencia_pagamento || ' days')::INTERVAL <= NOW() 
        THEN true 
        ELSE false 
    END as deve_pagar_hoje
FROM entregadores_app e
LEFT JOIN saldos s ON e.id = s.id_entregador
WHERE s.saldo_disponivel > 0
ORDER BY 
    CASE WHEN COALESCE(e.data_ultimo_pagamento, e.criado_em) + (e.frequencia_pagamento || ' days')::INTERVAL <= NOW() THEN 0 ELSE 1 END,
    e.frequencia_pagamento ASC,
    s.saldo_disponivel DESC;
```

---

### 3️⃣ **Atualizar Interface: Resumo de Entregadores**

#### Modificar `resumo-entregadores-client.tsx`:

**Adicionar campos ao tipo:**
```typescript
type Item = {
    id_entregador: string
    total_entregas: number
    total_recebido: number
    saldo_pendente: number
    nome: string
    chave_pix?: string | null              // NOVO
    frequencia_pagamento?: number | null    // NOVO
    descricao_frequencia?: string | null    // NOVO
    deve_pagar_hoje?: boolean              // NOVO
    proxima_data_pagamento?: string | null // NOVO
}
```

**Adicionar badges visuais:**
```tsx
<CardHeader className="pb-3">
    <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold truncate">{e.nome}</CardTitle>
        {e.deve_pagar_hoje && (
            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                Pagar Hoje
            </span>
        )}
    </div>
    <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-muted-foreground">
            {e.descricao_frequencia || 'Diário'}
        </span>
        {e.proxima_data_pagamento && !e.deve_pagar_hoje && (
            <span className="text-xs text-muted-foreground">
                • Próximo: {new Date(e.proxima_data_pagamento).toLocaleDateString('pt-BR')}
            </span>
        )}
    </div>
</CardHeader>
```

**Exibir Chave Pix no card:**
```tsx
<div className="space-y-3">
    {/* ... campos existentes ... */}
    
    {e.chave_pix && (
        <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Chave Pix</span>
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(e.chave_pix!)
                        // Mostrar toast de sucesso
                    }}
                    className="text-xs font-mono bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    title="Clique para copiar"
                >
                    {e.chave_pix.length > 15 ? e.chave_pix.substring(0, 15) + '...' : e.chave_pix}
                </button>
            </div>
        </div>
    )}
</div>
```

---

### 4️⃣ **Criar Nova Aba: "Pagamentos Pendentes"**

Adicionar uma nova aba no dashboard especificamente para listar entregadores que devem receber hoje:

#### Criar arquivo `pagamentos-pendentes-client.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, CheckCircle2, Clock } from "lucide-react"
import { formatCurrencyBRL } from "@/components/format"

type EntregadorPendente = {
    id: string
    nome: string
    chave_pix: string
    saldo_disponivel: number
    frequencia_pagamento: number
    descricao_frequencia: string
    proxima_data_pagamento: string
    deve_pagar_hoje: boolean
}

export default function PagamentosPendentesClient() {
    const [entregadores, setEntregadores] = useState<EntregadorPendente[]>([])
    const [loading, setLoading] = useState(true)
    const [processando, setProcessando] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/entregadores/pendentes')
            .then(res => res.json())
            .then(data => setEntregadores(data))
            .finally(() => setLoading(false))
    }, [])

    const copiarChavePix = (chave: string) => {
        navigator.clipboard.writeText(chave)
        // Adicionar toast de sucesso
    }

    const confirmarPagamento = async (entregador: EntregadorPendente) => {
        setProcessando(entregador.id)
        try {
            const res = await fetch('/api/pagamentos/confirmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_entregador: entregador.id,
                    valor: entregador.saldo_disponivel,
                    chave_pix: entregador.chave_pix
                })
            })
            
            if (res.ok) {
                // Remover da lista
                setEntregadores(prev => prev.filter(e => e.id !== entregador.id))
                // Mostrar toast de sucesso
            }
        } catch (error) {
            console.error(error)
            // Mostrar toast de erro
        } finally {
            setProcessando(null)
        }
    }

    const entregadoresHoje = entregadores.filter(e => e.deve_pagar_hoje)
    const entregadoresProximos = entregadores.filter(e => !e.deve_pagar_hoje)

    return (
        <div className="space-y-6">
            {/* Pagamentos de Hoje */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-red-600" />
                        Pagamentos de Hoje ({entregadoresHoje.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {entregadoresHoje.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum pagamento pendente para hoje</p>
                    ) : (
                        <div className="space-y-3">
                            {entregadoresHoje.map(e => (
                                <div key={e.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                                    <div className="flex-1">
                                        <div className="font-semibold">{e.nome}</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {e.descricao_frequencia}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-muted-foreground">Chave Pix:</span>
                                            <code className="text-xs bg-white px-2 py-1 rounded">{e.chave_pix}</code>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => copiarChavePix(e.chave_pix)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-2">
                                        <div className="text-2xl font-bold text-emerald-600">
                                            {formatCurrencyBRL(e.saldo_disponivel)}
                                        </div>
                                        <Button 
                                            size="sm"
                                            disabled={processando === e.id}
                                            onClick={() => confirmarPagamento(e)}
                                        >
                                            {processando === e.id ? 'Processando...' : 'Confirmar Pagamento'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Próximos Pagamentos */}
            <Card>
                <CardHeader>
                    <CardTitle>Próximos Pagamentos ({entregadoresProximos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {entregadoresProximos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum pagamento programado</p>
                    ) : (
                        <div className="space-y-2">
                            {entregadoresProximos.map(e => (
                                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <div className="font-medium">{e.nome}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Próximo pagamento: {new Date(e.proxima_data_pagamento).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">{formatCurrencyBRL(e.saldo_disponivel)}</div>
                                        <Badge variant="outline">{e.descricao_frequencia}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
```

---

### 5️⃣ **Criar API Route: Entregadores Pendentes**

#### Criar arquivo `src/app/api/entregadores/pendentes/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabaseClient"
import { NextResponse } from "next/server"

export async function GET() {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
        .from('view_entregadores_para_pagar')
        .select('*')
        .order('deve_pagar_hoje', { ascending: false })
        .order('saldo_disponivel', { ascending: false })
    
    if (error) {
        console.error('Erro ao buscar entregadores pendentes:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
}
```

---

### 6️⃣ **Atualizar API de Confirmação de Pagamento**

#### Modificar `src/app/api/repasses/confirmar/route.ts`:

Adicionar lógica para atualizar `data_ultimo_pagamento`:

```typescript
// Após confirmar o pagamento, atualizar a data do último pagamento
if (tipo_usuario === 'entregador') {
    await supabase
        .from('entregadores_app')
        .update({ data_ultimo_pagamento: new Date().toISOString() })
        .eq('id', id_usuario)
}
```

---

### 7️⃣ **Adicionar Filtros no Dashboard**

Adicionar opções de filtro para visualizar:
- ✅ Todos os entregadores
- 🔴 Pagamento Diário (frequencia = 1)
- 🟡 Pagamento Ciclo (frequencia > 1)
- ⏰ Deve pagar hoje

---

## 📊 Fluxo Operacional Atualizado

### Passo a Passo para o Admin:

1. **Acessar aba "Pagamentos Pendentes"**
   - Ver lista de entregadores que devem receber hoje
   - Ordenados por urgência e valor

2. **Para cada entregador:**
   - ✅ Verificar saldo disponível
   - 📋 Copiar chave Pix (botão de copiar)
   - 💰 Realizar transferência bancária
   - ✔️ Clicar em "Confirmar Pagamento"

3. **Sistema automaticamente:**
   - Registra saída na `movimentacoes_carteira`
   - Atualiza `data_ultimo_pagamento`
   - Zera saldo do entregador
   - Envia notificação push (se configurado)
   - Remove da lista de pendentes

---

## 🚀 Próximos Passos de Implementação

### Prioridade Alta:
1. ✅ Executar SQL para adicionar colunas
2. ✅ Criar view `view_entregadores_para_pagar`
3. ✅ Atualizar tipo `Item` em `resumo-entregadores-client.tsx`
4. ✅ Adicionar exibição de chave Pix nos cards
5. ✅ Criar componente `PagamentosPendentesClient`
6. ✅ Criar API route `/api/entregadores/pendentes`
7. ✅ Atualizar API de confirmação para registrar `data_ultimo_pagamento`

### Prioridade Média:
- Adicionar toast notifications
- Implementar filtros por frequência
- Adicionar dashboard de métricas (quantos pagamentos por dia/semana)
- Exportar relatório de pagamentos

### Prioridade Baixa:
- Integração com API de Pix para pagamento automático
- Notificações push para entregadores
- Histórico detalhado de pagamentos por entregador

---

## ⚠️ Considerações Importantes

1. **Segurança da Chave Pix:**
   - Chaves Pix são dados sensíveis
   - Implementar RLS adequado em produção
   - Considerar criptografia para armazenamento

2. **Validação de Dados:**
   - Validar formato da chave Pix no app do entregador
   - Verificar se saldo > 0 antes de permitir pagamento
   - Prevenir pagamentos duplicados

3. **Auditoria:**
   - Registrar quem confirmou cada pagamento (id_admin)
   - Manter histórico completo de todas as transações
   - Logs de tentativas de pagamento

4. **Performance:**
   - View materializada para grandes volumes
   - Índices nas colunas de busca frequente
   - Cache de dados de pagamentos pendentes

---

## 📝 Checklist de Implementação

- [ ] Executar migrations SQL
- [ ] Atualizar tipos TypeScript
- [ ] Modificar componente de resumo de entregadores
- [ ] Criar componente de pagamentos pendentes
- [ ] Criar API routes necessárias
- [ ] Adicionar aba no dashboard
- [ ] Testar fluxo completo
- [ ] Adicionar tratamento de erros
- [ ] Implementar notificações
- [ ] Documentar processo para equipe
- [ ] Treinar admins no novo fluxo

---

**Documento criado em:** 20/01/2026  
**Versão:** 1.0  
**Status:** Pronto para implementação
