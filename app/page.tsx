"use client";

import { FormEvent, useMemo, useState } from "react";

type Role = "user" | "assistant";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface DetectConceptResponse {
  subject: string;
  concept: string;
}

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  detectedSubject?: string;
  detectedConcept?: string;
  saveStatus?: SaveStatus;
  saveError?: string;
}

interface SaveConceptPayload {
  subject: string;
  concept: string;
  masteryLevel: "Introduced" | "Developing" | "Proficient" | "Strong";
  overviewGist: string;
  deepDiveGist: string[];
  strongAreas: string[];
  weakAreas: string[];
  nextSteps: string[];
  notes: string;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractBulletItems(text: string, sectionKeyword: string): string[] {
  const lines = text.split("\n");
  const startIndex = lines.findIndex((line) =>
    line.toLowerCase().includes(sectionKeyword.toLowerCase())
  );
  if (startIndex === -1) return [];

  const items: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (
      line.startsWith("#") ||
      line.toLowerCase().includes("strong areas") ||
      line.toLowerCase().includes("weak areas") ||
      line.toLowerCase().includes("next steps")
    ) {
      break;
    }
    if (line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line)) {
      items.push(line.replace(/^[-*\d.\s]+/, "").trim());
    }
  }
  return items;
}

function inferMasteryLevel(response: string): SaveConceptPayload["masteryLevel"] {
  const lower = response.toLowerCase();
  if (
    lower.includes("edge case") ||
    lower.includes("nuance") ||
    lower.includes("trade-off") ||
    lower.includes("optimization")
  ) {
    return "Proficient";
  }
  if (lower.includes("advanced") || lower.includes("deep dive")) {
    return "Developing";
  }
  return "Introduced";
}

function parseSavePayload(
  subject: string,
  concept: string,
  assistantText: string
): SaveConceptPayload {
  const lines = assistantText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const overviewGist = lines.slice(0, 2).join(" ").slice(0, 280);
  const deepDiveGist = lines.slice(0, 8).filter((line) => line.length > 20);
  const strongAreas = extractBulletItems(assistantText, "strong areas");
  const weakAreas = extractBulletItems(assistantText, "weak areas");
  const nextSteps = extractBulletItems(assistantText, "next steps");

  return {
    subject,
    concept,
    masteryLevel: inferMasteryLevel(assistantText),
    overviewGist: overviewGist || assistantText.slice(0, 280),
    deepDiveGist: deepDiveGist.length > 0 ? deepDiveGist : [assistantText.slice(0, 400)],
    strongAreas,
    weakAreas,
    nextSteps,
    notes: assistantText.slice(0, 5000),
  };
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || isSending) return;

    setIsSending(true);
    setInput("");

    const userMsgId = createId();
    const assistantMsgId = createId();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: userMessage },
      { id: assistantMsgId, role: "assistant", content: "", saveStatus: "idle" },
    ]);

    try {
      let subject = "";
      let concept = "";

      const detectRes = await fetch("/api/detect-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage }),
      });
      if (detectRes.ok) {
        const detected = (await detectRes.json()) as DetectConceptResponse;
        subject = detected.subject?.trim() ?? "";
        concept = detected.concept?.trim() ?? "";
      }

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage, subject, concept }),
      });

      if (!chatRes.ok || !chatRes.body) {
        throw new Error("Chat request failed");
      }

      const reader = chatRes.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: assistantText,
                  detectedSubject: subject,
                  detectedConcept: concept,
                }
              : msg
          )
        );
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: assistantText.trim(),
                detectedSubject: subject,
                detectedConcept: concept,
              }
            : msg
        )
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: "I hit an error while responding. Please try again.",
                saveStatus: "error",
                saveError: "Chat response failed.",
              }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveProgress(message: ChatMessage) {
    const subject = message.detectedSubject?.trim() ?? "";
    const concept = message.detectedConcept?.trim() ?? "";
    if (!subject || !concept) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === message.id ? { ...msg, saveStatus: "saving", saveError: undefined } : msg
      )
    );

    const payload = parseSavePayload(subject, concept, message.content);

    try {
      const saveRes = await fetch("/api/save-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        let errorText = "Save failed";
        try {
          const data = (await saveRes.json()) as { error?: string; code?: string | null };
          if (data.error) {
            errorText = data.code ? `${data.error} (${data.code})` : data.error;
          }
        } catch {
          // Keep fallback message.
        }
        throw new Error(errorText);
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === message.id ? { ...msg, saveStatus: "saved" } : msg))
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? {
                ...msg,
                saveStatus: "error",
                saveError:
                  error instanceof Error
                    ? error.message
                    : "Could not save. Check API logs and Supabase config.",
              }
            : msg
        )
      );
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-950 text-slate-100">
      <main className="mx-auto flex h-[calc(100vh-57px)] w-full max-w-4xl flex-col px-4 py-6">
        <header className="mb-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <h1 className="text-lg font-semibold">Chat</h1>
          <p className="text-sm text-slate-400">Ask anything. I will explain and track concept progress.</p>
        </header>

        <section className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-400">Start by asking about any topic you are studying.</p>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";
              const canSaveProgress =
                !isUser &&
                (message.detectedSubject?.length ?? 0) > 0 &&
                (message.detectedConcept?.length ?? 0) > 0 &&
                message.content.trim().length > 0;

              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser ? "bg-blue-900 text-blue-50" : "border border-slate-700 bg-slate-800 text-slate-100"
                    }`}
                  >
                    {message.content || (isUser ? "" : "Thinking...")}
                    
                  </div>
                </div>
              );
            })
          )}
        </section>

        <form onSubmit={handleSend} className="flex items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about a concept..."
            rows={2}
            className="max-h-40 min-h-12 flex-1 resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 placeholder:text-slate-500 focus:ring-2"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
