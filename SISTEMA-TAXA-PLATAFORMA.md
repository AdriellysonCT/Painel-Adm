# 💰 Sistema de Taxa da Plataforma

## 🎯 Modelo de Negócio

### Regra de Taxa por Item:
```
Se item >= R$ 5,00 → Taxa: R$ 1,00
Se item < R$ 5,00 → Taxa: R$ 0,70
```

---

## 📊 Como Funciona:

### Exemplo 1: Pedido com Itens Normais
```
Cliente compra:
├─ Pizza R$ 29,00 → Taxa: R$ 1,00
├─ Coca 2L R$ 9,00 → Taxa: R$ 1,00
├─ Taxa entrega: R$ 5,00
└─ Total pago: R$ 44,00

Repasse:
├─ Restaurante recebe: R$ 38,00 (R$29 + R$9)
├─ Entregador recebe: R$ 5,00 (taxa entrega)
└─ Plataforma fica: R$ 2,00 (R$1 + R$1)

✅ Total: R$ 45,00
```

### Exemplo 2: Pedido com Itens Baratos
```
Cliente compra:
├─ Bala R$ 1,00 → Taxa: R$ 0,70
├─ Refrigerante lata R$ 3,50 → Taxa: R$ 0,70
├─ Água R$ 2,00 → Taxa: R$ 0,70
├─ Taxa entrega: R$ 5,00
└─ Total pago: R$ 14,60

Repasse:
├─ Restaurante recebe: R$ 6,50 (R$1 + R$3,50 + R$2)
├─ Entregador recebe: R$ 5,00 (taxa entrega)
└─ Plataforma fica: R$ 2,10 (R$0,70 × 3)

✅ Total: R$ 13,60
```

### Exemplo 3: Pedido Misto
```
Cliente compra:
├─ Combo R$ 45,00 → Taxa: R$ 1,00
├─ Borda R$ 4,00 → Taxa: R$ 0,70
├─ Refrigerante lata R$ 3,00 → Taxa: R$ 0,70
├─ Taxa entrega: R$ 5,00
└─ Total pago: R$ 57,40

Repasse:
├─ Restaurante recebe: R$ 52,00 (R$45 + R$4 + R$3)
├─ Entregador recebe: R$ 5,00 (taxa entrega)
└─ Plataforma fica: R$ 2,40 (R$1 + R$0,70 + R$0,70)

✅ Total: R$ 59,40
```

---

## 🎯 Vantagens do Modelo:

### ✅ Para o Restaurante:
- Recebe 97% do valor dos itens (em média)
- Muito mais que iFood (73%) e Rappi (75%)
- Não perde dinheiro com entrega
- Taxa transparente e previsível

### ✅ Para o Cliente:
- Preços justos
- Sem taxas abusivas
- Valores arredondados (fácil de entender)
- Mais barato que concorrentes

### ✅ Para o Entregador:
- Recebe 100% da taxa de entrega
- Valor justo por corrida
- Pagamento garantido

### ✅ Para a Plataforma:
- Receita previsível
- Escalável (mais itens = mais receita)
- Competitivo no mercado
- Sustentável a longo prazo

---

## 📈 Comparação com Concorrentes:

| Pedido R$50 | iFood | Rappi | Seu App |
|-------------|-------|-------|---------|
| Taxa restaurante | 27% (R$13,50) | 25% (R$12,50) | ~5% (R$2,50) |
| Restaurante recebe | R$36,50 | R$37,50 | R$47,50 |
| **Diferença** | -R$11,00 | -R$10,00 | **+R$10,00** |

**Restaurante ganha R$10+ a mais no seu app!** 🚀

---

## 💻 Implementação Técnica:

### Função de Cálculo:
```sql
CREATE FUNCTION calcular_taxa_item(preco_item NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    IF preco_item >= 5.00 THEN
        RETURN 1.00;
    ELSE
        RETURN 0.70;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Views Criadas:

1. **`view_repasses_com_taxa`**
   - Mostra todos os pedidos com taxa calculada
   - Separa valor do restaurante e taxa da plataforma

2. **`view_resumo_repasses_restaurante`**
   - Resumo por restaurante
   - Total de vendas, taxa e valor a receber

3. **`view_receita_plataforma`**
   - Receita diária da plataforma
   - Métricas de performance

---

## 📊 Queries Úteis:

### Ver Repasses com Taxa:
```sql
SELECT 
    numero_pedido_sequencial,
    nome_fantasia,
    subtotal_original,
    taxa_plataforma,
    valor_restaurante,
    taxa_entrega,
    qtd_itens
FROM view_repasses_com_taxa
ORDER BY criado_em DESC
LIMIT 10;
```

### Ver Resumo por Restaurante:
```sql
SELECT 
    nome_fantasia,
    total_vendas,
    total_taxa_plataforma,
    valor_a_receber,
    qtd_pedidos,
    qtd_itens_total
FROM view_resumo_repasses_restaurante
WHERE total_vendas > 0;
```

### Ver Receita da Plataforma:
```sql
SELECT 
    data,
    qtd_pedidos,
    receita_dia,
    taxa_media_pedido
FROM view_receita_plataforma
ORDER BY data DESC;
```

### Recalcular Repasses:
```sql
SELECT recalcular_repasses_restaurantes();
```

---

## 🎨 Como Mostrar no App:

### Para o Cliente:
```
Carrinho:
├─ Pizza Margherita: R$ 30,00
├─ Coca 2L: R$ 10,00
├─ Taxa de entrega: R$ 5,00
├─────────────────────────────
└─ Total: R$ 45,00

💡 Preços já incluem taxa de serviço
```

### Para o Restaurante:
```
Pedido #42:
├─ Itens vendidos: R$ 38,00
├─ Taxa plataforma: R$ 2,00
├─────────────────────────────
└─ Você recebe: R$ 38,00

💰 Taxa de entrega (R$5) vai para o entregador
```

### Para o Entregador:
```
Entrega #42:
├─ Taxa de entrega: R$ 5,00
├─ Distância: 2,5 km
├─────────────────────────────
└─ Você recebe: R$ 5,00
```

---

## 📈 Projeção de Receita:

### Cenário Conservador:
```
100 pedidos/dia
├─ Média: 2,5 itens/pedido
├─ Taxa média: R$ 2,30/pedido
└─ Receita: R$ 230/dia = R$ 6.900/mês
```

### Cenário Realista:
```
300 pedidos/dia
├─ Média: 3 itens/pedido
├─ Taxa média: R$ 2,50/pedido
└─ Receita: R$ 750/dia = R$ 22.500/mês
```

### Cenário Otimista:
```
1.000 pedidos/dia
├─ Média: 3,5 itens/pedido
├─ Taxa média: R$ 2,80/pedido
└─ Receita: R$ 2.800/dia = R$ 84.000/mês
```

---

## 🎯 Estratégia de Marketing:

### Pitch para Restaurantes:
```
"Ganhe 10x mais por pedido!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
iFood cobra 27% → Você perde R$13,50
Nós cobramos ~5% → Você perde R$2,50

Diferença: +R$11,00 por pedido!

Em 100 pedidos = +R$1.100,00 no seu bolso"
```

### Pitch para Clientes:
```
"Preços justos, sem taxas abusivas!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pizza R$30 (vs R$35 no iFood)
+ Entrega R$5
= Total R$35 (vs R$40+ nos concorrentes)

Economize R$5+ por pedido!"
```

---

## ✅ Status da Implementação:

- [x] Função `calcular_taxa_item` criada
- [x] Função `calcular_taxa_pedido` criada
- [x] View `view_repasses_com_taxa` criada
- [x] View `view_resumo_repasses_restaurante` criada
- [x] View `view_receita_plataforma` criada
- [x] Função `recalcular_repasses_restaurantes` criada
- [x] Coluna `taxa_plataforma` adicionada
- [x] Sistema testado com dados reais
- [ ] Dashboard de receita da plataforma
- [ ] Relatórios para restaurantes
- [ ] Integração com painel de pagamentos

---

## 🚀 Próximos Passos:

1. **Dashboard de Receita:**
   - Gráfico de receita diária
   - Métricas de performance
   - Comparativo mensal

2. **Relatórios para Restaurantes:**
   - Extrato detalhado
   - Breakdown de taxas
   - Comparativo com concorrentes

3. **Integração com Pagamentos:**
   - Calcular valor correto a pagar
   - Descontar taxa da plataforma
   - Gerar comprovantes

---

**Sistema implementado em:** 20/01/2026  
**Versão:** 1.0  
**Status:** ✅ FUNCIONANDO  
**Modelo:** Taxa por item (R$1,00 ou R$0,70)
