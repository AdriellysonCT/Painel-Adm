"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  X, 
  Send, 
  Maximize2, 
  Minimize2, 
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function GeminiAgentChat() {
  const { isOpen, setIsOpen } = useChat();
  const [isMaximized, setIsMaximized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou seu Gerente Digital. Como posso te ajudar com o P ADM hoje?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data = await response.json();

      if (data.error) {
          throw new Error(data.error);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, tive um problema ao processar isso. Verifique se a API Key está configurada." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "overflow-hidden rounded-2xl border bg-background/80 backdrop-blur-xl shadow-2xl transition-all duration-300",
              isMaximized ? "h-[80vh] w-[90vw] md:w-[600px]" : "h-[500px] w-[350px] md:w-[400px]"
            )}
          >
            <Card className="h-full border-none bg-transparent flex flex-col">
              <CardHeader className="p-4 border-b bg-primary/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Agente Gemini</CardTitle>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Online</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMaximized(!isMaximized)}>
                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden relative flex flex-col min-h-0">
                <div 
                  className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent" 
                  ref={scrollRef}
                >
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex max-w-[85%] flex-col gap-1",
                          msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2 text-sm shadow-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-muted rounded-tl-none border"
                          )}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="flex mr-auto max-w-[85%] flex-col gap-1 items-start">
                        <div className="bg-muted rounded-2xl rounded-tl-none border px-4 py-2 text-sm flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-muted-foreground italic tracking-tight">O Agente está pensando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-background/80 border-t backdrop-blur-xl shrink-0">
                  <div className="relative flex items-center gap-2">
                    <input
                      placeholder="Pergunte algo ao gerente..."
                      className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none pr-12"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button 
                      size="icon" 
                      className="absolute right-1 rounded-lg h-8 w-8" 
                      onClick={handleSendMessage}
                      disabled={isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    Powered by <Sparkles className="h-3 w-3 text-purple-500" /> Gemini AI
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
