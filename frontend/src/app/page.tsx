import Link from "next/link";

import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
        }
      />
      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">Interview practice</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-[2.75rem] sm:leading-[1.15]">
            Write Java. Run the judge. Get interview-ready.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
            A focused bench for software interviews: original problems, a real Java sandbox, and progress
            that reflects the work you actually did.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/learn">Browse lessons</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/problems">Browse problems</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
