"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error && typeof error === "object" && "status" in error && error.status === 401) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
            staleTime: 60_000,
            gcTime: 10 * 60_000,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        {children}
        <ThemedToaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-right" richColors />;
}
