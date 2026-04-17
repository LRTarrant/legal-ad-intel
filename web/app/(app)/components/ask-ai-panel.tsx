"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Sparkles, Send, Loader2 } from "lucide-react";

interface TortContext {
  tortName: string;
  injury: string;
  mdlNumber: string;
  pendingCases: string;
  settlementRange: string;
  estimatedCPA: string;
  bellwetherDate: string;
  caseSummary: string;
  qualification: string;
  advertisingLandscape: string;
  targetingInsights: string;
}

export interface PageContext {
  pageName: string;
  pageDescription: string;
  dataSummary: string;
}

type AskAIPanelProps =
  | { tortContext: TortContext; pageContext?: never }
  | { tortContext?: never; pageContext: PageContext };

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TORT_SUGGESTED_QUESTIONS = [
  "What are the qualification criteria?",
  "Which states should I target?",
  "What's the current CPA benchmark?",
  "How does the settlement range compare?",
  "Who are the top advertisers?",
  "What's the litigation timeline?",
];

const PAGE_SUGGESTED_QUESTIONS = [
  "What are the key takeaways?",
  "Which states should I target?",
  "How can I use this data for advertising?",
  "What trends are most significant?",
  "Where are the biggest opportunities?",
  "How does this connect to active torts?",
];

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-1 ml-4 list-disc space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  function formatInline(str: string): React.ReactNode {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
    } else {
      flushList();
      if (line.trim() === "") {
        elements.push(<br key={`br-${i}`} />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="my-0.5">
            {formatInline(line)}
          </p>
        );
      }
    }
  }
  flushList();

  return elements;
}

export function AskAIPanel({ tortContext, pageContext }: AskAIPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = tortContext?.tortName ?? pageContext?.pageName ?? "this page";
  const suggestedQuestions = tortContext ? TORT_SUGGESTED_QUESTIONS : PAGE_SUGGESTED_QUESTIONS;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  async function sendMessage(content: string) {
    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          ...(tortContext ? { tortContext } : { pageContext }),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-intelligence-teal px-4 py-3 text-white shadow-lg transition-transform hover:scale-105"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm font-medium">Ask AI</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Ask AI assistant"
          className="fixed bottom-6 right-6 z-50 flex w-[400px] h-[560px] max-sm:inset-x-4 max-sm:bottom-4 max-sm:w-auto max-sm:h-[70vh] flex-col overflow-hidden rounded-2xl border border-cloud bg-white shadow-2xl transition-all duration-300 ease-out"
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-midnight-navy px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-intelligence-teal" />
              <div>
                <h3 className="font-heading text-sm font-semibold text-white">Ask AI</h3>
                <p className="text-[11px] text-white/60">
                  Powered by {displayName} intelligence data
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-intelligence-teal/10 p-3">
                  <Sparkles className="h-6 w-6 text-intelligence-teal" />
                </div>
                <p className="text-center text-sm text-slate-gray">
                  Ask anything about {displayName} — data insights, targeting, trends, and more.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="rounded-full border border-intelligence-teal/30 px-3 py-1.5 text-xs text-intelligence-teal transition-colors hover:bg-intelligence-teal/10"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-intelligence-teal text-white"
                          : "bg-cloud/60 text-midnight-navy"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        msg.content ? (
                          renderMarkdown(msg.content)
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-intelligence-teal" />
                        )
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-cloud px-3 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${displayName}...`}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-midnight-navy placeholder:text-slate-gray/60 focus:border-intelligence-teal focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-intelligence-teal text-white transition-colors hover:bg-intelligence-teal/90 disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
