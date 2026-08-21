"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageLoader } from "@/components/ui/state";
import { useSession } from "@/lib/session";

export function HomeGate({ children }: { children: React.ReactNode }) {
  const { signedIn, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && signedIn) {
      router.replace("/dashboard");
    }
  }, [ready, signedIn, router]);

  if (ready && signedIn) {
    return <PageLoader variant="screen" />;
  }

  return children;
}
