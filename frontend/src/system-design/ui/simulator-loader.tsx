"use client";

import dynamic from "next/dynamic";

import { PageLoader } from "@/components/ui/state";

export const SimulatorLoader = dynamic(
  () => import("./simulator-app").then((mod) => mod.SimulatorApp),
  { ssr: false, loading: () => <PageLoader /> },
);
