"use client";

import { RefObject, useEffect } from "react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function ChatInput({
  input,
  isLoading,
  inputRef,
  onInputChange,
  onSend,
  onKeyDown,
}: ChatInputProps) {
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input, inputRef]);

  return (
    <footer className="bg-base-200/30 backdrop-blur-sm border-t border-base-300">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="join w-full">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              rows={1}
              className="textarea textarea-bordered join-item w-full resize-none min-h-12 pr-16 focus:outline-none focus:border-primary"
            />
            <kbd className="kbd kbd-sm absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
              ⏎
            </kbd>
          </div>
          <button
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="btn btn-primary join-item px-6"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
