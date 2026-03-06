"use client";

import { useEffect, useRef, useState } from "react";

interface TerminalWindowProps {
  user?: string;
  host?: string;
  cursorWidth?: number;
  cursorHeight?: number;
}

interface HistoryEntry {
  command: string;
  output: string;
}

const commands: Record<string, string> = {
    "./about_me": [
      "hi! i'm joonhee park.",
      "professions that define me: software developer, musician, part-time tutor.",
      "previously @ Bytedance, Tegus, Yale.",
      "type to chat with an ai instructed to answer questions about me, or try ./list-commands to explore!",
    ].join("\n"),
  "./list-commands": "",
};

export default function TerminalWindow({
  user = "jp",
  host = "ai",
  cursorWidth = 10,
  cursorHeight = 20,
}: TerminalWindowProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([
    { command: "./about_me", output: commands["./about_me"] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);

  function handleCommand(cmd: string): string {
    const trimmed = cmd.trim();
    if (trimmed === "./list-commands") return `${Object.keys(commands).join("  ")}`;
    if (trimmed in commands) return commands[trimmed];
    if (trimmed.startsWith("./")) return "please enter a valid command";
    return "";
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [history, input]);

  async function submitToChat(cmd: string, entryIdx: number) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cmd }),
      });
      const data = await res.json();
      let output: string;
      if (!res.ok) {
        if (data.errorCode === "DONT_KNOW") output = "i don't know the answer to this question";
        else if (data.errorCode === "INVALID_QUESTION") output = "please enter a valid/intelligible question";
        else output = data.message ?? "error";
      } else {
        output = data.message;
      }
      setHistory((prev) => {
        const updated = [...prev];
        updated[entryIdx] = { command: cmd, output };
        return updated;
      });
    } catch {
      setHistory((prev) => {
        const updated = [...prev];
        updated[entryIdx] = { command: cmd, output: "error reaching server" };
        return updated;
      });
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const trimmed = input.trim();
        if (trimmed.startsWith("./")) {
          const output = handleCommand(trimmed);
          setHistory((prev) => [...prev, { command: input, output }]);
        } else {
          const entryIdx = history.length;
          setHistory((prev) => [...prev, { command: input, output: "..." }]);
          submitToChat(trimmed, entryIdx);
        }
        setHistoryIndex(-1);
        setInput("");
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistory((prev) => {
          const next = Math.min(historyIndex + 1, prev.length - 1);
          setHistoryIndex(next);
          setInput(prev[prev.length - 1 - next]?.command ?? input);
          return prev;
        });
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = historyIndex - 1;
        setHistoryIndex(next);
        if (next < 0) {
          setInput("");
        } else {
          setHistory((prev) => {
            setInput(prev[prev.length - 1 - next]?.command ?? "");
            return prev;
          });
        }
        return;
      }
      if (e.key === "Backspace") {
        setInput((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key.length === 1) {
        setInput((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, historyIndex, history]);

  const cursorStyle: React.CSSProperties = {
    display: "inline-block",
    width: cursorWidth,
    height: cursorHeight,
    backgroundColor: "var(--ctp-subtext1)",
    verticalAlign: "middle",
    position: "relative",
    top: -2,
  };

  const Prompt = () => (
    <>
      <span style={{ color: "var(--ctp-mauve)" }}>{user}</span>
      <span style={{ color: "var(--ctp-subtext1)" }}>@</span>
      <span style={{ color: "var(--ctp-sapphire)" }}>{host}</span>
      <span style={{ color: "var(--ctp-subtext1)" }}> ~ % </span>
    </>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--ctp-surface1)] shadow-xl">
      <div className="p-4 font-mono text-sm" style={{ outline: "none" }}>
        {history.map((entry, i) => (
          <div key={i} style={{ overflowWrap: "break-word", marginBottom: "0.2rem" }}>
            <div style={{ marginBottom: "0.2rem" }}>
              <Prompt />
              <span style={{ color: "var(--ctp-text)" }}>{entry.command}</span>
            </div>
            <div style={{ color: "var(--ctp-yellow)", whiteSpace: "pre-wrap" }}>{entry.output}</div>
          </div>
        ))}
        <div style={{ overflowWrap: "break-word" }}>
          <Prompt />
          <span style={{ color: "var(--ctp-text)" }}>{input}</span>
          <span className="cursor-blink" style={cursorStyle} aria-hidden />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
