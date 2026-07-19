import { NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'

const logger = createLogger('api.health', {
  operation: 'application.health',
  incidentCategory: 'api',
})

const ALWAYS_REQUIRED = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXTAUTH_SECRET',
]

const SERVER_REQUIRED_IN_PRODUCTION = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
]

export async function GET() {
  const required = process.env.NODE_ENV === 'production'
    ? [...ALWAYS_REQUIRED, ...SERVER_REQUIRED_IN_PRODUCTION]
    : ALWAYS_REQUIRED
  const cacheBackend = (process.env.CACHE_BACKEND ?? 'redis').trim().toLowerCase()
  if (cacheBackend === 'redis') {
    required.push('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN')
  }

  const missingVariables = required.filter((name) => !process.env[name]?.trim())
  if (missingVariables.length > 0) {
    logger.error('Application health check failed', {
      incidentCode: 'MISSING_RUNTIME_CONFIGURATION',
      retryable: false,
      missingVariables,
    })
    return NextResponse.json(
      { status: 'degraded', timestamp: new Date().toISOString() },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    )
  }

  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}
