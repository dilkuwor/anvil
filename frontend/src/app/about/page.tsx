import type { Metadata } from "next";
import Link from "next/link";

import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageHeader } from "@/components/layout/page-header";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About",
  description:
    "Anvil is a ByteTech LLC product built to help software engineers prepare for technical interviews through deliberate, realistic practice.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip">
      <PublicHeader />
      <main className="ia-content flex-1 py-10 sm:py-14">
        <PageHeader title="About" />
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">
          Anvil is a ByteTech LLC product built to help software engineers prepare for technical interviews through
          deliberate, realistic practice.
        </p>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
          How we handle information is described in the{" "}
          <Link className="font-medium text-foreground hover:text-accent" href="/privacy">
            Privacy Policy
          </Link>
          . Using the product is subject to the{" "}
          <Link className="font-medium text-foreground hover:text-accent" href="/terms">
            Terms of Service
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
