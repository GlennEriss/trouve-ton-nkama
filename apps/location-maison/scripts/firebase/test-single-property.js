// Test d'une seule propriété pour vérifier les nouveaux champs
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

async function testSingleProperty() {
  console.log('🧪 Test d\'une seule propriété avec nouveaux champs...\n');
  
  try {
    // Charger les variables d'environnement
    require('dotenv').config();
    
    // Initialiser Firebase
    if (!admin.apps.length) {
      const serviceAccount = require('./firebase-config.js');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'home-rent-1534e.appspot.com'
      });
    }
    
    const db = admin.firestore();
    
    // Propriété de test
    const testProperty = {
      title: "Test Property with ICreation Types",
      description: "Propriété de test pour valider les nouveaux champs",
      price: 150000,
      contact: "077933932/066100817", // Pour tester le traitement des contacts
      images: [], // Pas d'images pour ce test
      city: "Libreville",
      typeProperty: "Apartment"
    };
    
    // Traitement des contacts (copié de la classe principale)
    function processContact(contactStr) {
      if (!contactStr || contactStr.trim() === '' || contactStr === 'non précisé') {
        return { contact: '', contacts: [] };
      }
      const cleanContact = contactStr.replace(/\s+/g, '');
      const numbers = cleanContact.split(/[\/\-,;|]+/).filter(num => num.trim().length > 0);
      if (numbers.length <= 1) {
        return { contact: cleanContact, contacts: [] };
      } else {
        return { contact: numbers[0], contacts: numbers };
      }
    }
    
    const { contact, contacts } = processContact(testProperty.contact);
    
    // Préparer la propriété avec les types ICreation
    const processedProperty = {
      ...testProperty,
      contact: contact,
      contacts: contacts,
      images: [], // Pas d'images
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: process.env.CREATED_BY || 'test_script',
      source: 'test_import',
      state: 'IN_PROGRESS', // StateCreation
      isActive: true
    };
    
    console.log('📋 Propriété à sauvegarder:');
    console.log('   Title:', processedProperty.title);
    console.log('   Contact original:', testProperty.contact);
    console.log('   Contact traité:', processedProperty.contact);
    console.log('   Contacts array:', processedProperty.contacts);
    console.log('   Created By:', processedProperty.createdBy);
    console.log('   State:', processedProperty.state);
    
    // Sauvegarder dans Firestore
    const docRef = await db.collection('properties').add(processedProperty);
    console.log(`\n✅ Propriété test sauvegardée: ${docRef.id}`);
    
    // Lire la propriété sauvegardée pour vérifier
    const doc = await docRef.get();
    const savedData = doc.data();
    
    console.log('\n📊 VÉRIFICATION:');
    console.log('   ID:', doc.id);
    console.log('   Created By:', savedData.createdBy);
    console.log('   State:', savedData.state);
    console.log('   Source:', savedData.source);
    console.log('   Contact:', savedData.contact);
    console.log('   Contacts:', savedData.contacts);
    console.log('   CreatedAt:', savedData.createdAt ? '✅ Défini' : '❌ Manquant');
    console.log('   UpdatedAt:', savedData.updatedAt ? '✅ Défini' : '❌ Manquant');
    
    console.log('\n🎉 Test réussi !');
    
  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  }
}

testSingleProperty(); 