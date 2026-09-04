"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Pencil, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent } from "@trouve-ton-nkama/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditSearchRequestDialog } from "@/components/search-requests/EditSearchRequestDialog";
import { cn } from "@/lib/utils";
import type { SearchRequestListItem } from "@/modules/search-requests-moderation/domain/types";

type ListState = "IN_PROGRESS" | "ARCHIVED";

type ListResponse = {
  items: SearchRequestListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

/** Action en attente de confirmation dans la modale. */
type PendingAction =
  | { kind: "archive"; item: SearchRequestListItem }
  | { kind: "unarchive"; item: SearchRequestListItem }
  | { kind: "delete"; item: SearchRequestListItem };

async function fetchList(state: ListState): Promise<ListResponse> {
  const response = await fetch(`/api/admin/v1/search-requests?state=${state}&limit=50`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Impossible de charger les demandes.");
  }
  return payload.data as ListResponse;
}

async function runAction(action: PendingAction) {
  const { item, kind } = action;
  if (kind === "delete") {
    const response = await fetch(`/api/admin/v1/search-requests/${item.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message ?? "Suppression impossible.");
    }
    return;
  }

  const response = await fetch(`/api/admin/v1/search-requests/${item.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: kind === "archive" ? "ARCHIVED" : "IN_PROGRESS" }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Action impossible.");
  }
}

function formatBudget(item: SearchRequestListItem) {
  return `${item.budgetMinXaf.toLocaleString("fr-FR")} - ${item.budgetMaxXaf.toLocaleString("fr-FR")} FCFA`;
}

/**
 * Demandes déjà approuvées : publiées (visibles sur le site) ou archivées.
 * Distinct de la file d'attente au-dessus, qui ne montre que les PENDING.
 */
export function PublishedSearchRequests() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ListState>("IN_PROGRESS");
  const [pending, setPending] = useState<PendingAction | null>(null);

  const listQuery = useQuery({
    queryKey: ["search-requests-moderation", "approved", state],
    queryFn: () => fetchList(state),
  });

  const mutation = useMutation({
    mutationFn: runAction,
    onSuccess: () => {
      setPending(null);
      // Les deux onglets changent : un archivage retire d'ici et ajoute là-bas.
      void queryClient.invalidateQueries({ queryKey: ["search-requests-moderation"] });
    },
  });

  const items = listQuery.data?.items ?? [];

  const confirmLabels: Record<PendingAction["kind"], { title: string; description: string; cta: string }> = {
    archive: {
      title: "Archiver cette demande ?",
      description:
        "Elle disparaîtra du site public mais sera conservée : vous pourrez la republier à tout moment depuis l'onglet « Archivées ».",
      cta: "Archiver",
    },
    unarchive: {
      title: "Republier cette demande ?",
      description: "Elle redeviendra visible publiquement sur /demandes-recherche.",
      cta: "Republier",
    },
    delete: {
      title: "Supprimer définitivement ?",
      description:
        "Cette action est irréversible : le document sera détruit et ne pourra pas être récupéré. Si vous souhaitez seulement la retirer du site, utilisez plutôt « Archiver ».",
      cta: "Supprimer définitivement",
    },
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Demandes approuvées</h2>
          <p className="text-sm text-muted-foreground">
            {state === "IN_PROGRESS" ? "Actuellement visibles sur le site public." : "Retirées du site, conservées."}
          </p>
        </div>
        <div className="flex gap-2" role="tablist">
          {(["IN_PROGRESS", "ARCHIVED"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              role="tab"
              aria-selected={state === value}
              variant={state === value ? "default" : "outline"}
              size="sm"
              onClick={() => setState(value)}
            >
              {value === "IN_PROGRESS" ? "Publiées" : "Archivées"}
            </Button>
          ))}
        </div>
      </div>

      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : null}
      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : "Erreur de chargement."}
        </p>
      ) : null}
      {listQuery.data && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {state === "IN_PROGRESS" ? "Aucune demande publiée." : "Aucune demande archivée."}
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className={cn(item.state === "ARCHIVED" && "opacity-70")}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {item.typeProperty} · {item.transactionType === "FOR_RENT" ? "Location" : "Vente"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {item.source === "admin" ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Saisie admin</span>
                  ) : null}
                  {item.boostPaid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      <Sparkles className="h-3 w-3" /> Boost
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>
                  {item.city}
                  {item.neighborhood ? `, ${item.neighborhood}` : ""} ({item.province})
                </p>
                <p>Budget : {formatBudget(item)}</p>
                <p>WhatsApp : {item.whatsappContact}</p>
              </div>

              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{item.description}</p>

              <EditSearchRequestDialog
                item={item}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Modifier
                  </Button>
                }
              />

              <div className="grid grid-cols-2 gap-2">
                {item.state === "IN_PROGRESS" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPending({ kind: "archive", item })}
                  >
                    <Archive className="mr-1.5 h-4 w-4" />
                    Archiver
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPending({ kind: "unarchive", item })}
                  >
                    <ArchiveRestore className="mr-1.5 h-4 w-4" />
                    Republier
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setPending({ kind: "delete", item })}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => (open ? undefined : setPending(null))}>
        <DialogContent>
          {pending ? (
            <>
              <DialogHeader>
                <DialogTitle>{confirmLabels[pending.kind].title}</DialogTitle>
                <DialogDescription>{confirmLabels[pending.kind].description}</DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {pending.item.typeProperty} · {pending.item.city}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{pending.item.description}</p>
              </div>

              {mutation.isError ? (
                <p className="text-xs text-destructive">
                  {mutation.error instanceof Error ? mutation.error.message : "Une erreur est survenue."}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPending(null)}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant={pending.kind === "delete" ? "destructive" : "default"}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(pending)}
                >
                  {mutation.isPending ? "En cours..." : confirmLabels[pending.kind].cta}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
