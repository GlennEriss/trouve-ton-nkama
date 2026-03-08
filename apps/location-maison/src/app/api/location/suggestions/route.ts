import { NextRequest, NextResponse } from 'next/server';
import redis from '@/redis/client';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.location.suggestions');

const suggestionsParamsSchema = z.object({
  q: z.string().min(1, 'La recherche doit contenir au moins 1 caractère').max(50),
  limit: z.string().optional().transform((val) => (val ? Math.min(parseInt(val, 10), 20) : 10)),
});

const REDIS_KEYS = {
  AUTOCOMPLETE: 'gabon:autocomplete',
  POPULAR_SEARCHES: 'gabon:popular',
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = suggestionsParamsSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { q: query, limit } = validation.data;
    const normalizedQuery = query.toLowerCase().trim();

    try {
      const autocompleteResults = await redis.zrange(REDIS_KEYS.AUTOCOMPLETE, 0, -1, { rev: true, withScores: true });

      const matchingSuggestions: Array<{ text: string; score: number; type: 'autocomplete' | 'popular' }> = [];

      for (let i = 0; i < autocompleteResults.length; i += 2) {
        const suggestion = autocompleteResults[i] as string;
        const score = autocompleteResults[i + 1] as number;

        if (suggestion.startsWith(normalizedQuery)) {
          matchingSuggestions.push({
            text: suggestion,
            score,
            type: 'autocomplete',
          });
        }
      }

      let popularSuggestions: Array<{ text: string; score: number; type: 'autocomplete' | 'popular' }> = [];
      if (matchingSuggestions.length < limit) {
        const popularResults = await redis.zrange(REDIS_KEYS.POPULAR_SEARCHES, 0, limit * 2, { rev: true, withScores: true });

        for (let i = 0; i < popularResults.length; i += 2) {
          const suggestion = popularResults[i] as string;
          const score = popularResults[i + 1] as number;

          if (suggestion.includes(normalizedQuery) && !matchingSuggestions.some((m) => m.text === suggestion)) {
            popularSuggestions.push({
              text: suggestion,
              score,
              type: 'popular',
            });
          }
        }
      }

      const allSuggestions = [...matchingSuggestions, ...popularSuggestions]
        .sort((a, b) => {
          if (a.type === 'autocomplete' && b.type === 'popular') return -1;
          if (a.type === 'popular' && b.type === 'autocomplete') return 1;
          return b.score - a.score;
        })
        .slice(0, limit)
        .map((item) => ({
          text: item.text,
          type: item.type,
          highlighted: highlightMatch(item.text, normalizedQuery),
        }));

      return NextResponse.json({
        suggestions: allSuggestions,
        query: normalizedQuery,
        count: allSuggestions.length,
      });
    } catch (redisError) {
      logger.warn('Redis suggestions retrieval failed, using fallback', {
        query: normalizedQuery,
        error: redisError,
      });

      return NextResponse.json({
        suggestions: generateFallbackSuggestions(normalizedQuery),
        query: normalizedQuery,
        count: 0,
        fallback: true,
      });
    }
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location/suggestions',
      fallbackMessage: 'Erreur dans l\'API de suggestions',
    });
  }
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function generateFallbackSuggestions(query: string) {
  const fallbackCities = [
    'libreville',
    'port-gentil',
    'franceville',
    'oyem',
    'mouila',
    'lambaréné',
    'tchibanga',
    'koulamoutou',
    'makokou',
  ];

  return fallbackCities
    .filter((city) => city.includes(query.toLowerCase()))
    .slice(0, 5)
    .map((city) => ({
      text: city,
      type: 'fallback',
      highlighted: highlightMatch(city, query),
    }));
}
