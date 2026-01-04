# 🔒 Configuração de RLS (Row Level Security) - Supabase

## ✅ Problema Resolvido

O painel administrativo não conseguia carregar os nomes dos entregadores porque o **RLS (Row Level Security)** estava bloqueando a leitura da tabela `entregadores_app`.

## 🛠️ Solução Aplicada

Execute este SQL no Supabase SQL Editor para permitir leitura das tabelas:

```sql
-- ============================================
-- POLÍTICAS DE LEITURA PARA O PAINEL ADMIN
-- ============================================

-- 1. Entregadores
CREATE POLICY "Allow read for all" ON entregadores_app
    FOR SELECT
    USING (true);

-- 2. Restaurantes (se necessário)
CREATE POLICY "Allow read for all" ON restaurantes_app
    FOR SELECT
    USING (true);

-- 3. Movimentações (se necessário)
CREATE POLICY "Allow read for all" ON movimentacoes_carteira
    FOR SELECT
    USING (true);

-- 4. Repasses (se necessário)
CREATE POLICY "Allow read for all" ON repasses_restaurantes
    FOR SELECT
    USING (true);

-- 5. Histórico de repasses (se necessário)
CREATE POLICY "Allow read for all" ON historico_repasses
    FOR SELECT
    USING (true);

-- 6. Falhas de repasses (se necessário)
CREATE POLICY "Allow read for all" ON falhas_repasses
    FOR SELECT
    USING (true);
```

## 🔐 Alternativa Mais Segura (Recomendado para Produção)

Se você quiser restringir o acesso apenas para admins autenticados:

```sql
-- Criar política que permite leitura apenas para usuários autenticados
CREATE POLICY "Allow read for authenticated users" ON entregadores_app
    FOR SELECT
    TO authenticated
    USING (true);

-- Ou restringir apenas para admins específicos
CREATE POLICY "Allow read for admins" ON entregadores_app
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (
            'admin@yopmail.com',
            'outro-admin@email.com'
        )
    );
```

## 📋 Verificar Políticas Existentes

Para ver todas as políticas de uma tabela:

```sql
SELECT * FROM pg_policies WHERE tablename = 'entregadores_app';
```

## 🗑️ Remover Políticas

Se precisar remover uma política:

```sql
DROP POLICY IF EXISTS "Allow read for all" ON entregadores_app;
```

## ⚠️ Importante

### Para Desenvolvimento:
- Use políticas permissivas (`USING (true)`)
- Facilita o desenvolvimento e testes

### Para Produção:
- Restrinja o acesso baseado em autenticação
- Use roles específicas (admin, user, etc.)
- Valide permissões no backend também

## 🎯 Resultado

Após aplicar as políticas:
- ✅ Nomes dos entregadores aparecem corretamente
- ✅ Nomes dos restaurantes aparecem corretamente
- ✅ Todas as queries funcionam sem bloqueios
- ✅ Painel administrativo totalmente funcional

## 📝 Notas

- O RLS é uma camada de segurança do PostgreSQL/Supabase
- Ele filtra automaticamente as queries baseado em políticas
- Mesmo com políticas permissivas, ainda é seguro se combinado com autenticação adequada
- O painel admin já tem autenticação via cookie (`admin_token`)
