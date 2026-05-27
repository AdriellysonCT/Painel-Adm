import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GeminiAgentChat } from "@/components/gemini/agent-chat";
import { ChatProvider } from "@/lib/chat-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FomeNinja Painel Administrativo",
  description: "Painel administrativo financeiro - FomeNinja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-[#f8fafc] text-[#0b1c30]`}>
        <ChatProvider>
          {children}
          <GeminiAgentChat />
        </ChatProvider>
      </body>
    </html>
  );
}
