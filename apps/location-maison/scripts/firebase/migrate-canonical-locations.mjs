#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(SCRIPT_DIR, '../..')
const PROJECTS = {
  dev: {
    id: 'location-maison-dev',
    serviceAccount: 'services-account-firebase/location-maison-dev-firebase-adminsdk-fbsvc-3e00fcd22d.json',
  },
  prod: {
    id: 'location-maison-prod-167da',
    serviceAccount: 'services-account-firebase/location-maison-prod-167da-firebase-adminsdk-fbsvc-ebdb85e144.json',
  },
}

function parseArgs(argv) {
  const args = {
    project: 'dev',
    apply: false,
    confirmProject: '',
    report: '',
    maxDistanceKm: 1,
    bootstrapOsm: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--project') args.project = argv[++index] ?? ''
    else if (arg === '--apply') args.apply = true
    else if (arg === '--confirm-project') args.confirmProject = argv[++index] ?? ''
    else if (arg === '--report') args.report = argv[++index] ?? ''
    else if (arg === '--max-distance-km') args.maxDistanceKm = Number(argv[++index])
    else if (arg === '--bootstrap-osm') args.bootstrapOsm = true
    else if (arg === '--help') args.help = true
    else throw new Error(`Argument inconnu: ${arg}`)
  }
  return args
}

function printHelp() {
  console.log(`Usage:
  node scripts/firebase/migrate-canonical-locations.mjs --project dev
  node scripts/firebase/migrate-canonical-locations.mjs --project dev --apply --confirm-project location-maison-dev

Options:
  --report <path>           Ecrit le rapport JSON
  --bootstrap-osm           Amorce la projection geo_* depuis le fichier OSM
  --max-distance-km <n>     Distance maximale pour fusion automatique (defaut: 1)`)
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s’'`´-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function safeAliases(value) {
  return Array.isArray(value) ? value.map(safeText).filter(Boolean) : []
}

function haversineKm(left, right) {
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const latDelta = toRad(right.lat - left.lat)
  const lonDelta = toRad(right.lon - left.lon)
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRad(left.lat)) * Math.cos(toRad(right.lat)) * Math.sin(lonDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceBetween(left, right) {
  if (left.lat == null || left.lon == null || right.lat == null || right.lon == null) return null
  return haversineKm(left, right)
}

function sameScope(item, city, province) {
  return normalize(item.city) === normalize(city) && normalize(item.province) === normalize(province)
}

function pickOsmName(item) {
  return safeText(item?.names?.fr) || safeText(item?.name)
}

function pickOsmLocation(item, type, source, originalType) {
  const name = pickOsmName(item)
  const lat = safeNumber(item?.center?.lat)
  const lon = safeNumber(item?.center?.lon)
  if (!name || lat == null || lon == null || (lat === 0 && lon === 0)) return null
  return { name, lat, lon, type, source, originalType }
}

function nearestLocation(target, candidates, maxDistanceKm) {
  let best = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const distance = distanceBetween(target, candidate)
    if (distance != null && distance <= maxDistanceKm && distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

function dedupeByName(items) {
  const unique = new Map()
  for (const item of items) {
    const key = normalize(item.name)
    if (!unique.has(key)) unique.set(key, item)
  }
  return Array.from(unique.values())
}

function buildProjectionFromOsm(root) {
  const provinces = dedupeByName(
    (root.admin_boundaries?.['4'] ?? [])
      .map((item) => pickOsmLocation(item, 'province', 'admin_boundaries', 'admin_level_4'))
      .filter(Boolean),
  )
  const citySources = [
    ...((root.places?.city ?? []).map((item) => [item, 'city'])),
    ...((root.places?.town ?? []).map((item) => [item, 'town'])),
    ...((root.admin_boundaries?.['6'] ?? []).map((item) => [item, 'admin_level_6'])),
    ...((root.admin_boundaries?.['8'] ?? []).map((item) => [item, 'admin_level_8'])),
  ]
  const cities = dedupeByName(
    citySources
      .map(([item, originalType]) =>
        pickOsmLocation(
          item,
          'city',
          originalType.startsWith('admin_') ? 'admin_boundaries' : 'places',
          originalType,
        ),
      )
      .filter(Boolean),
  ).map((city) => ({
    ...city,
    province: nearestLocation(city, provinces, 100)?.name ?? '',
  }))

  const quarterSources = [
    ...['suburb', 'neighbourhood', 'quarter', 'village', 'hamlet', 'locality'].flatMap((placeType) =>
      (root.places?.[placeType] ?? []).map((item) => [item, placeType]),
    ),
    ...((root.admin_boundaries?.['9'] ?? []).map((item) => [item, 'admin_level_9'])),
    ...((root.admin_boundaries?.['10'] ?? []).map((item) => [item, 'admin_level_10'])),
  ]
  const rawQuarters = quarterSources
    .map(([item, originalType]) =>
      pickOsmLocation(
        item,
        'quarter',
        originalType.startsWith('admin_') ? 'admin_boundaries' : 'places',
        originalType,
      ),
    )
    .filter(Boolean)
  const quarters = []
  for (const quarter of rawQuarters) {
    const nearbyDuplicate = quarters.some(
      (candidate) =>
        normalize(candidate.name) === normalize(quarter.name) &&
        (distanceBetween(candidate, quarter) ?? Number.POSITIVE_INFINITY) <= 1,
    )
    if (!nearbyDuplicate) quarters.push(quarter)
  }

  const scopedQuarters = quarters.map((quarter) => {
    const urbanTypes = new Set([
      'suburb',
      'neighbourhood',
      'quarter',
      'admin_level_9',
      'admin_level_10',
    ])
    const city = nearestLocation(quarter, cities, urbanTypes.has(quarter.originalType) ? 35 : 80)
    const province = city?.province || nearestLocation(quarter, provinces, 150)?.name || ''
    return { ...quarter, city: city?.name ?? '', province }
  })
  return { provinces, cities, quarters: scopedQuarters }
}

function projectionDocId(...parts) {
  return parts.map(normalize).filter(Boolean).join('__') || 'unknown'
}

function quarterProjectionDocId(quarter) {
  return `${projectionDocId(quarter.name, quarter.city, quarter.province)}__${quarter.lat.toFixed(5)}_${quarter.lon.toFixed(5)}`
}

async function commitProjection(db, projection, rulesVersion) {
  const operations = []
  for (const province of projection.provinces) {
    operations.push({
      ref: db.collection('geo_provinces').doc(projectionDocId(province.name)),
      data: {
        source: 'osm',
        name: province.name,
        normalizedName: normalize(province.name),
        lat: province.lat,
        lon: province.lon,
        countryName: 'Gabon',
        countryIso2: 'GA',
        updatedAt: FieldValue.serverTimestamp(),
      },
    })
  }
  for (const city of projection.cities) {
    operations.push({
      ref: db.collection('geo_cities').doc(projectionDocId(city.name, city.province)),
      data: {
        source: 'osm',
        name: city.name,
        normalizedName: normalize(city.name),
        province: city.province || null,
        normalizedProvince: city.province ? normalize(city.province) : null,
        lat: city.lat,
        lon: city.lon,
        countryName: 'Gabon',
        countryIso2: 'GA',
        updatedAt: FieldValue.serverTimestamp(),
      },
    })
  }
  for (const quarter of projection.quarters) {
    operations.push({
      ref: db.collection('geo_quarters').doc(quarterProjectionDocId(quarter)),
      data: {
        source: 'osm',
        name: quarter.name,
        aliases: [],
        normalizedName: normalize(quarter.name),
        city: quarter.city || null,
        province: quarter.province || null,
        normalizedCity: quarter.city ? normalize(quarter.city) : null,
        normalizedProvince: quarter.province ? normalize(quarter.province) : null,
        lat: quarter.lat,
        lon: quarter.lon,
        countryName: 'Gabon',
        countryIso2: 'GA',
        updatedAt: FieldValue.serverTimestamp(),
      },
    })
  }
  operations.push({
    ref: db.collection('geo_osm_meta').doc('gabon'),
    data: {
      countryName: 'Gabon',
      countryIso2: 'GA',
      sourceMode: 'local',
      sourcePath: 'src/data/gabon_osm.json',
      projectionRulesVersion: rulesVersion,
      counts: {
        provinces: projection.provinces.length,
        cities: projection.cities.length,
        quarters: projection.quarters.length,
      },
      projectionUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  })
  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch()
    for (const operation of operations.slice(index, index + 400)) {
      batch.set(operation.ref, operation.data, { merge: true })
    }
    await batch.commit()
  }
  return operations.length
}

function chooseKeeper(items, preferredCoordinates) {
  if (preferredCoordinates) {
    return [...items].sort((left, right) => {
      const leftDistance = distanceBetween(left, preferredCoordinates) ?? Number.POSITIVE_INFINITY
      const rightDistance = distanceBetween(right, preferredCoordinates) ?? Number.POSITIVE_INFINITY
      return leftDistance - rightDistance
    })[0]
  }
  return [...items].sort((left, right) => {
    const sourceScore = Number(right.source === 'manual') - Number(left.source === 'manual')
    if (sourceScore !== 0) return sourceScore
    const aliasScore = right.aliases.length - left.aliases.length
    return aliasScore || left.id.localeCompare(right.id)
  })[0]
}

function withinMergeDistance(items, maxDistanceKm) {
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      const distance = distanceBetween(items[left], items[right])
      if (distance == null || distance > maxDistanceKm) return false
    }
  }
  return true
}

function uniqueAliases(names, canonicalName) {
  const canonical = normalize(canonicalName)
  const aliases = new Map()
  for (const name of names.map(safeText).filter(Boolean)) {
    const key = normalize(name)
    if (key && key !== canonical && !aliases.has(key)) aliases.set(key, name)
  }
  return Array.from(aliases.values()).slice(0, 20)
}

function sameAliasSet(left, right) {
  const normalizeList = (items) => items.map(normalize).filter(Boolean).sort()
  return JSON.stringify(normalizeList(left)) === JSON.stringify(normalizeList(right))
}

function buildMigrationPlan(quarters, rules, maxDistanceKm) {
  const consumed = new Set()
  const plans = []

  for (const rule of rules.quarters) {
    const matchNames = new Set(rule.matchNames.map(normalize))
    const matches = quarters.filter(
      (item) =>
        !consumed.has(item.id) &&
        sameScope(item, rule.city, rule.province) &&
        matchNames.has(normalize(item.name)),
    )
    if (matches.length === 0) {
      plans.push({ type: 'missing_rule_target', rule })
      continue
    }
    if (matches.length > 1 && !withinMergeDistance(matches, maxDistanceKm)) {
      plans.push({
        type: 'manual_review',
        reason: 'distance_exceeded',
        canonicalName: rule.canonicalName,
        ids: matches.map((item) => item.id),
      })
      continue
    }
    matches.forEach((item) => consumed.add(item.id))
    const keeper = chooseKeeper(matches, rule.preferredCoordinates)
    const aliases = uniqueAliases(
      [...rule.aliases, ...rule.matchNames, ...matches.flatMap((item) => [item.name, ...item.aliases])],
      rule.canonicalName,
    )
    const duplicates = matches.filter((item) => item.id !== keeper.id)
    const needsUpdate =
      keeper.name !== rule.canonicalName ||
      keeper.source !== 'manual' ||
      keeper.canonicalizationVersion !== rules.version ||
      !sameAliasSet(keeper.aliases, aliases)
    if (!needsUpdate && duplicates.length === 0) continue
    plans.push({
      type: 'merge',
      reason: 'canonical_rule',
      canonicalName: rule.canonicalName,
      keeper,
      aliases,
      delete: duplicates,
    })
  }

  const genericGroups = new Map()
  for (const quarter of quarters) {
    if (consumed.has(quarter.id)) continue
    const key = [normalize(quarter.name), normalize(quarter.city), normalize(quarter.province)].join('|')
    const group = genericGroups.get(key) ?? []
    group.push(quarter)
    genericGroups.set(key, group)
  }

  for (const group of genericGroups.values()) {
    if (group.length < 2) continue
    if (!withinMergeDistance(group, maxDistanceKm)) {
      plans.push({
        type: 'manual_review',
        reason: 'distance_exceeded',
        canonicalName: group[0].name,
        ids: group.map((item) => item.id),
      })
      continue
    }
    const keeper = chooseKeeper(group)
    const aliases = uniqueAliases(group.flatMap((item) => [item.name, ...item.aliases]), keeper.name)
    plans.push({
      type: 'merge',
      reason: 'normalized_duplicate',
      canonicalName: keeper.name,
      keeper,
      aliases,
      delete: group.filter((item) => item.id !== keeper.id),
    })
  }
  return plans
}

function buildEffectiveCatalog(quarters, plans) {
  const deleted = new Set(
    plans.filter((plan) => plan.type === 'merge').flatMap((plan) => plan.delete.map((item) => item.id)),
  )
  const updates = new Map(
    plans
      .filter((plan) => plan.type === 'merge')
      .map((plan) => [plan.keeper.id, { ...plan.keeper, name: plan.canonicalName, aliases: plan.aliases }]),
  )
  return quarters.filter((item) => !deleted.has(item.id)).map((item) => updates.get(item.id) ?? item)
}

function auditProperties(properties, catalog) {
  const lookup = new Map()
  for (const quarter of catalog) {
    const scope = `${normalize(quarter.city)}|${normalize(quarter.province)}`
    for (const label of [quarter.name, ...quarter.aliases]) {
      const key = `${normalize(label)}|${scope}`
      const matches = lookup.get(key) ?? []
      if (!matches.some((item) => item.id === quarter.id)) matches.push(quarter)
      lookup.set(key, matches)
    }
  }

  const groups = new Map()
  let legacyCount = 0
  let unknownCount = 0
  let aliasMatchCount = 0
  let ambiguousCount = 0

  for (const property of properties) {
    const district = safeText(property.address?.district) || safeText(property.street)
    const city = safeText(property.address?.city) || safeText(property.city)
    const province = safeText(property.address?.province) || safeText(property.province)
    const source = safeText(property.locationSource) || 'MISSING'
    if (source === 'LEGACY' || source === 'MISSING') legacyCount += 1

    const key = `${normalize(district)}|${normalize(city)}|${normalize(province)}`
    const matches = lookup.get(key) ?? []
    let status = 'canonical'
    let proposedCanonical = null
    if (!district || !city || !province || matches.length === 0) {
      status = 'unknown'
      unknownCount += 1
    } else if (matches.length > 1) {
      status = 'ambiguous'
      ambiguousCount += 1
    } else if (district !== matches[0].name) {
      status = 'alias_match'
      proposedCanonical = matches[0].name
      aliasMatchCount += 1
    }

    if (status === 'canonical' && source !== 'LEGACY' && source !== 'MISSING') continue
    const groupKey = [district || '(vide)', city || '(vide)', province || '(vide)', status].join('|')
    const group = groups.get(groupKey) ?? {
      district: district || null,
      city: city || null,
      province: province || null,
      status,
      proposedCanonical,
      count: 0,
      sources: {},
      samplePropertyIds: [],
    }
    group.count += 1
    group.sources[source] = (group.sources[source] ?? 0) + 1
    if (group.samplePropertyIds.length < 5) group.samplePropertyIds.push(property.id)
    groups.set(groupKey, group)
  }

  return {
    summary: {
      totalProperties: properties.length,
      legacyOrMissingSource: legacyCount,
      aliasMatches: aliasMatchCount,
      unknownLocations: unknownCount,
      ambiguousLocations: ambiguousCount,
      requiresReview: Array.from(groups.values()).reduce((sum, group) => sum + group.count, 0),
    },
    groups: Array.from(groups.values()).sort((left, right) => right.count - left.count),
  }
}

async function commitPlans(db, plans, version) {
  const operations = []
  for (const plan of plans.filter((item) => item.type === 'merge')) {
    operations.push({
      type: 'set',
      ref: db.collection('geo_quarters').doc(plan.keeper.id),
      data: {
        name: plan.canonicalName,
        normalizedName: normalize(plan.canonicalName),
        aliases: plan.aliases,
        source: 'manual',
        canonicalizationVersion: version,
        canonicalizedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
    })
    for (const duplicate of plan.delete) operations.push({ type: 'delete', ref: duplicate.ref })
  }

  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch()
    for (const operation of operations.slice(index, index + 400)) {
      if (operation.type === 'set') batch.set(operation.ref, operation.data, { merge: true })
      else batch.delete(operation.ref)
    }
    await batch.commit()
  }
  return operations.length
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) return printHelp()
  const project = PROJECTS[args.project]
  if (!project) throw new Error(`Projet invalide: ${args.project}. Valeurs: dev, prod`)
  if (!Number.isFinite(args.maxDistanceKm) || args.maxDistanceKm <= 0 || args.maxDistanceKm > 5) {
    throw new Error('--max-distance-km doit etre compris entre 0 et 5')
  }
  if (args.apply && args.confirmProject !== project.id) {
    throw new Error(`Ecriture refusee: ajoutez --confirm-project ${project.id}`)
  }

  const serviceAccountPath = path.resolve(APP_DIR, project.serviceAccount)
  const rulesPath = path.resolve(APP_DIR, 'src/data/gabon-location-canonical-rules.json')
  const osmPath = path.resolve(APP_DIR, 'src/data/gabon_osm.json')
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'))
  const app = getApps().find((candidate) => candidate.name === `canonical-${project.id}`) ?? initializeApp(
    { credential: cert(serviceAccount), projectId: project.id },
    `canonical-${project.id}`,
  )
  const db = getFirestore(app)

  console.log(`Canonical locations | project=${project.id} mode=${args.apply ? 'APPLY' : 'DRY-RUN'} rules=${rules.version}`)
  const projection = args.bootstrapOsm
    ? buildProjectionFromOsm(JSON.parse(fs.readFileSync(osmPath, 'utf8')))
    : null
  if (projection) {
    console.log(`Projection OSM: ${projection.provinces.length} provinces, ${projection.cities.length} villes, ${projection.quarters.length} quartiers.`)
    if (args.apply) {
      const projectionWrites = await commitProjection(db, projection, rules.version)
      console.log(`Projection amorcee: ${projectionWrites} ecritures Firestore.`)
    }
  }

  const [quarterSnapshot, propertySnapshot] = await Promise.all([
    db.collection('geo_quarters').get(),
    db.collection('properties').get(),
  ])
  let quarters = quarterSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ref: doc.ref,
      name: safeText(data.name),
      aliases: safeAliases(data.aliases),
      city: safeText(data.city),
      province: safeText(data.province),
      lat: safeNumber(data.lat),
      lon: safeNumber(data.lon),
      source: safeText(data.source),
      canonicalizationVersion: safeText(data.canonicalizationVersion),
    }
  })
  if (!args.apply && projection && quarters.length === 0) {
    quarters = projection.quarters.map((quarter) => ({
      id: quarterProjectionDocId(quarter),
      ref: db.collection('geo_quarters').doc(quarterProjectionDocId(quarter)),
      name: quarter.name,
      aliases: [],
      city: quarter.city,
      province: quarter.province,
      lat: quarter.lat,
      lon: quarter.lon,
      source: 'osm',
      canonicalizationVersion: '',
    }))
  }
  const properties = propertySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const plans = buildMigrationPlan(quarters, rules, args.maxDistanceKm)
  const effectiveCatalog = buildEffectiveCatalog(quarters, plans)
  const propertyAudit = auditProperties(properties, effectiveCatalog)

  const report = {
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    mode: args.apply ? 'apply' : 'dry-run',
    canonicalRulesVersion: rules.version,
    catalog: {
      projectionBootstrap: projection
        ? {
            provinces: projection.provinces.length,
            cities: projection.cities.length,
            quarters: projection.quarters.length,
          }
        : null,
      quartersBefore: quarters.length,
      quartersAfter: effectiveCatalog.length,
      merges: plans.filter((plan) => plan.type === 'merge').map((plan) => ({
        reason: plan.reason,
        canonicalName: plan.canonicalName,
        keeperId: plan.keeper.id,
        deletedIds: plan.delete.map((item) => item.id),
        aliases: plan.aliases,
      })),
      manualReviews: plans.filter((plan) => plan.type === 'manual_review'),
      missingRuleTargets: plans.filter((plan) => plan.type === 'missing_rule_target'),
    },
    properties: propertyAudit,
  }

  console.log(JSON.stringify({
    quartersBefore: report.catalog.quartersBefore,
    quartersAfter: report.catalog.quartersAfter,
    merges: report.catalog.merges.length,
    manualReviews: report.catalog.manualReviews.length,
    missingRuleTargets: report.catalog.missingRuleTargets.length,
    propertyAudit: report.properties.summary,
  }, null, 2))
  for (const merge of report.catalog.merges) {
    console.log(`- ${merge.reason}: ${merge.canonicalName} | keep=${merge.keeperId} | delete=${merge.deletedIds.join(',') || 'none'} | aliases=${merge.aliases.join(',') || 'none'}`)
  }

  if (args.apply) {
    const operationCount = await commitPlans(db, plans, rules.version)
    console.log(`Migration appliquee: ${operationCount} operations Firestore.`)
  } else {
    console.log('Dry-run termine: aucune ecriture Firestore.')
  }

  if (args.report) {
    const reportPath = path.resolve(process.cwd(), args.report)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`Rapport: ${reportPath}`)
  }
}

main().catch((error) => {
  console.error(`Migration echouee: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
