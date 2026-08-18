"use client";

import dynamic from "next/dynamic";

import { PageLoader } from "@/components/ui/state";

export const HistoryLoader = dynamic(
  () => import("./history-page").then((mod) => mod.HistoryPage),
  { ssr: false, loading: () => <PageLoader /> },
);
