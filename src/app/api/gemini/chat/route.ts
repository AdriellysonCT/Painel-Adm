import { NextRequest, NextResponse } from "next/server";
import { genAI, SYSTEM_INSTRUCTION } from "@/lib/gemini";
import { geminiTools, toolImplementations } from "@/lib/gemini-tools";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",

      systemInstruction: SYSTEM_INSTRUCTION,
      tools: geminiTools as any,
    });


    // Filtrar mensagens vazias e garantir que o histórico comece com 'user'
    const validHistory = messages.slice(0, -1)
      .map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }))
      .filter((msg: any, index: number, array: any[]) => {
        // Remove a primeira mensagem se for do modelo, pois o Gemini exige começar com 'user'
        if (index === 0 && msg.role === "model") return false;
        return true;
      });

    const chat = model.startChat({
      history: validHistory,
    });


    const lastMessage = messages[messages.length - 1].content;
    let result = await chat.sendMessage(lastMessage);
    let response = result.response;

    // Lógica de loop para Function Calling
    let callCount = 0;
    while (response.candidates?.[0]?.content?.parts?.some((p: any) => p.functionCall) && callCount < 5) {
      callCount++;
      const functionCalls = response.candidates[0].content.parts.filter((p: any) => p.functionCall);
      
      const responses = await Promise.all(
        functionCalls.map(async (call: any) => {
          const { name, args } = call.functionCall;
          const implementation = (toolImplementations as any)[name];
          if (implementation) {
            const data = await implementation(args);
            return {
              functionResponse: {
                name,
                response: { content: data },
              },
            };
          }
          return {
            functionResponse: {
                name,
                response: { error: "Ferramenta não encontrada" },
            },
          };
        })
      );

      result = await chat.sendMessage(responses);
      response = result.response;
    }

    return NextResponse.json({
      content: response.text(),
    });
  } catch (error: any) {
    console.error("Erro no chat do Gemini:", error);
    return NextResponse.json(
      { error: "Erro ao processar sua solicitação: " + error.message },
      { status: 500 }
    );
  }
}
