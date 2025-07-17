# Diagnostic du Problème d'Inscription

## 🚨 Problème Signalé
L'utilisateur reçoit le message "L'adresse email est déjà utilisée" lors de l'inscription, mais l'email n'est pas réellement utilisé.

## 🔍 Analyse du Code

### 1. Flux d'Inscription
```typescript
// Dans Signup.tsx et SignupMobileComponent.tsx
const onRegister = async (user: Partial<User>) => {
    try {
        // 1. Vérification obligatoire du numéro de téléphone
        if (!user.phoneNumbers || user.phoneNumbers.length === 0 || !user.phoneNumbers[0]) {
            throw new Error("Le numéro de téléphone est obligatoire.");
        }
        
        // 2. Vérification si le numéro est déjà associé à un compte
        const existingUser = await findUserByPhoneNumber(user.phoneNumbers[0]);
        if (existingUser) {
            throw new Error("Un numéro est déjà associé à un compte.");
        }
        
        // 3. Création du compte Firebase Auth
        const userCred = await createUserWithEmailAndPassword(
            auth,
            user.login!, // user.login = values.email
            user.password!
        );
        
        // 4. Envoi email de vérification
        // 5. Création de l'utilisateur dans Firestore
        // 6. Déconnexion
    } catch (error) {
        throw error; // Remonte l'erreur Firebase
    }
}
```

### 2. Gestion d'Erreur Améliorée
```typescript
// Nouvelle gestion d'erreur spécifique
if (error.code === 'auth/email-already-in-use') {
    errorMessage = "Cette adresse email est déjà utilisée par un autre compte.";
    errorTitle = "Email déjà utilisé";
} else if (error.message && error.message.includes("numéro de téléphone est obligatoire")) {
    errorMessage = error.message;
    errorTitle = "Numéro de téléphone manquant";
} else if (error.message && error.message.includes("numéro est déjà associé")) {
    errorMessage = error.message;
    errorTitle = "Numéro déjà utilisé";
}
// ... autres erreurs Firebase
```

### 3. Validation du Schéma
```typescript
// Schéma de validation mis à jour
phone: z
    .string()
    .min(1, { message: 'Le numéro de téléphone est obligatoire' })
    .refine(isValidPhoneNumber, { message: "Le numéro de téléphone est invalide" }),
```

## 🎯 Causes Possibles

### 1. **Compte Firebase Auth Existant**
- L'email existe dans Firebase Auth mais pas dans votre Firestore
- Solution : Vérifier dans Firebase Console > Authentication

### 2. **Compte Supprimé Partiellement**
- Le compte a été supprimé de Firestore mais pas de Firebase Auth
- Solution : Nettoyer manuellement dans Firebase Console

### 3. **Numéro de Téléphone Manquant ou Invalide**
- Le numéro de téléphone n'est pas fourni ou est invalide
- Solution : Vérifier que le numéro est saisi et valide

### 4. **Numéro de Téléphone Déjà Utilisé**
- Le numéro de téléphone est déjà associé à un autre compte
- Solution : Utiliser un autre numéro ou contacter le support

### 5. **Erreur de Configuration Firebase**
- Problème de configuration Firebase
- Solution : Vérifier les variables d'environnement

### 6. **Cache Navigateur**
- Données en cache
- Solution : Vider le cache ou utiliser un navigateur privé

### 7. **Erreur de Validation**
- Problème dans le schéma de validation
- Solution : Vérifier FormRegisterSchema

## 🔧 Étapes de Diagnostic

### Étape 1 : Vérifier Firebase Console
1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionner votre projet
3. Aller dans **Authentication** > **Users**
4. Rechercher l'email problématique
5. Si trouvé : supprimer le compte

### Étape 2 : Tester avec un Email Unique
```javascript
// Utiliser un email avec timestamp
const testEmail = `test-${Date.now()}@example.com`;
```

### Étape 3 : Vérifier le Numéro de Téléphone
```javascript
// S'assurer que le numéro est valide
const testPhone = '+24101234567'; // Format international
```

### Étape 4 : Vérifier les Logs
```bash
# Dans la console du navigateur
console.log('Email:', values.email);
console.log('Phone:', values.phone);
console.log('Erreur Firebase:', error);
```

### Étape 5 : Tester l'API Directement
```bash
# Test avec curl
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🛠️ Solutions

### Solution 1 : Nettoyer Firebase Auth
```javascript
// Dans Firebase Console > Authentication > Users
// Supprimer manuellement le compte problématique
```

### Solution 2 : Améliorer la Gestion d'Erreur
```typescript
// Ajouter plus de logs pour diagnostiquer
console.log('Tentative d\'inscription avec:', {
    email: user.login,
    phone: user.phoneNumbers?.[0]
});

console.log('Erreur Firebase complète:', {
    code: error.code,
    message: error.message,
    stack: error.stack
});
```

### Solution 3 : Vérifier la Configuration
```bash
# Vérifier les variables d'environnement
echo $NEXT_PUBLIC_FIREBASE_API_KEY
echo $NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
echo $NEXT_PUBLIC_FIREBASE_PROJECT_ID
```

### Solution 4 : Test de Validation
```typescript
// Tester le schéma de validation
const result = FormRegisterSchema.safeParse({
    email: "test@example.com",
    phone: "+24101234567",
    password: "TestPassword123!",
    // ... autres champs
});

console.log('Validation result:', result);
```

## 📊 Tests à Effectuer

### Test 1 : Email Unique
```javascript
const uniqueEmail = `test-${Date.now()}@example.com`;
// Tenter l'inscription avec cet email
```

### Test 2 : Email Existant
```javascript
const existingEmail = "test@example.com";
// Vérifier que l'erreur est correcte
```

### Test 3 : Numéro de Téléphone Manquant
```javascript
const dataWithoutPhone = {
    email: "test@example.com",
    phone: "", // Numéro vide
    // ... autres champs
};
// Vérifier que l'erreur est correcte
```

### Test 4 : Numéro de Téléphone Invalide
```javascript
const dataWithInvalidPhone = {
    email: "test@example.com",
    phone: "invalid-phone", // Format invalide
    // ... autres champs
};
// Vérifier que l'erreur est correcte
```

### Test 5 : Numéro de Téléphone Déjà Utilisé
```javascript
const dataWithExistingPhone = {
    email: "test@example.com",
    phone: "+24101234567", // Numéro déjà utilisé
    // ... autres champs
};
// Vérifier que l'erreur est correcte
```

## 🚀 Scripts de Test

### Script de Diagnostic Principal
```bash
node scripts/test-signup-flow.js
```

### Script de Validation du Numéro de Téléphone
```bash
node scripts/test-phone-validation.js
```

## 📝 Checklist de Diagnostic

- [ ] Vérifier Firebase Console > Authentication
- [ ] Tester avec un email unique
- [ ] Vérifier que le numéro de téléphone est saisi
- [ ] Vérifier le format du numéro de téléphone
- [ ] Vérifier les logs de la console
- [ ] Tester la validation du formulaire
- [ ] Vérifier la configuration Firebase
- [ ] Nettoyer le cache du navigateur
- [ ] Tester en mode navigation privée

## 🔄 Prochaines Étapes

1. **Exécuter les tests de diagnostic**
2. **Vérifier Firebase Console**
3. **Tester avec un email unique et un numéro valide**
4. **Analyser les logs d'erreur**
5. **Implémenter les corrections nécessaires**

## 📞 Support

Si le problème persiste après ces étapes :
1. Collecter les logs d'erreur
2. Fournir l'email et le numéro de téléphone problématiques
3. Décrire les étapes reproduites
4. Inclure les captures d'écran Firebase Console

## 🆕 Nouvelles Validations Ajoutées

### Validation du Numéro de Téléphone
- ✅ **Obligatoire** : Le numéro de téléphone est maintenant requis
- ✅ **Format Valide** : Vérification du format international
- ✅ **Unicité** : Vérification qu'il n'est pas déjà utilisé
- ✅ **Messages d'Erreur** : Messages spécifiques selon le type d'erreur

### Messages d'Erreur Améliorés
- "Le numéro de téléphone est obligatoire" - Si le champ est vide (du FormRegisterSchema)
- "Le numéro de téléphone est invalide" - Si le format est incorrect (du FormRegisterSchema)
- "Un numéro est déjà associé à un compte" - Si le numéro existe déjà

### Utilisation du FormRegisterSchema
Les composants utilisent maintenant le `FormRegisterSchema` pour :
- ✅ **Validation explicite** avec `FormRegisterSchema.safeParse(values)`
- ✅ **Messages d'erreur cohérents** du schéma
- ✅ **Gestion unifiée** des erreurs de validation 