const fs = require('fs/promises');
const path = require('path');

class FacebookPostProcessor {
  constructor() {
    this.JSON_FILES_DIR = path.resolve(__dirname, '../facebook-posts');
  }

  async loadAllFacebookJsonFiles() {
    try {
      // Lire tous les fichiers JSON dans le dossier facebook-posts
      const files = await fs.readdir(this.JSON_FILES_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json') && file.startsWith('property-'));
      
      console.log(`📁 ${jsonFiles.length} fichiers JSON trouvés: ${jsonFiles.join(', ')}`);
      
      const allPosts = [];
      
      for (const file of jsonFiles) {
        const filePath = path.join(this.JSON_FILES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        console.log(`  📄 ${file}: ${data.length} posts`);
        
        // Traiter chaque post du fichier
        const processedPosts = this.processPosts(data, file);
        allPosts.push(...processedPosts);
      }
      
      return allPosts;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des fichiers JSON:', error);
      throw error;
    }
  }

  processPosts(posts, fileName) {
    const processed = [];
    
    posts.forEach((post, index) => {
      // Ignorer les posts sans texte
      if (!post.text || post.text.trim() === '') {
        return;
      }
      
      // Extraire les images des attachments
      const images = [];
      if (post.attachments) {
        post.attachments.forEach(attachment => {
          if (attachment.__typename === 'Photo' && attachment.image?.uri) {
            images.push(attachment.image.uri);
          }
        });
      }
      
      // Créer un ID unique basé sur le fichier et l'index
      const id = `${fileName.replace('.json', '')}_${index}`;
      
      processed.push({
        id,
        text: post.text.trim(),
        user: post.user.name,
        images,
        photoCount: images.length,
        originalPost: post
      });
    });
    
    return processed;
  }

  filterValidPosts(posts) {
    const validPosts = posts.filter(post => {
      // Vérifier qu'il y a au moins 2 photos
      const hasMinimumPhotos = post.photoCount >= 2;
      
      // Optionnel: autres critères de validation
      const hasText = post.text.length > 10; // Au moins 10 caractères
      
      return hasMinimumPhotos && hasText;
    });
    
    console.log('📊 Statistiques de filtrage:');
    console.log(`  📸 Posts avec 0 photo: ${posts.filter(p => p.photoCount === 0).length}`);
    console.log(`  📸 Posts avec 1 photo: ${posts.filter(p => p.photoCount === 1).length}`);
    console.log(`  📸 Posts avec 2+ photos: ${posts.filter(p => p.photoCount >= 2).length}`);
    console.log(`  📝 Posts sans texte suffisant: ${posts.filter(p => p.text.length <= 10).length}`);
    
    return validPosts;
  }

  async saveTransformedData(data) {
    const outputPath = path.join(__dirname, '../facebook-transformed-properties.json');
    
    try {
      await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`💾 ${data.length} propriétés transformées sauvegardées dans facebook-transformed-properties.json`);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }

  // Méthode pour préparer les données pour l'IA
  prepareForAI(posts) {
    return posts.map(post => ({
      id: post.id,
      text: post.text,
      user: post.user,
      images: post.images,
      photoCount: post.photoCount
    }));
  }
}

module.exports = { FacebookPostProcessor }; 