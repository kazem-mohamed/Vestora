"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Banknote, Flag, LineChart, Rocket, UserPlus } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { PillButton } from "@/components/ui/pill-button";
import { timeAgo } from "@/components/dashboard/dashboard-panels";
import { feedApi } from "@/lib/api/engagement";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FeedItem, FeedType } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const FILTERS: { key: FeedType | ""; labelKey: string }[] = [
  { key: "", labelKey: "proj.filter.all" },
  { key: "new_project", labelKey: "feed.type.new_project" },
  { key: "update", labelKey: "feed.type.update" },
  { key: "investment", labelKey: "feed.type.investment" },
  { key: "milestone", labelKey: "feed.type.milestone" },
  { key: "new_user", labelKey: "feed.type.new_user" },
];

const ICON: Record<string, typeof Banknote> = {
  new_project: Rocket,
  update: LineChart,
  investment: Banknote,
  milestone: Flag,
  new_user: UserPlus,
};

function ItemText({ item }: { item: FeedItem }) {
  const { t } = useLocale();
  const project = item.projectId ? (
    <Link href={`/projects/${item.projectId}`} data-cursor="hover" className="font-medium text-foreground transition-colors hover:text-primary">
      {item.projectName}
    </Link>
  ) : (
    <span className="font-medium text-foreground">{item.projectName}</span>
  );
  const actor = item.actorId ? (
    <Link href={`/u/${item.actorId}`} data-cursor="hover" className="font-medium text-foreground transition-colors hover:text-primary">
      {item.actorName}
    </Link>
  ) : (
    <span className="font-medium text-foreground">{item.actorName}</span>
  );

  switch (item.type) {
    case "new_project":
      return <>{actor} {t("feed.launched")} {project}</>;
    case "update":
      return <>{actor} {t("feed.posted")} {project}{item.text ? <span className="text-muted-foreground">: {item.text}</span> : null}</>;
    case "investment":
      return <>{actor} {t("feed.backed")} {project}</>;
    case "milestone":
      return <>{project} {t("feed.milestone")}{item.text ? <span className="text-muted-foreground">: {item.text}</span> : null}</>;
    case "new_user":
      return <>{actor} {t("feed.joined")}</>;
    default:
      return null;
  }
}

export default function AdminActivityPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const [type, setType] = useState<FeedType | "">("");

  const q = useInfiniteQuery({
    queryKey: ["feed", type],
    queryFn: ({ pageParam }) => feedApi.list({ type: type || undefined, page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("feed.title")} sub={t("feed.subtitle")} eyebrowKey="admin.sidebar.label" />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            type="button"
            data-cursor="hover"
            onClick={() => setType(f.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs transition-colors",
              type === f.key ? "border-primary/50 bg-primary/[0.08] text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("feed.empty")}</p>
      ) : (
        <div className="relative max-w-3xl">
          <span aria-hidden className="absolute bottom-4 start-[19px] top-2 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />
          <ol className="space-y-2">
            {items.map((item, i) => {
              const Icon = ICON[item.type] ?? LineChart;
              const important = item.type === "investment" || item.type === "milestone";
              return (
                <motion.li
                  key={`${item.type}-${item.date}-${i}`}
                  initial={{ opacity: 0, x: rtl ? 16 : -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: (i % 10) * 0.04, ease: EASE }}
                  className={cn(
                    "relative flex items-start gap-4 rounded-xl py-3 pe-3 ps-1 transition-colors",
                    important ? "bg-primary/[0.03] ring-1 ring-primary/10" : "hover:bg-foreground/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "relative z-[1] grid size-9 shrink-0 place-items-center rounded-full border ring-4 ring-background",
                      important ? "border-primary/50 bg-primary/[0.1] text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm leading-snug text-muted-foreground">
                      <ItemText item={item} />
                    </p>
                    <p className="mt-0.5 font-numeric text-[11px] text-muted-foreground/70">{timeAgo(item.date, t("time.now"))}</p>
                  </div>
                </motion.li>
              );
            })}
          </ol>

          {q.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <PillButton onClick={() => q.fetchNextPage()} variant="outline" disabled={q.isFetchingNextPage} showArrow={false}>
                {q.isFetchingNextPage ? t("feed.loading") : t("feed.loadMore")}
              </PillButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
