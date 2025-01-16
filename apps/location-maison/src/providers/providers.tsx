import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { AlgoliaProvider } from "./AlgoliaContext";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocationProvider } from "./LocationProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <NextAuthProvider>
        <LocationProvider>
          <AlgoliaProvider indexName={"Users"}>{children}</AlgoliaProvider>
          <Toaster />
        </LocationProvider>
      </NextAuthProvider>
    </ReactQueryProvider>
  );
}
