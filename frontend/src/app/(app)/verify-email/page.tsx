import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailPanel } from "@/components/auth/verify-email-form";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Verify email", "/verify-email");

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailPanel />
    </Suspense>
  );
}
