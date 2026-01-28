"use client";

import { useState, useRef, useEffect } from "react";
import Toast from "./components/Toast";
import HealthModal from "./components/HealthModal";
import Header from "./components/Header";
import ChatMessages, { Message } from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";

const API_BASE_URL = "http://localhost:8000";

// Generate a unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Get or create session ID from localStorage
const getSessionId = (): string => {
  if (typeof window === "undefined") return generateSessionId();

  let sessionId = localStorage.getItem("chat_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem("chat_session_id", sessionId);
  }
  return sessionId;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [sessionId, setSessionId] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    backend: string;
    redis: string;
    ollama: string;
    model: string;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session ID on mount
  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check document status on mount
  useEffect(() => {
    if (sessionId) {
      checkDocumentStatus();
      loadChatHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // Simulate streaming text effect
  const streamText = async (messageId: string, fullText: string) => {
    const words = fullText.split(" ");
    let currentText = "";
    setStreamingMessageId(messageId);

    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? "" : " ") + words[i];
      const textToSet = currentText;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: textToSet } : msg,
        ),
      );
      const delay = Math.max(20, 50 - Math.floor(words.length / 20));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    setStreamingMessageId(null);
  };

  const checkDocumentStatus = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/document/status/${sessionId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setHasDocument(data.has_document);
        setDocumentName(data.document_name);
      }
    } catch {
      // Backend might not be running yet
    }
  };

  const loadChatHistory = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/history/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const loadedMessages: Message[] = data.messages.map(
            (msg: { role: string; content: string }, index: number) => ({
              id: `loaded_${index}`,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(),
            }),
          );
          setMessages(loadedMessages);
        }
      }
    } catch {
      // Backend might not be running yet
    }
  };

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    setShowHealthModal(true);
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      } else {
        setHealthStatus({
          status: "error",
          backend: "error",
          redis: "unknown",
          ollama: "unknown",
          model: "unknown",
        });
      }
    } catch {
      setHealthStatus({
        status: "error",
        backend: "disconnected",
        redis: "unknown",
        ollama: "unknown",
        model: "unknown",
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get response");
      }

      const data = await response.json();
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);

      await streamText(assistantMessageId, data.response);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ ${error instanceof Error ? error.message : "Failed to connect to the server. Make sure the backend is running."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [".pdf", ".csv", ".txt"];
    const fileExtension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf("."));
    if (!validTypes.includes(fileExtension)) {
      showToast("Please upload a PDF, CSV, or TXT file.", "error");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          "X-Session-ID": sessionId,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      setHasDocument(true);
      setDocumentName(file.name);
      showToast(`"${file.name}" uploaded successfully!`, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Upload failed",
        "error",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearDocument = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/document/${sessionId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setHasDocument(false);
        setDocumentName(null);
        showToast("Document removed", "success");
      }
    } catch {
      showToast("Failed to clear document", "error");
    }
  };

  const clearChat = async () => {
    setMessages([]);

    try {
      await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore errors
    }

    const newSessionId = generateSessionId();
    localStorage.setItem("chat_session_id", newSessionId);
    setSessionId(newSessionId);
    setHasDocument(false);
    setDocumentName(null);
    showToast("Chat cleared. Starting new session.", "success");
  };

  return (
    <div className="flex flex-col h-screen bg-base-300" data-theme="dark">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Health Check Modal */}
      <HealthModal
        isOpen={showHealthModal}
        isLoading={isCheckingHealth}
        healthStatus={healthStatus}
        onClose={() => setShowHealthModal(false)}
        onRefresh={handleHealthCheck}
      />

      {/* Header */}
      <Header
        hasDocument={hasDocument}
        documentName={documentName}
        messagesCount={messages.length}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onHealthCheck={handleHealthCheck}
        onClearDocument={handleClearDocument}
        onClearChat={clearChat}
        onFileUpload={handleFileUpload}
      />

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            streamingMessageId={streamingMessageId}
            messagesEndRef={messagesEndRef}
            onSuggestionClick={setInput}
          />
        </div>
      </main>

      {/* Input Area */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        inputRef={inputRef}
        onInputChange={setInput}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
