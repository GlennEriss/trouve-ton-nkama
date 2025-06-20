import { Redis } from '@upstash/redis'

// Utilisation d'un singleton pour éviter plusieurs initialisations en mode dev (Hot Reload)
// et pour partager la connexion entre les fonctions.

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined
}

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Les variables UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN doivent être définies')
}

const redis = global._redis ?? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Stocker l'instance dans le global pour la réutiliser
if (!global._redis) global._redis = redis

export default redis 