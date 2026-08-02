"use client";

import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ActivityTimeline } from "@/components/dashboard/dashboard-panels";
import { useFounderDashboard } from "@/lib/hooks/use-dashboard";
import { useLocale } from "@/lib/i18n/locale";

export default function DashboardActivityPage() {
  const { t } = useLocale();
  const { data, isLoading } = useFounderDashboard();

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("dash.page.activity.title")} sub={t("dash.page.activity.sub")} />
      {isLoading || !data ? (
        <div className="h-96 animate-pulse rounded-2xl bg-secondary" />
      ) : (
        <Panel elevated>
          <ActivityTimeline items={data.recentActivity} />
        </Panel>
      )}
    </div>
  );
}
