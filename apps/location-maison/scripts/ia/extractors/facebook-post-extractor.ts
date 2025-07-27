import * as fs from 'fs/promises';
import * as path from 'path';
import { configLoader } from '../config/config-loader';

export interface FacebookPost {
  id: string;
  text: string;
  date: string;
  creation_time?: number;
  url?: string;
  images?: string[];
  imageUrlList?: string[];
  // Autres champs selon la structure de property.json
}

export class FacebookPostExtractor {
  private config = configLoader;

  async loadPropertyData(): Promise<FacebookPost[]> {
    const config = await this.config.loadConfig();
    const inputPath = path.resolve(__dirname, config.files.input);
    
    try {
      const content = await fs.readFile(inputPath, 'utf-8');
      const data = JSON.parse(content);
      
      if (!Array.isArray(data)) {
        throw new Error('Le fichier property.json doit contenir un tableau');
      }
      
      console.log(`📄 ${data.length} posts Facebook chargés depuis ${config.files.input}`);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des posts Facebook:', error);
      throw error;
    }
  }

  async saveTransformedData(data: any[]): Promise<void> {
    const config = await this.config.loadConfig();
    const outputPath = path.resolve(__dirname, config.files.output);
    
    try {
      await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`💾 ${data.length} propriétés transformées sauvegardées dans ${config.files.output}`);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }

  // Méthode pour préparer les données pour l'IA (optionnel)
  prepareForAI(posts: FacebookPost[]): any[] {
    return posts.map(post => ({
      id: post.id,
      text: post.text,
      date: post.date,
      url: post.url
    })).slice(0, 5); // Limiter pour test
  }
} 