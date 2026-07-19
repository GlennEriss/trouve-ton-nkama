import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type FirestoreIndex = {
  collectionGroup?: string
  queryScope?: string
  fields?: Array<{ fieldPath?: string; order?: string }>
}

describe('configuration des index Firestore', () => {
  it('declare l index utilise par le filtre de l historique des credits', () => {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), 'firestore.indexes.json'), 'utf8'),
    ) as { indexes?: FirestoreIndex[] }

    expect(config.indexes).toContainEqual({
      collectionGroup: 'credit_transactions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'type', order: 'ASCENDING' },
        { fieldPath: 'uid', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    })
  })
})
