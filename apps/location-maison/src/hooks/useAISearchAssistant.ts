'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { auth } from '@/firebase/auth';
import { useCurrentUser } from '@/hooks/use-current-user';
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';

export type AISearchFilters = {
  query?: string;
  province?: string;
  city?: string;
  street?: string;
  minPrice?: number;
  maxPrice?: number;
  minNbrRooms?: number;
  maxNbrRooms?: number;
  typeProperty?: string[];
  status?: Array<'FOR_RENT' | 'FOR_SALE'>;
  tags?: string[];
};

export type AISuggestedAction = {
  type: 'APPLY_FILTERS';
  label: string;
  reason: string;
  payload: Partial<AISearchFilters>;
};

export type AISearchMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  createdAt: string;
  creditsDebited?: number;
  creditsRemaining?: number;
  suggestedActions?: AISuggestedAction[];
};

export type AISearchResponsePayload = {
  success: boolean;
  conversationId: string;
  assistantMessage: string;
  suggestedActions: AISuggestedAction[];
  search: {
    ran: boolean;
    query: string | null;
    filters: string | null;
    queryId: string | null;
    indexName: string | null;
    appliedFilters: AISearchFilters;
    nbHits: number;
    hits: any[];
    resultStatus: 'none' | 'few' | 'enough';
  };
  usage: {
    searchCallsDelta: number;
    searchCallsTotal: number;
    inputTokens: number;
    outputTokens: number;
  };
  billing: {
    creditsDebited: number;
    creditsRemaining: number;
    creditsDebitedTotal: number;
    transactionId: string | null;
  };
  finance: {
    costEstimatedFcfa: number;
    revenueEstimatedFcfa: number;
    marginRate: number;
  };
};

type SendMessageOptions = {
  forceSearch?: boolean;
  entrypointSource?: 'search_cta' | 'direct' | 'other';
  overrideFilters?: Partial<AISearchFilters>;
};

type UseAISearchAssistantOptions = {
  initialFilters?: AISearchFilters;
  entrypointSource?: 'search_cta' | 'direct' | 'other';
};

function buildConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mergeUnique(values: string[] | undefined, extra: string[] | undefined): string[] {
  return Array.from(new Set([...(values ?? []), ...(extra ?? [])]));
}

function mergeFilters(base: AISearchFilters, next?: Partial<AISearchFilters>): AISearchFilters {
  if (!next) return base;

  return {
    ...base,
    ...next,
    typeProperty: mergeUnique(base.typeProperty, next.typeProperty),
    tags: mergeUnique(base.tags, next.tags),
    status: mergeUnique(base.status, next.status) as AISearchFilters['status'],
  };
}

export function useAISearchAssistant(options?: UseAISearchAssistantOptions) {
  const conversationIdRef = useRef<string>(buildConversationId());
  const trackedClicksRef = useRef<Set<string>>(new Set());
  const { trackEvent } = useTrackEvent();
  const { data: session, update } = useSession();
  const { user, isFirebaseConnected } = useCurrentUser();

  const [messages, setMessages] = useState<AISearchMessage[]>([
    {
      id: `system-${Date.now()}`,
      role: 'system',
      content:
        "Assistant IA Recherche prêt. Donnez vos critères (budget, zone, type de bien, chambres) et je lance la recherche utile.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [filters, setFilters] = useState<AISearchFilters>(options?.initialFilters ?? {});
  const [results, setResults] = useState<any[]>([]);
  const [resultStatus, setResultStatus] = useState<'none' | 'few' | 'enough'>('none');
  const [nbHits, setNbHits] = useState(0);
  const [searchCallsTotal, setSearchCallsTotal] = useState(0);
  const [creditsDebitedTotal, setCreditsDebitedTotal] = useState(0);
  const [lastSearchQueryId, setLastSearchQueryId] = useState<string | null>(null);
  const [lastSearchIndexName, setLastSearchIndexName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const creditsAvailable = useMemo(() => {
    const fromUser = Number(user?.credits ?? NaN);
    if (Number.isFinite(fromUser)) return fromUser;
    return Number((session?.user as any)?.credits ?? 0);
  }, [session?.user, user?.credits]);

  const pushMessage = useCallback((message: AISearchMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const sendMessage = useCallback(
    async (rawMessage: string, sendOptions?: SendMessageOptions): Promise<{ success: boolean; error?: string }> => {
      const message = rawMessage.trim();
      if (!message) return { success: false, error: 'Message vide' };

      setLastError(null);
      pushMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      });

      if (!auth.currentUser) {
        const errorMessage = "Connexion Firebase en cours. Réessayez dans quelques secondes.";
        setLastError(errorMessage);
        pushMessage({
          id: `error-${Date.now()}`,
          role: 'error',
          content: errorMessage,
          createdAt: new Date().toISOString(),
        });
        return { success: false, error: errorMessage };
      }

      const mergedFilters = mergeFilters(filters, sendOptions?.overrideFilters);
      if (sendOptions?.overrideFilters) {
        setFilters(mergedFilters);
      }

      try {
        setIsLoading(true);

        trackEvent(trackingEvents.AI_SEARCH_MESSAGE_SENT, {
          source: sendOptions?.entrypointSource ?? options?.entrypointSource ?? 'other',
          conversation_id: conversationIdRef.current,
        });

        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch('/api/ai-search/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            message,
            currentFilters: mergedFilters,
            forceSearch: sendOptions?.forceSearch ?? false,
            entrypointSource: sendOptions?.entrypointSource ?? options?.entrypointSource ?? 'other',
          }),
        });

        const payload = (await response.json()) as
          | AISearchResponsePayload
          | { success?: false; error?: { message?: string } };

        if (!response.ok || !('success' in payload) || !payload.success) {
          const errorMessage =
            (payload as any)?.error?.message ?? "Erreur lors de la recherche assistée par IA.";
          setLastError(errorMessage);
          pushMessage({
            id: `error-${Date.now()}`,
            role: 'error',
            content: errorMessage,
            createdAt: new Date().toISOString(),
          });
          return { success: false, error: errorMessage };
        }

        const aiPayload = payload as AISearchResponsePayload;

        pushMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiPayload.assistantMessage,
          createdAt: new Date().toISOString(),
          creditsDebited: aiPayload.billing.creditsDebited,
          creditsRemaining: aiPayload.billing.creditsRemaining,
          suggestedActions: aiPayload.suggestedActions,
        });

        setFilters(aiPayload.search.appliedFilters);
        if (aiPayload.search.ran) {
          setResults(aiPayload.search.hits ?? []);
          setResultStatus(aiPayload.search.resultStatus);
          setNbHits(aiPayload.search.nbHits ?? 0);
        }
        setSearchCallsTotal(aiPayload.usage.searchCallsTotal ?? 0);
        setCreditsDebitedTotal(aiPayload.billing.creditsDebitedTotal ?? 0);
        if (aiPayload.search.ran) {
          setLastSearchQueryId(aiPayload.search.queryId ?? null);
          setLastSearchIndexName(aiPayload.search.indexName ?? null);
          trackedClicksRef.current = new Set();
        }

        if (aiPayload.usage.searchCallsDelta > 0) {
          trackEvent(trackingEvents.AI_SEARCH_SEARCH_CALL, {
            conversation_id: conversationIdRef.current,
            result_status: aiPayload.search.resultStatus,
            nb_hits: aiPayload.search.nbHits,
          });
        }

        if (aiPayload.billing.creditsDebited > 0) {
          trackEvent(trackingEvents.AI_SEARCH_CREDIT_DEBITED, {
            conversation_id: conversationIdRef.current,
            credits_debited: aiPayload.billing.creditsDebited,
            credits_remaining: aiPayload.billing.creditsRemaining,
          });

          const sessionUser = session?.user as any;
          if (sessionUser && typeof aiPayload.billing.creditsRemaining === 'number') {
            await update({
              user: {
                ...sessionUser,
                credits: aiPayload.billing.creditsRemaining,
              },
            });
          }
        }

        return { success: true };
      } catch (error) {
        const errorMessage = "Erreur réseau lors de la recherche assistée par IA.";
        setLastError(errorMessage);
        pushMessage({
          id: `error-${Date.now()}`,
          role: 'error',
          content: errorMessage,
          createdAt: new Date().toISOString(),
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [
      filters,
      options?.entrypointSource,
      pushMessage,
      session?.user,
      trackEvent,
      update,
    ]
  );

  const applySuggestedAction = useCallback(
    async (action: AISuggestedAction) => {
      if (action.type !== 'APPLY_FILTERS') return;
      const result = await sendMessage('Relance la recherche avec ces filtres.', {
        forceSearch: true,
        overrideFilters: action.payload,
      });
      return result.success;
    },
    [sendMessage]
  );

  const trackResultClick = useCallback(
    async (hit: any, position: number) => {
      const objectId = String(hit?.objectID ?? hit?.id ?? '').trim();
      if (!objectId || !lastSearchQueryId || !auth.currentUser) {
        return;
      }

      const dedupeKey = `${lastSearchQueryId}:${objectId}`;
      if (trackedClicksRef.current.has(dedupeKey)) {
        return;
      }
      trackedClicksRef.current.add(dedupeKey);

      trackEvent(trackingEvents.AI_SEARCH_RESULT_CLICK, {
        conversation_id: conversationIdRef.current,
        object_id: objectId,
        position,
        query_id: lastSearchQueryId,
      });

      try {
        const idToken = await auth.currentUser.getIdToken();
        await fetch('/api/ai-search/insights/click', {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            objectId,
            queryId: lastSearchQueryId,
            indexName: lastSearchIndexName ?? undefined,
            position,
            entrypointSource: options?.entrypointSource ?? 'other',
          }),
        });
      } catch {
        // Ne pas bloquer l'UX si l'analytics Algolia échoue.
      }
    },
    [lastSearchIndexName, lastSearchQueryId, options?.entrypointSource, trackEvent]
  );

  return {
    conversationId: conversationIdRef.current,
    messages,
    filters,
    setFilters,
    results,
    nbHits,
    resultStatus,
    searchCallsTotal,
    creditsDebitedTotal,
    creditsAvailable,
    isLoading,
    lastError,
    isFirebaseConnected,
    sendMessage,
    applySuggestedAction,
    trackResultClick,
  };
}

export default useAISearchAssistant;
