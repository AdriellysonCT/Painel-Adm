# 📋 PROMPT: Registro de Entregas para Split de Pagamento (EFI Bank)

## 🎯 Contexto

O sistema de delivery agora usa **split de pagamento via EFI Bank**. Quando o cliente paga, o banco divide automaticamente:

- **Restaurante**: recebe o valor dos produtos direto na conta dele
- **Plataforma**: recebe a taxa fixa (R$2,00) + taxa de entrega
- **Entregador**: deve receber o valor da taxa de entrega que ficou retido na conta da plataforma

## ❌ Problema Atual

As entregas estão sendo registradas **sem** as informações necessárias para conciliação:

```json
// Como está sendo registrado hoje:
{
  "origem": "entrega",
  "tipo": "entrada", 
  "valor": 5.00,
  "status": "confirmado",
  "id_restaurante": null,    ← FALTA
  "id_pedido": null          ← FALTA
}
```

## ✅ O Que Precisa Ser Implementado

### 1. Verificar/Adicionar campos no INSERT de entregas

No código que registra a entrega concluída na tabela `movimentacoes_carteira`, **verificar se existem** e **preencher** os seguintes campos:

| Campo | Tipo | Obrigatório | De onde vem |
|---|---|---|---|
| `id_restaurante` | UUID | ✅ Sim | Dados do pedido/restaurante |
| `id_pedido` | UUID | ✅ Sim | ID do pedido que foi entregue |

### 2. Exemplo de como o INSERT deve ficar:

```typescript
// EXEMPLO - Supabase Client (app do entregador)
const { data, error } = await supabase
  .from('movimentacoes_carteira')
  .insert({
    id_carteira: idCarteiraEntregador,
    tipo: 'entrada',
    origem: 'entrega',
    descricao: `Entrega do pedido #${idPedido}`,
    valor: valorDaEntrega, // ex: 5.00, 8.00
    status: 'confirmado',
    id_restaurante: idRestaurante,  // ← ADICIONAR: ID do restaurante
    id_pedido: idPedido,            // ← ADICIONAR: ID do pedido original
    referencia_id: idPedido,        // Manter para compatibilidade
    tipo_pedido: 'entrega'          // Já existe
  })
```

### 3. Quando registrar:

O INSERT deve ser feito quando:
- O entregador marca a entrega como **"Entrega Concluída"** no app
- OU quando o restaurante **confirma** que a entrega foi realizada
- OU via webhook/API do painel do restaurante

### 4. De onde pegar os dados:

```typescript
// Quando o entregador aceita/realiza uma entrega, o app já deve ter:
const idPedido = pedido.id                    // ID do pedido
const idRestaurante = pedido.restaurante_id   // ID do restaurante
const idEntregador = entregador.id            // ID do entregador logado
const valorEntrega = pedido.taxa_entrega      // Valor que o entregador ganha
```

### 5. Fluxo Completo:

```
1. Entregador aceita pedido
        ↓
2. Entregador coleta no restaurante
        ↓
3. Entregador marca como "Entregue" no app
        ↓
4. APP REGISTRA na movimentacoes_carteira:
   - origem: 'entrega'
   - tipo: 'entrada'
   - status: 'confirmado'
   - valor: R$5,00 (ou valor configurado)
   - id_restaurante: ID do restaurante ✅
   - id_pedido: ID do pedido ✅
        ↓
5. Painel Admin calcula quanto deve pagar
        ↓
6. Admin faz Pix ao entregador
        ↓
7. Admin confirma pagamento → status muda para 'repassado'
```

## 🔧 Tabela no Banco (já atualizada)

As colunas `id_restaurante` e `id_pedido` **já foram adicionadas** na tabela `movimentacoes_carteira`. Só precisa usá-las no INSERT.

```sql
-- Colunas disponíveis em movimentacoes_carteira:
id              UUID
id_carteira     UUID
tipo            TEXT          -- 'entrada' ou 'saida'
origem          TEXT          -- 'entrega', 'pedido', 'pagamento'
referencia_id   UUID
id_restaurante  UUID          -- ← NOVA (já existe no banco)
id_pedido       UUID          -- ← NOVA (já existe no banco)
descricao       TEXT
valor           NUMERIC
status          TEXT          -- 'pendente', 'confirmado', 'repassado'
tipo_pedido     TEXT          -- 'entrega', 'retirada', 'local'
criado_em       TIMESTAMPTZ
```

## ⚠️ Importante

- **Todo INSERT de entrega DEVE ter `id_restaurante` e `id_pedido` preenchidos**
- Isso é necessário para **conciliação com o split da EFI Bank**
- Sem esses dados, não é possível saber qual restaurante originou a entrega nem conciliar com o pagamento dividido

## 📝 Checklist de Implementação

- [ ] Localizar no código onde é feito o INSERT de entrega concluída
- [ ] Adicionar `id_restaurante` no INSERT (pegar do objeto do pedido)
- [ ] Adicionar `id_pedido` no INSERT (pegar do objeto do pedido)
- [ ] Testar com uma entrega real
- [ ] Verificar no banco se os campos foram preenchidos corretamente

## 🧪 Como Testar

Após implementar, verificar se o registro está correto:

```typescript
// Após marcar entrega como concluída, verificar no banco:
const { data } = await supabase
  .from('movimentacoes_carteira')
  .select('id, id_restaurante, id_pedido, origem, tipo, valor, status')
  .eq('origem', 'entrega')
  .order('criado_em', { ascending: false })
  .limit(1)

console.log(data[0])
// Deve mostrar:
// { 
//   id: "...",
//   id_restaurante: "uuid-do-restaurante",  ← NÃO PODE SER NULL
//   id_pedido: "uuid-do-pedido",             ← NÃO PODE SER NULL
//   origem: "entrega",
//   tipo: "entrada",
//   valor: 5.00,
//   status: "confirmado"
// }
```

---

**Prioridade**: 🔴 Alta — necessário para o split de pagamento funcionar corretamente.
**Impacto**: Sem isso, não é possível conciliar os pagamentos entre plataforma, restaurante e entregador.
