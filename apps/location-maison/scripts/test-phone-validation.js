#!/usr/bin/env node

/**
 * Script de test pour la validation des numéros de téléphone
 * Usage: node scripts/test-phone-validation.js
 */

// Simulation de l'environnement Next.js
process.env.NEXT_PUBLIC_ENABLED_PHONE_COUNTRIES = 'GA,SN';

// Import de la validation (simulation)
const { validatePhoneNumberForSupportedCountries, formatPhoneNumberForDisplay, normalizePhoneNumberForFirebase } = require('../src/lib/phoneValidation');

// Couleurs pour la console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPhoneNumber(number, expectedValid = true, expectedCountry = null) {
  const result = validatePhoneNumberForSupportedCountries(number);
  const isValid = result.isValid === expectedValid;
  const countryMatch = !expectedCountry || result.country === expectedCountry;
  
  const status = isValid && countryMatch ? '✅' : '❌';
  const color = isValid && countryMatch ? 'green' : 'red';
  
  log(`${status} ${number}`, color);
  log(`   Valid: ${result.isValid} (expected: ${expectedValid})`, color);
  log(`   Country: ${result.country} (expected: ${expectedCountry})`, color);
  log(`   Message: ${result.message}`, color);
  
  if (result.isValid) {
    const formatted = formatPhoneNumberForDisplay(number);
    const normalized = normalizePhoneNumberForFirebase(number);
    log(`   Formatted: ${formatted}`, 'blue');
    log(`   Normalized: ${normalized}`, 'blue');
  }
  
  console.log('');
  return isValid && countryMatch;
}

function runTests() {
  log('🧪 Test de Validation des Numéros de Téléphone', 'bold');
  log('==============================================', 'bold');
  console.log('');

  let passed = 0;
  let total = 0;

  // Tests Gabon - Nouveaux préfixes (2024)
  log('🇬🇦 Tests Gabon - Nouveaux Préfixes (2024)', 'bold');
  const gabonNewTests = [
    { number: '+24106123456', valid: true, country: 'GA' },
    { number: '+24107123456', valid: true, country: 'GA' },
    { number: '24106123456', valid: true, country: 'GA' },
    { number: '06123456', valid: true, country: 'GA' },
    { number: '6123456', valid: true, country: 'GA' },
    { number: '+241 06 12 34 56', valid: true, country: 'GA' },
    { number: '+241-06-12-34-56', valid: true, country: 'GA' }
  ];

  gabonNewTests.forEach(test => {
    if (testPhoneNumber(test.number, test.valid, test.country)) passed++;
    total++;
  });

  // Tests Gabon - Anciens préfixes (compatibilité)
  log('🇬🇦 Tests Gabon - Anciens Préfixes (Compatibilité)', 'bold');
  const gabonOldTests = [
    { number: '+24101234567', valid: true, country: 'GA' },
    { number: '+24102234567', valid: true, country: 'GA' },
    { number: '01234567', valid: true, country: 'GA' },
    { number: '1234567', valid: true, country: 'GA' }
  ];

  gabonOldTests.forEach(test => {
    if (testPhoneNumber(test.number, test.valid, test.country)) passed++;
    total++;
  });

  // Tests Sénégal
  log('🇸🇳 Tests Sénégal', 'bold');
  const senegalTests = [
    { number: '+22170123456', valid: true, country: 'SN' },
    { number: '+22171123456', valid: true, country: 'SN' },
    { number: '22170123456', valid: true, country: 'SN' },
    { number: '70123456', valid: true, country: 'SN' },
    { number: '+221 70 123 45 67', valid: true, country: 'SN' }
  ];

  senegalTests.forEach(test => {
    if (testPhoneNumber(test.number, test.valid, test.country)) passed++;
    total++;
  });

  // Tests de rejet
  log('❌ Tests de Rejet', 'bold');
  const invalidTests = [
    { number: '+24108123456', valid: false }, // Préfixe 08 non supporté
    { number: '+2410612345', valid: false },  // Trop court
    { number: '+241061234567', valid: false }, // Trop long
    { number: '+24206123456', valid: false },  // Mauvais code pays
    { number: '+22160123456', valid: false },  // Préfixe 60 non supporté
    { number: 'invalid', valid: false },
    { number: '', valid: false },
    { number: null, valid: false },
    { number: undefined, valid: false }
  ];

  invalidTests.forEach(test => {
    if (testPhoneNumber(test.number, test.valid)) passed++;
    total++;
  });

  // Résultats
  console.log('');
  log('📊 Résultats', 'bold');
  log('============', 'bold');
  log(`Tests réussis: ${passed}/${total}`, passed === total ? 'green' : 'red');
  log(`Taux de réussite: ${((passed / total) * 100).toFixed(1)}%`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('🎉 Tous les tests sont passés !', 'green');
  } else {
    log('⚠️  Certains tests ont échoué.', 'red');
  }
}

// Fonction pour tester un numéro spécifique
function testSpecificNumber(number) {
  log(`🔍 Test du numéro: ${number}`, 'bold');
  console.log('');
  testPhoneNumber(number);
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2);

if (args.length > 0) {
  const number = args[0];
  testSpecificNumber(number);
} else {
  runTests();
}

module.exports = {
  testPhoneNumber,
  runTests
}; 