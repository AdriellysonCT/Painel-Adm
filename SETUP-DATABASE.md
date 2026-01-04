# 🗄️ Setup do Banco de Dados Supabase

## 📋 Problema Identificado

O painel administrativo não está mostrando dados porque:
1. As tabelas do banco podem não existir
2. Não há dados de teste para visualizar
3. A view `view_extrato_carteira` pode não estar criada
4. A função RPC `confirmar_repasso_manual` pode não existir

## 🚀 Como Resolver

### Passo 1: Acessar o Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: `eaeggaondfefgwhseswn`
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o Script de Setup

1. Abra o arquivo `supabase-setup.sql` (na raiz do projeto admin-panel)
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar se Funcionou

Execute estas queries para verificar:

```sql
-- Verificar restaurantes
SELECT * FROM restaurantes_app;

-- Verificar entregadores
SELECT * FROM entregadores_app;

-- Verificar movimentações
SELECT * FROM movimentacoes_carteira;

-- Verificar view de extrato
SELECT * FROM view_extrato_carteira LIMIT 10;

-- Verificar repasses por restaurante
SELECT * FROM repasses_restaurantes;
```

### Passo 4: Testar o Painel

1. Volte ao painel administrativo: http://localhost:3000
2. Faça login com: `admin@yopmail.com` / `147258`
3. Você deve ver:
   - **5 restaurantes** com saldos pendentes
   - **3 entregadores** com saldos pendentes
   - KPIs preenchidos (Total pendente, Total repassado, etc.)

## 📊 Dados de Teste Incluídos

### Restaurantes:
- Pizzaria Bella Napoli (saldo pendente: ~R$ 40,00)
- Hamburgueria Top Burger (saldo pendente: ~R$ 20,00)
- Sushi House (saldo: R$ 0,00 - já foi pago)
- Churrascaria Gaúcha (saldo pendente: ~R$ 30,00)
- Restaurante Vegano Verde (saldo pendente: ~R$ 17,00)

### Entregadores:
- João Silva (saldo pendente: ~R$ 2,00)
- Maria Santos (saldo pendente: ~R$ 8,00)
- Pedro Oliveira (saldo: R$ 0,00 - já foi pago)

## 🔧 Estrutura do Banco

### Tabelas Principais:
- `restaurantes_app` - Cadastro de restaurantes
- `entregadores_app` - Cadastro de entregadores
- `movimentacoes_carteira` - Todas as movimentações financeiras
- `repasses_restaurantes` - Resumo agregado por restaurante
- `historico_repasses` - Histórico de pagamentos confirmados
- `falhas_repasses` - Registro de falhas

### Views:
- `view_extrato_carteira` - Extrato unificado com joins

### Functions:
- `confirmar_repasso_manual()` - Processa confirmação de pagamento

## ⚠️ Importante

As políticas de segurança (RLS) estão configuradas de forma **permissiva para desenvolvimento**.

**ANTES DE IR PARA PRODUÇÃO**, você deve:
1. Remover as políticas "Allow all for development"
2. Criar políticas específicas baseadas em roles/usuários
3. Configurar autenticação adequada
4. Adicionar validações de permissão

## 🐛 Troubleshooting

### Erro: "relation does not exist"
- Execute o script SQL completo novamente
- Verifique se todas as tabelas foram criadas

### Erro: "permission denied"
- Verifique as políticas RLS
- Certifique-se de que o usuário anon tem permissão

### Dados não aparecem no painel
1. Abra o console do browser (F12)
2. Veja os logs com 🔍 para identificar erros
3. Verifique se as queries estão retornando dados

### Erro de CORS
- Já foi corrigido com `createServerClient()`
- Se persistir, verifique as configurações do Supabase

## 📞 Próximos Passos

Depois que os dados aparecerem:
1. Teste a funcionalidade "Marcar como Pago"
2. Verifique os filtros e buscas
3. Teste a exportação de CSV
4. Adicione mais dados reais conforme necessário
