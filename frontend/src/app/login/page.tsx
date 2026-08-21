import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Log in", "/login");

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
