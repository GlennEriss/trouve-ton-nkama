import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { AlgoliaProvider } from "./AlgoliaContext";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocationProvider } from "./LocationProvider";
import { NotificationProvider } from "./NotificationProvider";
import { AlgoliaRefinementsProvider } from "./AlgoliaRefinementsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <NextAuthProvider>
        <LocationProvider>
          <NotificationProvider>
            <AlgoliaProvider indexName={"location-maison_property-index"}>
              <AlgoliaRefinementsProvider>
                {children}
              </AlgoliaRefinementsProvider>
            </AlgoliaProvider>
          </NotificationProvider>
          <Toaster />
        </LocationProvider>
      </NextAuthProvider>
    </ReactQueryProvider>
  );
}
