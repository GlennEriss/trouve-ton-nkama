const fs = require('node:fs')
const path = require('node:path')

const profiles = {
  application: {
    summary: '__tests__/coverage/coverage-summary.json',
    global: { branches: 45, functions: 22, lines: 10, statements: 10 },
    files: {
      'src/db/credit-transaction.db.ts': { branches: 70, functions: 100, lines: 95, statements: 95 },
      'src/db/reel.db.ts': { branches: 60, functions: 95, lines: 90, statements: 90 },
      'src/hooks/use-gift-payment.ts': { branches: 65, functions: 100, lines: 90, statements: 90 },
      'src/hooks/useFormAIHandler.ts': { branches: 75, functions: 100, lines: 95, statements: 95 },
      'src/components/reels/CreateOrphanReelClient.tsx': { branches: 65, functions: 30, lines: 85, statements: 85 },
      'src/components/shared/form/PhoneNumberFormAppSimple.tsx': { branches: 60, functions: 50, lines: 75, statements: 75 },
      'src/db/generic.db.ts': { branches: 95, functions: 100, lines: 95, statements: 95 },
      'src/db/property.db.ts': { branches: 80, functions: 100, lines: 90, statements: 90 },
      'src/directors/factory.director.ts': { branches: 90, functions: 100, lines: 95, statements: 95 },
      'src/hooks/useFormPropertyType.ts': { branches: 90, functions: 100, lines: 95, statements: 95 },
      'src/hooks/useOnSubmitFormProperty.ts': { branches: 70, functions: 100, lines: 95, statements: 95 },
      'src/hooks/usePropertyFormSchema.ts': { branches: 25, functions: 100, lines: 80, statements: 80 },
      'src/providers/property.form.provider.tsx': { branches: 65, functions: 60, lines: 70, statements: 70 },
    },
  },
  functions: {
    summary: 'coverage/coverage-summary.json',
    global: { branches: 35, functions: 25, lines: 35, statements: 35 },
    files: {
      'src/payments/gifts/initiateGiftPayment.ts': { branches: 80, functions: 75, lines: 90, statements: 90 },
      'src/payments/gifts/webhook.ts': { branches: 65, functions: 80, lines: 85, statements: 85 },
      'src/payments/mypayga/initiatePurchase.ts': { branches: 75, functions: 60, lines: 90, statements: 90 },
      'src/payments/mypayga/webhook.ts': { branches: 60, functions: 100, lines: 80, statements: 80 },
    },
  },
}

const profileName = process.argv[2]
const profile = profiles[profileName]
if (!profile) {
  console.error(`Profil de couverture inconnu: ${profileName || '(absent)'}`)
  process.exit(2)
}

const summaryPath = path.resolve(process.cwd(), profile.summary)
if (!fs.existsSync(summaryPath)) {
  console.error(`Rapport de couverture introuvable: ${summaryPath}`)
  process.exit(2)
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
const failures = []

function check(label, coverage, thresholds) {
  for (const [metric, minimum] of Object.entries(thresholds)) {
    const actual = coverage?.[metric]?.pct
    if (typeof actual !== 'number') {
      failures.push(`${label}: metrique ${metric} absente`)
    } else if (actual < minimum) {
      failures.push(`${label}: ${metric} ${actual}% < ${minimum}%`)
    }
  }
}

check('global', summary.total, profile.global)

for (const [relativePath, thresholds] of Object.entries(profile.files)) {
  const normalizedSuffix = `/${relativePath.replaceAll('\\', '/')}`
  const entry = Object.entries(summary).find(([filePath]) =>
    filePath.replaceAll('\\', '/').endsWith(normalizedSuffix),
  )
  if (!entry) {
    failures.push(`${relativePath}: fichier absent du rapport`)
    continue
  }
  check(relativePath, entry[1], thresholds)
}

if (failures.length > 0) {
  console.error('Seuils de couverture non respectes:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Seuils de couverture ${profileName} respectes.`)
