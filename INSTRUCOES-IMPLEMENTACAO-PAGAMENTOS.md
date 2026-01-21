# 📋 Instruções de Implementação - Sistema de Pagamentos Seguros

## ✅ O que foi criado:

### 1. Documentação:
- ✅ `FLUXO-PAGAMENTOS-SEGURO.md` - Documentação completa do fluxo
- ✅ `ADAPTACAO-CARTEIRA-ENTREGADORES.md` - Análise das mudanças necessárias
- ✅ Este arquivo de instruções

### 2. SQL:
- ✅ `setup-pagamentos-seguros.sql` - Script completo de setup do banco

### 3. API Routes:
- ✅ `/api/entregadores/pendentes` - Lista entregadores para pagar
- ✅ `/api/pagamentos/processar` - Inicia processo de pagamento
- ✅ `/api/pagamentos/confirmar` - Confirma pagamento realizado

### 4. Componentes React:
- ✅ `pagamentos-pendentes-client.tsx` - Interface completa de pagamentos

---

## 🚀 Passo a Passo para Implementar:

### **PASSO 1: Executar SQL no Supabase**

1. Acesse o Supabase SQL Editor:
   - https://supabase.com/dashboard
   - Projeto: `eaeggaondfefgwhseswn`
   - Menu: SQL Editor

2. Copie TODO o conteúdo do arquivo `setup-pagamentos-seguros.sql`

3. Cole no SQL Editor e clique em **Run**

4. Verifique se apareceu: `"Setup concluído com sucesso!"`

**O que esse script faz:**
- ✅ Adiciona coluna `data_ultimo_pagamento` em `entregadores_app`
- ✅ Cria índices para otimizar consultas
- ✅ Cria VIEW `view_entregadores_para_pagar` (lista automática)
- ✅ Cria FUNCTION `processar_pagamento_entregador` (validações)
- ✅ Cria FUNCTION `confirmar_pagamento_entregador` (confirmação)
- ✅ Cria VIEWs de relatórios e auditoria
- ✅ Cria FUNCTION `recalcular_saldo_carteira` (correção)

---

### **PASSO 2: Testar as APIs**

Abra o terminal e teste:

```bash
# 1. Listar entregadores pendentes
curl http://localhost:3000/api/entregadores/pendentes

# Deve retornar JSON com:
# - todos: array de entregadores
# - hoje: entregadores que devem receber hoje
# - proximos: próximos pagamentos
# - alertas: problemas detectados
# - resumo: totalizadores
```

Se der erro 404, verifique se o servidor está rodando:
```bash
cd admin-panel
npm run dev
```

---

### **PASSO 3: Adicionar Aba no Dashboard**

Edite o arquivo `src/app/dashboard/dashboard-wrapper-client.tsx`:

```typescript
// Adicione o import no topo
import PagamentosPendentesClient from './pagamentos-pendentes-client'

// Dentro do componente, adicione uma nova aba:
<TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
    <TabsTrigger value="dashboard" className="gap-2">
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
    </TabsTrigger>
    <TabsTrigger value="pagamentos" className="gap-2">
        <Wallet className="h-4 w-4" />
        Pagamentos
    </TabsTrigger>
    <TabsTrigger value="fechamentos" className="gap-2">
        <Receipt className="h-4 w-4" />
        Fechamentos
    </TabsTrigger>
</TabsList>

// Adicione o conteúdo da aba:
<TabsContent value="pagamentos">
    <PagamentosPendentesClient />
</TabsContent>
```

Não esqueça de importar o ícone:
```typescript
import { LayoutDashboard, Receipt, Wallet } from "lucide-react"
```

---

### **PASSO 4: Testar o Fluxo Completo**

1. **Acesse o painel:** http://localhost:3000/dashboard

2. **Clique na aba "Pagamentos"**

3. **Você deve ver:**
   - Resumo com totalizadores
   - Seção "Pagamentos de Hoje" (se houver)
   - Seção "Alertas" (se houver problemas)
   - Seção "Próximos Pagamentos"

4. **Para testar um pagamento:**
   - Clique em "Pagar Agora" em um entregador
   - Verifique os dados no dialog
   - Clique em "Confirmar Pagamento"
   - O sistema deve processar e remover da lista

---

### **PASSO 5: Verificar no Banco de Dados**

Após processar um pagamento, verifique no Supabase:

```sql
-- Ver movimentações criadas
SELECT * FROM movimentacoes_carteira 
WHERE tipo = 'saida' 
  AND origem = 'pagamento'
ORDER BY criado_em DESC
LIMIT 5;

-- Ver saldos atualizados
SELECT 
    e.nome,
    c.saldo_atual,
    c.saldo_pendente
FROM entregadores_app e
INNER JOIN carteiras c ON e.id = c.id_usuario
WHERE c.tipo_usuario = 'entregador';

-- Ver relatório de pagamentos
SELECT * FROM relatorio_pagamentos_diario;

-- Verificar inconsistências
SELECT * FROM relatorio_inconsistencias;
```

---

## 🔍 Checklist de Validação:

### Funcionalidades Básicas:
- [ ] SQL executado sem erros
- [ ] API `/api/entregadores/pendentes` retorna dados
- [ ] Aba "Pagamentos" aparece no dashboard
- [ ] Lista de entregadores é exibida
- [ ] Botão "Copiar Pix" funciona
- [ ] Dialog de confirmação abre
- [ ] Pagamento é processado com sucesso
- [ ] Entregador some da lista após pagamento

### Validações de Segurança:
- [ ] Não permite pagar sem chave Pix
- [ ] Não permite pagar com saldo zero
- [ ] Não permite pagamento duplicado
- [ ] Alerta para valores suspeitos (>R$10k)
- [ ] Saldo é recalculado corretamente

### Relatórios:
- [ ] `relatorio_pagamentos_diario` mostra dados
- [ ] `relatorio_inconsistencias` está vazio (ou mostra problemas)
- [ ] `view_entregadores_para_pagar` lista corretamente

---

## 🐛 Troubleshooting:

### Erro: "relation does not exist"
**Solução:** Execute o SQL novamente no Supabase

### Erro: "function does not exist"
**Solução:** Verifique se o SQL foi executado completamente

### Erro: "Carteira não encontrada"
**Solução:** Certifique-se de que os entregadores têm carteiras criadas:
```sql
-- Criar carteiras para entregadores sem carteira
INSERT INTO carteiras (id_usuario, tipo_usuario, saldo_atual, saldo_pendente)
SELECT id, 'entregador', 0, 0
FROM entregadores_app
WHERE id NOT IN (SELECT id_usuario FROM carteiras WHERE tipo_usuario = 'entregador');
```

### Erro: "Saldo insuficiente"
**Solução:** Verifique se há movimentações de entrada confirmadas:
```sql
-- Ver movimentações do entregador
SELECT * FROM movimentacoes_carteira m
INNER JOIN carteiras c ON m.id_carteira = c.id
WHERE c.id_usuario = 'ID_DO_ENTREGADOR';
```

### Lista vazia na tela
**Solução:** Adicione dados de teste:
```sql
-- Adicionar movimentação de entrada para teste
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status
)
SELECT 
    c.id,
    'entrada',
    'entrega',
    'Entrega de teste',
    50.00,
    'confirmado'
FROM carteiras c
INNER JOIN entregadores_app e ON c.id_usuario = e.id
WHERE e.chave_pix IS NOT NULL
LIMIT 1;
```

---

## 📊 Próximos Passos (Opcional):

### Melhorias Futuras:
1. **Upload de Comprovante:**
   - Adicionar campo para upload de imagem
   - Armazenar no Supabase Storage

2. **Notificações Push:**
   - Integrar com OneSignal
   - Enviar notificação quando pagamento for confirmado

3. **Histórico de Pagamentos:**
   - Criar tela com histórico completo
   - Filtros por data, entregador, valor

4. **Exportar Relatórios:**
   - Botão para exportar CSV
   - Relatório mensal em PDF

5. **Automação:**
   - Cron job para processar pagamentos diários
   - Integração com API de Pix para pagamento automático

---

## 📞 Suporte:

Se encontrar problemas:

1. Verifique os logs do console (F12 no navegador)
2. Verifique os logs do servidor (terminal onde roda `npm run dev`)
3. Verifique os logs do Supabase (SQL Editor > Logs)
4. Consulte a documentação em `FLUXO-PAGAMENTOS-SEGURO.md`

---

## ✅ Conclusão:

Após seguir todos os passos, você terá:

- ✅ Sistema de pagamentos robusto e seguro
- ✅ Validações automáticas para prevenir erros
- ✅ Auditoria completa de todas as operações
- ✅ Interface intuitiva para o admin
- ✅ Relatórios para acompanhamento

**Tempo estimado de implementação:** 30-45 minutos

**Prioridade:** 🔴 CRÍTICA (envolve dinheiro)

---

**Documento criado em:** 20/01/2026  
**Versão:** 1.0  
**Status:** Pronto para implementação
