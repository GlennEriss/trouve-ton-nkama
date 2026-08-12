"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent } from "@trouve-ton-nkama/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";
import type { ReelListItem } from "@/modules/reels-moderation/domain/types";

type PendingReelsResponse = {
  items: ReelListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

async function fetchPendingReels(): Promise<PendingReelsResponse> {
  const response = await fetch("/api/admin/v1/reels/moderation/pending", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Impossible de charger la file de modération.");
  }
  return payload.data as PendingReelsResponse;
}

async function submitDecision(reelId: string, decision: "approve" | "reject", reason?: string) {
  const response = await fetch(`/api/admin/v1/reels/${reelId}/moderation/${decision}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Échec de l'action.");
  }
}

export default function ReelsModerationPage() {
  const queryClient = useQueryClient();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["reels-moderation", "pending"],
    queryFn: fetchPendingReels,
  });

  const handleDecision = async (reelId: string, decision: "approve" | "reject") => {
    let reason: string | undefined;
    if (decision === "reject") {
      reason = window.prompt("Motif du rejet (obligatoire, 3 caractères minimum) :")?.trim();
      if (!reason || reason.length < 3) return;
    }

    setActioningId(reelId);
    try {
      await submitDecision(reelId, decision, reason);
      await queryClient.invalidateQueries({ queryKey: ["reels-moderation", "pending"] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modération des réels"
        description="Vidéos en attente de validation avant publication."
      />

      {pendingQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {pendingQuery.isError && (
        <p className="text-sm text-destructive">
          {pendingQuery.error instanceof Error ? pendingQuery.error.message : "Erreur de chargement."}
        </p>
      )}
      {pendingQuery.data && pendingQuery.data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun réel en attente de modération.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingQuery.data?.items.map((reel) => (
          <Card key={reel.id} className="overflow-hidden">
            <CardContent className="p-3 space-y-3">
              {reel.videoUrl ? (
                <video
                  src={reel.videoUrl}
                  poster={reel.thumbnailUrl ?? undefined}
                  controls
                  className="w-full aspect-[9/16] rounded-lg bg-black object-cover"
                />
              ) : (
                <div className="w-full aspect-[9/16] rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  Vidéo indisponible
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Annonce : {reel.propertyId}</p>
                <p>Annonceur : {reel.createdBy}</p>
                {reel.durationSeconds != null && <p>Durée : {Math.round(reel.durationSeconds)}s</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-9 text-success hover:bg-success/10"
                  disabled={actioningId === reel.id}
                  onClick={() => handleDecision(reel.id, "approve")}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-destructive hover:bg-destructive/10"
                  disabled={actioningId === reel.id}
                  onClick={() => handleDecision(reel.id, "reject")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
