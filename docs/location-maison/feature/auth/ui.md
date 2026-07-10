# UI — Inscription (Register)

> **FEATURE-001** - Spécifications UI

---

## 🎨 Vue d'ensemble

Page d'inscription centrée, avec formulaire clair et branding visible. Design moderne et accessible.

---

## 📐 Structure de la Page

### Container Principal

```tsx
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
  <div className="w-full max-w-md">
    {/* Formulaire */}
  </div>
</div>
```

**Styles** :
- `min-h-screen` : Hauteur minimale = viewport
- `flex items-center justify-center` : Centrage vertical et horizontal
- `bg-gradient-to-br from-gray-50 to-gray-100` : Dégradé de fond subtil
- `px-4 py-8` : Padding responsive
- `max-w-md` : Largeur maximale 448px (28rem)

### Card du Formulaire

```tsx
<Card className="shadow-lg border-0">
  <CardHeader className="space-y-2 text-center">
    {/* Header */}
  </CardHeader>
  <CardContent>
    {/* Formulaire */}
  </CardContent>
</Card>
```

**Styles Card** :
- `shadow-lg` : Ombre portée importante
- `border-0` : Pas de bordure (l'ombre suffit)
- `rounded-lg` : Coins arrondis (8px)

---

## 🎯 Header

### Logo et Titre

```tsx
<div className="flex flex-col items-center space-y-2 mb-6">
  <div className="w-16 h-16 bg-gradient-to-br from-[#146B67] to-[#1FA89B] rounded-full flex items-center justify-center">
    <Home className="w-8 h-8 text-white" />
  </div>
  <h1 className="text-2xl font-semibold text-gray-900">
    Créer un compte
  </h1>
  <p className="text-sm text-gray-600">
    Commencez à rechercher des propriétés
  </p>
</div>
```

**Styles** :
- Logo : Cercle 64x64px avec dégradé (couleurs de la marque)
- Titre : `text-2xl font-semibold` (24px, font-weight 600)
- Sous-titre : `text-sm text-gray-600` (14px, gris moyen)

---

## 📝 Formulaire

### Structure Générale

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    {/* Champs */}
  </form>
</Form>
```

**Espacement** :
- `space-y-4` : Espacement vertical de 16px entre les champs

### Champ Prénom

```tsx
<FormField
  control={form.control}
  name="firstname"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Prénom</FormLabel>
      <FormControl>
        <Input
          placeholder="John"
          className="h-11"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Styles Input** :
- `h-11` : Hauteur 44px (accessibilité)
- `placeholder` : Texte d'aide gris clair
- Bordure : `border-gray-300` par défaut
- Focus : `ring-2 ring-[#146B67]` (couleur de la marque)

### Champ Nom

Identique au champ Prénom, avec placeholder "Doe"

### Champ Email

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          type="email"
          placeholder="john.doe@example.com"
          className="h-11"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation visuelle** :
- Bordure verte si email valide (après blur)
- Bordure rouge si email invalide
- Icône de validation (checkmark/X) à droite (optionnel)

### Champ Date de Naissance

```tsx
<FormField
  control={form.control}
  name="birthdate"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Date de naissance</FormLabel>
      <FormControl>
        <div className="grid grid-cols-3 gap-2">
          <Select>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Jour" />
            </SelectTrigger>
            <SelectContent>
              {/* Options 1-31 */}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {/* Options mois */}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {/* Options années (1900 - aujourd'hui - 18) */}
            </SelectContent>
          </Select>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Layout** :
- `grid-cols-3` : 3 colonnes égales
- `gap-2` : Espacement de 8px entre les selects

### Champ Téléphone

```tsx
<FormField
  control={form.control}
  name="phone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Numéro de téléphone</FormLabel>
      <FormControl>
        <PhoneInput
          defaultCountry="GA"
          className="h-11"
          {...field}
        />
      </FormControl>
      <FormDescription>
        Format : +241 XX XX XX XX
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Composant PhoneInput** :
- Utilise `react-phone-number-input`
- Drapeau du pays (Gabon par défaut)
- Format automatique selon le pays

### Champ Mot de Passe

```tsx
<FormField
  control={form.control}
  name="password"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Mot de passe</FormLabel>
      <FormControl>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="h-11 pr-10"
            {...field}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </FormControl>
      <FormDescription>
        Minimum 8 caractères, 1 majuscule, 1 chiffre
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Fonctionnalités** :
- Toggle visibilité (icône Eye/EyeOff)
- Indicateur de force du mot de passe (optionnel, barre de progression)

### Champ Confirmation Mot de Passe

Identique au champ Mot de passe, avec placeholder "Confirmez votre mot de passe"

### Checkbox Conditions

```tsx
<FormField
  control={form.control}
  name="termsOfPrivacyPolicy"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel className="text-sm font-normal">
          J'accepte les{" "}
          <Link href="/terms" className="text-[#146B67] hover:underline">
            conditions d'utilisation
          </Link>
          {" "}et la{" "}
          <Link href="/privacy" className="text-[#146B67] hover:underline">
            politique de confidentialité
          </Link>
        </FormLabel>
      </div>
    </FormItem>
  )}
/>
```

**Styles** :
- Checkbox alignée à gauche
- Texte avec liens vers CGU et politique
- Liens en couleur de la marque (`#146B67`)

### Bouton Submit

```tsx
<Button
  type="submit"
  className="w-full h-11 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white font-medium"
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Création en cours...
    </>
  ) : (
    "S'inscrire"
  )}
</Button>
```

**Styles** :
- `w-full` : Pleine largeur
- `h-11` : Hauteur 44px
- Dégradé de fond (couleurs de la marque)
- Texte blanc, font-medium
- État loading : Spinner + texte modifié

---

## 🎨 États Visuels

### Champ Valide
- Bordure : `border-green-500` (optionnel)
- Icône : Checkmark vert à droite (optionnel)

### Champ Invalide
- Bordure : `border-red-500`
- Background : `bg-red-50` (très léger)
- Icône : X rouge à droite
- Message d'erreur : Texte rouge `text-red-600` sous le champ

### Champ en Focus
- Ring : `ring-2 ring-[#146B67] ring-offset-2`
- Bordure : `border-[#146B67]`

### Bouton Disabled
- Opacité : `opacity-50`
- Cursor : `cursor-not-allowed`
- Background : Gris (`bg-gray-300`)

---

## 📱 Responsive

### Mobile (< 640px)
```tsx
<div className="px-4 py-6">
  <Card className="shadow-md">
    {/* Formulaire avec padding réduit */}
  </Card>
</div>
```

**Ajustements** :
- Padding réduit : `px-4 py-6` (16px/24px)
- Date de naissance : Champs empilés verticalement
- Bouton : Pleine largeur avec marges latérales

### Desktop (> 1024px)
```tsx
<div className="px-8 py-12">
  <Card className="shadow-xl max-w-md mx-auto">
    {/* Formulaire centré */}
  </Card>
</div>
```

**Ajustements** :
- Padding augmenté : `px-8 py-12` (32px/48px)
- Ombre plus prononcée : `shadow-xl`
- Max-width : `max-w-md` (448px)

---

## 🎬 Animations

### Fade-in au Chargement
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Application** :
- Card : `animate-fade-in` (300ms, ease-out)

### Shake sur Erreur
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

**Application** :
- Champ en erreur : `animate-shake` (200ms)

### Toast Slide-in
```css
@keyframes slideInDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

**Application** :
- Toast : `animate-slide-in-down` (300ms)

---

## 🎨 Palette de Couleurs

### Couleurs Principales
- **Primaire** : `#146B67` (Vert foncé)
- **Secondaire** : `#1FA89B` (Vert clair)
- **Erreur** : `#EF4444` (Rouge)
- **Succès** : `#10B981` (Vert)
- **Warning** : `#F59E0B` (Orange)

### Couleurs Neutres
- **Fond** : `#F9FAFB` (Gris très clair)
- **Card** : `#FFFFFF` (Blanc)
- **Texte principal** : `#111827` (Gris très foncé)
- **Texte secondaire** : `#6B7280` (Gris moyen)
- **Bordure** : `#E5E7EB` (Gris clair)

---

## 📦 Composants Utilisés

### shadcn/ui
- `Card`, `CardHeader`, `CardContent`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription`
- `Input`
- `Button`
- `Checkbox`
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`
- `Toast` (pour les messages de succès/erreur)

### Autres
- `react-phone-number-input` : Composant téléphone
- `lucide-react` : Icônes (Eye, EyeOff, Loader2, Home)

---

## ✅ Checklist UI

- [ ] Card centrée avec ombre
- [ ] Logo et titre visibles
- [ ] Tous les champs avec labels
- [ ] Validation visuelle (bordure rouge/verte)
- [ ] Messages d'erreur sous les champs
- [ ] Bouton avec état loading
- [ ] Responsive mobile/desktop
- [ ] Animations fluides
- [ ] Accessibilité (contraste, labels, focus)
- [ ] Couleurs de la marque respectées

---

*Dernière mise à jour : 2026-01-12*

