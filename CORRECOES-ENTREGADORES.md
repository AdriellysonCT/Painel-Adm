# Correções - Sistema de Repasses para Entregadores

## Data: 19/01/2026

## Problemas Identificados e Corrigidos

### 1. ❌ Entregador "hanny" não aparecia no resumo
**Causa**: O código filtrava apenas entregadores com `saldo !== 0`, excluindo quem tinha saldo zero.

**Solução**: 
- Alterado o filtro em `repasses-dashboard-client.tsx` para mostrar todos os entregadores com movimentações, independente do saldo
- Linha alterada: removido filtro `saldo !== 0`

### 2. ❌ Entregas com valor zerado (R$ 0,00)
**Causa**: A função `definir_valor_entrega()` estava buscando dados na tabela errada:
- Buscava em `valores_entrega` (não existe)
- Deveria buscar em `valores_entrega_bairro`
- Buscava coluna `preco_entrega` (não existe)
- Deveria buscar coluna `valor`

**Solução**:
- Corrigida a função `definir_valor_entrega()` para:
  - Buscar na tabela correta: `valores_entrega_bairro`
  - Usar a coluna correta: `valor`
  - Fallback para `taxa_entrega` do pedido se não encontrar valor por bairro
  - Usar o bairro direto da entrega se não encontrar mapeamento de rua

### 3. ❌ Movimentações duplicadas
**Causa**: Dois triggers fazendo a mesma coisa:
- `entrega_concluida_trigger` → `trg_entrega_concluida_to_carteira()`
- `trg_creditar_entregador_ao_concluir` → `creditar_entregador_ao_concluir()`

**Solução**:
- Removido o trigger duplicado `entrega_concluida_trigger`
- Mantido apenas `trg_creditar_entregador_ao_concluir` (tem melhor tratamento de erros)
- Criado índice único para prevenir duplicatas futuras:
  ```sql
  CREATE UNIQUE INDEX idx_movimentacoes_entrega_unica 
  ON movimentacoes_carteira (referencia_id, id_carteira) 
  WHERE origem = 'entrega_concluida' AND referencia_id IS NOT NULL;
  ```

### 4. ✅ Correção de dados históricos
**Ações realizadas**:
1. Atualizado `valor_entrega` nas entregas que estavam zeradas (2 entregas corrigidas)
2. Atualizado `valor` nas movimentações que estavam zeradas (4 movimentações corrigidas)
3. Removido movimentações duplicadas (3 duplicatas removidas)
4. Recalculado `saldo_pendente` nas carteiras dos entregadores

## Resultado Final

### Antes:
- ❌ Apenas 1 entregador aparecia (Adriellyson)
- ❌ Entregador "hanny" não aparecia
- ❌ 4 movimentações com valor R$ 0,00
- ❌ 3 movimentações duplicadas

### Depois:
- ✅ 2 entregadores aparecem corretamente
- ✅ Adriellyson: 4 entregas, R$ 15,00 pendente
- ✅ hanny: 1 entrega, R$ 5,00 pendente
- ✅ Todas as movimentações com valores corretos
- ✅ Sem duplicatas

## Prevenção de Problemas Futuros

1. **Índice único**: Previne duplicatas de movimentações por entrega
2. **Função corrigida**: Novos pedidos terão o valor correto automaticamente
3. **Trigger único**: Apenas um trigger cria movimentações, evitando duplicatas
4. **Fallback inteligente**: Se não encontrar valor por bairro, usa a taxa do pedido

## Arquivos Alterados

1. `admin-panel/src/app/dashboard/repasses-dashboard-client.tsx`
   - Removido filtro que excluía entregadores com saldo zero

2. Banco de dados (via MCP Supabase):
   - Função `definir_valor_entrega()` corrigida
   - Trigger `entrega_concluida_trigger` removido
   - Índice único `idx_movimentacoes_entrega_unica` criado
   - Dados históricos corrigidos

## Testes Recomendados

1. ✅ Verificar se ambos os entregadores aparecem no painel
2. ✅ Verificar se os valores estão corretos
3. ⚠️ Criar uma nova entrega e verificar se o valor é calculado corretamente
4. ⚠️ Concluir uma entrega e verificar se não cria duplicatas

## Observações

- O sistema agora está mais robusto e previne os problemas identificados
- Recomenda-se monitorar as próximas entregas para garantir que tudo está funcionando corretamente
- Se houver problemas com cálculo de valores, verificar a tabela `valores_entrega_bairro` e o mapeamento de ruas em `ruas_bairros`
