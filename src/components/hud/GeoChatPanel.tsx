"use client";

import { useState, useRef, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import type { SpectralMode } from "@/types/sentinel";
import { Bot, X } from "lucide-react";

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
        <GlowButton onClick={() => setIsOpen(true)} className="rounded-none w-12 h-12 flex items-center justify-center p-0" variant="white">
          <Bot size={20} className="text-white animate-pulse" />
        </GlowButton>
      </div>
    );
  }

  return (
    <GlassPanel className={`fixed w-80 h-96 flex flex-col z-50 pointer-events-auto transition-all duration-300 ${className || "bottom-14 right-4"}`}>
      <div className="flex items-center justify-between border-b border-white/10 p-3 bg-black/50">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-white animate-pulse" />
          <h2 className="text-xs font-mono text-white uppercase tracking-wider font-bold">
            ORB Oracle
          </h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="bg-red-600/80 hover:bg-red-600 text-white transition-colors p-1 flex items-center justify-center rounded-none"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3 font-mono text-xs">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-2 rounded-none ${msg.role === "user" ? "bg-white/10 text-white border border-white/10" : "bg-black/50 text-neutral-200 border border-white/5"}`}>
              <span className="opacity-50 text-[9px] block mb-1">
                {msg.role === "user" ? "> USER_INPUT" : "> SYSTEM_RESPONSE"}
              </span>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-2 rounded-none bg-black/50 text-neutral-400 border border-white/5 animate-pulse">
              Processing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/10 bg-black/50 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Command..."
          className="flex-1 bg-transparent border border-white/10 rounded-none px-2 py-1 text-neutral-100 text-xs font-mono focus:outline-none focus:border-neutral-400"
        />
        <GlowButton onClick={handleSend} disabled={isLoading} variant="white" className="px-3 py-1 text-xs">
          TX
        </GlowButton>
      </div>
    </GlassPanel>
  );
}
