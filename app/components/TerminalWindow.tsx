"use client";

interface TerminalWindowProps {
  user?: string;
  host?: string;
}

export default function TerminalWindow({
  user = "joonhee",
  host = "ai",
}: TerminalWindowProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--ctp-surface1)] bg-[var(--ctp-base)] shadow-xl"
      style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)" }}
    >
      <div className="p-4 font-mono text-sm">
        <div className="flex items-center gap-1">
          <span style={{ color: "var(--ctp-mauve)" }}>{user}</span>
          <span style={{ color: "var(--ctp-subtext1)" }}>@</span>
          <span style={{ color: "var(--ctp-sapphire)" }}>{host}</span>
          <span style={{ color: "var(--ctp-subtext1)" }}> ~ % </span>
          <span className="cursor-blink ml-0.5 text-[var(--ctp-mauve)]" aria-hidden>
            █
          </span>
        </div>
      </div>
    </div>
  );
}
