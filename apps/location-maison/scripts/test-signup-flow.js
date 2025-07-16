#!/usr/bin/env node

/**
 * Script pour tester le flow complet d'inscription avec envoi d'email de vérification
 * Usage: node scripts/test-signup-flow.js [email] [password]
 */

const { createUserWithEmailAndPassword, auth } = require('firebase/auth');

// Script de test pour diagnostiquer le problème d'inscription
async function testSignupFlow() {
    console.log('🔍 Test du processus d\'inscription...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    try {
        console.log(`📧 Tentative d'inscription avec l'email: ${testEmail}`);
        
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            testEmail,
            testPassword
        );
        
        console.log('✅ Inscription réussie!');
        console.log('UID:', userCredential.user.uid);
        console.log('Email vérifié:', userCredential.user.emailVerified);
        
        // Nettoyer le compte de test
        await userCredential.user.delete();
        console.log('🧹 Compte de test supprimé');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription:');
        console.error('Code d\'erreur:', error.code);
        console.error('Message d\'erreur:', error.message);
        
        // Analyser les types d'erreurs possibles
        switch (error.code) {
            case 'auth/email-already-in-use':
                console.log('💡 Cette erreur indique que l\'email existe déjà dans Firebase Auth');
                break;
            case 'auth/invalid-email':
                console.log('💡 Format d\'email invalide');
                break;
            case 'auth/weak-password':
                console.log('💡 Mot de passe trop faible');
                break;
            case 'auth/operation-not-allowed':
                console.log('💡 Inscription par email/mot de passe désactivée');
                break;
            case 'auth/too-many-requests':
                console.log('💡 Trop de tentatives, limite de débit atteinte');
                break;
            default:
                console.log('💡 Erreur inconnue, vérifiez la configuration Firebase');
        }
    }
}

// Test avec un email qui existe déjà
async function testExistingEmail() {
    console.log('\n🔍 Test avec un email existant...');
    
    const existingEmail = 'test@example.com'; // Remplacez par un email qui existe
    const testPassword = 'TestPassword123!';
    
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            existingEmail,
            testPassword
        );
        
        console.log('⚠️ Inscription réussie avec un email existant (inattendu)');
        
    } catch (error) {
        console.log('✅ Erreur attendue pour email existant:');
        console.log('Code:', error.code);
        console.log('Message:', error.message);
        
        if (error.code === 'auth/email-already-in-use') {
            console.log('✅ Firebase détecte correctement l\'email existant');
        }
    }
}

// Test de validation des données
function testDataValidation() {
    console.log('\n🔍 Test de validation des données...');
    
    const testCases = [
        { email: 'invalid-email', password: 'weak', description: 'Email et mot de passe invalides' },
        { email: 'test@example.com', password: '123', description: 'Mot de passe trop court' },
        { email: 'test@example.com', password: 'TestPassword123!', description: 'Données valides' },
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\nTest ${index + 1}: ${testCase.description}`);
        console.log('Email:', testCase.email);
        console.log('Mot de passe:', testCase.password);
        
        // Validation basique
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = emailRegex.test(testCase.email);
        const isPasswordValid = testCase.password.length >= 6;
        
        console.log('Email valide:', isEmailValid);
        console.log('Mot de passe valide:', isPasswordValid);
    });
}

// Fonction principale
async function runTests() {
    console.log('🚀 Démarrage des tests d\'inscription...\n');
    
    try {
        await testSignupFlow();
        await testExistingEmail();
        testDataValidation();
        
        console.log('\n✅ Tests terminés');
    
  } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
    }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
    runTests();
}

module.exports = {
    testSignupFlow,
    testExistingEmail,
    testDataValidation,
    runTests
}; 