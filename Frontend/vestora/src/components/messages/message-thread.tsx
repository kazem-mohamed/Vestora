"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  MessageSquare,
  RotateCw,
  X,
} from "lucide-react";
import {
  useMarkRead,
  usePresence,
  useSendAttachment,
  useSendMessage,
  useThread,
} from "@/lib/hooks/use-chat";
import { usersApi, avatarUrl } from "@/lib/api/users";
import { messagesApi } from "@/lib/api/messages";
import { sendTyping } from "@/lib/realtime/chat";
import { useChatStore } from "@/lib/realtime/chat-store";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { buildThreadItems, dayLabel } from "@/lib/chat/thread-utils";
import { cn } from "@/lib/utils";
import { MessageComposer } from "@/components/messages/message-composer";
import type { Message, UserType } from "@/lib/types/api";

/** Expo-style ease — long, settled, cinematic. */
const EASE = [0.16, 1, 0.3, 1] as const;

function initials(name: string): string {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function ThreadAvatar({
  id,
  name,
  size = 36,
  online,
}: {
  id: number;
  name: string;
  size?: number;
  online?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border/70">
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl(id)}
            alt=""
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[11px] text-primary" style={{ fontFamily: "var(--font-heading)" }}>
            {initials(name)}
          </span>
        )}
      </span>
      {online && (
        <span className="absolute bottom-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background ltr:right-0 rtl:left-0" />
      )}
    </span>
  );
}

/** Sent / read / sending state for my own messages. Shape differs, not just color. */
function Ticks({ msg }: { msg: Message }) {
  const { t } = useLocale();
  if (msg.pending) {
    return <Clock className="size-3 text-primary-foreground/50" aria-label={t("msg.status.sending")} />;
  }
  if (msg.isRead) {
    return <CheckCheck className="size-3.5 text-primary-foreground" aria-label={t("msg.status.read")} />;
  }
  return <Check className="size-3.5 text-primary-foreground/55" aria-label={t("msg.status.sent")} />;
}

/** Three-dot pulse used in the header status line and the typing bubble. */
function TypingDots({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-current"
          animate={reduce ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function formatLastSeen(iso: string, locale: string, timeFmt: Intl.DateTimeFormat): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return timeFmt.format(d);
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
  });
  return `${dateFmt.format(d)} · ${timeFmt.format(d)}`;
}

/**
 * Renders an image attachment. Uses the local preview (sender's own bubble)
 * when present, otherwise fetches the bytes with auth into an object URL.
 */
function AttachmentImage({
  messageId,
  name,
  localPreviewUrl,
  pending,
  onOpen,
}: {
  messageId: number;
  name?: string | null;
  localPreviewUrl?: string;
  pending?: boolean;
  onOpen: (src: string) => void;
}) {
  const q = useQuery({
    queryKey: ["attachment", messageId],
    queryFn: () => messagesApi.attachmentObjectUrl(messageId),
    enabled: !localPreviewUrl && messageId > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
  const src = localPreviewUrl ?? q.data;

  if (!src) {
    return <span className="skeleton-shimmer block h-48 w-60 max-w-full rounded-xl" />;
  }
  return (
    <button
      type="button"
      data-cursor="hover"
      onClick={() => onOpen(src)}
      className="relative block overflow-hidden rounded-xl transition-transform duration-200 active:scale-[0.99]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name ?? ""}
        className={cn(
          "max-h-80 w-full max-w-sm object-cover transition-opacity",
          pending && "opacity-70"
        )}
      />
      {pending && (
        <span className="absolute inset-0 grid place-items-center bg-black/10">
          <span className="size-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        </span>
      )}
    </button>
  );
}

const roleKey: Record<UserType, string> = {
  Investor: "msg.role.investor",
  Innovator: "msg.role.innovator",
  Admin: "msg.role.admin",
};

export function MessageThread({
  partnerId,
  partnerName,
  onBack,
}: {
  partnerId: number;
  partnerName?: string;
  onBack?: () => void;
}) {
  const { t, locale } = useLocale();
  const reduce = useReducedMotion();
  const rtl = locale === "ar";
  const BackArrow = rtl ? ArrowRight : ArrowLeft;
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useThread(partnerId);
  const send = useSendMessage(partnerId);
  const sendAttachment = useSendAttachment(partnerId);
  const markRead = useMarkRead();
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // Partner identity — cached and shared with the profile page.
  const partnerQ = useQuery({
    queryKey: ["profile", partnerId],
    queryFn: () => usersApi.getProfile(partnerId),
    enabled: !!partnerId,
  });
  const name = partnerName || partnerQ.data?.userName || "…";
  const role = partnerQ.data?.userType;

  // Live presence + typing for this partner.
  const { online, lastSeen } = usePresence([partnerId]);
  const isOnline = online[partnerId] ?? false;
  const partnerLastSeen = lastSeen[partnerId] ?? null;
  const partnerTyping = useChatStore((s) => s.typing[partnerId] ?? false);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(rtl ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" }),
    [rtl]
  );

  const items = useMemo(() => (me ? buildThreadItems(messages, me.id) : []), [messages, me]);

  // Scroll plumbing.
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unreadElRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const initialForRef = useRef<number | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);

  function scrollToBottom(smooth: boolean) {
    bottomRef.current?.scrollIntoView({
      behavior: smooth && !reduce ? "smooth" : "auto",
      block: "end",
    });
    setNewCount(0);
  }

  function recomputeAtBottom() {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const at = dist < 80;
    atBottomRef.current = at;
    setAtBottom(at);
    if (at) setNewCount(0);
  }

  // Mark the conversation read when it opens or grows while viewing.
  useEffect(() => {
    if (partnerId) markRead.mutate(partnerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, messages.length]);

  // Initial position per partner: land on the first unread, else the latest.
  useEffect(() => {
    if (isLoading) return;
    if (initialForRef.current === partnerId) return;
    initialForRef.current = partnerId;
    prevLenRef.current = messages.length;
    requestAnimationFrame(() => {
      if (unreadElRef.current) {
        unreadElRef.current.scrollIntoView({ block: "center" });
      } else {
        bottomRef.current?.scrollIntoView({ block: "end" });
      }
      recomputeAtBottom();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, partnerId]);

  // New messages: follow if I'm at the bottom or it's mine, else bump the pill.
  useEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = messages.length;
    if (isLoading || initialForRef.current !== partnerId) return;
    if (messages.length <= prev) return;
    const last = messages[messages.length - 1];
    const mine = last?.senderId === me?.id;
    if (mine || atBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    } else {
      setNewCount((c) => c + (messages.length - prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isLoading]);

  // Keep the typing bubble in view when it appears and I'm already at the bottom.
  useEffect(() => {
    if (partnerTyping && atBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerTyping]);

  function handleRetry(m: Message) {
    qc.setQueryData<Message[]>(["thread", me?.id, partnerId], (old = []) =>
      old.filter((x) => x.id !== m.id)
    );
    send.mutate(m.content);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header — glass bar spanning the full pane */}
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            data-cursor="hover"
            aria-label={t("msg.back")}
            className="-ms-1 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground lg:hidden"
          >
            <BackArrow className="size-4.5" />
          </button>
        )}
        <Link
          href={`/u/${partnerId}`}
          data-cursor="hover"
          aria-label={t("msg.viewProfile")}
          className="group flex min-w-0 flex-1 items-center gap-3"
        >
          <ThreadAvatar id={partnerId} name={name} size={42} online={isOnline} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold leading-tight transition-colors group-hover:text-primary">
              {name}
            </span>
            {partnerTyping ? (
              <span className="flex items-center gap-2 truncate text-xs font-medium text-primary">
                {t("msg.typing")}
                <TypingDots />
              </span>
            ) : isOnline ? (
              <span className="flex items-center gap-1.5 truncate text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {t("msg.online")}
              </span>
            ) : partnerLastSeen ? (
              <span className="truncate text-xs text-muted-foreground">
                {t("msg.lastSeenPrefix")} {formatLastSeen(partnerLastSeen, locale, timeFmt)}
              </span>
            ) : role ? (
              <span className="truncate text-xs text-muted-foreground">{t(roleKey[role])}</span>
            ) : null}
          </span>
        </Link>
      </header>

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={recomputeAtBottom} className="absolute inset-0 overflow-y-auto">
          {/* Readable column inside a full-bleed surface */}
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "skeleton-shimmer h-11 rounded-2xl",
                      i % 3 === 0 ? "ms-auto w-56" : i % 3 === 1 ? "w-44" : "ms-auto w-72"
                    )}
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.06] text-primary">
                  <MessageSquare className="size-6" strokeWidth={1.25} />
                </span>
                <p className="max-w-xs text-sm text-muted-foreground">{t("msg.thread.empty")}</p>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    if (item.kind === "day") {
                      return (
                        <div key={item.id} className="my-6 flex items-center gap-4">
                          <span className="h-px flex-1 bg-border/50" />
                          <span className="font-numeric text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                            {dayLabel(item.iso, locale, {
                              today: t("msg.day.today"),
                              yesterday: t("msg.day.yesterday"),
                            })}
                          </span>
                          <span className="h-px flex-1 bg-border/50" />
                        </div>
                      );
                    }

                    if (item.kind === "unread") {
                      return (
                        <div key={item.id} ref={unreadElRef} className="my-5 flex items-center gap-4">
                          <span className="h-px flex-1 bg-primary/25" />
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
                            {t("msg.unreadDivider")}
                          </span>
                          <span className="h-px flex-1 bg-primary/25" />
                        </div>
                      );
                    }

                    const { msg, mine, firstOfGroup, lastOfGroup } = item;
                    const isImage = (msg.attachmentType ?? "").startsWith("image/");
                    return (
                      <motion.div
                        key={msg.id}
                        initial={reduce ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: msg.pending ? 0.7 : 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className={cn(
                          "flex items-end",
                          mine ? "justify-end" : "justify-start",
                          firstOfGroup ? "mt-4" : "mt-1"
                        )}
                      >
                        {!mine && (
                          <div className="me-2.5 w-7 shrink-0 self-end">
                            {lastOfGroup && <ThreadAvatar id={partnerId} name={name} size={28} />}
                          </div>
                        )}

                        <div className="flex max-w-[76%] flex-col">
                          <div
                            title={timeFmt.format(new Date(msg.sentAt))}
                            className={cn(
                              "overflow-hidden text-[14.5px] leading-relaxed",
                              isImage ? "p-1.5" : "px-4 py-2.5",
                              mine
                                ? "rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                : "rounded-2xl border border-border/70 bg-card/80 text-foreground shadow-sm backdrop-blur-sm",
                              !firstOfGroup && (mine ? "rounded-se-md" : "rounded-ss-md"),
                              lastOfGroup && (mine ? "rounded-ee-md" : "rounded-es-md"),
                              msg.failed && "ring-1 ring-destructive/60"
                            )}
                          >
                            {isImage && (
                              <AttachmentImage
                                messageId={msg.id}
                                name={msg.attachmentName}
                                localPreviewUrl={msg.localPreviewUrl}
                                pending={msg.pending}
                                onOpen={setLightbox}
                              />
                            )}

                            {msg.content && (
                              <p
                                className={cn(
                                  "whitespace-pre-wrap break-words",
                                  isImage && "px-2.5 pt-2"
                                )}
                              >
                                {msg.content}
                              </p>
                            )}

                            {lastOfGroup && !msg.failed && (
                              <span
                                className={cn(
                                  "flex items-center gap-1.5",
                                  isImage ? "px-2.5 pb-1 pt-1.5" : "mt-1",
                                  mine ? "justify-end" : "justify-start"
                                )}
                              >
                                <span
                                  className={cn(
                                    "font-numeric text-[10.5px] tabular-nums",
                                    mine ? "text-primary-foreground/70" : "text-muted-foreground/80"
                                  )}
                                >
                                  {timeFmt.format(new Date(msg.sentAt))}
                                </span>
                                {mine && <Ticks msg={msg} />}
                              </span>
                            )}
                          </div>

                          {mine && msg.failed && (
                            <button
                              type="button"
                              onClick={() => handleRetry(msg)}
                              data-cursor="hover"
                              className="mt-1.5 flex items-center gap-1.5 self-end text-[11px] font-medium text-destructive transition-opacity hover:opacity-80"
                            >
                              <RotateCw className="size-3" />
                              {t("msg.status.failed")} · {t("msg.retry")}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Partner typing */}
                <AnimatePresence>
                  {partnerTyping && (
                    <motion.div
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="mt-4 flex items-end"
                    >
                      <div className="me-2.5 w-7 shrink-0 self-end">
                        <ThreadAvatar id={partnerId} name={name} size={28} />
                      </div>
                      <div className="rounded-2xl rounded-es-md border border-border/70 bg-card/80 px-4 py-3.5 text-muted-foreground shadow-sm backdrop-blur-sm">
                        <TypingDots />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={bottomRef} className="h-1" />
              </>
            )}
          </div>
        </div>

        {/* Scroll-to-latest */}
        <AnimatePresence>
          {!atBottom && !isLoading && messages.length > 0 && (
            <motion.button
              type="button"
              onClick={() => scrollToBottom(true)}
              data-cursor="hover"
              aria-label={t("msg.new")}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="absolute bottom-5 z-10 grid size-11 place-items-center rounded-full border border-border/60 bg-popover/90 text-foreground shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-popover ltr:right-6 rtl:left-6"
            >
              <ChevronDown className="size-5" />
              {newCount > 0 && (
                <span className="absolute -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 font-numeric text-[10px] font-bold text-primary-foreground ltr:-right-1.5 rtl:-left-1.5">
                  {newCount > 9 ? "9+" : newCount}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <MessageComposer
        onSend={(content) => send.mutate(content)}
        onSendAttachment={(file, caption) => sendAttachment.mutate({ file, caption })}
        onTyping={(isTyping) => sendTyping(partnerId, isTyping)}
        sending={send.isPending}
        rtl={rtl}
      />

      {/* Image lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label={t("msg.close")}
              className="absolute end-5 top-5 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            <motion.img
              initial={reduce ? undefined : { scale: 0.96 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, ease: EASE }}
              src={lightbox}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
