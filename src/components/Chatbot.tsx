"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_START_NODE, type ChatButton, getChatNode } from "@/lib/chatbot";
import { site } from "@/lib/content";

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  buttons?: ChatButton[];
};

let messageCounter = 0;
function nextId() {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

function nodeToBotMessages(nodeId: string): ChatMessage[] {
  const node = getChatNode(nodeId);
  const lastIndex = node.messages.length - 1;
  return node.messages.map((text, index) => ({
    id: nextId(),
    role: "bot" as const,
    text,
    buttons: index === lastIndex ? node.buttons : undefined,
  }));
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (!initialized) {
      setMessages(nodeToBotMessages(CHAT_START_NODE));
      setInitialized(true);
    }
  }, [initialized]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages, scrollToBottom]);

  const handleButton = (button: ChatButton) => {
    setMessages((prev) => [
      ...prev.map((m) => (m.buttons ? { ...m, buttons: undefined } : m)),
      { id: nextId(), role: "user", text: button.label },
    ]);

    if (button.href) {
      return;
    }

    if (button.nextNodeId) {
      setTimeout(() => {
        setMessages((prev) => [...prev, ...nodeToBotMessages(button.nextNodeId!)]);
        scrollToBottom();
      }, 450);
    }
  };

  const resetChat = () => {
    messageCounter = 0;
    setMessages(nodeToBotMessages(CHAT_START_NODE));
  };

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <span aria-hidden="true">✕</span>
        ) : (
          <span className="chat-fab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
            </svg>
          </span>
        )}
      </button>

      {open ? (
        <div className="chat-panel" role="dialog" aria-label="Programme assistant">
          <header className="chat-header">
            <div className="chat-header-info">
              <span className="chat-avatar" aria-hidden="true">
                🤖
              </span>
              <div>
                <p className="chat-header-title">Programme Assistant</p>
                <p className="chat-header-sub">{site.shortName}</p>
              </div>
            </div>
            <button type="button" className="chat-reset" onClick={resetChat} title="Restart chat">
              ↺
            </button>
          </header>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={`chat-bubble-wrap ${message.role}`}>
                <div className={`chat-bubble ${message.role}`}>
                  <p className="chat-text">{message.text}</p>
                </div>
                {message.buttons && message.buttons.length > 0 ? (
                  <div className="chat-actions">
                    {message.buttons.map((button) =>
                      button.href ? (
                        <Link
                          key={button.id}
                          href={button.href}
                          className="chat-action-btn"
                          onClick={() => handleButton(button)}
                        >
                          {button.label}
                        </Link>
                      ) : (
                        <button
                          key={button.id}
                          type="button"
                          className="chat-action-btn"
                          onClick={() => handleButton(button)}
                        >
                          {button.label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

        </div>
      ) : null}
    </>
  );
}
