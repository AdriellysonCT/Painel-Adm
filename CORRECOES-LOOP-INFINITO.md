# Correções do Loop Infinito e Consumo de Memória

## 🔴 Problemas Identificados e Corrigidos

### Data: 2 de Março de 2026

---

## Problema Original

O sistema estava apresentando:
- Loop infinito de carregamento
- Consumo excessivo de memória (20GB+)
- Criação de 800+ processos Node.js
- Aplicação travando completamente

---

## Causas Raiz Identificadas

### 1. **`location.reload()` causando recarregamento em cascata**
**Arquivos afetados:**
- `resumo-restaurantes-client.tsx`
- `resumo-entregadores-client.tsx`
- `repasses-dashboard-client.tsx`

**Problema:** Após confirmar pagamentos, o código chamava `location.reload()` que:
- Recarregava a página inteira
- Reiniciava todos os componentes
- Criava novos intervalos sem limpar os antigos
- Gerava múltiplas chamadas API simultâneas

**Solução:** Substituído por callbacks `onUpdate()` que atualizam apenas os dados necessários via state.

---

### 2. **Auto-refresh acumulando intervalos**
**Arquivo:** `breakdown-financeiro-client.tsx`

**Problema:** 
```typescript
// ❌ ANTES
useEffect(() => {
    const interval = setInterval(() => {
        carregarDados(true)
    }, 30000)
    return () => clearInterval(interval)
}, [periodo]) // Criava novo intervalo a cada mudança de período
```

Cada mudança de `periodo` criava um NOVO intervalo, mas os antigos continuavam rodando.

**Solução:**
```typescript
// ✅ DEPOIS
const carregarDados = useCallback(async (isAutoRefresh = false) => {
    if (isRefreshingRef.current) return // Evita chamadas simultâneas
    // ... resto do código
}, [periodo])

useEffect(() => {
    const interval = setInterval(() => {
        carregarDados(true)
    }, 30000)
    return () => clearInterval(interval)
}, [carregarDados]) // Agora depende de carregarDados que já inclui periodo
```

---

### 3. **Dependency arrays incompletas**
**Arquivo:** `pagamentos-pendentes-client.tsx`

**Problema:**
```typescript
// ❌ ANTES
useEffect(() => {
    carregarDados() // Usa 'filtro' mas não está nas dependências
}, [])
```

**Solução:**
```typescript
// ✅ DEPOIS
useEffect(() => {
    carregarDados(filtro)
}, [filtro]) // Agora inclui filtro como dependência
```

---

## Correções Implementadas

### ✅ 1. Removido todos os `location.reload()`

**Antes:**
```typescript
location.reload() // ou window.location.reload()
```

**Depois:**
```typescript
onUpdate?.() // Callback que atualiza apenas os dados necessários
```

---

### ✅ 2. Implementado `useCallback` com flag de controle

**Adicionado:**
```typescript
const isRefreshingRef = useRef(false)

const carregarDados = useCallback(async (isAutoRefresh = false) => {
    if (isRefreshingRef.current) {
        console.log('⏭️ Refresh já em andamento, pulando...')
        return
    }
    isRefreshingRef.current = true
    try {
        // ... código de fetch
    } finally {
        isRefreshingRef.current = false
    }
}, [periodo])
```

---

### ✅ 3. Corrigido dependency arrays

Todos os `useEffect` agora incluem todas as dependências necessárias.

---

### ✅ 4. Implementado sistema de callbacks

**Componente Pai (`resumo-client.tsx`):**
```typescript
const [refreshKey, setRefreshKey] = useState(0)

const handleUpdate = () => {
    console.log('🔄 Atualizando dados...')
    setRefreshKey(prev => prev + 1) // Força re-fetch
}

useEffect(() => {
    // ... buscar dados
}, [modo, refreshKey])

return <ResumoRestaurantesClient items={restaurantes} onUpdate={handleUpdate} />
```

**Componente Filho:**
```typescript
export default function ResumoRestaurantesClient({ 
    items, 
    onUpdate 
}: { 
    items: Item[]; 
    onUpdate?: () => void 
}) {
    // ... após confirmar pagamento
    onUpdate?.() // Notifica o pai para atualizar
}
```

---

### ✅ 5. Melhorado tratamento de erros

Adicionado `alert()` para feedback ao usuário em caso de erro:
```typescript
} catch (e) {
    console.error(e)
    alert('Erro ao confirmar pagamento. Tente novamente.')
}
```

---

## Arquivos Modificados

1. ✅ `breakdown-financeiro-client.tsx` - Auto-refresh corrigido
2. ✅ `resumo-restaurantes-client.tsx` - Removido reload, adicionado callback
3. ✅ `resumo-entregadores-client.tsx` - Removido reload, adicionado callback
4. ✅ `repasses-dashboard-client.tsx` - Removido reload, implementado workaround
5. ✅ `pagamentos-pendentes-client.tsx` - Corrigido dependency array
6. ✅ `resumo-client.tsx` - Implementado sistema de refresh via state

---

## Resultado Esperado

Após as correções:
- ✅ Sem recarregamentos de página desnecessários
- ✅ Intervalos de auto-refresh controlados e limpos adequadamente
- ✅ Sem acúmulo de processos Node.js
- ✅ Consumo de memória normal
- ✅ Atualizações de dados via state ao invés de reload
- ✅ Melhor experiência do usuário (sem perda de estado)

---

## Como Testar

1. Abrir o painel admin
2. Navegar para a página de pagamentos
3. Confirmar um pagamento
4. Verificar que:
   - A página NÃO recarrega completamente
   - Os dados são atualizados automaticamente
   - Não há múltiplas chamadas API simultâneas
   - O consumo de memória permanece estável

---

## Monitoramento

Para verificar se o problema foi resolvido, monitore:

```bash
# No console do navegador
# Deve mostrar apenas 1 refresh a cada 30 segundos
🔄 Iniciando auto-refresh...
✅ Dados atualizados: [hora]

# Não deve aparecer:
# - Múltiplos "Iniciando auto-refresh" simultâneos
# - Recarregamentos de página após confirmar pagamento
```

---

## Notas Técnicas

- **useCallback**: Memoriza a função para evitar recriações desnecessárias
- **useRef**: Usado para flag de controle sem causar re-renders
- **refreshKey**: Pattern para forçar re-fetch de dados via useEffect
- **Callbacks**: Comunicação entre componentes pai-filho sem prop drilling

---

## Autor

Correções implementadas em 2 de Março de 2026
