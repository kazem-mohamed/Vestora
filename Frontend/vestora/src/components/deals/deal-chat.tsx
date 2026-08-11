"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { messagesApi } from "@/lib/api/messages";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealRoom } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The conversation, inside the room it belongs to.
 *
 * The deal room counted unread messages and then sent you somewhere else to read them.
 * That split is why the questions panel exists at all: with the chat one navigation
 * away, every clarification ended up in it, and the structured record the room was
 * built to hold stayed empty.
 *
 * This is not a second chat system. It is the same project-scoped thread `/messages`
 * shows, filtered to this venture — the API has carried a `projectId` for exactly this
 * purpose since the endpoint was written. The difference is only where you read it.
 *
 * Questions and chat both stay, and the distinction between them is the point: a
 * question is a thing you will need to find again next week, a message is a thing you
 * said. Collapsing the two would lose the first.
 */
export function DealChat({ deal }: { deal: DealRoom }) {
  const { t, locale } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const counterpartId = deal.viewerRole === "founder" ? deal.investorId : deal.founderId;
  const counterpartName = deal.viewerRole === "founder" ? deal.investorName : deal.founderName;

  const thread = useQuery({
    queryKey: ["deal-chat", deal.investmentId],
    queryFn: () => messagesApi.thread(me!.id, counterpartId, deal.projectId),
    enabled: !!me && counterpartId > 0,
    // The hub pushes new messages elsewhere in the app; a slow poll keeps this panel
    // honest without standing up a second realtime subscription for one surface.
    refetchInterval: 20_000,
  });

  const send = useMutation({
    mutationFn: () => messagesApi.send(counterpartId, draft.trim(), deal.projectId),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["deal-chat", deal.investmentId] });
      qc.invalidateQueries({ queryKey: ["deal", deal.investmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const messages = thread.data ?? [];

  // Mark the thread read once, on open. The unread badge in the masthead is counting
  // exactly these messages, so leaving them unread while they are on screen would be
  // the room lying about itself.
  useEffect(() => {
    if (!me || counterpartId <= 0 || messages.length === 0) return;
    messagesApi
      .markRead(counterpartId)
      .then(() => qc.invalidateQueries({ queryKey: ["deal", deal.investmentId] }))
      .catch(() => {
        /* Reading is not an action worth interrupting anyone over. */
      });
    // Intentionally once per thread load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterpartId, messages.length === 0]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [messages.length, reduce]);

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="flex items-center gap-2.5">
        <MessageSquare className="size-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("deal.chat.title")}
        </h2>
        <span className="text-xs text-muted-foreground">{counterpartName}</span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{t("deal.chat.sub")}</p>

      <div className="mt-4 rounded-2xl border border-border/70 bg-card/40">
        <div className="max-h-[26rem] space-y-3 overflow-y-auto p-4">
          {thread.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-12 rounded-xl" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("deal.chat.empty")}</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === me?.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5",
                      mine
                        ? "bg-primary/[0.10] text-foreground"
                        : "border border-border/60 bg-background/50 text-foreground/90"
                    )}
                  >
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{m.content}</p>
                    <time
                      dateTime={m.sentAt}
                      className="font-numeric mt-1 block text-[10.5px] text-muted-foreground/70"
                    >
                      {fmt.format(new Date(m.sentAt))}
                    </time>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border/60 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && draft.trim()) {
                  e.preventDefault();
                  send.mutate();
                }
              }}
              rows={1}
              placeholder={t("deal.chat.placeholder")}
              aria-label={t("deal.chat.placeholder")}
              className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
            />
            <button
              type="button"
              data-cursor="hover"
              disabled={draft.trim().length === 0 || send.isPending}
              onClick={() => send.mutate()}
              aria-label={t("deal.chat.send")}
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="size-4 rtl:-scale-x-100" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
