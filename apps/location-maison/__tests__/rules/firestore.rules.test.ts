/**
 * @jest-environment node
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  setLogLevel,
  updateDoc,
} from 'firebase/firestore'

const PROJECT_ID =
  process.env.GCLOUD_PROJECT ??
  process.env.FIREBASE_PROJECT_ID ??
  `location-maison-rules-${Date.now()}`

let testEnv: RulesTestEnvironment

function emulatorHostAndPort() {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
  const [host, portRaw] = raw.split(':')
  return {
    host: host || '127.0.0.1',
    port: Number(portRaw || 8080),
  }
}

function authedDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore()
}

function anonDb() {
  return testEnv.unauthenticatedContext().firestore()
}

async function seed(pathName: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), pathName), data)
  })
}

async function seedBaseUsers() {
  await seed('users/announcer', {
    uid: 'announcer',
    roles: ['User', 'Announcer'],
    credits: 100,
    metadata: {},
    state: 'IN_PROGRESS',
  })
  await seed('users/user', {
    uid: 'user',
    roles: ['User'],
    credits: 10,
    metadata: {},
    state: 'IN_PROGRESS',
  })
  await seed('users/incomplete', {
    uid: 'incomplete',
    roles: ['User'],
    credits: 3,
    metadata: { needsProfileCompletion: true },
    state: 'IN_PROGRESS',
  })
}

beforeAll(async () => {
  setLogLevel('error')
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      ...emulatorHostAndPort(),
      rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedBaseUsers()
})

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup()
  }
})

describe('firestore.rules users', () => {
  it('autorise la creation d un profil utilisateur standard', async () => {
    await assertSucceeds(
      setDoc(doc(authedDb('new-user'), 'users/new-user'), {
        uid: 'new-user',
        roles: ['User'],
        credits: 3,
        state: 'IN_PROGRESS',
      }),
    )
  })

  it('refuse la creation d un profil avec credits ou role sensible arbitraires', async () => {
    await assertFails(
      setDoc(doc(authedDb('new-rich-user'), 'users/new-rich-user'), {
        uid: 'new-rich-user',
        roles: ['User'],
        credits: 999,
        state: 'IN_PROGRESS',
      }),
    )
    await assertFails(
      setDoc(doc(authedDb('new-admin'), 'users/new-admin'), {
        uid: 'new-admin',
        roles: ['User', 'Admin'],
        credits: 3,
        state: 'IN_PROGRESS',
      }),
    )
  })

  it('autorise la mise a jour des champs profil non financiers', async () => {
    await assertSucceeds(
      updateDoc(doc(authedDb('user'), 'users/user'), {
        firstname: 'Glenn',
        lastname: 'Eriss',
        searchableName: 'Glenn Eriss',
      }),
    )
  })

  it('refuse qu un utilisateur augmente ses credits', async () => {
    await assertFails(
      updateDoc(doc(authedDb('user'), 'users/user'), {
        credits: 9999,
      }),
    )
  })

  it('autorise uniquement une deduction client de credits', async () => {
    await assertSucceeds(
      updateDoc(doc(authedDb('user'), 'users/user'), {
        credits: 9,
      }),
    )
    await assertFails(
      updateDoc(doc(authedDb('user'), 'users/user'), {
        credits: 11,
      }),
    )
  })

  it('refuse une escalation libre de role', async () => {
    await assertFails(
      updateDoc(doc(authedDb('user'), 'users/user'), {
        roles: ['User', 'Admin'],
      }),
    )
  })

  it('autorise le choix User/Announcer uniquement pendant complete-profile', async () => {
    await assertSucceeds(
      updateDoc(doc(authedDb('incomplete'), 'users/incomplete'), {
        roles: ['User', 'Announcer'],
        metadata: { needsProfileCompletion: false },
      }),
    )
    await assertFails(
      updateDoc(doc(authedDb('incomplete'), 'users/incomplete'), {
        roles: ['User', 'Admin'],
        metadata: { needsProfileCompletion: false },
      }),
    )
  })
})

describe('firestore.rules properties', () => {
  it('autorise un annonceur a creer une annonce PENDING', async () => {
    await assertSucceeds(
      setDoc(doc(authedDb('announcer'), 'properties/property-ok'), {
        createdBy: 'announcer',
        moderationStatus: 'PENDING',
        state: 'IN_PROGRESS',
      }),
    )
  })

  it('refuse une creation annonce approuvee ou par un non annonceur', async () => {
    await assertFails(
      setDoc(doc(authedDb('announcer'), 'properties/property-approved'), {
        createdBy: 'announcer',
        moderationStatus: 'APPROVED',
        state: 'IN_PROGRESS',
      }),
    )
    await assertFails(
      setDoc(doc(authedDb('user'), 'properties/property-user'), {
        createdBy: 'user',
        moderationStatus: 'PENDING',
        state: 'IN_PROGRESS',
      }),
    )
  })

  it('refuse au proprietaire de s auto-approuver', async () => {
    await seed('properties/property-pending', {
      createdBy: 'announcer',
      moderationStatus: 'PENDING',
      state: 'IN_PROGRESS',
    })

    await assertFails(
      updateDoc(doc(authedDb('announcer'), 'properties/property-pending'), {
        moderationStatus: 'APPROVED',
      }),
    )
  })

  it('autorise la resoumission REJECTED vers PENDING', async () => {
    await seed('properties/property-rejected', {
      createdBy: 'announcer',
      moderationStatus: 'REJECTED',
      state: 'IN_PROGRESS',
    })

    await assertSucceeds(
      updateDoc(doc(authedDb('announcer'), 'properties/property-rejected'), {
        moderationStatus: 'PENDING',
      }),
    )
  })

  it('autorise le propriétaire à modifier et supprimer son annonce', async () => {
    await seed('properties/property-owned', {
      createdBy: 'announcer',
      moderationStatus: 'PENDING',
      state: 'IN_PROGRESS',
      price: 40000,
    })

    const propertyRef = doc(authedDb('announcer'), 'properties/property-owned')
    await assertSucceeds(updateDoc(propertyRef, { price: 45000 }))
    await assertSucceeds(deleteDoc(propertyRef))
  })

  it('refuse à un autre utilisateur de modifier ou supprimer l annonce', async () => {
    await seed('properties/property-other', {
      createdBy: 'announcer',
      moderationStatus: 'PENDING',
      state: 'IN_PROGRESS',
      price: 40000,
    })

    const propertyRef = doc(authedDb('user'), 'properties/property-other')
    await assertFails(updateDoc(propertyRef, { price: 1 }))
    await assertFails(deleteDoc(propertyRef))
  })

  it('autorise l announceur revendicateur (claimedBy) a modifier et supprimer une annonce co-geree', async () => {
    await seed('users/claimant', {
      uid: 'claimant',
      roles: ['User', 'Announcer'],
      credits: 100,
      metadata: {},
      state: 'IN_PROGRESS',
    })
    await seed('properties/property-claimed', {
      createdBy: 'announcer',
      claimedBy: 'claimant',
      moderationStatus: 'PENDING',
      state: 'IN_PROGRESS',
      price: 40000,
    })

    const propertyRef = doc(authedDb('claimant'), 'properties/property-claimed')
    await assertSucceeds(updateDoc(propertyRef, { price: 45000 }))
    await assertSucceeds(deleteDoc(propertyRef))
  })

  it('refuse a un tiers non createdBy/claimedBy de modifier ou supprimer une annonce co-geree', async () => {
    await seed('properties/property-claimed-other', {
      createdBy: 'announcer',
      claimedBy: 'claimant',
      moderationStatus: 'PENDING',
      state: 'IN_PROGRESS',
      price: 40000,
    })

    const propertyRef = doc(authedDb('user'), 'properties/property-claimed-other')
    await assertFails(updateDoc(propertyRef, { price: 1 }))
    await assertFails(deleteDoc(propertyRef))
  })

  it('autorise toujours le createdBy d origine meme quand claimedBy est defini pour quelqu un d autre', async () => {
    await seed('properties/property-created-and-claimed', {
      createdBy: 'announcer',
      claimedBy: 'claimant',
      moderationStatus: 'PENDING',
      state: 'IN_PROGRESS',
      price: 40000,
    })

    const propertyRef = doc(authedDb('announcer'), 'properties/property-created-and-claimed')
    await assertSucceeds(updateDoc(propertyRef, { price: 45000 }))
  })
})

describe('firestore.rules reels', () => {
  beforeEach(async () => {
    await seed('properties/owned-property', {
      createdBy: 'announcer',
      moderationStatus: 'APPROVED',
      state: 'IN_PROGRESS',
    })
    await seed('properties/other-property', {
      createdBy: 'other',
      moderationStatus: 'APPROVED',
      state: 'IN_PROGRESS',
    })
    await seed('users/claimant', {
      uid: 'claimant',
      roles: ['User', 'Announcer'],
      credits: 100,
      metadata: {},
      state: 'IN_PROGRESS',
    })
    await seed('properties/claimed-property', {
      createdBy: 'announcer',
      claimedBy: 'claimant',
      moderationStatus: 'APPROVED',
      state: 'IN_PROGRESS',
    })
  })

  it('autorise la creation reel rattache a une annonce revendiquee (claimedBy)', async () => {
    await assertSucceeds(
      setDoc(doc(authedDb('claimant'), 'reels/claimed-reel'), {
        createdBy: 'claimant',
        propertyId: 'claimed-property',
        moderationStatus: 'PENDING',
        processingStatus: 'uploading',
      }),
    )
  })

  it('autorise la creation reel orphelin ou rattache a une annonce possedee', async () => {
    await assertSucceeds(
      setDoc(doc(authedDb('announcer'), 'reels/orphan-reel'), {
        createdBy: 'announcer',
        propertyId: null,
        moderationStatus: 'PENDING',
        processingStatus: 'uploading',
      }),
    )
    await assertSucceeds(
      setDoc(doc(authedDb('announcer'), 'reels/attached-reel'), {
        createdBy: 'announcer',
        propertyId: 'owned-property',
        moderationStatus: 'PENDING',
        processingStatus: 'uploading',
      }),
    )
  })

  it('refuse un reel approuve, traite ou rattache a une annonce non possedee', async () => {
    await assertFails(
      setDoc(doc(authedDb('announcer'), 'reels/approved-reel'), {
        createdBy: 'announcer',
        moderationStatus: 'APPROVED',
        processingStatus: 'uploading',
      }),
    )
    await assertFails(
      setDoc(doc(authedDb('announcer'), 'reels/processed-reel'), {
        createdBy: 'announcer',
        moderationStatus: 'PENDING',
        processingStatus: 'processed',
      }),
    )
    await assertFails(
      setDoc(doc(authedDb('announcer'), 'reels/other-property-reel'), {
        createdBy: 'announcer',
        propertyId: 'other-property',
        moderationStatus: 'PENDING',
        processingStatus: 'uploading',
      }),
    )
  })

  it('autorise la lecture publique seulement pour les reels APPROVED', async () => {
    await seed('reels/approved', {
      createdBy: 'announcer',
      moderationStatus: 'APPROVED',
      processingStatus: 'processed',
    })
    await seed('reels/pending', {
      createdBy: 'announcer',
      moderationStatus: 'PENDING',
      processingStatus: 'uploading',
    })

    await assertSucceeds(getDoc(doc(anonDb(), 'reels/approved')))
    await assertFails(getDoc(doc(anonDb(), 'reels/pending')))
    await assertSucceeds(getDoc(doc(authedDb('announcer'), 'reels/pending')))
  })

  it('autorise uniquement le rattachement propertyId/updatedAt sur un reel orphelin', async () => {
    await seed('reels/orphan-to-attach', {
      createdBy: 'announcer',
      propertyId: null,
      moderationStatus: 'PENDING',
      processingStatus: 'processed',
    })

    await assertSucceeds(
      updateDoc(doc(authedDb('announcer'), 'reels/orphan-to-attach'), {
        propertyId: 'owned-property',
      }),
    )
    await seed('reels/orphan-with-contact', {
      createdBy: 'announcer',
      propertyId: null,
      moderationStatus: 'PENDING',
      processingStatus: 'processed',
    })
    await assertFails(
      updateDoc(doc(authedDb('announcer'), 'reels/orphan-with-contact'), {
        propertyId: 'owned-property',
        contact: '+24166545430',
      }),
    )
  })

  it('refuse la suppression client des reels', async () => {
    await seed('reels/to-delete', {
      createdBy: 'announcer',
      moderationStatus: 'APPROVED',
      processingStatus: 'processed',
    })

    await assertFails(deleteDoc(doc(authedDb('announcer'), 'reels/to-delete')))
  })
})

describe('firestore.rules finances et collections serveur', () => {
  it('autorise uniquement les transactions de depense client negatives', async () => {
    await assertSucceeds(
      setDoc(doc(authedDb('user'), 'credit_transactions/spend-ok'), {
        uid: 'user',
        type: 'spend',
        credits: -1,
        status: 'success',
      }),
    )
    await assertFails(
      setDoc(doc(authedDb('user'), 'credit_transactions/purchase-bad'), {
        uid: 'user',
        type: 'purchase',
        credits: 100,
        status: 'success',
      }),
    )
    await assertFails(
      updateDoc(doc(authedDb('user'), 'credit_transactions/spend-ok'), {
        credits: -2,
      }),
    )
  })

  it('bloque les cadeaux, retraits, pubs et cles idempotence cote client', async () => {
    await seed('gift_transactions/gift-1', { announcerUid: 'announcer', amountXaf: 1000 })
    await seed('gift_withdrawals/withdrawal-1', { announcerUid: 'announcer', statut: 'EN_ATTENTE' })
    await seed('ad_campaigns/ad-1', { createdBy: 'announcer', status: 'active' })
    await seed('idempotency_keys/key-1', { uid: 'announcer', status: 'completed' })

    await assertFails(getDoc(doc(authedDb('announcer'), 'gift_transactions/gift-1')))
    await assertFails(setDoc(doc(authedDb('announcer'), 'gift_transactions/gift-2'), { amountXaf: 1000 }))
    await assertFails(getDoc(doc(authedDb('announcer'), 'gift_withdrawals/withdrawal-1')))
    await assertFails(setDoc(doc(authedDb('announcer'), 'gift_withdrawals/withdrawal-2'), { montantXaf: 1000 }))
    await assertFails(getDoc(doc(authedDb('announcer'), 'ad_campaigns/ad-1')))
    await assertFails(setDoc(doc(authedDb('announcer'), 'ad_campaigns/ad-2'), { status: 'active' }))
    await assertFails(getDoc(doc(authedDb('announcer'), 'idempotency_keys/key-1')))
    await assertFails(setDoc(doc(authedDb('announcer'), 'idempotency_keys/key-2'), { status: 'completed' }))
  })
})

describe('firestore.rules search_requests', () => {
  it('autorise la lecture publique anonyme seulement pour les demandes APPROVED', async () => {
    await seed('search_requests/approved', {
      moderationStatus: 'APPROVED',
      paymentStatus: 'confirmed',
      whatsappContact: '074123456',
    })
    await seed('search_requests/pending', {
      moderationStatus: 'PENDING',
      paymentStatus: 'confirmed',
      whatsappContact: '074123456',
    })
    await seed('search_requests/draft', {
      moderationStatus: null,
      paymentStatus: 'pending_confirmation',
      whatsappContact: '074123456',
    })

    await assertSucceeds(getDoc(doc(anonDb(), 'search_requests/approved')))
    await assertFails(getDoc(doc(anonDb(), 'search_requests/pending')))
    await assertFails(getDoc(doc(anonDb(), 'search_requests/draft')))
    // Même un compte connecté (annonceur) n'a pas de lecture directe sur une
    // demande non approuvée : seul l'Admin SDK (Cloud Function, routes admin)
    // y accède, avant modération.
    await assertFails(getDoc(doc(authedDb('announcer'), 'search_requests/pending')))
  })

  it('bloque toute ecriture client, connecte ou non', async () => {
    await seed('search_requests/existing', {
      moderationStatus: 'APPROVED',
      paymentStatus: 'confirmed',
      whatsappContact: '074123456',
    })

    await assertFails(
      setDoc(doc(anonDb(), 'search_requests/new-anon'), {
        moderationStatus: null,
        paymentStatus: 'pending_confirmation',
      }),
    )
    await assertFails(
      setDoc(doc(authedDb('announcer'), 'search_requests/new-authed'), {
        moderationStatus: null,
        paymentStatus: 'pending_confirmation',
      }),
    )
    await assertFails(
      updateDoc(doc(authedDb('announcer'), 'search_requests/existing'), {
        moderationStatus: 'REJECTED',
      }),
    )
    await assertFails(deleteDoc(doc(authedDb('announcer'), 'search_requests/existing')))
  })
})
