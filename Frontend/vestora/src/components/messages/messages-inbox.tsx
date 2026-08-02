"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageThread } from "@/components/messages/message-thread";
import { useUnreadCount } from "@/lib/hooks/use-chat";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function MessagesInbox() {
  const { t } = useLocale();
  const { data: unread = 0 } = useUnreadCount();
  const params = useSearchParams();
  const toParam = params.get("to");
  const initial = toParam ? Number(toParam) : null;

  const [selected, setSelected] = useState<{ id: number; name?: string } | null>(
    initial && Number.isFinite(initial) ? { id: initial } : null
  );

  return (
    <div className="relative h-[calc(100svh-4rem)] w-full overflow-hidden bg-background">
      {/* Ambient light — keeps wide screens composed instead of a flat empty slab */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <span
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60% 55% at 22% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
          }}
        />
        <span
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(50% 50% at 100% 100%, color-mix(in oklab, var(--bronze) 9%, transparent), transparent 72%)",
          }}
        />
        <span className="film-grain absolute inset-0 opacity-[0.035] mix-blend-overlay" />
      </div>

      <div className="relative z-10 grid h-full grid-cols-1 lg:grid-cols-[minmax(320px,380px)_1fr]">
        {/* Rail — conversations */}
        <aside
          className={cn(
            "min-h-0 flex-col border-border/60 bg-card/45 backdrop-blur-xl lg:flex lg:border-e",
            selected ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="flex items-center justify-between gap-3 px-6 pb-4 pt-6">
            <h1
              className="text-[22px] font-bold leading-none tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("msg.title")}
            </h1>
            {unread > 0 && (
              <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-primary px-2 font-numeric text-[11px] font-semibold text-primary-foreground shadow-sm">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>

          <ConversationList
            selectedId={selected?.id ?? null}
            onSelect={(id, name) => setSelected({ id, name })}
          />
        </aside>

        {/* Thread */}
        <section className={cn("min-h-0", selected ? "block" : "hidden lg:block")}>
          {selected ? (
            <MessageThread
              partnerId={selected.id}
              partnerName={selected.name}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
              <span className="relative grid size-20 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.06] text-primary">
                <span
                  aria-hidden
                  className="absolute -inset-6 rounded-full opacity-60 blur-2xl"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
                  }}
                />
                <MessagesSquare className="relative size-8" strokeWidth={1.25} />
              </span>
              <div className="space-y-2">
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t("msg.select.title")}
                </h2>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {t("msg.select.body")}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
