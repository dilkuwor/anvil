import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthorizeConsent } from "@/components/oauth/authorize-consent";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Authorize", "/oauth/authorize");

export default function OAuthAuthorizePage() {
  return (
    <Suspense>
      <AuthorizeConsent />
    </Suspense>
  );
}
