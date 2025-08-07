import * as fs from 'fs/promises';
import { configLoader } from '../config/config-loader';

export interface KeyStats {
  keyIndex: number;
  keyId: string;
  dateFirstUsed: string | null;
  dateLastUsed: string | null;
  totalRequests: number;
  sessionsHistory: Array<{
    sessionStart: string;
    sessionEnd: string;
    requestsInSession: number;
    reason: string;
    date: string;
    time: string;
  }>;
}

export interface ProgressState {
  lastProcessedIndex: number;
  totalItems: number;
  processedItems: number;
  startTime: string | null;
  allKeysExhausted: boolean;
  allKeysExhaustedAt: string | null;
}

export class KeyManager {
  private currentKeyIndex = 0;
  private keysExhausted = new Set<number>();
  private keyUsageStats: Record<number, KeyStats> = {};
  private requestCounters: number[] = [];
  private keyStartTimes: Record<number, string> = {};
  private apiKeys: string[] = [];
  private rateLimitPerKey: number = 50;

  constructor() {
    // L'initialisation se fera après le chargement de la config
  }

  async initialize(): Promise<void> {
    const config = await configLoader.loadConfig();
    this.apiKeys = config.api.keys;
    this.rateLimitPerKey = config.limits.rate_limit_per_key;
    this.requestCounters = new Array(this.apiKeys.length).fill(0);
    this.initializeKeyStats();
    
    // Vérifier si les clés sont épuisées au démarrage
    await this.checkAndResetDailyLimits();
  }

  private initializeKeyStats(): void {
    this.apiKeys.forEach((key, index) => {
      if (!this.keyUsageStats[index]) {
        this.keyUsageStats[index] = {
          keyIndex: index + 1,
          keyId: key.substring(0, 20) + "...",
          dateFirstUsed: null,
          dateLastUsed: null,
          totalRequests: 0,
          sessionsHistory: []
        };
      }
    });
  }

  async loadKeyStats(): Promise<void> {
    const config = await configLoader.loadConfig();
    const statsFile = config.files.stats;
    
    try {
      const content = await fs.readFile(statsFile, 'utf-8');
      this.keyUsageStats = JSON.parse(content);
      console.log('📈 Statistiques des clés chargées depuis le fichier existant');
    } catch (error) {
      console.log('⚠️ Erreur lors du chargement des stats, initialisation de nouvelles stats');
      this.initializeKeyStats();
    }
  }

  async saveKeyStats(): Promise<void> {
    const config = await configLoader.loadConfig();
    const statsFile = config.files.stats;
    await fs.writeFile(statsFile, JSON.stringify(this.keyUsageStats, null, 2), 'utf-8');
    console.log(`📊 Statistiques des clés sauvegardées dans ${statsFile}`);
  }

  getCurrentApiKey(): string {
    return this.apiKeys[this.currentKeyIndex];
  }

  getCurrentKeyIndex(): number {
    return this.currentKeyIndex;
  }

  incrementRequestCounter(): void {
    this.requestCounters[this.currentKeyIndex]++;
    
    if (this.requestCounters[this.currentKeyIndex] === 1) {
      this.startKeyUsage(this.currentKeyIndex);
    }
  }

  private startKeyUsage(keyIndex: number): void {
    const now = new Date().toISOString();
    this.keyStartTimes[keyIndex] = now;
    
    if (!this.keyUsageStats[keyIndex].dateFirstUsed) {
      this.keyUsageStats[keyIndex].dateFirstUsed = now;
    }
    this.keyUsageStats[keyIndex].dateLastUsed = now;
  }

  private endKeyUsage(keyIndex: number, reason: string = 'Rate limit reached'): void {
    const endTime = new Date().toISOString();
    const startTime = this.keyStartTimes[keyIndex];
    const requestCount = this.requestCounters[keyIndex];
    
    const session = {
      sessionStart: startTime,
      sessionEnd: endTime,
      requestsInSession: requestCount,
      reason,
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR')
    };
    
    this.keyUsageStats[keyIndex].totalRequests += requestCount;
    this.keyUsageStats[keyIndex].sessionsHistory.push(session);
    this.keyUsageStats[keyIndex].dateLastUsed = endTime;
    
    console.log(`📝 Clé ${keyIndex + 1} épuisée - ${requestCount} requêtes effectuées`);
    this.saveKeyStats();
    
    this.requestCounters[keyIndex] = 0;
  }

  switchToNextKey(): boolean {
    const previousIndex = this.currentKeyIndex;
    
    // Ne marquer comme épuisée que si la limite est vraiment atteinte
    const todayRequests = this.keyUsageStats[previousIndex]?.sessionsHistory
      ?.filter(session => session.date === new Date().toLocaleDateString('fr-FR'))
      ?.reduce((total, session) => total + session.requestsInSession, 0) || 0;
    
    if (todayRequests >= this.rateLimitPerKey) {
      this.endKeyUsage(previousIndex, 'Rate limit reached');
      this.keysExhausted.add(this.currentKeyIndex);
      console.log(`⚠️ Clé ${previousIndex + 1} épuisée (${todayRequests}/${this.rateLimitPerKey})`);
    } else {
      console.log(`⚠️ Clé ${previousIndex + 1} temporairement indisponible, basculement...`);
    }
    
    for (let i = 0; i < this.apiKeys.length; i++) {
      const nextIndex = (this.currentKeyIndex + 1 + i) % this.apiKeys.length;
      if (!this.keysExhausted.has(nextIndex)) {
        this.currentKeyIndex = nextIndex;
        console.log(`🔄 Basculement de la clé ${previousIndex + 1} vers la clé ${this.currentKeyIndex + 1}`);
        return true;
      }
    }
    
    console.log("⚠️ Toutes les clés API ont atteint leur limite quotidienne");
    return false;
  }

  resetKeyStatus(): void {
    this.keysExhausted.clear();
    this.currentKeyIndex = 0;
    this.requestCounters.fill(0);
    this.keyStartTimes = {};
    console.log('🔄 Statut des clés réinitialisé');
  }

  getKeyStatus(): void {
    console.log('\n📊 Statut des clés API:');
    this.apiKeys.forEach((key, index) => {
      const status = this.keysExhausted.has(index) ? '❌ Épuisée' : '✅ Active';
      const current = index === this.currentKeyIndex ? ' (ACTUELLE)' : '';
      
      const todayRequests = this.keyUsageStats[index]?.sessionsHistory
        ?.filter(session => session.date === new Date().toLocaleDateString('fr-FR'))
        ?.reduce((total, session) => total + session.requestsInSession, 0) || 0;
      
      const totalRequests = this.keyUsageStats[index]?.totalRequests || 0;
      console.log(`  Clé ${index + 1}: ${status}${current} - Aujourd'hui: ${todayRequests}/${this.rateLimitPerKey} - Total: ${totalRequests} req`);
    });
    console.log(`\nClés restantes: ${this.apiKeys.length - this.keysExhausted.size}/${this.apiKeys.length}\n`);
  }

  getDetailedKeyStats(): void {
    console.log('\n📈 Statistiques détaillées des clés:');
    Object.values(this.keyUsageStats).forEach(stats => {
      console.log(`\n🔑 Clé ${stats.keyIndex} (${stats.keyId}):`);
      console.log(`  📅 Première utilisation: ${stats.dateFirstUsed || 'Jamais utilisée'}`);
      console.log(`  📅 Dernière utilisation: ${stats.dateLastUsed || 'Jamais utilisée'}`);
      console.log(`  📊 Total requêtes: ${stats.totalRequests}`);
      console.log(`  📋 Sessions: ${stats.sessionsHistory.length}`);
      
      if (stats.sessionsHistory.length > 0) {
        const lastSession = stats.sessionsHistory[stats.sessionsHistory.length - 1];
        console.log(`  📝 Dernière session: ${lastSession.date} - ${lastSession.requestsInSession} req`);
      }
    });
  }

  isRateLimitError(error: any): boolean {
    return error.message.includes('429') && 
           (error.message.includes('Rate limit exceeded') || 
            error.message.includes('Provider returned error') ||
            error.message.includes('rate-limited upstream'));
  }

  calculateNextAvailability(): {
    nextResetTime: string;
    hoursUntilReset: number;
    resetTimeLocal: string;
  } {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60));
    
    return {
      nextResetTime: tomorrow.toISOString(),
      hoursUntilReset,
      resetTimeLocal: tomorrow.toLocaleString('fr-FR')
    };
  }

  private async checkAndResetDailyLimits(): Promise<void> {
    const today = new Date().toLocaleDateString('fr-FR');
    
    // Vérifier si on a déjà traité aujourd'hui
    const lastSession = Object.values(this.keyUsageStats).find(stats => 
      stats.sessionsHistory.length > 0 && 
      stats.sessionsHistory[stats.sessionsHistory.length - 1].date === today
    );
    
    if (!lastSession) {
      // Nouveau jour, réinitialiser les compteurs
      console.log('🔄 Nouveau jour détecté, réinitialisation des compteurs de clés');
      this.resetKeyStatus();
    } else {
      // Même jour, vérifier les limites actuelles
      console.log('📅 Même jour détecté, vérification des limites de clés');
      this.checkCurrentKeyLimits();
    }
  }

  private checkCurrentKeyLimits(): void {
    this.apiKeys.forEach((key, index) => {
      const todayRequests = this.keyUsageStats[index]?.sessionsHistory
        ?.filter(session => session.date === new Date().toLocaleDateString('fr-FR'))
        ?.reduce((total, session) => total + session.requestsInSession, 0) || 0;
      
      if (todayRequests >= this.rateLimitPerKey) {
        this.keysExhausted.add(index);
        console.log(`⚠️ Clé ${index + 1} déjà épuisée aujourd'hui (${todayRequests}/${this.rateLimitPerKey})`);
      } else {
        this.requestCounters[index] = todayRequests;
        console.log(`✅ Clé ${index + 1} disponible (${todayRequests}/${this.rateLimitPerKey})`);
      }
    });
    
    // Trouver la première clé disponible
    for (let i = 0; i < this.apiKeys.length; i++) {
      if (!this.keysExhausted.has(i)) {
        this.currentKeyIndex = i;
        console.log(`🎯 Clé ${i + 1} sélectionnée comme clé active`);
        break;
      }
    }
  }
} 