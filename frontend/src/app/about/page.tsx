import type { Metadata } from "next";

import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "About",
  description:
    "Anvil is a ByteTech LLC product built to help software engineers prepare for technical interviews through deliberate, realistic practice.",
};

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
      </main>
      <SiteFooter />
    </div>
  );
}
