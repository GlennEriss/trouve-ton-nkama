import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { AlgoliaProvider } from "./AlgoliaContext";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocationProvider } from "./LocationProvider";
import { NotificationProvider } from "./NotificationProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <NextAuthProvider>
        <LocationProvider>
          <NotificationProvider>
            <AlgoliaProvider indexName={"location-maison_property-index"}>{children}</AlgoliaProvider>
          </NotificationProvider>
          <Toaster />
        </LocationProvider>
      </NextAuthProvider>
    </ReactQueryProvider>
  );
}
