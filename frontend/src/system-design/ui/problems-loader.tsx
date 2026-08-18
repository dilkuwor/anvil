"use client";

import dynamic from "next/dynamic";

import { PageLoader } from "@/components/ui/state";

export const ProblemsLoader = dynamic(
  () => import("./problems-page").then((mod) => mod.ProblemsPage),
  { ssr: false, loading: () => <PageLoader /> },
);
