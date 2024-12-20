import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { AlgoliaProvider } from "./AlgoliaContext";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <NextAuthProvider>
        <AlgoliaProvider indexName={"Users"}>{children}</AlgoliaProvider>
        <Toaster />
      </NextAuthProvider>
    </ReactQueryProvider>
  );
}