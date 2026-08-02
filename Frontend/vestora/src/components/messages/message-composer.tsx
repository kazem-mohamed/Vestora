"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ImagePlus, Smile, SendHorizontal, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX = 2000;
const COUNTER_AT = MAX - 200;

// A tight, considered set — enough for warmth without a heavyweight picker.
const EMOJI = [
  "😊", "🙏", "👍", "🔥", "🎉", "🚀", "💡", "✅",
  "👏", "🙌", "💪", "✨", "📈", "💰", "🤝", "👀",
  "❤️", "😍", "😅", "🤔", "😎", "🥳", "😃", "🙂",
  "👋", "💬", "⭐", "⚡", "📌", "🎯", "💯", "🫶",
];

export function MessageComposer({
  onSend,
  onSendAttachment,
  onTyping,
  sending,
  rtl,
}: {
  onSend: (content: string) => void;
  onSendAttachment?: (file: File, caption: string) => void;
  onTyping?: (isTyping: boolean) => void;
  sending: boolean;
  rtl: boolean;
}) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const emojiWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the composer's preview URL when it changes or the composer unmounts.
  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      setAttachmentPreview(URL.createObjectURL(file));
    }
  }
  function clearAttachment() {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Typing relay — send "true" at most once per 2s, and a trailing "false".
  const lastTypingRef = useRef(0);
  const stopTypingRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      onTyping?.(true);
    }
    clearTimeout(stopTypingRef.current);
    stopTypingRef.current = setTimeout(() => {
      lastTypingRef.current = 0;
      onTyping?.(false);
    }, 3000);
  }
  function stopTyping() {
    clearTimeout(stopTypingRef.current);
    lastTypingRef.current = 0;
    onTyping?.(false);
  }
  // Signal "stopped typing" if the composer unmounts (e.g. leaving the thread).
  useEffect(() => () => stopTyping(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = draft.trim();
  const canSend = (trimmed.length > 0 || !!attachment) && !sending;
  const remaining = MAX - draft.length;

  // Auto-grow the textarea up to a ceiling, then let it scroll.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [draft]);

  // Dismiss the emoji panel on outside click or Escape.
  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!emojiWrapRef.current?.contains(e.target as Node)) setEmojiOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEmojiOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  function submit() {
    if (!canSend) return;
    if (attachment) {
      onSendAttachment?.(attachment, draft);
      clearAttachment();
    } else {
      onSend(trimmed);
    }
    setDraft("");
    stopTyping();
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function insertEmoji(e: string) {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? draft.length;
    const end = ta?.selectionEnd ?? draft.length;
    const next = (draft.slice(0, start) + e + draft.slice(end)).slice(0, MAX);
    setDraft(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      const caret = start + e.length;
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-border/60 bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        {/* Attachment preview */}
        <AnimatePresence>
          {attachmentPreview && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="relative mb-3 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentPreview}
                  alt={attachment?.name ?? ""}
                  className="size-24 rounded-xl border border-border/70 object-cover shadow-sm"
                />
                <button
                  type="button"
                  data-cursor="hover"
                  aria-label={t("msg.attach.remove")}
                  onClick={clearAttachment}
                  className="absolute -end-2 -top-2 grid size-7 place-items-center rounded-full border border-border/70 bg-popover text-foreground shadow-md transition-colors hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* One unified control — every element sits on the same baseline */}
        <div className="flex items-end gap-1 rounded-[24px] border border-border/60 bg-card/60 p-1.5 shadow-sm transition-all duration-200 focus-within:border-primary/45 focus-within:bg-card focus-within:ring-4 focus-within:ring-ring/10">
          {/* Emoji */}
          <div ref={emojiWrapRef} className="relative">
            <button
              type="button"
              data-cursor="hover"
              aria-label={t("msg.emoji")}
              aria-expanded={emojiOpen}
              onClick={() => setEmojiOpen((v) => !v)}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-foreground/[0.06] hover:text-foreground active:scale-95",
                emojiOpen && "bg-primary/10 text-primary"
              )}
            >
              <Smile className="size-4.5" strokeWidth={1.75} />
            </button>

            <AnimatePresence>
              {emojiOpen && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  style={{ transformOrigin: rtl ? "bottom right" : "bottom left" }}
                  className="absolute bottom-full z-20 mb-3 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-border/70 bg-popover/95 p-2.5 shadow-xl shadow-black/15 backdrop-blur-xl ltr:left-0 rtl:right-0"
                >
                  {EMOJI.map((e) => (
                    <button
                      key={e}
                      type="button"
                      data-cursor="hover"
                      onClick={() => insertEmoji(e)}
                      className="grid size-8 place-items-center rounded-lg text-lg leading-none transition-transform duration-150 hover:scale-110 hover:bg-foreground/[0.06]"
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Attach image */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={pickFile}
            className="hidden"
          />
          <button
            type="button"
            data-cursor="hover"
            aria-label={t("msg.attach.image")}
            onClick={() => fileInputRef.current?.click()}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-foreground/[0.06] hover:text-foreground active:scale-95"
          >
            <ImagePlus className="size-4.5" strokeWidth={1.75} />
          </button>

          {/* Input — borderless; the wrapper owns the frame and focus ring.
              Native scrollbar is hidden so no arrows/thumb show inside. */}
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, MAX));
              if (e.target.value.trim()) pingTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={MAX}
            placeholder={t("msg.composer.ph")}
            aria-label={t("msg.composer.ph")}
            className="scrollbar-none max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-[14.5px] leading-6 outline-none placeholder:text-muted-foreground/55 focus:outline-none"
          />

          {draft.length > COUNTER_AT && (
            <span
              className={cn(
                "pointer-events-none self-center pe-1 font-numeric text-[10px] tabular-nums",
                remaining <= 0 ? "text-destructive" : "text-muted-foreground/60"
              )}
            >
              {remaining}
            </span>
          )}

          {/* Send */}
          <button
            type="submit"
            disabled={!canSend}
            data-cursor="hover"
            aria-label={t("msg.send")}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-all duration-200 hover:brightness-[1.06] active:scale-95 disabled:pointer-events-none disabled:bg-foreground/[0.08] disabled:text-muted-foreground/50 disabled:shadow-none"
          >
            {sending ? (
              <motion.span
                aria-hidden
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="block size-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
              />
            ) : (
              <SendHorizontal className={cn("size-4", rtl && "-scale-x-100")} />
            )}
          </button>
        </div>

        {/* Keyboard hint — desktop only, quiet */}
        <p className="mt-2 hidden px-3 text-[11px] text-muted-foreground/45 sm:block">
          {t("msg.enterHint")}
        </p>
      </div>
    </form>
  );
}
