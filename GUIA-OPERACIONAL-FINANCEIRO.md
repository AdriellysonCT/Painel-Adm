# 🏦 Guia Operacional: Gerente Financeiro - FomeNinja

Este guia define os processos e protocolos para a gestão financeira do sistema, baseando-se na infraestrutura de **Ledger Imutável** e **Segurança Bancária** implementada.

---

## 📅 1. Manual de Fechamento Mensal

_Objetivo: Garantir que o lucro reportado no sistema condiz com as movimentações reais._

1.  **Bloqueio de Período:** Certifique-se de que todas as ordens do mês anterior foram convertidas em lançamentos no Ledger com o status `CONFIRMADO`.
2.  **Conferência de GMV:** Acesse a view `gmv_mensal` e valide se o volume total de pedidos bate com as expectativas de mercado.
3.  **Geração do DRE:** Consulte a `dre_mensal` para visualizar a Receita Líquida vs. Pagamentos de Parceiros.
4.  **Emissão de Relatórios:** Execute a função `exportar_ledger_csv(data_inicio, data_fim)` para gerar o arquivo base do mês.

---

## 🔄 2. Processo de Conciliação Bancária

_Objetivo: Cruzar o dinheiro que entrou no banco (PIX) com o saldo no sistema._

1.  **Executar Conciliação Automática:** Chame a função `conciliar_pix()` no painel admin.
2.  **Verificar Pendências:** Liste as transações em `pix_transacoes` com status `PAGO` que não mudaram para `CONCILIADO`. Isso indica que o dinheiro entrou no banco, mas o Ledger não registrou o lançamento correspondente.
3.  **Ajuste Manual:** Caso haja divergência, use a função `inserir_lancamento_seguro` (apenas Super Admin) com a categoria `AJUSTE` para equilibrar o caixa.

---

## 🔍 3. Processo de Auditoria e Integridade

_Objetivo: Transparência total e prevenção contra alteração de dados._

1.  **Verificação de Imutabilidade:** O Ledger bloqueia qualquer alteração em lançamentos confirmados. Se um valor precisar ser corrigido, nunca edite o registro. **Sempre crie um novo lançamento de estorno/ajuste.**
2.  **Trilha de Admin:** Verifique o campo `criado_por_admin_id` em qualquer movimentação suspeita para identificar qual membro da equipe financeira processou a operação.

---

## 💸 4. Fluxo de Aprovação de Saque

_Objetivo: Mover o dinheiro para entregadores e restaurantes com segurança._

1.  **Triagem:** Analise a tabela `solicitacoes_saque` com status `SOLICITADO`.
2.  **Validação de Saldo:** O sistema já valida o saldo no momento da solicitação, mas o gerente deve conferir se não há alertas de fraude para aquela conta.
3.  **Aprovação:** Mude o status para `APROVADO` e realize a transferência PiX externa.
4.  **Confirmação:** Após transferir no banco, mude para `PAGO` e anexe a `comprovante_url`.

---

## 🚨 5. Como Agir em Fraude (Protocolo Antifraude)

_Objetivo: Reagir rapidamente a ataques de velocidade ou valores suspeitos._

1.  **Detecção Automática:** Se o sistema detectar > 5 lançamentos em 5 minutos para uma conta, o saque será bloqueado e um registro aparecerá em `auditoria_financeira`.
2.  **Investigação:** O Gerente Financeiro deve analisar o extrato daquela conta contábil. Se as entregas forem legítimas, proceda para o desbloqueio.
3.  **Desbloqueio:** Utilize o comando `desbloquear_conta_suspeita(conta_id, senha_admin)`. O sistema exige sua senha pessoal para liberar o saque, gravando um log de quem autorizou a liberação de suspeita.

---

## ✅ 6. Checklist de DRE e Fluxo de Caixa

- [ ] O Take Rate está entre os 15% - 25% esperados? (`take_rate_mensal`)
- [ ] O lucro operacional da `dre_mensal` é positivo?
- [ ] O saldo em `pix_transacoes` (PAGO/CONCILIADO) é igual ao saldo total na View `centro_controle_financeiro`?
- [ ] Existem "buracos" no fluxo de caixa diário (dias sem movimentação quando houve pedidos)?

---

## 📑 7. Roteiro de Reunião com o Contador

1.  **Entrega do Ledger:** Entregue o CSV gerado pela função `exportar_ledger_csv`.
2.  **Separação de Impostos:** Informe que a `TAXA_PLATAFORMA` é a receita tributável da empresa, enquanto `RECEITA_ENTREGA` é trânsito de valores de terceiros.
3.  **Comprovação:** Cada linha do CSV possui um `txid` que pode ser cruzado com o extrato bancário oficial do banco/PSP.

---

## 📈 8. Roteiro de Apresentação para Investidor

1.  **Crescimento (GMV):** "Nosso volume bruto de mercadorias cresceu X% este mês" (`gmv_mensal`).
2.  **Margem Real:** "Operamos com um Take Rate médio de Y%, comprovando a saúde do modelo" (`take_rate_mensal`).
3.  **Previsibilidade:** "Para o próximo mês, nossa projeção de receita líquida é de R$ Z" (`previsao_receita_proximo_mes`).
4.  **Governança:** "Utilizamos um Ledger Imutável com RLS e Antifraude em nível de banco, pronto para auditoria externa das Big Four." (`painel_investidor`).

---

_Manual gerado por Antigravity AI - FomeNinja Finance Suite_
