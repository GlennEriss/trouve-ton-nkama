"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";

import { Button } from "@trouve-ton-nkama/ui/button";
import { cn } from "@/lib/utils";

type PendingQueue = {
  key: string;
  label: string;
  href: string;
  /** null = file en erreur côté serveur, on ne l'affiche pas. */
  count: number | null;
};

type PendingSummary = {
  queues: PendingQueue[];
  total: number;
};

async function fetchPendingSummary(): Promise<PendingSummary> {
  const response = await fetch("/api/admin/v1/notifications/pending-summary", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Impossible de charger les notifications.");
  }
  return payload.data as PendingSummary;
}

/**
 * Cloche des files d'attente nécessitant une décision admin.
 *
 * Le badge ne compte que les files que l'admin connecté a le droit de traiter :
 * le filtrage par permission est fait côté serveur (pending-summary), pas ici.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["admin", "notifications", "pending-summary"],
    queryFn: fetchPendingSummary,
    // Les files bougent au rythme des décisions admin : un rafraîchissement
    // périodique suffit, inutile de solliciter le serveur à chaque navigation.
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const total = summaryQuery.data?.total ?? 0;
  const actionable = (summaryQuery.data?.queues ?? []).filter((queue) => (queue.count ?? 0) > 0);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={total > 0 ? `Notifications : ${total} en attente` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {total > 0 ? (
          <span
            // Pastille de comptage : le nombre est répété dans l'aria-label
            // ci-dessus, l'information n'est donc pas portée par la couleur seule.
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white"
          >
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          {/* Capture le clic extérieur pour refermer le panneau. */}
          <button
            type="button"
            aria-label="Fermer les notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">En attente d&apos;approbation</p>
              <p className="text-xs text-muted-foreground">
                {total > 0 ? `${total} élément${total > 1 ? "s" : ""} à traiter` : "Rien à traiter"}
              </p>
            </div>

            {summaryQuery.isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Chargement...</p>
            ) : summaryQuery.isError ? (
              <p className="px-4 py-6 text-center text-sm text-destructive">
                {summaryQuery.error instanceof Error ? summaryQuery.error.message : "Erreur de chargement."}
              </p>
            ) : actionable.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <Check className="h-5 w-5 text-success" />
                <p className="text-sm text-muted-foreground">Toutes les files sont à jour.</p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {actionable.map((queue) => (
                  <li key={queue.key}>
                    <Link
                      href={queue.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors",
                        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      )}
                    >
                      <span className="min-w-0 truncate text-foreground">{queue.label}</span>
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive">
                        {queue.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
