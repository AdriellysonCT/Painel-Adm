export const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "consultar_ledger_cash_digital",
        description: "Retorna o resumo de entregas em dinheiro (cash) vs Pix/cartão por entregador. Mostra quanto cada entregador movimentou em dinheiro físico (coletado diretamente) vs digital, e o saldo líquido de taxas.",
        parameters: {
          type: "OBJECT",
          properties: {
            entregador_id: {
              type: "STRING",
              description: "Opcional: UUID do entregador para ver extrato detalhado. Se não informado, lista todos."
            }
          }
        }
      },
      {
        name: "listar_pagamentos_pendentes",
        description: "Lista entregadores e restaurantes com pagamentos pendentes, incluindo valores e chaves Pix.",
        parameters: {
          type: "OBJECT",
          properties: {
            tipo: {
              type: "STRING",
              description: "Opcional: 'entregador' ou 'restaurante'. Se não informado, lista todos.",
              enum: ["entregador", "restaurante"]
            }
          }
        }
      },
      {
        name: "processar_pagamento",
        description: "Processa e confirma o pagamento de um entregador ou restaurante. Use esta ferramenta após confirmação do usuário.",
        parameters: {
          type: "OBJECT",
          properties: {
            id_entregador: {
              type: "STRING",
              description: "ID do entregador ou restaurante."
            },
            tipo_usuario: {
              type: "STRING",
              description: "Tipo de usuário: 'entregador' ou 'restaurante'."
            },
            valor: {
              type: "NUMBER",
              description: "Valor total a ser pago."
            },
            chave_pix: {
              type: "STRING",
              description: "Chave Pix para o pagamento."
            },
            observacao: {
              type: "STRING",
              description: "Opcional: Nota sobre o pagamento."
            }
          },
          required: ["id_entregador", "tipo_usuario", "valor", "chave_pix"]
        }
      },
      {
        name: "get_resumo_financeiro",
        description: "Obtém um resumo geral do faturamento e repasses da plataforma.",
      },
      {
        name: "buscar_entregador",
        description: "Busca informações cadastrais de um entregador (nome, telefone/contato, CPF, data de cadastro). Use quando o usuário quiser o contato, telefone, número ou dados de um entregador específico.",
        parameters: {
          type: "OBJECT",
          properties: {
            busca: {
              type: "STRING",
              description: "Nome (parcial ou completo), CPF ou número de telefone do entregador para buscar."
            }
          },
          required: ["busca"]
        }
      },
      {
        name: "buscar_restaurante",
        description: "Busca informações cadastrais de um restaurante (nome fantasia, nome do responsável, CNPJ, telefone/contato, data de cadastro). Use quando o usuário quiser dados ou contato de um restaurante específico.",
        parameters: {
          type: "OBJECT",
          properties: {
            busca: {
              type: "STRING",
              description: "Nome fantasia (parcial ou completo), CNPJ ou telefone do restaurante para buscar."
            }
          },
          required: ["busca"]
        }
      },
      {
        name: "listar_todos_entregadores",
        description: "Lista todos os entregadores cadastrados na plataforma com seus dados de contato. Use quando o usuário quiser ver todos os entregadores disponíveis.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "listar_todos_restaurantes",
        description: "Lista todos os restaurantes cadastrados na plataforma. Use quando o usuário quiser ver todos os restaurantes disponíveis.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      }
    ]
  }
];

// Implementação das funções (lado do servidor)
import { createClient } from "@supabase/supabase-js";

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const toolImplementations = {
  consultar_ledger_cash_digital: async ({ entregador_id }: { entregador_id?: string }, _baseUrl?: string) => {
    const baseUrl = _baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = entregador_id
      ? `${baseUrl}/api/entregadores/ledger-resumo?entregador_id=${entregador_id}`
      : `${baseUrl}/api/entregadores/ledger-resumo`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  },
  listar_pagamentos_pendentes: async ({ tipo }: { tipo?: string }, _baseUrl?: string) => {
    const baseUrl = _baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = tipo ? `${baseUrl}/api/entregadores/pendentes?tipo=${tipo}` : `${baseUrl}/api/entregadores/pendentes`;
    const res = await fetch(url);
    return await res.json();
  },
  processar_pagamento: async (params: any, _baseUrl?: string) => {
    const baseUrl = _baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    const resProcessar = await fetch(`${baseUrl}/api/pagamentos/processar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    const dataProcessar = await resProcessar.json();
    if (!resProcessar.ok) return { error: dataProcessar.error || "Erro ao processar" };

    const resConfirmar = await fetch(`${baseUrl}/api/pagamentos/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_movimentacao: dataProcessar.id_movimentacao })
    });

    return await resConfirmar.json();
  },
  get_resumo_financeiro: async (_args: unknown, _baseUrl?: string) => {
    const baseUrl = _baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/breakdown-financeiro`);
    return await res.json();
  },

  buscar_entregador: async ({ busca }: { busca: string }) => {
    const supabase = getSupabaseAdmin();
    const termo = `%${busca}%`;
    const { data, error } = await supabase
      .from('entregadores_app')
      .select('id, nome, telefone, cpf, created_at, chave_pix')
      .or(`nome.ilike.${termo},cpf.ilike.${termo},telefone.ilike.${termo}`)
      .limit(10);

    if (error) return { erro: error.message };
    if (!data || data.length === 0) return { resultado: "Nenhum entregador encontrado com esse termo de busca." };

    return {
      total: data.length,
      entregadores: data.map(e => ({
        nome: e.nome,
        telefone: e.telefone || 'Não informado',
        cpf: e.cpf || 'Não informado',
        chave_pix: e.chave_pix || 'Não cadastrada',
        cadastrado_em: e.created_at ? new Date(e.created_at).toLocaleDateString('pt-BR') : 'N/A',
      }))
    };
  },

  buscar_restaurante: async ({ busca }: { busca: string }) => {
    const supabase = getSupabaseAdmin();
    const termo = `%${busca}%`;
    const { data, error } = await supabase
      .from('restaurantes_app')
      .select('id, nome_fantasia, nome_responsavel, cnpj, telefone, created_at')
      .or(`nome_fantasia.ilike.${termo},cnpj.ilike.${termo},telefone.ilike.${termo},nome_responsavel.ilike.${termo}`)
      .limit(10);

    if (error) return { erro: error.message };
    if (!data || data.length === 0) return { resultado: "Nenhum restaurante encontrado com esse termo de busca." };

    return {
      total: data.length,
      restaurantes: data.map(r => ({
        nome_fantasia: r.nome_fantasia,
        responsavel: r.nome_responsavel || 'Não informado',
        telefone: r.telefone || 'Não informado',
        cnpj: r.cnpj || 'Não informado',
        cadastrado_em: r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : 'N/A',
      }))
    };
  },

  listar_todos_entregadores: async () => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('entregadores_app')
      .select('nome, telefone, cpf, created_at')
      .order('nome', { ascending: true })
      .limit(50);

    if (error) return { erro: error.message };
    if (!data || data.length === 0) return { resultado: "Nenhum entregador cadastrado." };

    return {
      total: data.length,
      entregadores: data.map(e => ({
        nome: e.nome,
        telefone: e.telefone || 'Não informado',
        cpf: e.cpf || 'Não informado',
        cadastrado_em: e.created_at ? new Date(e.created_at).toLocaleDateString('pt-BR') : 'N/A',
      }))
    };
  },

  listar_todos_restaurantes: async () => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('restaurantes_app')
      .select('nome_fantasia, nome_responsavel, cnpj, telefone, created_at')
      .order('nome_fantasia', { ascending: true })
      .limit(50);

    if (error) return { erro: error.message };
    if (!data || data.length === 0) return { resultado: "Nenhum restaurante cadastrado." };

    return {
      total: data.length,
      restaurantes: data.map(r => ({
        nome_fantasia: r.nome_fantasia,
        responsavel: r.nome_responsavel || 'Não informado',
        telefone: r.telefone || 'Não informado',
        cnpj: r.cnpj || 'Não informado',
        cadastrado_em: r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : 'N/A',
      }))
    };
  },
};
