import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface ApiConfig {
  openrouter: {
    url: string;
    model: string;
    max_tokens: number;
    stream: boolean;
  };
  keys: string[];
}

export interface LimitsConfig {
  rate_limit_per_key: number;
  request_delay: number;
  retry_delay: number;
  max_retries: number;
}

export interface TagsConfig {
  available_tags: string[];
}

export interface FilesConfig {
  input: string;
  output: string;
  stats: string;
  progress: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  save_stats: boolean;
  show_detailed_progress: boolean;
}

export interface Config {
  api: ApiConfig;
  limits: LimitsConfig;
  tags: TagsConfig;
  files: FilesConfig;
  logging: LoggingConfig;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: Config | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  async loadConfig(configPath?: string): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    const defaultPath = path.join(__dirname, 'config.yaml');
    const configFile = configPath || defaultPath;

    try {
      const content = await fs.readFile(configFile, 'utf-8');
      this.config = yaml.load(content) as Config;
      
      // Validation de base
      this.validateConfig(this.config);
      
      console.log('✅ Configuration chargée avec succès');
      return this.config;
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la configuration:', error);
      throw new Error(`Impossible de charger la configuration depuis ${configFile}`);
    }
  }

  getConfig(): Config {
    if (!this.config) {
      throw new Error('Configuration non chargée. Appelez loadConfig() d\'abord.');
    }
    return this.config;
  }

  private validateConfig(config: Config): void {
    if (!config.api?.keys || config.api.keys.length === 0) {
      throw new Error('Configuration invalide: aucune clé API définie');
    }

    if (!config.api.openrouter?.url) {
      throw new Error('Configuration invalide: URL OpenRouter manquante');
    }

    if (!config.api.openrouter?.model) {
      throw new Error('Configuration invalide: modèle OpenRouter manquant');
    }

    if (config.limits.rate_limit_per_key <= 0) {
      throw new Error('Configuration invalide: rate_limit_per_key doit être positif');
    }

    if (!config.tags.available_tags || config.tags.available_tags.length === 0) {
      throw new Error('Configuration invalide: aucun tag disponible défini');
    }
  }

  // Méthodes utilitaires pour accéder aux configurations
  getApiKeys(): string[] {
    return this.getConfig().api.keys;
  }

  getOpenRouterConfig() {
    return this.getConfig().api.openrouter;
  }

  getLimits() {
    return this.getConfig().limits;
  }

  getAvailableTags(): string[] {
    return this.getConfig().tags.available_tags;
  }

  getFiles() {
    return this.getConfig().files;
  }

  getLogging() {
    return this.getConfig().logging;
  }
}

// Export d'une instance singleton
export const configLoader = ConfigLoader.getInstance(); 