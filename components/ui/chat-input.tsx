"use client";

import React, { useEffect, useRef, useCallback } from "react";

/**
 * ChatInput — glowing auto-growing message input, adapted for Pronoia's
 * Hermes chat from the "prompt-input-dynamic-grow" concept.
 *
 * Adaptations vs. the source component:
 *  - removed the broken `figma:react` import and Figma-specific props
 *  - controlled component (value/onChange/onSubmit come from SocialHub state)
 *  - dynamic Tailwind classes like `text-[${color}]` don't compile — replaced
 *    with theme CSS variables
 *  - dark glass styling on Pronoia tokens; glow follows the accent customizer
 */
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Frag Hermes…",
  disabled = false,
  sending = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !disabled && !sending) onSubmit();
      }
    },
    [value, disabled, sending, onSubmit]
  );

  const isSubmitDisabled = disabled || sending || !value.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isSubmitDisabled) onSubmit();
      }}
      className="relative w-full group"
    >
      {/* Accent glow on hover/focus (follows --theme-accent) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          boxShadow: `0 0 0 1px var(--theme-accent-dim, rgba(26,106,255,0.18)),
                      0 0 12px var(--theme-accent-glow, rgba(26,106,255,0.22)),
                      0 0 28px var(--theme-accent-dim, rgba(26,106,255,0.12))`,
          filter: "blur(0.5px)",
        }}
      />

      <div
        className="relative flex items-end gap-2 rounded-3xl p-2 backdrop-blur-xl transition-colors duration-300"
        style={{
          background: "var(--bg2, rgba(15,17,24,0.85))",
          border: "1px solid var(--border, rgba(100,130,180,0.15))",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Nachricht an Hermes"
          rows={1}
          disabled={disabled || sending}
          className="w-full min-h-[36px] max-h-[160px] resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm outline-none border-0 disabled:opacity-60"
          style={{
            color: "var(--text, #eef0f4)",
            lineHeight: "22px",
            letterSpacing: "-0.14px",
          }}
        />

        <button
          type="submit"
          aria-label="Nachricht senden"
          disabled={isSubmitDisabled}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: isSubmitDisabled
              ? "var(--bg3, #161b27)"
              : "var(--theme-accent, #1A6AFF)",
            color: "#fff",
          }}
        >
          {sending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 22L16 10M16 10L11 15M16 10L21 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
