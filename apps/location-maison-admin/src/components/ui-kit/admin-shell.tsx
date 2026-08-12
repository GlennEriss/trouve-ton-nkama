"use client";

import { type ReactNode, useEffect } from "react";

import { AppSidebar } from "@/components/ui-kit/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  useEffect(() => {
    let isMounted = true;

    const ping = async () => {
      if (!isMounted) {
        return;
      }

      await fetch("/api/admin/v1/auth/heartbeat", {
        method: "POST",
      }).catch(() => null);
    };

    void ping();
    const intervalId = window.setInterval(() => {
      void ping();
    }, 45_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void ping();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-app">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <SidebarTrigger className="-ml-1" />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Trouve Ton Nkama</p>
              <p className="truncate text-xs text-muted-foreground">Tableau de bord administrateur</p>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">Version Sprint 3</p>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
