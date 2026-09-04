import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { AlgoliaProvider } from "./AlgoliaContext";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { Toaster } from "@trouve-ton-nkama/ui/toaster";
import { LocationProvider } from "./LocationProvider";
import { NotificationProvider } from "./NotificationProvider";
import { ThemeProvider } from "@/components/theme-provider"
import { PWAInstallProvider } from "./PWAInstallProvider";
import { RechargeProvider } from "./RechargeProvider";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ReactQueryProvider>
        <NextAuthProvider>
          <LocationProvider>
            <NotificationProvider>
                {/* AlgoliaRefinementsProvider (useMenu x2 + useRefinementList x2 + useSearchBox +
                    useHits) a été retiré : aucun composant du code ne consommait
                    useAlgoliaRefinements (vérifié par recherche globale), mais ces 6 connecteurs
                    InstantSearch actifs déclenchaient malgré tout une vraie requête Algolia sur
                    CHAQUE page du site (accueil, blog, mentions légales, /publicite,
                    /demandes-recherche, pages protégées...) — confirmé en traçant le réseau
                    réel. Coût facturé pour zéro fonctionnalité. Voir
                    docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md. */}
                <AlgoliaProvider indexName={"location-maison_property-index"}>
                  <PWAInstallProvider>
                    <RechargeProvider>
                      {children}
                    </RechargeProvider>
                  </PWAInstallProvider>
                </AlgoliaProvider>
            </NotificationProvider>
            <Toaster />
          </LocationProvider>
        </NextAuthProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
