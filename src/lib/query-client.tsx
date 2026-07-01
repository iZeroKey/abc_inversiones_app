import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, QueryClientProvider, type Query } from "@tanstack/react-query";
import {
    PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "abc-query-cache-v1";
const CACHE_VERSION = "abc-query-cache:2026-05-28";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 60 * 1000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

const persister =
  typeof window === "undefined"
    ? undefined
    : createAsyncStoragePersister({
        key: CACHE_KEY,
        storage: window.localStorage,
      });

const persistOptions = persister
  ? {
      buster: CACHE_VERSION,
      dehydrateOptions: {
        shouldDehydrateQuery: (query: Query) => {
          const meta = query.meta as { persist?: boolean } | undefined;
          return query.state.status === "success" && meta?.persist === true;
        },
      },
      maxAge: DAY_MS,
      persister,
    }
  : null;

export function AppQueryProvider({ children }: { children: ReactNode }) {
  if (!persistOptions) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

export function clearPersistedQueryCache() {
  queryClient.clear();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CACHE_KEY);
  }
}
