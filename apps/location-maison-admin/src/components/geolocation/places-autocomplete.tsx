"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@trouve-ton-nkama/ui/input";

export type PlaceDetailsResult = {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province: string | null;
  city: string | null;
  quarter: string | null;
};

type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type AutocompleteData = { suggestions: Suggestion[] };

type DetailsData =
  | { found: false }
  | ({ found: true } & PlaceDetailsResult);

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: { message?: string } };

type PlacesAutocompleteProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (details: PlaceDetailsResult) => void;
  kind: "city" | "quarter";
  placeholder?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
};

function newSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Locality picker backed by Google Places autocomplete (proxied server-side).
 * The admin types, picks an official suggestion, and the parent receives the
 * normalized name plus coordinates/administrative area — avoiding misspelled or
 * made-up city/quarter names.
 */
export function PlacesAutocomplete({
  value,
  onValueChange,
  onSelect,
  kind,
  placeholder,
  disabled,
  onError,
}: PlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string>(newSessionToken());
  // Skips the autocomplete fetch triggered by the value update from a selection.
  const suppressNextFetchRef = useRef(false);

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Debounced fetch of suggestions as the query changes. All state updates run
  // inside the debounce callback (never synchronously in the effect body).
  useEffect(() => {
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      return;
    }
    const query = value.trim();
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (disabled || query.length < 2) {
        setSuggestions([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, kind, sessionToken: sessionTokenRef.current });
        const response = await fetch(`/api/admin/v1/places/autocomplete?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiEnvelope<AutocompleteData>;
        if (cancelled) return;
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Échec de l'autocomplétion." : payload.error?.message || "Échec de l'autocomplétion.");
        }
        setSuggestions(payload.data.suggestions);
        setActiveIndex(-1);
        setOpen(payload.data.suggestions.length > 0);
      } catch (error) {
        if (cancelled) return;
        setSuggestions([]);
        setOpen(false);
        onError?.(error instanceof Error ? error.message : "Échec de l'autocomplétion Google Places.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, kind, disabled, onError]);

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      suppressNextFetchRef.current = true;
      onValueChange(suggestion.mainText);
      setOpen(false);
      setSuggestions([]);
      setLoading(true);
      try {
        const params = new URLSearchParams({ placeId: suggestion.placeId, sessionToken: sessionTokenRef.current });
        const response = await fetch(`/api/admin/v1/places/details?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json()) as ApiEnvelope<DetailsData>;
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Échec de la récupération du lieu." : payload.error?.message || "Échec de la récupération du lieu.");
        }
        const data = payload.data;
        if (data.found) {
          onSelect({
            // Prefer the concise suggestion label over Google's full place name.
            name: suggestion.mainText || data.name,
            formattedAddress: data.formattedAddress,
            latitude: data.latitude,
            longitude: data.longitude,
            province: data.province,
            city: data.city,
            quarter: data.quarter,
          });
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "Échec de la récupération du lieu Google Places.");
      } finally {
        setLoading(false);
        // A new session token starts a fresh billing session for the next pick.
        sessionTokenRef.current = newSessionToken();
      }
    },
    [onSelect, onValueChange, onError],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || suggestions.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (event.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          event.preventDefault();
          void handleSelect(suggestions[activeIndex]);
        }
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    },
    [open, suggestions, activeIndex, handleSelect],
  );

  const showDropdown = useMemo(() => open && suggestions.length > 0, [open, suggestions.length]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {loading ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>
      ) : null}
      {showDropdown ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId}>
              <button
                type="button"
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted ${
                  index === activeIndex ? "bg-muted" : ""
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void handleSelect(suggestion)}
              >
                <span className="font-medium text-foreground">{suggestion.mainText}</span>
                {suggestion.secondaryText ? (
                  <span className="text-xs text-muted-foreground">{suggestion.secondaryText}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
