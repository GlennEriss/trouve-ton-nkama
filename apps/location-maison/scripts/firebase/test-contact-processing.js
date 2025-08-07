// Test du traitement des contacts
function processContact(contactStr) {
  if (!contactStr || contactStr.trim() === '' || contactStr === 'non précisé') {
    return { contact: '', contacts: [] };
  }

  // Supprimer les espaces
  const cleanContact = contactStr.replace(/\s+/g, '');
  
  // Détecter plusieurs numéros (séparés par /, - ou d'autres caractères)
  const numbers = cleanContact.split(/[\/\-,;|]+/).filter(num => num.trim().length > 0);
  
  if (numbers.length <= 1) {
    return {
      contact: cleanContact,
      contacts: []
    };
  } else {
    return {
      contact: numbers[0], // Premier numéro
      contacts: numbers    // Tous les numéros
    };
  }
}

// Tests
console.log('🧪 Test du traitement des contacts\n');

const testCases = [
  "077933932/066100817",
  "074673707///06",
  "077 933 932",
  "077 77 38 73",
  "06",
  "non précisé",
  "",
  "077627094",
  "+241 07 84 32 11",
  "074147182/062240823"
];

testCases.forEach((test, i) => {
  const result = processContact(test);
  console.log(`Test ${i + 1}: "${test}"`);
  console.log(`  contact: "${result.contact}"`);
  console.log(`  contacts: [${result.contacts.map(c => `"${c}"`).join(', ')}]`);
  console.log('');
});

console.log('✅ Tests terminés !'); 