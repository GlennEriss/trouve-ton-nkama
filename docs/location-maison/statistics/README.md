# Module de Statistiques pour les Annonces

## 🎯 Vue d'ensemble

### Page de tracking vs Page d'affichage

**📍 Page de tracking (PUBLIQUE)** : `src/app/(public)/houseDetails/[id]/page.tsx`
- **Accessible à tous** les visiteurs (authentifiés ou non)
- **Capture toutes les interactions** : vues, contacts WhatsApp, partages, etc.
- **Composant principal** : `src/components/preview-property/HouseDetails.tsx`

**🔐 Page d'affichage des statistiques (PRIVÉE)** : `src/app/(protected)/property/[id]/statistics/page.tsx`
- **Accessible uniquement au propriétaire** de l'annonce
- **Affiche les statistiques** collectées depuis la page publique
- **Visualisations et graphiques** pour le propriétaire

### Principe de fonctionnement

```
Visiteur (Public)                    Propriétaire (Protégé)
     │                                      │
     ├─ Consulte /houseDetails/[id]         │
     ├─ Interactions trackées ────────────┐ │
     │                                    │ │
     │                                    ▼ │
     │                            Données stockées
     │                            dans Firestore
     │                                    │
     │                                    ▼
     │                          Propriétaire consulte
     │                          /property/[id]/statistics
     │                                    │
     └──────────────────────────────────► Affichage des stats
```

## 📋 Table des matières

1. [Analyse du projet](#analyse-du-projet)
2. [Statistiques à relever](#statistiques-à-relever)
3. [Architecture proposée](#architecture-proposée)
4. [Structure de données](#structure-de-données)
5. [Implémentation](#implémentation)
6. [Cas d'usage](#cas-dusage)

---

## 🔍 Analyse du projet

### Structure actuelle

Le projet est une plateforme de location/vente de propriétés construite avec **Next.js**, **TypeScript**, **Firebase Firestore** et **React Query**.

#### Modèles de données existants

**Propriété (Property)** - Défini dans `src/models/annonce.d.ts` :
```typescript
export type Property = Location & ICreation & {
    typeProperty: TypeProperty
    images: Image[]
    title: string,
    description: string,
    area: number,
    price: number,
    tags: string[],
    createdBy?: string,
    status: StatusProperty,
    contact?: string
    currentPromotion?: Promotion;
    promotionHistory?: Promotion[];
    lastBoostedAt?: Timestamp;
    isPromoted?: boolean;
}
```

#### Pages de détails

- **Page publique** : `src/app/(public)/houseDetails/[id]/page.tsx`
  - Composant : `src/components/preview-property/HouseDetails.tsx`
  - Accessible à tous les utilisateurs
  - Affiche les détails complets d'une propriété

- **Page propriétaire** : `src/app/(protected)/property/[id]/page.tsx`
  - Composant : `src/components/preview-property/PreviewPropertyClient.tsx`
  - Accessible uniquement au propriétaire
  - Permet la modification de l'annonce

#### Système de statistiques existant

**Statistiques agrégées par utilisateur** (`src/hooks/use-properties-stat-by-user-id.ts`) :
- Compte les propriétés par type (Villa, Apartment, Studio, etc.)
- Statistiques globales du portefeuille du propriétaire

**Tests d'intégration** (`__tests__/integration/property-lifecycle.test.ts`) :
- Concept de `trackPropertyView()` avec analytics
- Suivi des vues uniques
- Analytics par jour/heure
- Métriques de performance

### État actuel des statistiques

✅ **Déjà implémenté** :
- Comptage des propriétés par type
- Comptage des propriétés par province
- Structure de base pour les analytics (dans les tests)

❌ **Non implémenté** :
- Suivi des vues individuelles sur les pages de détails
- Statistiques détaillées par propriété
- Historique des interactions
- Métriques de performance réelles

---

## 📊 Statistiques à relever

> **📍 Point de tracking principal** : `src/app/(public)/houseDetails/[id]/page.tsx`  
> **Composant principal** : `src/components/preview-property/HouseDetails.tsx`  
> 
> **Toutes les interactions sont capturées depuis la page publique** accessible à tous les visiteurs (authentifiés ou non).  
> Les statistiques sont ensuite **affichées uniquement au propriétaire** sur la page protégée `/property/[id]/statistics`.

### Composants d'interaction à tracker

Les interactions sont présentes dans plusieurs composants :
- **ContactSection.tsx** : Contacts WhatsApp et téléphone
- **ButtonShareToWhatsapp.tsx** : Partage WhatsApp
- **ButtonShareToFacebook.tsx** : Partage Facebook
- **ButtonShare.tsx** : Menu de partage général
- **ButtonFavoris.tsx** : Ajout/suppression des favoris
- **HouseDetails.tsx** : Vue générale, scroll, durée

### 1. Statistiques de vues

**Où tracker** : `src/components/preview-property/HouseDetails.tsx`

#### Vues totales
- **Nombre total de vues** : Compteur global de toutes les consultations
- **Vues uniques** : Nombre d'utilisateurs distincts ayant consulté
- **Dernière vue** : Timestamp de la dernière consultation
- **Tracking** : Au chargement du composant `HouseDetails`

#### Granularité temporelle
- **Vues par jour** : Distribution des vues sur les 30/90 derniers jours
- **Vues par heure** : Heures de pointe (0-23)
- **Vues par semaine** : Tendances hebdomadaires
- **Vues par mois** : Évolution mensuelle

#### Segmentation géographique
- **Vues par province** : D'où viennent les visiteurs (basé sur IP ou géolocalisation)
- **Vues par ville** : Géolocalisation des consultations

### 2. Statistiques d'interactions utilisateur

#### 2.1 Contacts générés

**Composant** : `src/components/preview-property/ContactSection.tsx`

##### Contact WhatsApp
- **Clics sur le bouton WhatsApp** : Nombre de clics pour contacter via WhatsApp
- **Tracking** : Lors du clic sur le `<Link>` vers `https://wa.me/...` (ligne 22-44)
- **Métadonnées** : Timestamp, user agent, provenance (si disponible)

##### Contact téléphone
- **Clics sur le bouton téléphone** : Nombre de clics pour afficher/appeler
- **Tracking** : Lors du clic sur le bouton téléphone (ligne 60-68 mobile, ligne 48-51 desktop)
- **Métadonnées** : Timestamp, user agent

#### 2.2 Partages sociaux

**Composant** : `src/components/preview-property/ButtonShare.tsx`

##### Partage WhatsApp
- **Composant** : `src/components/preview-property/ButtonShareToWhatsapp.tsx`
- **Tracking** : Lors du clic sur `handleShare()` (ligne 6-14)
- **Métadonnées** : Timestamp, type de partage (WhatsApp)

##### Partage Facebook
- **Composant** : `src/components/preview-property/ButtonShareToFacebook.tsx`
- **Tracking** : Lors du clic sur le bouton de partage Facebook
- **Métadonnées** : Timestamp, type de partage (Facebook)

##### Autres partages
- **Partage via l'API native** : Si utilisation de `navigator.share()`
- **Copie de lien** : Si fonctionnalité ajoutée

#### 2.3 Engagement sur la page

##### Interactions de navigation
- **Temps de consultation** : Durée moyenne de visite sur la page
- **Scroll depth** : Jusqu'où les utilisateurs scrollent (0-100%)
- **Images consultées** : Quelles images du carousel sont les plus regardées
- **Temps sur chaque section** : Durée passée sur description, carte, etc.

##### Interactions complémentaires
- **Ajout aux favoris** : `src/components/preview-property/ButtonFavoris.tsx`
- **Clics sur la carte** : Interactions avec la map
- **Vues des recommandations** : Clics sur les propriétés suggérées

### 3. Statistiques d'engagement

#### Taux de conversion
- **Taux de contact** : (Contacts / Vues) × 100
- **Taux de partage** : (Partages / Vues) × 100
- **Taux de contact WhatsApp** : (Contacts WhatsApp / Vues) × 100
- **Taux de vues uniques** : (Vues uniques / Vues totales) × 100
- **Taux de rebond** : Visiteurs qui quittent immédiatement (< 10 secondes)

#### Métriques d'engagement
- **Temps moyen de consultation** : Durée moyenne par visite
- **Scroll moyen** : Pourcentage moyen de scroll
- **Images les plus consultées** : Ranking des images du carousel

### 3. Statistiques de performance

#### Métriques temporelles
- **Jours en ligne** : Nombre de jours depuis la publication
- **Vues par jour** : Moyenne de vues quotidiennes
- **Vues par jour (moyenne mobile)** : Tendances sur 7/30 jours

#### Comparaisons
- **Performance vs moyenne** : Comparaison avec d'autres annonces similaires
- **Performance vs propre moyenne** : Comparaison avec les autres annonces du propriétaire
- **Évolution temporelle** : Croissance/décroissance des vues

### 4. Statistiques de contact

#### Contacts générés
- **Nombre total de contacts** : Compteur de contacts
- **Dernier contact** : Timestamp du dernier contact
- **Contacts par jour** : Fréquence des contacts
- **Taux de réponse** : Si suivi des réponses aux contacts

---

## 🏗️ Architecture proposée

### Structure de données Firestore

#### Collection principale : `property_statistics`

Chaque document correspond à une propriété et contient :

```typescript
interface PropertyStatistics {
  // Identifiants
  propertyId: string;
  propertyOwnerId: string;
  
  // Métriques de base
  totalViews: number;
  uniqueViews: number;
  totalContacts: number;
  
  // Timestamps
  firstViewedAt: Timestamp | null;
  lastViewedAt: Timestamp | null;
  lastContactAt: Timestamp | null;
  
  // Analytics temporels
  viewsByDay: Record<string, number>; // { "2024-01-15": 5, ... }
  viewsByHour: Record<number, number>; // { 0: 10, 1: 5, ... }
  viewsByMonth: Record<string, number>; // { "2024-01": 150, ... }
  
  // Analytics géographiques
  viewsByProvince: Record<string, number>;
  viewsByCity: Record<string, number>;
  
  // Utilisateurs uniques (Set converti en Array pour Firestore)
  uniqueViewers: string[]; // IDs des utilisateurs uniques
  
  // Métriques d'engagement
  averageViewDuration: number; // en secondes
  totalViewDuration: number; // en secondes
  scrollDepth: Record<string, number>; // { "0-25": 100, "25-50": 80, ... }
  imageViews: Record<number, number>; // { 0: 150, 1: 120, ... } index de l'image
  
  // Statistiques d'interactions
  whatsappContacts: number; // Nombre de clics sur contact WhatsApp
  phoneContacts: number; // Nombre de clics sur téléphone
  whatsappShares: number; // Nombre de partages WhatsApp
  facebookShares: number; // Nombre de partages Facebook
  favoriteAdds: number; // Nombre d'ajouts aux favoris
  interactionsByDay: Record<string, number>; // Interactions par jour
  
  // Métriques calculées
  viewsPerDay: number; // Calculé : totalViews / daysOnline
  contactRate: number; // Calculé : (totalContacts / totalViews) * 100
  uniqueViewRate: number; // Calculé : (uniqueViews / totalViews) * 100
  
  // Métadonnées
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Collection de logs : `property_view_logs` (optionnel, pour granularité fine)

```typescript
interface PropertyViewLog {
  id: string;
  propertyId: string;
  userId: string | null; // null si visiteur anonyme
  timestamp: Timestamp;
  duration: number; // en secondes
  scrollDepth: number; // 0-100
  imagesViewed: number[]; // indices des images vues
  province: string | null;
  city: string | null;
  userAgent: string;
  referrer: string | null;
  sessionId: string;
}
```

### Extensions du modèle Property

Ajouter au type `Property` dans `src/models/annonce.d.ts` :

```typescript
export type Property = Location & ICreation & {
  // ... propriétés existantes ...
  
  // Nouveaux champs pour statistiques rapides
  viewCount?: number; // Compteur simple pour affichage rapide
  contactCount?: number; // Compteur simple pour affichage rapide
  lastViewedAt?: Timestamp;
}
```

---

## 💻 Implémentation

### 1. Fonctions de base de données

#### `src/db/property-statistics.db.ts`

```typescript
// Fonctions à implémenter :

/**
 * Enregistre une vue sur une propriété
 */
export async function trackPropertyView(
  propertyId: string,
  userId?: string,
  metadata?: ViewMetadata
): Promise<void>

/**
 * Enregistre un contact sur une propriété
 */
export async function trackPropertyContact(
  propertyId: string,
  userId?: string
): Promise<void>

/**
 * Récupère les statistiques complètes d'une propriété
 */
export async function getPropertyStatistics(
  propertyId: string,
  ownerId: string
): Promise<PropertyStatistics | null>

/**
 * Récupère les statistiques agrégées pour un propriétaire
 */
export async function getOwnerPropertyStatistics(
  ownerId: string
): Promise<AggregatedStatistics>

/**
 * Met à jour les métriques calculées (appelé périodiquement ou après modification)
 */
export async function updateCalculatedMetrics(
  propertyId: string
): Promise<void>
```

### 2. Hook React Query

#### `src/hooks/use-property-statistics.ts`

```typescript
export function usePropertyStatistics(
  propertyId: string | undefined,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ['property-statistics', propertyId],
    queryFn: () => getPropertyStatistics(propertyId),
    enabled: enabled && !!propertyId,
  });
}
```

### 3. Tracking côté client

#### Hook de tracking des vues

#### `src/hooks/use-track-property-view.ts`

```typescript
export function useTrackPropertyView(propertyId: string) {
  useEffect(() => {
    if (!propertyId) return;
    
    const startTime = Date.now();
    let scrollDepth = 0;
    const imagesViewed = new Set<number>();
    let hasLeftPage = false;
    
    // Tracking du scroll
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const percentage = (scrollTop / (documentHeight - windowHeight)) * 100;
      scrollDepth = Math.max(scrollDepth, percentage);
    };
    
    // Tracking des images (via intersection observer)
    const observeImages = () => {
      const images = document.querySelectorAll('[data-property-image]');
      images.forEach((img, index) => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              imagesViewed.add(index);
            }
          });
        }, { threshold: 0.5 });
        observer.observe(img);
      });
    };
    
    // Tracking de la durée et scroll
    window.addEventListener('scroll', handleScroll);
    observeImages();
    
    // Tracking lors du départ de la page
    const handleBeforeUnload = () => {
      if (!hasLeftPage) {
        hasLeftPage = true;
        const duration = Math.floor((Date.now() - startTime) / 1000);
        
        // Envoyer les données au serveur (utiliser sendBeacon pour fiabilité)
        trackPropertyView(propertyId, {
          duration,
          scrollDepth,
          imagesViewed: Array.from(imagesViewed),
        });
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Nettoyage et envoi des données
    return () => {
      handleBeforeUnload();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [propertyId]);
}
```

#### 4.2 Hook de tracking des interactions

#### `src/hooks/use-track-property-interaction.ts`

```typescript
export type InteractionType = 
  | 'whatsapp_contact'
  | 'phone_contact'
  | 'whatsapp_share'
  | 'facebook_share'
  | 'native_share'
  | 'favorite_add'
  | 'favorite_remove'
  | 'map_click'
  | 'recommendation_click';

export function useTrackPropertyInteraction(propertyId: string) {
  const trackInteraction = useCallback((
    type: InteractionType,
    metadata?: Record<string, any>
  ) => {
    if (!propertyId) return;
    
    // Envoyer au serveur
    fetch('/api/property/[id]/statistics/interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        type,
        timestamp: new Date().toISOString(),
        metadata: {
          userAgent: navigator.userAgent,
          ...metadata,
        },
      }),
    }).catch(console.error);
  }, [propertyId]);
  
  return { trackInteraction };
}
```

#### 4.3 Intégration dans les composants

##### Dans `HouseDetails.tsx`

```typescript
export default function HouseDetails() {
  const { id } = useParams<{ id: string }>()
  const { data: property, isLoading, error } = useProperty(id)
  
  // Tracking des vues
  useTrackPropertyView(id)
  
  // ... reste du code
}
```

##### Dans `ContactSection.tsx`

```typescript
export default function ContactSection({ property }: Readonly<{ property: Property }>) {
  const { trackInteraction } = useTrackPropertyInteraction(property.id!)
  
  const handleWhatsAppClick = () => {
    trackInteraction('whatsapp_contact', {
      phoneNumber: property.contact ?? user?.phoneNumbers?.[0],
    });
  };
  
  const handlePhoneClick = () => {
    trackInteraction('phone_contact', {
      phoneNumber: property.contact ?? user?.phoneNumbers?.[0],
    });
  };
  
  return (
    <section>
      <Link
        href={/* ... */}
        onClick={handleWhatsAppClick}
      >
        {/* Bouton WhatsApp */}
      </Link>
      <button onClick={handlePhoneClick}>
        {/* Bouton téléphone */}
      </button>
    </section>
  );
}
```

##### Dans `ButtonShareToWhatsapp.tsx`

```typescript
export default function ButtonShareToWhatsapp({ property }: Readonly<{ property: Property }>) {
  const { trackInteraction } = useTrackPropertyInteraction(property.id!)
  
  const handleShare = () => {
    trackInteraction('whatsapp_share');
    
    const message = `🏠 Découvrez cette annonce...`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  return (
    <button onClick={handleShare}>
      {/* ... */}
    </button>
  );
}
```

##### Dans `ButtonShareToFacebook.tsx`

```typescript
export default function ButtonShareToFacebook({ property }: Readonly<{ property: Property }>) {
  const { trackInteraction } = useTrackPropertyInteraction(property.id!)
  
  const handleShare = () => {
    trackInteraction('facebook_share');
    // ... logique de partage Facebook
  };
  
  // ...
}
```
```

### 5. API Routes

#### `src/app/api/property/[id]/statistics/route.ts`

```typescript
// GET /api/property/[id]/statistics
// Récupère les statistiques d'une propriété (pour le propriétaire uniquement)
// Vérifie que l'utilisateur est le propriétaire avant de retourner les données
```

#### `src/app/api/property/[id]/statistics/view/route.ts`

```typescript
// POST /api/property/[id]/statistics/view
// Enregistre une vue sur une propriété (public - accessible à tous)
// Ne nécessite pas d'authentification
```

#### `src/app/api/property/[id]/statistics/interaction/route.ts`

```typescript
// POST /api/property/[id]/statistics/interaction
// Enregistre une interaction (contact, partage, etc.) (public - accessible à tous)
// Types d'interactions : whatsapp_contact, phone_contact, whatsapp_share, facebook_share, etc.
// Ne nécessite pas d'authentification
```

### 5. Composants UI

#### `src/components/property/PropertyStatisticsPanel.tsx`

Affichage des statistiques pour le propriétaire :
- Graphiques de vues (Chart.js ou Recharts)
- Tableau des métriques clés
- Filtres temporels (7j, 30j, 90j, Tout)
- Export des données

---

## 📍 Emplacement de l'affichage des statistiques

### ⚠️ Contraintes importantes

**Les statistiques sont PRIVÉES et doivent être visibles UNIQUEMENT par le propriétaire** :

- ✅ **Visible uniquement** : Propriétaire de l'annonce (`property.createdBy === user.uid`)
- ❌ **Non visible** : Page publique `/houseDetails/[id]`
- ❌ **Non visible** : Utilisateurs non authentifiés
- ❌ **Non visible** : Autres utilisateurs authentifiés

### 🔐 Protection d'accès

#### Côté client
La page `/property/[id]` vérifie déjà l'appartenance :
```typescript
// src/components/preview-property/PreviewPropertyClient.tsx
if (property.createdBy !== user?.uid) {
    redirect('/houseDetails/' + id)
}
```

#### Côté serveur
Chaque API route de statistiques doit vérifier l'appartenance avant de retourner les données.

---

## 🎨 Solutions d'affichage recommandées

### 📌 Solution A : Page dédiée + Section résumée (RECOMMANDÉE)

#### 1. Page dédiée aux statistiques complètes

**Route** : `/property/[id]/statistics`

**Fichier** : `src/app/(protected)/property/[id]/statistics/page.tsx`

**Contenu** :
- Graphiques détaillés (Chart.js ou Recharts)
- Toutes les métriques avancées
- Filtres temporels (7j, 30j, 90j, Tout)
- Export des données
- Comparaisons et recommandations

**Avantages** :
- ✅ Page complète sans encombrer la vue de détails
- ✅ Espace dédié pour analytics avancés
- ✅ Facilite la navigation avec un lien clair

**Structure proposée** :
```
src/app/(protected)/property/[id]/
├── page.tsx                    # Page de détails (existant)
├── statistics/
│   └── page.tsx                # Page statistiques complètes (à créer)
└── not-found.tsx               # 404 (existant)
```

#### 2. Section statistiques résumée dans la page de détails

**Fichier** : `src/components/preview-property/PreviewProperty.tsx`

**Contenu** :
- Vue d'ensemble compacte avec métriques clés
- Lien vers la page statistiques complètes
- Widget de métriques principales (vues, contacts, taux)

**Avantages** :
- ✅ Vue rapide des métriques importantes
- ✅ Encourage la consultation des statistiques détaillées
- ✅ N'encombre pas la page de détails

**Emplacement dans le composant** :
```typescript
// À ajouter après la section "Carte" (ligne 122)
{/* Section Statistiques - Visible uniquement pour le propriétaire */}
{isOwner && (
  <PropertyStatisticsSummary 
    propertyId={property.id}
    viewCount={property.viewCount}
    contactCount={property.contactCount}
  />
)}
```

---

### 📌 Solution B : Onglets dans la page de détails

**Fichier** : `src/components/preview-property/PreviewPropertyClient.tsx` ou créer un nouveau composant wrapper

**Structure** :
- Onglet "Détails" : Contenu actuel de `PreviewProperty`
- Onglet "Statistiques" : Vue complète des statistiques

**Composant Tabs existant** : `src/components/ui/tabs.tsx` (Radix UI)

**Avantages** :
- ✅ Tout au même endroit
- ✅ Navigation fluide entre détails et statistiques
- ✅ Pas de page supplémentaire

**Inconvénients** :
- ⚠️ Peut allonger la page si statistiques complexes
- ⚠️ Nécessite de restructurer le composant

**Exemple de structure** :
```typescript
<Tabs defaultValue="details" className="w-full">
  <TabsList>
    <TabsTrigger value="details">Détails</TabsTrigger>
    <TabsTrigger value="statistics">Statistiques</TabsTrigger>
  </TabsList>
  <TabsContent value="details">
    <PreviewProperty property={property} />
  </TabsContent>
  <TabsContent value="statistics">
    <PropertyStatisticsPanel propertyId={property.id} />
  </TabsContent>
</Tabs>
```

---

## 📈 Cas d'usage détaillés

### Cas 1 : Affichage résumé dans la page de détails (Solution A)

**Où** : `src/components/preview-property/PreviewProperty.tsx`

**Composant** : `PropertyStatisticsSummary`

```typescript
// Composant compact avec métriques clés
<div className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
  <div className="flex items-center justify-between">
    <h1 className='font-bold'>Statistiques</h1>
    <Link href={`/property/${propertyId}/statistics`}>
      <Button variant="outline">Voir tout</Button>
    </Link>
  </div>
  
  <div className="grid grid-cols-3 gap-4">
    <StatCard 
      label="Vues totales" 
      value={viewCount} 
      icon={<Eye />} 
    />
    <StatCard 
      label="Contacts" 
      value={contactCount} 
      icon={<Phone />} 
    />
    <StatCard 
      label="Taux de contact" 
      value={`${contactRate}%`} 
      icon={<TrendingUp />} 
    />
  </div>
</div>
```

**Condition de rendu** : Uniquement si `property.createdBy === user.uid`

---

### Cas 2 : Page complète des statistiques (Solution A)

**Où** : `src/app/(protected)/property/[id]/statistics/page.tsx`

**Composant** : `PropertyStatisticsPanel`

**Contenu** :
- Graphique d'évolution des vues (7j, 30j, 90j, Tout)
- Graphique de répartition horaire
- Tableau des métriques détaillées
- Comparaisons avec les moyennes
- Recommandations d'amélioration
- Export CSV/PDF

**Protection** :
```typescript
// Vérifier que l'utilisateur est le propriétaire
const { user } = useCurrentUser();
const { data: property } = useProperty(id);

if (property?.createdBy !== user?.uid) {
  redirect(`/property/${id}`);
}
```

**Lien de navigation** :
- Depuis la page de détails : Bouton "Voir les statistiques"
- Depuis la liste des propriétés : Lien dans chaque carte de propriété

---

### Cas 3 : Onglets dans la page de détails (Solution B)

**Où** : `src/components/preview-property/PreviewPropertyClient.tsx`

**Restructuration** :
```typescript
export default function PreviewPropertyClient() {
  const { id } = useParams<{ id: string }>()
  const { user } = useCurrentUser()
  const { data: property, isLoading, error } = useProperty(id)

  // ... vérifications d'erreur et loading ...

  if (property.createdBy !== user?.uid) {
    redirect('/houseDetails/' + id)
  }

  const isOwner = property.createdBy === user?.uid;

  return (
    <div>
      <Advertissment />
      
      {isOwner ? (
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="statistics">Statistiques</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <PreviewProperty property={property} />
          </TabsContent>
          <TabsContent value="statistics">
            <PropertyStatisticsPanel propertyId={property.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <PreviewProperty property={property} />
      )}
    </div>
  )
}
```

---

### Cas 4 : Navigation depuis la liste des propriétés

**Où** : `src/components/property/ListPropertySection.tsx` ou `src/components/property/PropertyList.tsx`

**Ajout d'un bouton** :
```typescript
// Dans CardPropertyCrud ou composant de liste
<Link href={`/property/${property.id}/statistics`}>
  <Button variant="ghost" size="sm">
    <BarChart3 className="w-4 h-4 mr-2" />
    Statistiques
  </Button>
</Link>
```

---

### Cas 5 : Notification au propriétaire

**Lorsqu'une annonce dépasse certains seuils** :
- **100 vues** : "Félicitations ! Votre annonce a atteint 100 vues"
- **Nouveau contact** : "Vous avez reçu un nouveau contact"
- **Performance faible** : "Votre annonce pourrait être améliorée"

**Où** : Système de notifications existant ou toast dans l'interface

**Afficher dans** :
- Page de détails (banner d'information)
- Liste des propriétés (badge sur la carte)
- Page des statistiques (alerte contextuelle)

---

## 🎯 Recommandation finale

**Solution recommandée : Solution A (Page dédiée + Section résumée)**

**Raisons** :
1. ✅ Séparation claire des responsabilités
2. ✅ Meilleure UX : vue rapide + détails approfondis
3. ✅ Évolutivité : facile d'ajouter de nouvelles statistiques
4. ✅ Performance : charge les statistiques uniquement si nécessaire
5. ✅ Cohérence avec la structure actuelle du projet

**Plan d'implémentation** :
1. Phase 1 : Créer la page `/property/[id]/statistics` (protégée)
2. Phase 2 : Créer le composant `PropertyStatisticsSummary` pour la vue résumée
3. Phase 3 : Intégrer la section résumée dans `PreviewProperty`
4. Phase 4 : Ajouter les liens de navigation depuis la liste des propriétés

---

## 🚀 Étapes de mise en œuvre

### Phase 1 : Infrastructure de base
1. ✅ Créer la structure de documentation
2. ⬜ Créer le schéma Firestore `property_statistics`
3. ⬜ Implémenter `trackPropertyView()` dans `property-statistics.db.ts`
4. ⬜ Créer l'API route `/api/property/[id]/statistics/view`
5. ⬜ Créer l'API route `/api/property/[id]/statistics` (GET - protégée)

### Phase 2 : Tracking côté client (Page publique)

**Page de tracking** : `src/app/(public)/houseDetails/[id]/page.tsx` (Page publique)
**Composant principal** : `src/components/preview-property/HouseDetails.tsx`

#### 2.1 Tracking des vues
1. ⬜ Implémenter `useTrackPropertyView()` hook
2. ⬜ Intégrer dans `HouseDetails.tsx` (page publique)
3. ⬜ Tester le tracking des vues (au chargement de la page)

#### 2.2 Tracking des interactions
1. ⬜ Implémenter `useTrackPropertyInteraction()` hook
2. ⬜ Tracker les clics sur le bouton WhatsApp (ContactSection.tsx)
3. ⬜ Tracker les clics sur le bouton téléphone (ContactSection.tsx)
4. ⬜ Tracker les partages WhatsApp (ButtonShareToWhatsapp.tsx)
5. ⬜ Tracker les partages Facebook (ButtonShareToFacebook.tsx)
6. ⬜ Tracker les autres interactions (favoris, scroll, durée, etc.)

#### 2.3 Protection d'accès côté serveur
1. ⬜ Vérifier l'authentification dans les API routes de tracking
2. ⬜ Implémenter la validation des données de tracking

### Phase 3 : Affichage des statistiques (Solution A recommandée)

#### 3.1 Page de statistiques complètes
1. ⬜ Créer `src/app/(protected)/property/[id]/statistics/page.tsx`
2. ⬜ Implémenter la vérification de propriétaire dans la page
3. ⬜ Créer `usePropertyStatistics()` hook
4. ⬜ Créer `PropertyStatisticsPanel` component (page complète)
5. ⬜ Ajouter les graphiques et visualisations (Chart.js/Recharts)

#### 3.2 Section statistiques résumée
1. ⬜ Créer `PropertyStatisticsSummary` component (vue compacte)
2. ⬜ Intégrer dans `PreviewProperty.tsx` (conditionnel si propriétaire)
3. ⬜ Ajouter le lien vers la page statistiques complètes

#### 3.3 Navigation
1. ⬜ Ajouter le lien "Statistiques" dans `ListPropertySection.tsx`
2. ⬜ Ajouter le bouton "Voir toutes les statistiques" dans la vue résumée

### Phase 4 : Analytics avancés
1. ⬜ Implémenter le tracking géographique (province, ville)
2. ⬜ Implémenter le tracking d'engagement (scroll, durée, images)
3. ⬜ Ajouter les métriques calculées (taux de contact, vues par jour, etc.)
4. ⬜ Créer les graphiques avancés (évolution temporelle, répartition géographique)

### Phase 5 : Optimisations et notifications
1. ⬜ Mise en cache des statistiques (React Query)
2. ⬜ Calcul batch des métriques
3. ⬜ Implémenter les notifications automatiques (seuils atteints)
4. ⬜ Créer les index Firestore nécessaires
5. ⬜ Optimiser les requêtes pour les performances

---

## 📝 Notes techniques

### Performance

- **Batching** : Regrouper les mises à jour de statistiques
- **Cache** : Mettre en cache les statistiques avec React Query
- **Index Firestore** : Créer les index nécessaires pour les requêtes

### Privacy

- Respecter le RGPD pour les données de tracking
- Anonymiser les données utilisateur si nécessaire
- Permettre l'opt-out du tracking

### Scalabilité

- Considérer l'utilisation de Cloud Functions pour les calculs lourds
- Utiliser Firestore Batch pour les mises à jour fréquentes
- Implémenter un système de logs si nécessaire pour un suivi granulaire

---

## 📚 Références

- Modèle Property : `src/models/annonce.d.ts`
- Tests de cycle de vie : `__tests__/integration/property-lifecycle.test.ts`
- Page de détails : `src/app/(public)/houseDetails/[id]/page.tsx`
- Base de données : `src/db/property.db.ts`

