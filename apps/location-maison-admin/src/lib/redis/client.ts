import { Redis } from '@upstash/redis'

// Même instance Upstash que location-maison (UPSTASH_REDIS_REST_URL/TOKEN partagés) —
// utilisé uniquement pour invalider le cache `property:{id}` de l'app publique quand
// une annonce est approuvée/rejetée depuis ce panneau admin (cf. property.form provider
// invalidation cross-repo). Ne pas confondre avec un cache propre à l'admin, il n'y en a pas.

declare global {
  var _redis: Redis | undefined
}

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? global._redis ?? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

if (redis) {
  global._redis ??= redis
}

export default redis
