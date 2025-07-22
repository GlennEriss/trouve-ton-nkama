import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { AlgoliaProvider } from "./AlgoliaContext";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocationProvider } from "./LocationProvider";
import { NotificationProvider } from "./NotificationProvider";
import { AlgoliaRefinementsProvider } from "./AlgoliaRefinementsContext";
import { ThemeProvider } from "@/components/theme-provider"
import InstallPWAButton from "@/components/pwa/InstallPWAButton";

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
      <InstallPWAButton />
    </ThemeProvider>
  );
}
