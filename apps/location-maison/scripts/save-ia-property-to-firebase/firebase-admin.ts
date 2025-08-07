import * as admin from 'firebase-admin';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FirebaseConfig {
  firebase: {
    project_id: string;
    collection_name: string;
    batch_size: number;
    indexes: Array<{
      field: string;
      order: string;
    }>;
  };
  transformation: {
    required_fields: string[];
    default_values: Record<string, any>;
    type_validation: Record<string, string[]>;
  };
  metadata: {
    source: string;
    version: string;
    created_by: string;
  };
  backup: {
    enabled: boolean;
    backup_collection: string;
    max_backups: number;
    auto_cleanup: boolean;
  };
}

export interface AIProperty {
  typeProperty: string;
  title: string;
  description: string;
  price: number;
  status: string;
  contact: string;
  street: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  area: number;
  tags: string[];
  images: string[];
  nbrRooms: number;
  nbrBathrooms: number;
  nbrToilets: number;
  nbrChickens: number;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  source?: string;
  version?: string;
}

export class FirebasePropertyService {
  private db: admin.firestore.Firestore;
  private config: FirebaseConfig;

  constructor() {
    // Initialiser Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'location-maison-gabon'
      });
    }
    
    this.db = admin.firestore();
  }

  async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(__dirname, 'firebase-config.yaml');
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = yaml.load(configContent) as FirebaseConfig;
      console.log('✅ Configuration Firebase chargée');
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la config Firebase:', error);
      throw error;
    }
  }

  private validateProperty(property: any): AIProperty {
    const validated: AIProperty = {
      ...this.config.transformation.default_values,
      ...property
    };

    // Vérifier les champs obligatoires
    for (const field of this.config.transformation.required_fields) {
      if (!validated[field]) {
        throw new Error(`Champ obligatoire manquant: ${field}`);
      }
    }

    // Valider les types
    for (const [field, allowedValues] of Object.entries(this.config.transformation.type_validation)) {
      if (validated[field] && !allowedValues.includes(validated[field])) {
        throw new Error(`Valeur invalide pour ${field}: ${validated[field]}`);
      }
    }

    // Ajouter les métadonnées
    validated.createdAt = admin.firestore.Timestamp.now();
    validated.updatedAt = admin.firestore.Timestamp.now();
    validated.source = this.config.metadata.source;
    validated.version = this.config.metadata.version;

    return validated;
  }

  async saveProperties(properties: any[]): Promise<{success: number, errors: number}> {
    console.log(`🚀 Début de la sauvegarde de ${properties.length} propriétés...`);
    
    let successCount = 0;
    let errorCount = 0;
    const batchSize = this.config.firebase.batch_size;
    
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = this.db.batch();
      const batchProperties = properties.slice(i, i + batchSize);
      
      console.log(`📦 Traitement du batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(properties.length / batchSize)}`);
      
      for (const property of batchProperties) {
        try {
          const validatedProperty = this.validateProperty(property);
          const docRef = this.db.collection(this.config.firebase.collection_name).doc();
          batch.set(docRef, validatedProperty);
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur validation propriété:`, error);
          errorCount++;
        }
      }
      
      try {
        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} sauvegardé`);
      } catch (error) {
        console.error(`❌ Erreur sauvegarde batch:`, error);
        errorCount += batchProperties.length;
        successCount -= batchProperties.length;
      }
      
      // Délai entre les batches
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`📊 Sauvegarde terminée: ${successCount} succès, ${errorCount} erreurs`);
    return { success: successCount, errors: errorCount };
  }

  async createBackup(): Promise<void> {
    if (!this.config.backup.enabled) {
      console.log('⚠️ Sauvegarde désactivée dans la configuration');
      return;
    }

    console.log('💾 Création de la sauvegarde...');
    
    try {
      const snapshot = await this.db.collection(this.config.firebase.collection_name).get();
      const backupBatch = this.db.batch();
      
      snapshot.docs.forEach(doc => {
        const backupRef = this.db.collection(this.config.backup.backup_collection).doc(doc.id);
        backupBatch.set(backupRef, {
          ...doc.data(),
          backupCreatedAt: admin.firestore.Timestamp.now()
        });
      });
      
      await backupBatch.commit();
      console.log(`✅ Sauvegarde créée: ${snapshot.docs.length} documents`);
      
      // Nettoyage automatique des anciennes sauvegardes
      if (this.config.backup.auto_cleanup) {
        await this.cleanupOldBackups();
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de la sauvegarde:', error);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const snapshot = await this.db.collection(this.config.backup.backup_collection)
        .orderBy('backupCreatedAt', 'desc')
        .limit(this.config.backup.max_backups + 1)
        .get();
      
      if (snapshot.docs.length > this.config.backup.max_backups) {
        const deleteBatch = this.db.batch();
        const docsToDelete = snapshot.docs.slice(this.config.backup.max_backups);
        
        docsToDelete.forEach(doc => {
          deleteBatch.delete(doc.ref);
        });
        
        await deleteBatch.commit();
        console.log(`🧹 ${docsToDelete.length} anciennes sauvegardes supprimées`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des sauvegardes:', error);
    }
  }

  async getStats(): Promise<{total: number, byType: Record<string, number>}> {
    const snapshot = await this.db.collection(this.config.firebase.collection_name).get();
    const stats = {
      total: snapshot.docs.length,
      byType: {} as Record<string, number>
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as AIProperty;
      stats.byType[data.typeProperty] = (stats.byType[data.typeProperty] || 0) + 1;
    });
    
    return stats;
  }
} 