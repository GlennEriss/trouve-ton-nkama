import { createHash } from 'node:crypto'

const VALID_VISITOR_ID = /^[a-zA-Z0-9_-]{12,128}$/

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

export function resolveStatisticsActor(
  request: Pick<Request, 'headers'>,
  suppliedVisitorId?: unknown,
): string {
  const visitorId = typeof suppliedVisitorId === 'string'
    ? suppliedVisitorId.trim()
    : ''

  if (VALID_VISITOR_ID.test(visitorId)) {
    return digest(`visitor:${visitorId}`)
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const realIp = request.headers.get('x-real-ip')?.trim() ?? ''
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? ''
  const language = request.headers.get('accept-language')?.slice(0, 128) ?? ''

  return digest(`request:${forwardedFor || realIp || 'unknown'}:${userAgent}:${language}`)
}
