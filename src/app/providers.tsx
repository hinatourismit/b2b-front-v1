import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";
import { useSessionBootstrap } from "@/features/auth/api/auth.queries";

function SessionBootstrap({ children }: { children: ReactNode }) {
  useSessionBootstrap();
  return children;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap>{children}</SessionBootstrap>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
