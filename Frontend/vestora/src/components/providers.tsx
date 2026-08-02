"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ChatRealtime } from "@/components/messages/chat-realtime";
import { LocaleProvider } from "@/lib/i18n/locale";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/store";
import { getRefreshToken } from "@/lib/auth/tokens";

/**
 * On load, if a refresh token exists we call a protected endpoint; the API
 * client's 401 interceptor refreshes and hydrates the session automatically.
 */
function useSessionBootstrap() {
  useEffect(() => {
    let active = true;
    const store = useAuthStore.getState();

    async function boot() {
      if (!getRefreshToken()) {
        store.setStatus("unauthenticated");
        return;
      }
      store.setStatus("loading");
      try {
        await authApi.me();
        if (active) useAuthStore.getState().setStatus("authenticated");
      } catch {
        if (active) useAuthStore.getState().clearSession();
      }
    }

    boot();
    return () => {
      active = false;
    };
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      })
  );

  useSessionBootstrap();

  return (
    /**
     * Reduced motion, honoured once for the whole app.
     *
     * `reducedMotion="user"` makes Framer Motion read the OS preference and drop
     * every transform animation — x/y, scale, rotate — while leaving opacity
     * crossfades intact, so nothing jumps into place and no layout shifts. It is
     * set here rather than component by component because there are more than
     * forty animated components and a per-file opt-in is a rule that decays: one
     * new component written without the hook silently reintroduces the problem.
     *
     * Components that need to change more than their animation — swapping an
     * infinite pulse for a static dot, skipping a pointer-tilt scene — still call
     * `useReducedMotion()` themselves. This handles everything else.
     */
    <MotionConfig reducedMotion="user">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LocaleProvider>
          <QueryClientProvider client={queryClient}>
            <ChatRealtime />
            {children}
            {/* No `richColors`: it hands the palette to Sonner and is the main reason
                toasts read as library output. No `position` either — the component
                picks it from the reading direction. */}
            <Toaster />
          </QueryClientProvider>
        </LocaleProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
