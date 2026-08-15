'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Bot, Loader2, Search } from 'lucide-react';
import PropertyCard from '@/components/home-page/PropertyCard';
import InlineAdUnit from '@/components/ads/InlineAdUnit';
import { ADSENSE_SLOTS } from '@/lib/ads/config';
import useAISearchAssistant, { AISearchFilters, AISearchMessage } from '@/hooks/useAISearchAssistant';
import { routes } from '@/constantes/routes';
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInitialFilters(searchParams: URLSearchParams): AISearchFilters {
  const typeProperty = searchParams.get('typeProperty');
  const status = searchParams.get('status');
  const tags = searchParams.get('tags');

  return {
    query: searchParams.get('query') ?? undefined,
    province: searchParams.get('province') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    street: searchParams.get('street') ?? undefined,
    minPrice: parseOptionalNumber(searchParams.get('minPrice')),
    maxPrice: parseOptionalNumber(searchParams.get('maxPrice')),
    minNbrRooms: parseOptionalNumber(searchParams.get('minNbrRooms')),
    maxNbrRooms: parseOptionalNumber(searchParams.get('maxNbrRooms')),
    typeProperty: typeProperty ? typeProperty.split(',').map((value) => value.trim()) : undefined,
    status: status ? (status.split(',').map((value) => value.trim()) as Array<'FOR_RENT' | 'FOR_SALE'>) : undefined,
    tags: tags ? tags.split(',').map((value) => value.trim()) : undefined,
  };
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function MessageItem({
  message,
  onApplyAction,
}: {
  message: AISearchMessage;
  onApplyAction: (payload: any) => void;
}) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm',
          isUser ? 'bg-primary text-white' : '',
          isError ? 'bg-red-50 text-red-700 border border-red-200' : '',
          isSystem ? 'bg-amber-50 text-amber-800 border border-amber-200' : '',
          !isUser && !isError && !isSystem ? 'bg-gray-100 text-gray-800 border border-gray-200' : '',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <div className="mt-2 text-[11px] opacity-75 flex flex-wrap items-center gap-2">
          <span>{formatDateTime(message.createdAt)}</span>
          {typeof message.creditsDebited === 'number' && message.creditsDebited > 0 && (
            <span>-{message.creditsDebited} crédit</span>
          )}
          {typeof message.creditsRemaining === 'number' && <span>{message.creditsRemaining} restant(s)</span>}
        </div>

        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestedActions.map((action) => (
              <button
                key={`${message.id}-${action.label}`}
                type="button"
                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                onClick={() => onApplyAction(action)}
                title={action.reason}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchWithAIPage() {
  const searchParams = useSearchParams();
  const { trackEvent } = useTrackEvent();

  const initialFilters = useMemo(
    () => parseInitialFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const rawEntrypoint = searchParams.get('entry');
  const entrypointSource =
    rawEntrypoint === 'search_cta' || rawEntrypoint === 'direct' || rawEntrypoint === 'other'
      ? rawEntrypoint
      : 'direct';

  const {
    messages,
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
  } = useAISearchAssistant({
    initialFilters,
    entrypointSource,
  });

  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickPrompts = [
    'Je cherche une maison 3 chambres à Libreville max 190000 FCFA',
    "Trouve-moi un appartement à louer avec 2 chambres",
    'Je veux des logements avec tag Meublé et Parking',
  ];

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isLoading) return;
    setDraft('');
    await sendMessage(message, { entrypointSource });
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 h-full">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
              <Bot className="w-6 h-6" />
              Recherche avec IA
            </h1>
            <p className="text-sm text-gray-600">
              Assistance conversationnelle dédiée pour trouver un logement et ajuster les filtres automatiquement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={routes.public.search_property}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à /search
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4 xl:h-[calc(100vh-210px)]">
          <section className="border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col min-h-[460px] xl:min-h-0">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Session IA</p>
                  <p className="text-gray-500">
                    {searchCallsTotal} recherche(s) • {creditsDebitedTotal} crédit(s) débité(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Crédits disponibles</p>
                  <p className="text-lg font-bold text-primary">{creditsAvailable}</p>
                </div>
              </div>
              {!isFirebaseConnected && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  Synchronisation Firebase en cours...
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  onApplyAction={(action) => {
                    void applySuggestedAction(action);
                  }}
                />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse et recherche en cours...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 space-y-3">
              <form onSubmit={onSubmit} className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ex: maison 3 chambres max 190000 FCFA à Libreville"
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary text-white px-3 py-2 text-sm disabled:opacity-60"
                  disabled={isLoading || !draft.trim()}
                >
                  <Search className="w-4 h-4" />
                  Envoyer
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="text-xs px-2.5 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setDraft(prompt);
                      trackEvent(trackingEvents.AI_SEARCH_MESSAGE_SENT, {
                        source: 'quick_prompt',
                      });
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col min-h-[420px] xl:min-h-0">
            <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Résultats IA</h2>
                <p className="text-sm text-gray-500">
                  {nbHits} résultat(s) • statut {resultStatus === 'none' ? 'aucun' : resultStatus === 'few' ? 'peu' : 'suffisant'}
                </p>
              </div>

              <div className="text-xs text-gray-500">
                La facturation se déclenche uniquement quand une recherche est réellement exécutée.
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {lastError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {lastError}
                </div>
              )}

              {results.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500 text-sm px-6">
                  Lance une recherche dans le chat IA pour afficher des logements ici.
                </div>
              ) : (
                <>
                  {/* flex-wrap plutôt qu'un nombre de colonnes fixe (2026-08-15, demande
                      utilisateur explicite) : card à taille fixe (220px), colonnes adaptatives.
                      Largeur en % sous sm (2 cards par ligne sur mobile étroit) puis fixe. */}
                  <div className="flex flex-wrap gap-4">
                    {results.map((hit, index) => (
                      <div
                        key={hit.objectID}
                        className="w-[calc(50%-0.5rem)] sm:w-[220px]"
                        onClickCapture={() => {
                          void trackResultClick(hit, index + 1);
                        }}
                      >
                        <PropertyCard property={hit} />
                      </div>
                    ))}
                  </div>

                  <InlineAdUnit
                    className="mt-4"
                    slot={ADSENSE_SLOTS.searchAi}
                    slotKey="search-ai-results"
                    compact
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
