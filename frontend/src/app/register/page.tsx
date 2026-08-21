import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Create an account", "/register");

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
