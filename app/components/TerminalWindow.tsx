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

export default function TerminalWindow({
  user = "jp",
  host = "ai",
  cursorWidth = 10,
  cursorHeight = 20,
}: TerminalWindowProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [history, input]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        setHistory((prev) => [...prev, { command: input, output: "hello world" }]);
        setInput("");
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
  }, [input]);

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
          <div key={i} style={{ wordBreak: "break-all" }}>
            <div>
              <Prompt />
              <span style={{ color: "var(--ctp-text)" }}>{entry.command}</span>
            </div>
            <div style={{ color: "var(--ctp-yellow)" }}>{entry.output}</div>
          </div>
        ))}
        <div style={{ wordBreak: "break-all" }}>
          <Prompt />
          <span style={{ color: "var(--ctp-text)" }}>{input}</span>
          <span className="cursor-blink" style={cursorStyle} aria-hidden />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
