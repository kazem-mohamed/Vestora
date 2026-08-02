import { RequireAuth } from "@/components/auth/require-auth";
import { SiteHeader } from "@/components/site-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        {children}
      </div>
    </RequireAuth>
  );
}
