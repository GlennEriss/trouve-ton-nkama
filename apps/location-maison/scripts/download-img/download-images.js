const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

class ImageDownloader {
  constructor() {
    this.baseDir = __dirname;
    this.imagesDir = path.join(this.baseDir, 'images');
    this.inputFile = path.join(__dirname, '..', 'apify', 'facebook-transformed-properties.json');
    this.outputFile = path.join(this.baseDir, 'properties-with-local-images.json');
    this.downloadedCount = 0;
    this.failedCount = 0;
  }

  async initialize() {
    console.log('🚀 Démarrage du téléchargement d\'images...\n');
    
    // Vérifier que le dossier images existe
    try {
      await fs.access(this.imagesDir);
    } catch {
      await fs.mkdir(this.imagesDir, { recursive: true });
      console.log('📁 Dossier images créé');
    }
  }

  async loadProperties() {
    console.log('📄 Chargement du fichier JSON...');
    const data = await fs.readFile(this.inputFile, 'utf8');
    const properties = JSON.parse(data);
    console.log(`✅ ${properties.length} propriétés trouvées\n`);
    return properties;
  }

  async downloadImage(imageUrl, propertyIndex, imageIndex) {
    return new Promise((resolve, reject) => {
      const isHttps = imageUrl.startsWith('https://');
      const client = isHttps ? https : http;
      
      // Extraire l'extension de l'image
      const urlParts = imageUrl.split('?')[0]; // Enlever les paramètres d'URL
      const extension = path.extname(urlParts) || '.jpg'; // Par défaut .jpg
      
      // Nom du fichier: property_X_image_Y.ext
      const fileName = `property_${propertyIndex}_image_${imageIndex}${extension}`;
      const filePath = path.join(this.imagesDir, fileName);
      
      const request = client.get(imageUrl, (response) => {
        if (response.statusCode === 200) {
          const fileStream = require('fs').createWriteStream(filePath);
          response.pipe(fileStream);
          
          fileStream.on('finish', () => {
            fileStream.close();
            this.downloadedCount++;
            resolve(`images/${fileName}`); // Chemin relatif
          });
          
          fileStream.on('error', (err) => {
            this.failedCount++;
            console.log(`❌ Erreur écriture: ${fileName}`);
            reject(err);
          });
        } else {
          this.failedCount++;
          console.log(`❌ Erreur HTTP ${response.statusCode}: ${imageUrl}`);
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      });
      
      request.on('error', (err) => {
        this.failedCount++;
        console.log(`❌ Erreur réseau: ${imageUrl}`);
        reject(err);
      });
      
      request.setTimeout(30000, () => {
        this.failedCount++;
        console.log(`⏰ Timeout: ${imageUrl}`);
        request.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  async processProperty(property, propertyIndex) {
    console.log(`📝 [${propertyIndex + 1}] Traitement: ${property.title}`);
    console.log(`   📸 ${property.images.length} images à télécharger`);
    
    const localImages = [];
    
    for (let i = 0; i < property.images.length; i++) {
      const imageUrl = property.images[i];
      
      try {
        const localPath = await this.downloadImage(imageUrl, propertyIndex, i);
        localImages.push(localPath);
        process.stdout.write('.');
      } catch (error) {
        console.log(`\n   ❌ Échec téléchargement image ${i + 1}: ${error.message}`);
        // On garde l'URL originale en cas d'échec
        localImages.push(imageUrl);
      }
    }
    
    console.log(`\n   ✅ ${property.images.length - this.failedCount} images téléchargées\n`);
    
    // Remplacer les URLs par les chemins locaux
    return {
      ...property,
      images: localImages
    };
  }

  async processAllProperties() {
    const properties = await this.loadProperties();
    const processedProperties = [];
    
    console.log('🖼️  Début du téléchargement...\n');
    
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      
      if (property.images && property.images.length > 0) {
        const processedProperty = await this.processProperty(property, i);
        processedProperties.push(processedProperty);
      } else {
        console.log(`⚠️  [${i + 1}] ${property.title} - Aucune image`);
        processedProperties.push(property);
      }
    }
    
    return processedProperties;
  }

  async saveResults(properties) {
    console.log('💾 Sauvegarde du nouveau JSON...');
    const jsonData = JSON.stringify(properties, null, 2);
    await fs.writeFile(this.outputFile, jsonData, 'utf8');
    console.log(`✅ Fichier sauvegardé: ${this.outputFile}\n`);
  }

  async run() {
    try {
      await this.initialize();
      const properties = await this.processAllProperties();
      await this.saveResults(properties);
      
      console.log('📊 RÉSULTATS:');
      console.log(`✅ Images téléchargées: ${this.downloadedCount}`);
      console.log(`❌ Échecs: ${this.failedCount}`);
      console.log(`📁 Dossier images: ${this.imagesDir}`);
      console.log(`📄 Nouveau JSON: ${this.outputFile}`);
      console.log('\n🎉 Téléchargement terminé !');
      
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      process.exit(1);
    }
  }
}

// Lancement du script
const downloader = new ImageDownloader();
downloader.run(); 