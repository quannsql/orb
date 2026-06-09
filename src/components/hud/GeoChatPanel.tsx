"use client";

import { useState, useRef, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import type { SpectralMode } from "@/types/sentinel";
import { Bot, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import RestrictedAccessOverlay from "@/components/ui/RestrictedAccessOverlay";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GeoChatPanelProps {
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  onSetMode: (mode: SpectralMode | null) => void;
  onSetDate: (date: string) => void;
  className?: string;
}

export default function GeoChatPanel({ onFlyTo, onSetMode, onSetDate, className = "" }: GeoChatPanelProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "ORB Oracle online. Enter coordinates or instructions." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error("Failed to chat");

      const data = await response.json();
      let assistantText = data.content;

      // Parse JSON commands
      const jsonMatch = assistantText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const commandBlock = JSON.parse(jsonMatch[1]);
          if (commandBlock.commands && Array.isArray(commandBlock.commands)) {
            commandBlock.commands.forEach((cmd: any) => {
              if (cmd.action === "flyTo" && cmd.lng && cmd.lat) {
                onFlyTo(cmd.lng, cmd.lat, cmd.zoom || 10);
              } else if (cmd.action === "setMode" && cmd.mode) {
                onSetMode(cmd.mode as SpectralMode);
              } else if (cmd.action === "setDate" && cmd.date) {
                onSetDate(cmd.date);
              }
            });
          }
          // Remove the JSON block from the text shown to the user
          assistantText = assistantText.replace(/```json\n[\s\S]*?\n```/, "").trim();
        } catch (e) {
          console.error("Failed to parse commands from AI:", e);
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to ORB Core." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed z-50 pointer-events-auto transition-all duration-300 ${className || "bottom-14 right-4"}`}>
        <GlowButton onClick={() => setIsOpen(true)} className="rounded-none w-10 h-10 flex items-center justify-center p-0" variant="white">
          <Bot size={16} className="text-white animate-pulse" />
        </GlowButton>
      </div>
    );
  }

  return (
    <GlassPanel glowColor="white" className={`fixed w-80 h-96 flex flex-col z-50 pointer-events-auto transition-all duration-300 ${className || "bottom-14 right-4"}`}>
      <div className="flex items-center justify-between border-b border-white/10 p-2.5 bg-black/80 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={13} className="text-white animate-pulse" />
          <h2 className="text-[10px] font-mono text-white uppercase tracking-wider font-extrabold">
            ORB Oracle
          </h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="bg-black border border-white/25 hover:bg-white hover:text-black text-white transition-all px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded-none cursor-pointer"
        >
          [ CLOSE ]
        </button>
      </div>
      
      {!user && (
        <RestrictedAccessOverlay moduleName="ORB ORACLE CHAT" className="rounded-t-none" />
      )}

      <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar flex flex-col gap-3 font-mono text-xs">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-2 rounded-none text-[9px] leading-relaxed ${msg.role === "user" ? "bg-white/10 text-white border border-white/15" : "bg-white/5 text-neutral-200 border border-white/5"}`}>
              <span className="opacity-40 text-[7.5px] block mb-1 font-bold">
                {msg.role === "user" ? "> USER_INPUT" : "> ORACLE_SYSTEM"}
              </span>
              {msg.role === "assistant" ? (
                <MarkdownRenderer content={msg.content} compact />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-2 rounded-none bg-white/5 text-neutral-500 border border-white/5 text-[9px] animate-pulse">
              [ TRANSMITTING DECRYPTED DATA... ]
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2.5 border-t border-white/10 bg-black/80 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="ENTER SYSTEM DIRECTIVES..."
          className="flex-1 bg-black border border-white/10 rounded-none px-2 py-1 text-neutral-100 text-[9px] font-mono focus:outline-none focus:border-white/50 placeholder:text-neutral-600"
        />
        <GlowButton onClick={handleSend} disabled={isLoading} variant="white" className="px-3 py-1 text-[9px] font-bold">
          TX
        </GlowButton>
      </div>
    </GlassPanel>
  );
}
