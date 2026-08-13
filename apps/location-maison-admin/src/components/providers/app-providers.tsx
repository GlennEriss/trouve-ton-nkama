"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useAdminSyncListener } from "@/lib/cross-tab-sync";
import { createQueryClient } from "@/lib/query-client";

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Doit être monté SOUS QueryClientProvider : useAdminSyncListener consomme le
 * queryClient du contexte.
 */
function AdminSyncBridge({ children }: { children: ReactNode }) {
  useAdminSyncListener();
  return <>{children}</>;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AdminSyncBridge>
        <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
      </AdminSyncBridge>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
