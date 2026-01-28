"use client";

import { RefObject } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  streamingMessageId: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onSuggestionClick: (suggestion: string) => void;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ChatMessages({
  messages,
  isLoading,
  streamingMessageId,
  messagesEndRef,
  onSuggestionClick,
}: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="avatar placeholder mb-6">
          <div className="bg-gradient-to-br from-primary to-secondary text-neutral-content w-20 rounded-xl">
            <span className="text-3xl">💬</span>
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-3">
          How can I help you today?
        </h2>
        <p className="text-base-content/60 max-w-md mb-8">
          Ask me anything or upload a PDF/CSV file to chat about its contents.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
          {[
            "Explain quantum computing",
            "Help me write a poem",
            "What's the weather like?",
            "Summarize this document",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="btn btn-outline btn-sm h-auto py-3 justify-start text-left"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat ${message.role === "user" ? "chat-end" : "chat-start"}`}
        >
          <div className="chat-image avatar placeholder">
            <div
              className={`w-8 rounded-lg ${
                message.role === "user"
                  ? "bg-primary text-primary-content"
                  : "bg-gradient-to-br from-secondary to-accent text-secondary-content"
              }`}
            >
              <span className="text-xs">
                {message.role === "user" ? "👤" : "🤖"}
              </span>
            </div>
          </div>
          <div
            className={`chat-bubble ${
              message.role === "user"
                ? "chat-bubble-primary"
                : "chat-bubble-neutral"
            }`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
              {streamingMessageId === message.id && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
              )}
            </p>
          </div>
          <div className="chat-footer opacity-50 text-xs">
            {formatTime(message.timestamp)}
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="chat chat-start">
          <div className="chat-image avatar placeholder">
            <div className="w-8 rounded-lg bg-gradient-to-br from-secondary to-accent text-secondary-content">
              <span className="text-xs">🤖</span>
            </div>
          </div>
          <div className="chat-bubble chat-bubble-neutral">
            <span className="loading loading-dots loading-sm"></span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
