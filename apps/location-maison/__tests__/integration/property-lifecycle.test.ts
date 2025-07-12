import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Simulation du cycle de vie des propriétés
class MockPropertyLifecycleService {
  private properties: Map<string, any> = new Map();
  private propertyHistory: Map<string, any[]> = new Map();
  private moderationQueue: any[] = [];
  private analyticsData: Map<string, any> = new Map();

  async createProperty(ownerId: string, propertyData: any) {
    const propertyId = `prop_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const property = {
      id: propertyId,
      ownerId,
      ...propertyData,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      favorites: 0,
      contacts: 0,
      moderationStatus: 'pending'
    };

    this.properties.set(propertyId, property);
    this.addToHistory(propertyId, 'CREATED', 'Propriété créée', { initialData: propertyData });
    
    // Ajout à la file de modération
    this.moderationQueue.push({
      id: `mod_${Date.now()}`,
      propertyId,
      type: 'new_property',
      createdAt: new Date(),
      status: 'pending'
    });

    return property;
  }

  async updateProperty(propertyId: string, updates: any, userId: string) {
    const property = this.properties.get(propertyId);
    if (!property) {
      throw new Error('Propriété non trouvée');
    }

    if (property.ownerId !== userId) {
      throw new Error('Accès non autorisé');
    }

    const previousData = { ...property };
    
    Object.assign(property, updates, {
      updatedAt: new Date(),
      status: property.status === 'published' ? 'pending_review' : property.status
    });

    this.properties.set(propertyId, property);
    this.addToHistory(propertyId, 'UPDATED', 'Propriété modifiée', { 
      changes: updates,
      previousData: previousData 
    });

    // Si publiée, remettre en modération pour changements majeurs
    if (this.hasMajorChanges(previousData, property)) {
      this.moderationQueue.push({
        id: `mod_${Date.now()}`,
        propertyId,
        type: 'property_update',
        createdAt: new Date(),
        status: 'pending',
        changes: updates
      });
    }

    return property;
  }

  async publishProperty(propertyId: string, ownerId: string) {
    const property = this.properties.get(propertyId);
    if (!property) {
      throw new Error('Propriété non trouvée');
    }

    if (property.ownerId !== ownerId) {
      throw new Error('Accès non autorisé');
    }

    if (property.status !== 'draft' && property.status !== 'rejected') {
      throw new Error(`Impossible de publier depuis le statut: ${property.status}`);
    }

    property.status = 'pending_review';
    property.submittedAt = new Date();
    property.updatedAt = new Date();

    this.properties.set(propertyId, property);
    this.addToHistory(propertyId, 'SUBMITTED', 'Soumise pour publication');

    return property;
  }

  async moderateProperty(propertyId: string, moderatorId: string, decision: 'approve' | 'reject', reason?: string) {
    const property = this.properties.get(propertyId);
    if (!property) {
      throw new Error('Propriété non trouvée');
    }

    const moderationItem = this.moderationQueue.find(m => 
      m.propertyId === propertyId && m.status === 'pending'
    );

    if (moderationItem) {
      moderationItem.status = decision === 'approve' ? 'approved' : 'rejected';
      moderationItem.moderatorId = moderatorId;
      moderationItem.moderatedAt = new Date();
      moderationItem.reason = reason;
    }

    if (decision === 'approve') {
      property.status = 'published';
      property.publishedAt = new Date();
      property.moderationStatus = 'approved';
      
      this.addToHistory(propertyId, 'APPROVED', 'Propriété approuvée et publiée');
      
      // Notification au propriétaire
      await mockNotificationService.createNotification({
        userId: property.ownerId,
        type: 'SECURITY',
        title: 'Propriété approuvée !',
        message: `Votre propriété "${property.title}" est maintenant en ligne`,
        metadata: { propertyId }
      });
    } else {
      property.status = 'rejected';
      property.rejectedAt = new Date();
      property.moderationStatus = 'rejected';
      property.rejectionReason = reason;
      
      this.addToHistory(propertyId, 'REJECTED', `Propriété rejetée: ${reason}`);
      
      // Notification de rejet
      await mockNotificationService.createNotification({
        userId: property.ownerId,
        type: 'SECURITY',
        title: 'Propriété rejetée',
        message: `Votre propriété "${property.title}" a été rejetée. Raison: ${reason}`,
        metadata: { propertyId, reason }
      });
    }

    property.updatedAt = new Date();
    this.properties.set(propertyId, property);

    return property;
  }

  async archiveProperty(propertyId: string, ownerId: string, reason: string) {
    const property = this.properties.get(propertyId);
    if (!property || property.ownerId !== ownerId) {
      throw new Error('Propriété non trouvée ou accès non autorisé');
    }

    property.status = 'archived';
    property.archivedAt = new Date();
    property.archiveReason = reason;
    property.updatedAt = new Date();

    this.properties.set(propertyId, property);
    this.addToHistory(propertyId, 'ARCHIVED', `Propriété archivée: ${reason}`);

    return property;
  }

  async deleteProperty(propertyId: string, ownerId: string) {
    const property = this.properties.get(propertyId);
    if (!property || property.ownerId !== ownerId) {
      throw new Error('Propriété non trouvée ou accès non autorisé');
    }

    // Soft delete
    property.status = 'deleted';
    property.deletedAt = new Date();
    property.updatedAt = new Date();

    this.properties.set(propertyId, property);
    this.addToHistory(propertyId, 'DELETED', 'Propriété supprimée');

    return property;
  }

  async trackPropertyView(propertyId: string, viewerId?: string) {
    const property = this.properties.get(propertyId);
    if (!property || property.status !== 'published') {
      return false;
    }

    property.views = (property.views || 0) + 1;
    property.lastViewedAt = new Date();
    
    // Analytics
    const analytics = this.analyticsData.get(propertyId) || {
      totalViews: 0,
      uniqueViews: new Set(),
      viewsByDay: new Map(),
      viewsByHour: new Map()
    };

    analytics.totalViews++;
    if (viewerId) {
      analytics.uniqueViews.add(viewerId);
    }

    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    analytics.viewsByDay.set(today, (analytics.viewsByDay.get(today) || 0) + 1);
    analytics.viewsByHour.set(hour, (analytics.viewsByHour.get(hour) || 0) + 1);

    this.analyticsData.set(propertyId, analytics);
    this.properties.set(propertyId, property);

    return true;
  }

  async trackPropertyContact(propertyId: string, contactData: any) {
    const property = this.properties.get(propertyId);
    if (!property || property.status !== 'published') {
      return false;
    }

    property.contacts = (property.contacts || 0) + 1;
    property.lastContactAt = new Date();

    this.properties.set(propertyId, property);
    this.addToHistory(propertyId, 'CONTACTED', 'Contact reçu', contactData);

    // Notification au propriétaire
    await mockNotificationService.createNotification({
      userId: property.ownerId,
      type: 'BOOKMARKING',
      title: 'Nouveau contact pour votre propriété',
      message: `${contactData.name} s'intéresse à "${property.title}"`,
      metadata: { propertyId, contactData }
    });

    return true;
  }

  async getPropertyHistory(propertyId: string) {
    return this.propertyHistory.get(propertyId) || [];
  }

  async getPropertyAnalytics(propertyId: string, ownerId: string) {
    const property = this.properties.get(propertyId);
    if (!property || property.ownerId !== ownerId) {
      throw new Error('Accès non autorisé');
    }

    const analytics = this.analyticsData.get(propertyId) || {};
    const history = this.propertyHistory.get(propertyId) || [];

    return {
      property,
      analytics: {
        ...analytics,
        uniqueViews: analytics.uniqueViews ? analytics.uniqueViews.size : 0,
        viewsByDay: analytics.viewsByDay ? Object.fromEntries(analytics.viewsByDay) : {},
        viewsByHour: analytics.viewsByHour ? Object.fromEntries(analytics.viewsByHour) : {}
      },
      history,
      performance: this.calculatePerformanceMetrics(property, analytics)
    };
  }

  async getModerationQueue() {
    return this.moderationQueue.filter(item => item.status === 'pending');
  }

  async getPropertiesByStatus(status: string) {
    return Array.from(this.properties.values()).filter(p => p.status === status);
  }

  async getPropertiesByOwner(ownerId: string) {
    return Array.from(this.properties.values())
      .filter(p => p.ownerId === ownerId && p.status !== 'deleted');
  }

  private addToHistory(propertyId: string, action: string, description: string, metadata?: any) {
    const history = this.propertyHistory.get(propertyId) || [];
    history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      action,
      description,
      metadata,
      timestamp: new Date()
    });
    this.propertyHistory.set(propertyId, history);
  }

  private hasMajorChanges(previous: any, current: any): boolean {
    const majorFields = ['title', 'price', 'type', 'location', 'area'];
    return majorFields.some(field => 
      JSON.stringify(previous[field]) !== JSON.stringify(current[field])
    );
  }

  private calculatePerformanceMetrics(property: any, analytics: any) {
    const daysOnline = property.publishedAt ? 
      Math.max(1, Math.ceil((Date.now() - new Date(property.publishedAt).getTime()) / (1000 * 60 * 60 * 24))) : 1;
    
    const viewsPerDay = daysOnline > 0 ? (analytics.totalViews || 0) / daysOnline : 0;
    const contactRate = (analytics.totalViews || 0) > 0 ? 
      ((property.contacts || 0) / (analytics.totalViews || 0)) * 100 : 0;

    return {
      daysOnline,
      viewsPerDay: Math.round(viewsPerDay * 100) / 100,
      contactRate: Math.round(contactRate * 100) / 100,
      totalViews: analytics.totalViews || 0,
      uniqueViews: analytics.uniqueViews ? analytics.uniqueViews.size : 0,
      totalContacts: property.contacts || 0
    };
  }
}

class MockUserService {
  private users: Map<string, any> = new Map();

  async createUser(userData: any) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const user = {
      id: userId,
      ...userData,
      createdAt: new Date()
    };
    this.users.set(userId, user);
    return user;
  }

  async getUserById(userId: string) {
    return this.users.get(userId) || null;
  }
}

class MockNotificationService {
  private notifications: Map<string, any[]> = new Map();

  async createNotification(notificationData: any) {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...notificationData,
      isRead: false,
      createdAt: new Date()
    };

    const userNotifications = this.notifications.get(notificationData.userId) || [];
    userNotifications.push(notification);
    this.notifications.set(notificationData.userId, userNotifications);

    return notification;
  }

  async getUserNotifications(userId: string) {
    return this.notifications.get(userId) || [];
  }
}

// Instances globales
const mockPropertyLifecycleService = new MockPropertyLifecycleService();
const mockUserService = new MockUserService();
const mockNotificationService = new MockNotificationService();

describe('Cycle de Vie des Propriétés - Tests d\'Intégration', () => {
  let testOwner: any;
  let testModerator: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Créer un propriétaire de test
    testOwner = await mockUserService.createUser({
      email: 'proprietaire@example.com',
      firstName: 'Jean',
      lastName: 'Propriétaire',
      userType: 'owner'
    });

    // Créer un modérateur de test
    testModerator = await mockUserService.createUser({
      email: 'moderateur@example.com',
      firstName: 'Marie',
      lastName: 'Modératrice',
      userType: 'moderator'
    });
  });

  describe('Cycle Complet : Création → Publication → Modération → Analytics', () => {
    test('devrait gérer le cycle de vie complet d\'une propriété', async () => {
      // === ÉTAPE 1: CRÉATION DE LA PROPRIÉTÉ ===
      const propertyData = {
        title: 'Villa Moderne Libreville',
        description: 'Belle villa 4 chambres avec jardin et piscine',
        type: 'villa',
        price: 450000,
        area: 250,
        bedrooms: 4,
        bathrooms: 3,
        location: {
          city: 'Libreville',
          district: 'Batterie IV',
          address: '123 Avenue de la République'
        },
        features: ['piscine', 'jardin', 'garage', 'climatisation'],
        images: ['villa1.jpg', 'villa2.jpg', 'villa3.jpg']
      };

      const createdProperty = await mockPropertyLifecycleService.createProperty(
        testOwner.id,
        propertyData
      );

      expect(createdProperty.status).toBe('draft');
      expect(createdProperty.ownerId).toBe(testOwner.id);
      expect(createdProperty.title).toBe(propertyData.title);
      expect(createdProperty.moderationStatus).toBe('pending');

      // Vérifier l'historique
      const history = await mockPropertyLifecycleService.getPropertyHistory(createdProperty.id);
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('CREATED');

      // === ÉTAPE 2: MODIFICATION AVANT PUBLICATION ===
      const updates = {
        price: 425000, // Réduction de prix
        description: 'Belle villa 4 chambres avec jardin, piscine et vue mer',
        features: [...propertyData.features, 'vue_mer']
      };

      const updatedProperty = await mockPropertyLifecycleService.updateProperty(
        createdProperty.id,
        updates,
        testOwner.id
      );

      expect(updatedProperty.price).toBe(425000);
      expect(updatedProperty.features).toContain('vue_mer');
      expect(updatedProperty.status).toBe('draft'); // Reste en draft

      // === ÉTAPE 3: SOUMISSION POUR PUBLICATION ===
      const submittedProperty = await mockPropertyLifecycleService.publishProperty(
        createdProperty.id,
        testOwner.id
      );

      expect(submittedProperty.status).toBe('pending_review');
      expect(submittedProperty.submittedAt).toBeTruthy();

      // Vérifier la file de modération
      const moderationQueue = await mockPropertyLifecycleService.getModerationQueue();
      expect(moderationQueue.length).toBeGreaterThan(0);
      
      const moderationItem = moderationQueue.find(item => 
        item.propertyId === createdProperty.id
      );
      expect(moderationItem).toBeTruthy();

      // === ÉTAPE 4: MODÉRATION ET APPROBATION ===
      const approvedProperty = await mockPropertyLifecycleService.moderateProperty(
        createdProperty.id,
        testModerator.id,
        'approve'
      );

      expect(approvedProperty.status).toBe('published');
      expect(approvedProperty.publishedAt).toBeTruthy();
      expect(approvedProperty.moderationStatus).toBe('approved');

      // Vérifier les notifications
      const ownerNotifications = await mockNotificationService.getUserNotifications(testOwner.id);
      const approvalNotification = ownerNotifications.find(n => 
        n.title.includes('approuvée')
      );
      expect(approvalNotification).toBeTruthy();

      // === ÉTAPE 5: TRACKING DES VUES ===
      const viewerId1 = 'viewer_1';
      const viewerId2 = 'viewer_2';

      // Plusieurs vues
      await mockPropertyLifecycleService.trackPropertyView(createdProperty.id, viewerId1);
      await mockPropertyLifecycleService.trackPropertyView(createdProperty.id, viewerId2);
      await mockPropertyLifecycleService.trackPropertyView(createdProperty.id, viewerId1); // Vue répétée
      await mockPropertyLifecycleService.trackPropertyView(createdProperty.id); // Vue anonyme

      // === ÉTAPE 6: CONTACTS ===
      const contactData = {
        name: 'Acheteur Potentiel',
        email: 'acheteur@example.com',
        phone: '+24107654321',
        message: 'Je suis intéressé par cette propriété. Puis-je la visiter ?'
      };

      await mockPropertyLifecycleService.trackPropertyContact(
        createdProperty.id,
        contactData
      );

      // Vérifier la notification de contact
      const updatedNotifications = await mockNotificationService.getUserNotifications(testOwner.id);
      const contactNotification = updatedNotifications.find(n => 
        n.title.includes('Nouveau contact')
      );
      expect(contactNotification).toBeTruthy();

      // === ÉTAPE 7: ANALYTICS ===
      const analytics = await mockPropertyLifecycleService.getPropertyAnalytics(
        createdProperty.id,
        testOwner.id
      );

      expect(analytics.property.status).toBe('published');
      expect(analytics.analytics.totalViews).toBe(4);
      expect(analytics.analytics.uniqueViews).toBe(2); // 2 viewers uniques
      expect(analytics.performance.totalContacts).toBe(1);
      expect(analytics.performance.contactRate).toBeGreaterThan(0);
      expect(analytics.history.length).toBeGreaterThan(1);

      // === ÉTAPE 8: MODIFICATION POST-PUBLICATION ===
      const majorUpdate = {
        price: 380000, // Changement majeur de prix
        title: 'Villa Moderne Libreville - Prix Réduit'
      };

      const modifiedProperty = await mockPropertyLifecycleService.updateProperty(
        createdProperty.id,
        majorUpdate,
        testOwner.id
      );

      expect(modifiedProperty.status).toBe('pending_review'); // Remis en modération
      expect(modifiedProperty.price).toBe(380000);

      // === ÉTAPE 9: SECONDE MODÉRATION ===
      const reApprovedProperty = await mockPropertyLifecycleService.moderateProperty(
        createdProperty.id,
        testModerator.id,
        'approve'
      );

      expect(reApprovedProperty.status).toBe('published');

      // === ÉTAPE 10: HISTORIQUE COMPLET ===
      const finalHistory = await mockPropertyLifecycleService.getPropertyHistory(
        createdProperty.id
      );

      expect(finalHistory.length).toBeGreaterThanOrEqual(5);
      
      const actions = finalHistory.map(h => h.action);
      expect(actions).toContain('CREATED');
      expect(actions).toContain('UPDATED');
      expect(actions).toContain('SUBMITTED');
      expect(actions).toContain('APPROVED');
      expect(actions).toContain('CONTACTED');
    });
  });

  describe('Cycle avec Rejet et Correction', () => {
    test('devrait gérer le rejet et la correction d\'une propriété', async () => {
      // === CRÉATION AVEC PROBLÈMES ===
      const problematicProperty = await mockPropertyLifecycleService.createProperty(
        testOwner.id,
        {
          title: 'Propriété Problématique',
          description: 'Description inappropriée avec contenu suspect',
          type: 'villa',
          price: -100, // Prix invalide
          area: 0, // Surface invalide
          location: { city: 'VilleInexistante' }
        }
      );

      // === SOUMISSION ===
      await mockPropertyLifecycleService.publishProperty(
        problematicProperty.id,
        testOwner.id
      );

      // === REJET PAR LE MODÉRATEUR ===
      const rejectionReason = 'Prix et surface invalides, localisation incorrecte';
      const rejectedProperty = await mockPropertyLifecycleService.moderateProperty(
        problematicProperty.id,
        testModerator.id,
        'reject',
        rejectionReason
      );

      expect(rejectedProperty.status).toBe('rejected');
      expect(rejectedProperty.rejectionReason).toBe(rejectionReason);

      // Vérifier la notification de rejet
      const notifications = await mockNotificationService.getUserNotifications(testOwner.id);
      const rejectionNotification = notifications.find(n => 
        n.title.includes('rejetée')
      );
      expect(rejectionNotification).toBeTruthy();
      expect(rejectionNotification.metadata.reason).toBe(rejectionReason);

      // === CORRECTION ET NOUVELLE SOUMISSION ===
      const corrections = {
        price: 180000,
        area: 120,
        location: { city: 'Libreville', district: 'Centre-ville' },
        description: 'Belle villa rénovée dans un quartier résidentiel calme'
      };

      await mockPropertyLifecycleService.updateProperty(
        problematicProperty.id,
        corrections,
        testOwner.id
      );

      await mockPropertyLifecycleService.publishProperty(
        problematicProperty.id,
        testOwner.id
      );

      // === APPROBATION APRÈS CORRECTION ===
      // Attendre un peu pour assurer des timestamps différents
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const finalProperty = await mockPropertyLifecycleService.moderateProperty(
        problematicProperty.id,
        testModerator.id,
        'approve'
      );

      expect(finalProperty.status).toBe('published');
      expect(finalProperty.price).toBe(180000);

      // === VÉRIFICATION HISTORIQUE ===
      const history = await mockPropertyLifecycleService.getPropertyHistory(
        problematicProperty.id
      );

      const rejectionEntry = history.find(h => h.action === 'REJECTED');
      const approvalEntry = history.find(h => h.action === 'APPROVED');
      
      expect(rejectionEntry).toBeTruthy();
      expect(approvalEntry).toBeTruthy();
      expect(approvalEntry.timestamp.getTime()).toBeGreaterThan(rejectionEntry.timestamp.getTime());
    });
  });

  describe('Gestion du Portefeuille de Propriétés', () => {
    test('devrait gérer plusieurs propriétés pour un propriétaire', async () => {
      const properties = [];

      // === CRÉATION DE PLUSIEURS PROPRIÉTÉS ===
      const propertyTypes = [
        { type: 'villa', title: 'Villa Luxueuse', price: 500000 },
        { type: 'apartment', title: 'Appartement Moderne', price: 150000 },
        { type: 'home', title: 'Maison Familiale', price: 220000 }
      ];

      for (const propType of propertyTypes) {
        const property = await mockPropertyLifecycleService.createProperty(
          testOwner.id,
          {
            title: propType.title,
            description: `Description de ${propType.title}`,
            type: propType.type,
            price: propType.price,
            area: 100,
            location: { city: 'Libreville' }
          }
        );
        properties.push(property);

        // Publier et approuver
        await mockPropertyLifecycleService.publishProperty(property.id, testOwner.id);
        await mockPropertyLifecycleService.moderateProperty(
          property.id,
          testModerator.id,
          'approve'
        );
      }

      // === VÉRIFICATION DU PORTEFEUILLE ===
      const ownerProperties = await mockPropertyLifecycleService.getPropertiesByOwner(
        testOwner.id
      );

      expect(ownerProperties).toHaveLength(3);
      expect(ownerProperties.every(p => p.status === 'published')).toBe(true);

      // === SIMULATION D'ACTIVITÉ ===
      for (const property of properties) {
        // Vues aléatoires
        const viewCount = Math.floor(Math.random() * 20) + 5;
        for (let i = 0; i < viewCount; i++) {
          await mockPropertyLifecycleService.trackPropertyView(
            property.id,
            `viewer_${i}`
          );
        }

        // Contacts aléatoires
        const contactCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < contactCount; i++) {
          await mockPropertyLifecycleService.trackPropertyContact(property.id, {
            name: `Contact ${i}`,
            email: `contact${i}@example.com`,
            message: 'Intéressé par la propriété'
          });
        }
      }

      // === ANALYTICS COMPARATIVES ===
      const analyticsResults = [];
      for (const property of properties) {
        const analytics = await mockPropertyLifecycleService.getPropertyAnalytics(
          property.id,
          testOwner.id
        );
        analyticsResults.push(analytics);
      }

      // Vérifier que toutes les propriétés ont des analytics
      expect(analyticsResults).toHaveLength(3);
      analyticsResults.forEach(analytics => {
        expect(analytics.performance.totalViews).toBeGreaterThan(0);
        expect(analytics.performance.totalContacts).toBeGreaterThan(0);
        expect(analytics.performance.contactRate).toBeGreaterThan(0);
      });

      // === ARCHIVAGE D'UNE PROPRIÉTÉ ===
      const propertyToArchive = properties[0];
      const archivedProperty = await mockPropertyLifecycleService.archiveProperty(
        propertyToArchive.id,
        testOwner.id,
        'Vendue via une autre plateforme'
      );

      expect(archivedProperty.status).toBe('archived');
      expect(archivedProperty.archiveReason).toBeTruthy();

      // === VÉRIFICATION PORTEFEUILLE FINAL ===
      const finalPortfolio = await mockPropertyLifecycleService.getPropertiesByOwner(
        testOwner.id
      );

      const publishedCount = finalPortfolio.filter(p => p.status === 'published').length;
      const archivedCount = finalPortfolio.filter(p => p.status === 'archived').length;

      expect(publishedCount).toBe(2);
      expect(archivedCount).toBe(1);
    });
  });

  describe('Performance et Analytics Avancées', () => {
    test('devrait fournir des analytics détaillées', async () => {
      // === CRÉATION ET PUBLICATION ===
      const property = await mockPropertyLifecycleService.createProperty(
        testOwner.id,
        {
          title: 'Propriété Analytics Test',
          description: 'Test des analytics avancées',
          type: 'villa',
          price: 300000,
          area: 180,
          location: { city: 'Libreville' }
        }
      );

      await mockPropertyLifecycleService.publishProperty(property.id, testOwner.id);
      await mockPropertyLifecycleService.moderateProperty(
        property.id,
        testModerator.id,
        'approve'
      );

      // === SIMULATION DE TRAFIC RÉALISTE ===
      // Simuler des vues sur plusieurs jours avec des patterns réalistes
      const viewers = Array.from({ length: 50 }, (_, i) => `viewer_${i}`);
      
      // Pattern de vues : plus d'activité en semaine, pics en soirée
      for (let day = 0; day < 7; day++) {
        const viewsPerDay = day < 5 ? 15 : 8; // Plus de vues en semaine
        
        for (let view = 0; view < viewsPerDay; view++) {
          const randomViewer = viewers[Math.floor(Math.random() * viewers.length)];
          await mockPropertyLifecycleService.trackPropertyView(property.id, randomViewer);
        }
      }

      // === CONTACTS AVEC CONVERSION RÉALISTE ===
      const contactScenarios = [
        {
          name: 'Acheteur Sérieux',
          email: 'serieux@example.com',
          message: 'Je souhaite visiter rapidement'
        },
        {
          name: 'Investisseur',
          email: 'investisseur@example.com',
          message: 'Intéressé pour investissement locatif'
        },
        {
          name: 'Famille',
          email: 'famille@example.com',
          message: 'Convient-elle pour une famille avec enfants ?'
        }
      ];

      for (const contact of contactScenarios) {
        await mockPropertyLifecycleService.trackPropertyContact(property.id, contact);
      }

      // === ANALYTICS DÉTAILLÉES ===
      const analytics = await mockPropertyLifecycleService.getPropertyAnalytics(
        property.id,
        testOwner.id
      );

      // Vérifications des métriques
      expect(analytics.analytics.totalViews).toBeGreaterThan(50);
      expect(analytics.analytics.uniqueViews).toBeLessThanOrEqual(50);
      expect(analytics.performance.totalContacts).toBe(3);
      expect(analytics.performance.contactRate).toBeGreaterThan(0);
      expect(analytics.performance.contactRate).toBeLessThan(100);

      // Vérifications des patterns temporels
      expect(analytics.analytics.viewsByDay).toBeTruthy();
      expect(Object.keys(analytics.analytics.viewsByDay).length).toBeGreaterThan(0);

      // Métriques de performance
      expect(analytics.performance.daysOnline).toBeGreaterThan(0);
      expect(analytics.performance.viewsPerDay).toBeGreaterThan(0);

      // === COMPARAISON AVEC BENCHMARKS ===
      const benchmarkContactRate = 5; // 5% de taux de conversion standard
      const actualContactRate = analytics.performance.contactRate;

      let performanceRating;
      if (actualContactRate > benchmarkContactRate * 1.5) {
        performanceRating = 'excellent';
      } else if (actualContactRate > benchmarkContactRate) {
        performanceRating = 'good';
      } else {
        performanceRating = 'average';
      }

      expect(['excellent', 'good', 'average']).toContain(performanceRating);
    });
  });

  describe('Gestion des Erreurs et Sécurité', () => {
    test('devrait gérer les erreurs et tentatives d\'accès non autorisé', async () => {
      const unauthorizedUser = await mockUserService.createUser({
        email: 'unauthorized@example.com',
        firstName: 'Unauthorized',
        lastName: 'User'
      });

      const property = await mockPropertyLifecycleService.createProperty(
        testOwner.id,
        {
          title: 'Propriété Sécurisée',
          description: 'Test de sécurité',
          type: 'apartment',
          price: 100000,
          area: 60,
          location: { city: 'Libreville' }
        }
      );

      // === TENTATIVES D'ACCÈS NON AUTORISÉ ===
      
      // Tentative de modification par un utilisateur non autorisé
      try {
        await mockPropertyLifecycleService.updateProperty(
          property.id,
          { price: 50000 },
          unauthorizedUser.id
        );
        fail('Devrait lever une erreur d\'accès non autorisé');
      } catch (error: any) {
        expect(error.message).toContain('Accès non autorisé');
      }

      // Tentative de publication par un utilisateur non autorisé
      try {
        await mockPropertyLifecycleService.publishProperty(property.id, unauthorizedUser.id);
        fail('Devrait lever une erreur d\'accès non autorisé');
      } catch (error: any) {
        expect(error.message).toContain('Accès non autorisé');
      }

      // Tentative d'accès aux analytics par un utilisateur non autorisé
      try {
        await mockPropertyLifecycleService.getPropertyAnalytics(
          property.id,
          unauthorizedUser.id
        );
        fail('Devrait lever une erreur d\'accès non autorisé');
      } catch (error: any) {
        expect(error.message).toContain('Accès non autorisé');
      }

      // === TENTATIVES SUR PROPRIÉTÉ INEXISTANTE ===
      try {
        await mockPropertyLifecycleService.updateProperty(
          'property_inexistante',
          { title: 'Nouveau titre' },
          testOwner.id
        );
        fail('Devrait lever une erreur de propriété non trouvée');
      } catch (error: any) {
        expect(error.message).toContain('Propriété non trouvée');
      }

      // === VALIDATION DES STATUTS ===
      await mockPropertyLifecycleService.publishProperty(property.id, testOwner.id);
      await mockPropertyLifecycleService.moderateProperty(
        property.id,
        testModerator.id,
        'approve'
      );

      // Tentative de republication d'une propriété déjà publiée
      try {
        await mockPropertyLifecycleService.publishProperty(property.id, testOwner.id);
        fail('Devrait lever une erreur de statut invalide');
      } catch (error: any) {
        expect(error.message).toContain('Impossible de publier depuis le statut');
      }
    });
  });
});
