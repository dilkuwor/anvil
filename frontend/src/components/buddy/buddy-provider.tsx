"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { BuddyPageContext } from "@/lib/buddy";

type BuddyState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pageContext: BuddyPageContext | null;
  registerContext: (context: BuddyPageContext | null) => void;
};

const BuddyContext = createContext<BuddyState | null>(null);

export function BuddyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageContext, setPageContext] = useState<BuddyPageContext | null>(null);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const registerContext = useCallback(
    (context: BuddyPageContext | null) => setPageContext(context),
    [],
  );
  const value = useMemo(
    () => ({ open, setOpen, toggle, pageContext, registerContext }),
    [open, toggle, pageContext, registerContext],
  );
  return (
    <BuddyContext.Provider value={value}>{children}</BuddyContext.Provider>
  );
}

/** Null outside the app shell, so public pages and tests can render without a provider. */
export function useBuddy(): BuddyState | null {
  return useContext(BuddyContext);
}

/**
 * Pages call this to tell Buddy where the learner is. The context is cleared when the page unmounts.
 * `getCode` must be a stable function (useCallback) so the registration does not churn on every keystroke.
 */
export function useBuddyPageContext(context: BuddyPageContext | null) {
  const buddy = useBuddy();
  const register = buddy?.registerContext;
  const kind = context?.kind;
  const id = context?.id;
  const title = context?.title;
  const noteSourceId = context?.noteSourceId;
  const getCode = context?.getCode;
  useEffect(() => {
    if (!register) return;
    if (!kind || !id) {
      register(null);
      return;
    }
    register({ kind, id, title: title ?? "", noteSourceId, getCode });
    return () => register(null);
  }, [register, kind, id, title, noteSourceId, getCode]);
}
