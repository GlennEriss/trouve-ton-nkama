'use client'

import React, { useState, useEffect } from 'react';
import { PropertyStatistics } from '@/db/property-statistics.db';
import { Property } from '@/models/annonce';
import { 
  Eye, 
  Users, 
  Phone, 
  Share2, 
  TrendingUp, 
  Clock, 
  MapPin,
  Calendar,
  MessageSquare,
  Heart,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyStatisticsPanelProps {
  statistics: PropertyStatistics;
  property: Property;
}

type TimeFilter = '7d' | '30d' | '90d' | 'all';

// Animation hook for counting numbers
function useAnimatedCounter(value: number, duration: number = 1000) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }
    
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (value - startValue) * easeOutQuart);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return displayValue;
}

export default function PropertyStatisticsPanel({ 
  statistics, 
  property 
}: PropertyStatisticsPanelProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculer les jours en ligne
  const createdAt = property.createdAt as any;
  const daysOnline = createdAt 
    ? Math.max(1, Math.ceil((Date.now() - (createdAt.toMillis ? createdAt.toMillis() : createdAt.seconds * 1000)) / (1000 * 60 * 60 * 24)))
    : 1;

  // Formater les nombres
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Calculer les données du graphique
  const chartData = Object.entries(statistics.viewsByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30);
  
  const maxViews = Math.max(...chartData.map(([, count]) => count), 1);

  return (
    <div className={cn(
      "space-y-8 transition-all duration-700",
      mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    )}>
      {/* Filtres temporels avec design moderne */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
        {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
              timeFilter === filter
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            {filter === '7d' ? '7 jours' : filter === '30d' ? '30 jours' : filter === '90d' ? '90 jours' : 'Tout'}
          </button>
        ))}
      </div>

      {/* Cartes de métriques principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Eye className="h-5 w-5" />}
          title="Vues totales"
          value={statistics.totalViews}
          subtitle={`${formatNumber(statistics.uniqueViews)} visiteurs uniques`}
          gradient="from-violet-500 to-purple-600"
          delay={0}
        />
        
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          title="Visiteurs uniques"
          value={statistics.uniqueViews}
          subtitle={`${statistics.uniqueViewRate.toFixed(1)}% du trafic total`}
          gradient="from-blue-500 to-cyan-500"
          delay={100}
        />

        <MetricCard
          icon={<Phone className="h-5 w-5" />}
          title="Contacts"
          value={statistics.totalContacts}
          subtitle={`${statistics.contactRate.toFixed(1)}% taux de conversion`}
          gradient="from-emerald-500 to-teal-500"
          delay={200}
          highlight={statistics.contactRate > 5}
        />

        <MetricCard
          icon={<Share2 className="h-5 w-5" />}
          title="Partages"
          value={statistics.whatsappShares + statistics.facebookShares}
          subtitle={`${statistics.whatsappShares} WhatsApp • ${statistics.facebookShares} Facebook`}
          gradient="from-orange-500 to-amber-500"
          delay={300}
        />
      </div>

      {/* Graphique des vues */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-violet-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Évolution des vues
              </h3>
              <p className="text-slate-400 text-sm mt-1">Derniers 30 jours</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-sm font-medium">
                {statistics.viewsPerDay.toFixed(1)} vues/jour
              </span>
            </div>
          </div>

          {/* Graphique */}
          <div className="h-56 flex items-end gap-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-slate-700/50 w-full" />
              ))}
            </div>
            
            {chartData.length > 0 ? (
              chartData.map(([date, count], index) => {
                const height = (count / maxViews) * 100;
                
                return (
                  <div
                    key={date}
                    className="group relative flex-1 flex flex-col items-center justify-end"
                    style={{
                      animationDelay: `${index * 20}ms`
                    }}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-all duration-300 cursor-pointer",
                        "bg-gradient-to-t from-emerald-500 to-emerald-400",
                        "hover:from-emerald-400 hover:to-emerald-300",
                        "group-hover:shadow-lg group-hover:shadow-emerald-500/30",
                        mounted ? "animate-grow-up" : "h-0"
                      )}
                      style={{ 
                        height: mounted ? `${Math.max(height, 2)}%` : '0%',
                        animationDelay: `${index * 30}ms`,
                        transitionDelay: `${index * 30}ms`
                      }}
                    />
                    
                    {/* Tooltip */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                        <div className="font-semibold">{count} vues</div>
                        <div className="text-slate-400">{new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <p>Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Engagement & Géographie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métriques d'engagement */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              Performance
            </h3>
            
            <div className="space-y-5">
              <EngagementMetric
                icon={<Clock className="h-4 w-4" />}
                label="Temps moyen de consultation"
                value={`${Math.round(statistics.averageViewDuration)}s`}
                progress={Math.min(statistics.averageViewDuration / 60 * 100, 100)}
                color="violet"
              />
              <EngagementMetric
                icon={<MessageSquare className="h-4 w-4" />}
                label="Taux de conversion"
                value={`${statistics.contactRate.toFixed(1)}%`}
                progress={Math.min(statistics.contactRate * 10, 100)}
                color="emerald"
              />
              <EngagementMetric
                icon={<Eye className="h-4 w-4" />}
                label="Vues moyennes par jour"
                value={statistics.viewsPerDay.toFixed(1)}
                progress={Math.min(statistics.viewsPerDay * 10, 100)}
                color="blue"
              />
              <EngagementMetric
                icon={<Calendar className="h-4 w-4" />}
                label="Jours en ligne"
                value={`${daysOnline} jours`}
                progress={Math.min(daysOnline / 365 * 100, 100)}
                color="amber"
              />
            </div>
          </div>
        </div>

        {/* Répartition géographique */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              Origine géographique
            </h3>
            
            <div className="space-y-4">
              {Object.keys(statistics.viewsByProvince).length > 0 ? (
                Object.entries(statistics.viewsByProvince)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([province, count], index) => {
                    const percentage = (count / statistics.totalViews) * 100;
                    return (
                      <GeoMetric
                        key={province}
                        rank={index + 1}
                        location={province}
                        count={count}
                        percentage={percentage}
                      />
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700/50 mb-4">
                    <MapPin className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Données géographiques bientôt disponibles
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Les statistiques s'afficheront après les premières visites
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Détail des interactions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700/50 p-6 md:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Qzk0OTQiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Interactions détaillées
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InteractionCard
              icon={<MessageSquare className="h-5 w-5" />}
              label="WhatsApp"
              contacts={statistics.whatsappContacts}
              shares={statistics.whatsappShares}
              gradient="from-green-500 to-emerald-600"
            />
            <InteractionCard
              icon={<Phone className="h-5 w-5" />}
              label="Téléphone"
              contacts={statistics.phoneContacts}
              gradient="from-blue-500 to-indigo-600"
            />
            <InteractionCard
              icon={<Share2 className="h-5 w-5" />}
              label="Facebook"
              shares={statistics.facebookShares}
              gradient="from-blue-600 to-blue-700"
            />
            <InteractionCard
              icon={<Heart className="h-5 w-5" />}
              label="Favoris"
              favorites={statistics.favoriteAdds}
              gradient="from-rose-500 to-pink-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant MetricCard amélioré
function MetricCard({ 
  icon, 
  title, 
  value,
  subtitle, 
  gradient,
  delay = 0,
  highlight = false
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: number;
  subtitle?: string;
  gradient: string;
  delay?: number;
  highlight?: boolean;
}) {
  const animatedValue = useAnimatedCounter(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 transition-all duration-500",
        "bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50",
        "hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-600",
        highlight && "ring-2 ring-emerald-500/20",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Gradient background accent */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20",
        `bg-gradient-to-br ${gradient}`
      )} />
      
      <div className="relative">
        <div className={cn(
          "inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4",
          `bg-gradient-to-br ${gradient}`
        )}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
          {title}
        </p>
        
        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {new Intl.NumberFormat('fr-FR').format(animatedValue)}
        </p>
        
        {subtitle && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Composant EngagementMetric
function EngagementMetric({ 
  icon, 
  label, 
  value, 
  progress,
  color
}: { 
  icon: React.ReactNode;
  label: string; 
  value: string; 
  progress: number;
  color: 'violet' | 'emerald' | 'blue' | 'amber';
}) {
  const colorClasses = {
    violet: 'from-violet-500 to-purple-500 bg-violet-100 dark:bg-violet-900/30',
    emerald: 'from-emerald-500 to-teal-500 bg-emerald-100 dark:bg-emerald-900/30',
    blue: 'from-blue-500 to-cyan-500 bg-blue-100 dark:bg-blue-900/30',
    amber: 'from-amber-500 to-orange-500 bg-amber-100 dark:bg-amber-900/30',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <div className={cn("p-1.5 rounded-lg", colorClasses[color].split(' ').slice(2).join(' '))}>
            {icon}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{value}</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            `bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Composant GeoMetric
function GeoMetric({ 
  rank,
  location, 
  count,
  percentage
}: { 
  rank: number;
  location: string; 
  count: number;
  percentage: number;
}) {
  const rankColors = {
    1: 'from-amber-500 to-yellow-500 text-amber-600',
    2: 'from-slate-400 to-slate-500 text-slate-500',
    3: 'from-orange-600 to-orange-700 text-orange-600',
    4: 'from-slate-300 to-slate-400 text-slate-400',
    5: 'from-slate-300 to-slate-400 text-slate-400',
  };

  return (
    <div className="flex items-center gap-4">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
        rank <= 3 ? `bg-gradient-to-br ${rankColors[rank as keyof typeof rankColors]?.split(' ').slice(0, 2).join(' ')} text-white` : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
      )}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {location}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white ml-2">
            {count}
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Composant InteractionCard
function InteractionCard({ 
  icon,
  label, 
  contacts,
  shares,
  favorites,
  gradient
}: { 
  icon: React.ReactNode;
  label: string; 
  contacts?: number; 
  shares?: number;
  favorites?: number;
  gradient: string;
}) {
  const total = (contacts || 0) + (shares || 0) + (favorites || 0);
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className={cn(
        "absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-10",
        `bg-gradient-to-br ${gradient}`
      )} />
      
      <div className="relative">
        <div className={cn(
          "inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3",
          `bg-gradient-to-br ${gradient}`
        )}>
          <div className="text-white">{icon}</div>
        </div>
        
        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">{label}</h4>
        
        <div className="space-y-2">
          {contacts !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Contacts</span>
              <span className="font-bold text-slate-900 dark:text-white">{contacts}</span>
            </div>
          )}
          {shares !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Partages</span>
              <span className="font-bold text-slate-900 dark:text-white">{shares}</span>
            </div>
          )}
          {favorites !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Ajouts</span>
              <span className="font-bold text-slate-900 dark:text-white">{favorites}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
