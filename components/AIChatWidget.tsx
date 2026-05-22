"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import profileData from "../data/profile-data.json";
import styles from "./AIChatWidget.module.css";

type MessageRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

const promptSuggestions = [
  "Leadership experience",
  "AI transformation work",
  "Program delivery highlights",
  "Banking domain experience",
  "Career journey",
  "Agile transformation"
];

const initialWelcome = {
  id: "welcome",
  role: "assistant" as MessageRole,
  content:
    "Hi, I’m Summitizer, Sumeet’s AI assistant 👋\n\nI can help you explore:\n• Leadership experience\n• AI transformation initiatives\n• Program delivery expertise\n• Engineering management\n• Banking & fintech projects\n\nAsk me anything."
};

function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcome]);
  const [currentInput, setCurrentInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState("dark");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("sumeet-ai-chat-history");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (parsed.length) {
          setMessages(parsed);
        }
      } catch {
        setMessages([initialWelcome]);
      }
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("sumeet-ai-chat-history", JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(preferredDark ? "dark" : "light");
  }, []);

  const assistEndpoint = useMemo(() => "/api/assistant", []);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const appendAssistantText = (assistantId: string, text: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId ? { ...message, content: message.content + text } : message
      )
    );
  };

  const handlePrompt = async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return;
    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt.trim()
    };
    addMessage(userMessage);
    setCurrentInput("");
    setIsStreaming(true);

    const assistantId = `assistant-${Date.now()}`;
    addMessage({ id: assistantId, role: "assistant", content: "" });

    try {
      const response = await fetch(assistEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, chatHistory: [...messages, userMessage] })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Assistant service returned an error.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Streaming is not supported by the current browser.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) {
          done = true;
          break;
        }

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.replace(/^data:\s*/, "");
            if (payload === "[DONE]") {
              done = true;
              break;
            }

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                appendAssistantText(assistantId, delta);
              }
            } catch {
              // Ignore malformed segments and continue streaming.
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown assistant error.");
      setMessages((prev) => prev.filter((message) => message.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = async () => {
    const prompt = currentInput.trim();
    if (!prompt) return;
    await handlePrompt(prompt);
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  const clearHistory = () => {
    setMessages([initialWelcome]);
    setError(null);
    window.sessionStorage.removeItem("sumeet-ai-chat-history");
  };

  return (
    <div className={styles.widgetShell} data-theme={theme} aria-live="polite">
      <button
        className={styles.floatingButton}
        aria-label={isOpen ? "Close Summitizer" : "Open Summitizer"}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.chatIcon}>💬</span>
        <span className={styles.buttonLabel}>{isOpen ? "Close" : "Summitizer"}</span>
      </button>

      {isOpen ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.subtitle}>Portfolio AI Assistant</p>
              <h2 className={styles.panelTitle}>Summitizer</h2>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.quickButton} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light" : "Dark"}</button>
              <button className={styles.clearButton} onClick={clearHistory}>Clear</button>
            </div>
          </div>

          <div className={styles.quickActions}>
            <a className={styles.linkButton} href={profileData.quickActions.downloadResume} target="_blank" rel="noreferrer">
              Download Resume
            </a>
            <a className={styles.linkButton} href={profileData.quickActions.contact}>
              Contact Sumeet
            </a>
          </div>

          <div className={styles.chatContainer}>
            {messages.map((message) => (
              <div key={message.id} className={message.role === "assistant" ? styles.assistantRow : styles.userRow}>
                <div className={message.role === "assistant" ? styles.assistantBubble : styles.userBubble}>
                  <div className={styles.messageMeta}>
                    <span>{message.role === "assistant" ? "Summitizer" : "You"}</span>
                    <span>{getTimestamp()}</span>
                  </div>
                  <p>{message.content || (message.role === "assistant" ? "Thinking..." : "" )}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {error ? <div className={styles.errorNotice}>Error: {error}</div> : null}

          <div className={styles.promptPanel}>
            <textarea
              className={styles.promptInput}
              value={currentInput}
              onChange={(event) => setCurrentInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Summitizer about leadership, AI transformation, banking experience..."
              rows={2}
              aria-label="Type your question"
            />
            <button className={styles.sendButton} onClick={handleSend} disabled={isStreaming || !currentInput.trim()}>
              {isStreaming ? "Typing…" : "Send"}
            </button>
          </div>

          <div className={styles.promptSuggestions}>
            <span>Suggested prompts:</span>
            {promptSuggestions.map((prompt) => (
              <button key={prompt} className={styles.promptChip} onClick={() => handlePrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
