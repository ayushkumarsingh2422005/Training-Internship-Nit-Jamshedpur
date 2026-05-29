"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_START_NODE, type ChatButton, getChatNode } from "@/lib/chatbot";
import {
  formatAccommodationPrompt,
  formatAccommodationSaved,
  formatGenderPrompt,
  formatShortlistFailure,
  formatShortlistSuccess,
} from "@/lib/format-shortlist-chat";
import type { Gender } from "@/lib/gender";
import { site, studentPortalPath } from "@/lib/content";
import {
  authHeaders,
  clearStudentSession,
  getStudentSession,
  saveStudentSession,
} from "@/lib/student-session-client";
import type { Application } from "@/types/application";

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  buttons?: ChatButton[];
};

type ShortlistStep = null | "email" | "phone" | "loading" | "saving_hostel";

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

function botMessage(text: string, buttons?: ChatButton[]): ChatMessage {
  return { id: nextId(), role: "bot", text, buttons };
}

function userMessage(text: string): ChatMessage {
  return { id: nextId(), role: "user", text };
}

function afterShortlistButtons(app: Application): ChatButton[] {
  const enrolled = app.wantsAccommodation === true || app.wantsAccommodation === false;
  const buttons: ChatButton[] = [];

  if (enrolled) {
    buttons.push({ id: "acc-change", label: "Change hostel preference", action: "accommodation_change" });
  } else {
    buttons.push(
      { id: "acc-yes", label: "Yes — I need hostel", action: "accommodation_yes" },
      { id: "acc-no", label: "No — own stay", action: "accommodation_no" },
    );
  }

  buttons.push(
    { id: "sl-full", label: "Open Login & Profile", href: `${studentPortalPath}#check-shortlist` },
    { id: "sl-logout", label: "Log out", action: "shortlist_logout" },
    { id: "sl-again", label: "Check another student", action: "shortlist_check" },
    { id: "sl-menu", label: "Main menu", nextNodeId: "menu" },
  );

  return buttons;
}

function accommodationChoiceButtons(): ChatButton[] {
  return [
    { id: "acc-yes", label: "Yes — I need hostel", action: "accommodation_yes" },
    { id: "acc-no", label: "No — own stay", action: "accommodation_no" },
    { id: "acc-cancel", label: "← Back", action: "accommodation_cancel" },
  ];
}

function genderChoiceButtons(): ChatButton[] {
  return [
    { id: "g-male", label: "Male", action: "accommodation_gender_male" },
    { id: "g-female", label: "Female", action: "accommodation_gender_female" },
    { id: "g-other", label: "Other", action: "accommodation_gender_other" },
  ];
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [shortlistStep, setShortlistStep] = useState<ShortlistStep>(null);
  const [shortlistEmail, setShortlistEmail] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [open, messages, scrollToBottom, shortlistStep]);

  useEffect(() => {
    if ((shortlistStep === "email" || shortlistStep === "phone") && open) {
      inputRef.current?.focus();
    }
  }, [shortlistStep, open]);

  const appendMessages = useCallback(
    (newMessages: ChatMessage[]) => {
      setMessages((prev) => [...prev, ...newMessages]);
      setTimeout(scrollToBottom, 50);
    },
    [scrollToBottom],
  );

  const showShortlistedStudent = useCallback(
    (app: Application, welcomeBack = false) => {
      setCurrentApplication(app);
      setShortlistStep(null);
      setInputValue("");

      const intro = welcomeBack
        ? `Welcome back!\n\n${formatShortlistSuccess(app)}`
        : formatShortlistSuccess(app);

      const msgs: ChatMessage[] = [botMessage(intro)];

      const needsHostel = app.wantsAccommodation !== true && app.wantsAccommodation !== false;
      if (needsHostel) {
        msgs.push(botMessage(formatAccommodationPrompt(), accommodationChoiceButtons()));
      } else {
        msgs.push(
          botMessage("Your hostel preference is already saved. You can change it anytime using the buttons below.", afterShortlistButtons(app)),
        );
      }

      appendMessages(msgs);
    },
    [appendMessages],
  );

  const saveAccommodation = useCallback(
    async (wants: boolean, gender?: Gender) => {
      if (!getStudentSession()) {
        appendMessages([
          botMessage("Session expired. Please check your shortlist again with email and mobile.", [
            { id: "sl-again", label: "Check shortlist", action: "shortlist_check" },
          ]),
        ]);
        return;
      }

      setShortlistStep("saving_hostel");
      if (!gender) {
        appendMessages([userMessage(wants ? "Yes — I need hostel" : "No — own stay")]);
      }
      appendMessages([botMessage("Saving your preference…")]);

      try {
        const response = await fetch("/api/applications/accommodation", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            wantsAccommodation: wants,
            ...(wants && gender ? { gender } : {}),
          }),
        });

        const data = (await response.json()) as {
          application?: Application;
          error?: string;
        };

        if (!response.ok || !data.application) {
          appendMessages([
            botMessage(data.error ?? "Could not save. Try again or use the Results page.", [
              { id: "acc-retry-yes", label: "Yes — hostel", action: "accommodation_yes" },
              { id: "acc-retry-no", label: "No — own stay", action: "accommodation_no" },
            ]),
          ]);
          setShortlistStep(null);
          return;
        }

        setCurrentApplication(data.application);
        appendMessages([
          botMessage(
            `${formatAccommodationSaved(wants, data.application.gender)}\n\n${formatShortlistSuccess(data.application)}`,
            afterShortlistButtons(data.application),
          ),
        ]);
      } catch {
        appendMessages([botMessage("Network error. Please try again in a moment.")]);
      } finally {
        setShortlistStep(null);
      }
    },
    [appendMessages],
  );

  const runShortlistLookup = useCallback(
    async (email: string, phone: string) => {
      setShortlistStep("loading");
      appendMessages([botMessage("Checking shortlist status…")]);

      try {
        const response = await fetch("/api/applications/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, phoneNumber: phone }),
        });

        const data = (await response.json()) as {
          shortlisted?: boolean;
          application?: Application;
          token?: string;
          error?: string;
        };

        if (!response.ok) {
          appendMessages([
            botMessage(data.error ?? "Something went wrong. Please try again.", [
              { id: "sl-again", label: "Try again", action: "shortlist_check" },
              { id: "sl-menu", label: "Main menu", nextNodeId: "menu" },
            ]),
          ]);
          setShortlistStep(null);
          return;
        }

        if (data.shortlisted && data.application && data.token) {
          saveStudentSession(data.token);
          showShortlistedStudent(data.application);
          return;
        }

        clearStudentSession();
        setCurrentApplication(null);
        appendMessages([
          botMessage(formatShortlistFailure(), [
            { id: "sl-again", label: "Try again", action: "shortlist_check" },
            { id: "sl-menu", label: "Main menu", nextNodeId: "menu" },
          ]),
        ]);
        setShortlistStep(null);
        setInputValue("");
      } catch {
        appendMessages([
          botMessage("Could not reach the server. Please try again later.", [
            { id: "sl-again", label: "Try again", action: "shortlist_check" },
          ]),
        ]);
        setShortlistStep(null);
      }
    },
    [appendMessages, showShortlistedStudent],
  );

  const tryRestoreSession = useCallback(async (): Promise<boolean> => {
    if (!getStudentSession()) return false;

    try {
      const response = await fetch("/api/applications/me", { headers: authHeaders() });
      const data = (await response.json()) as { application?: Application };
      if (response.ok && data.application) {
        showShortlistedStudent(data.application, true);
        return true;
      }
      clearStudentSession();
    } catch {
      /* manual entry */
    }
    return false;
  }, [showShortlistedStudent]);

  const startShortlistFlow = useCallback(async () => {
    setShortlistEmail("");
    setInputValue("");
    setCurrentApplication(null);
    setShortlistStep("email");

    const restored = await tryRestoreSession();
    if (restored) return;

    appendMessages([
      botMessage(
        [
          "I can check your shortlist status and record hostel accommodation preference.",
          "",
          "Enter the same email and mobile number you used when applying.",
          "",
          "What is your email address?",
        ].join("\n"),
      ),
    ]);
  }, [appendMessages, tryRestoreSession]);

  const handleButton = (button: ChatButton) => {
    setMessages((prev) => [
      ...prev.map((m) => (m.buttons ? { ...m, buttons: undefined } : m)),
      userMessage(button.label),
    ]);

    if (button.action === "shortlist_check") {
      setTimeout(() => void startShortlistFlow(), 400);
      return;
    }

    if (button.action === "shortlist_logout") {
      clearStudentSession();
      setCurrentApplication(null);
      setShortlistStep(null);
      setTimeout(() => {
        appendMessages([
          botMessage("You have been logged out on this device.", [
            { id: "sl-again", label: "Check shortlist", action: "shortlist_check" },
            { id: "sl-menu", label: "Main menu", nextNodeId: "menu" },
          ]),
        ]);
      }, 400);
      return;
    }

    if (button.action === "accommodation_yes") {
      setTimeout(() => {
        appendMessages([botMessage(formatGenderPrompt(), genderChoiceButtons())]);
      }, 400);
      return;
    }

    if (button.action === "accommodation_no") {
      setTimeout(() => void saveAccommodation(false), 400);
      return;
    }

    if (button.action === "accommodation_gender_male") {
      setTimeout(() => void saveAccommodation(true, "Male"), 400);
      return;
    }

    if (button.action === "accommodation_gender_female") {
      setTimeout(() => void saveAccommodation(true, "Female"), 400);
      return;
    }

    if (button.action === "accommodation_gender_other") {
      setTimeout(() => void saveAccommodation(true, "Other"), 400);
      return;
    }

    if (button.action === "accommodation_change") {
      setTimeout(() => {
        appendMessages([botMessage(formatAccommodationPrompt(), accommodationChoiceButtons())]);
      }, 400);
      return;
    }

    if (button.action === "accommodation_cancel" && currentApplication) {
      setTimeout(() => {
        appendMessages([
          botMessage("No changes made.", afterShortlistButtons(currentApplication)),
        ]);
      }, 400);
      return;
    }

    if (button.href) {
      return;
    }

    if (button.nextNodeId) {
      setShortlistStep(null);
      setCurrentApplication(null);
      setTimeout(() => {
        appendMessages(nodeToBotMessages(button.nextNodeId!));
      }, 450);
    }
  };

  const handleShortlistSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = inputValue.trim();
    if (!value || shortlistStep === "loading" || shortlistStep === "saving_hostel") return;

    if (shortlistStep === "email") {
      if (!value.includes("@")) {
        appendMessages([botMessage("Please enter a valid email address (e.g. name@gmail.com).")]);
        return;
      }
      setShortlistEmail(value.toLowerCase());
      appendMessages([userMessage(value), botMessage("Thank you. Now enter your 10-digit mobile number:")]);
      setShortlistStep("phone");
      setInputValue("");
      return;
    }

    if (shortlistStep === "phone") {
      const digits = value.replace(/\D/g, "");
      const phone = digits.length >= 10 ? digits.slice(-10) : digits;
      if (phone.length !== 10) {
        appendMessages([botMessage("Please enter a valid 10-digit Indian mobile number.")]);
        return;
      }
      appendMessages([userMessage(value)]);
      setInputValue("");
      void runShortlistLookup(shortlistEmail, phone);
    }
  };

  const resetChat = () => {
    messageCounter = 0;
    setShortlistStep(null);
    setShortlistEmail("");
    setInputValue("");
    setCurrentApplication(null);
    setMessages(nodeToBotMessages(CHAT_START_NODE));
  };

  const showCompose = shortlistStep === "email" || shortlistStep === "phone";
  const inputPlaceholder =
    shortlistStep === "email"
      ? "Enter your email…"
      : shortlistStep === "phone"
        ? "Enter 10-digit mobile…"
        : "";

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
                          disabled={shortlistStep === "saving_hostel"}
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

          {showCompose ? (
            <form className="chat-compose" onSubmit={handleShortlistSubmit}>
              <input
                ref={inputRef}
                type={shortlistStep === "email" ? "email" : "tel"}
                inputMode={shortlistStep === "phone" ? "numeric" : "email"}
                autoComplete={shortlistStep === "email" ? "email" : "tel"}
                className="chat-compose-input"
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                aria-label={inputPlaceholder}
              />
              <button type="submit" className="chat-compose-send" disabled={!inputValue.trim()}>
                Send
              </button>
            </form>
          ) : null}

          {shortlistStep === "loading" || shortlistStep === "saving_hostel" ? (
            <p className="chat-compose-hint" role="status">
              {shortlistStep === "loading" ? "Checking shortlist…" : "Saving…"}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
