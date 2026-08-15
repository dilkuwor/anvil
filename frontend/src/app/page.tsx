import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-accent">Coding practice</p>
      <h1 className="max-w-3xl text-5xl font-semibold tracking-tight">
        Forge working Java solutions against a real judge.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-zinc-400">
        InterviewAnvil is a focused interview bench: read a problem, write Java in the editor, run sample
        tests, and submit against hidden cases in an isolated sandbox.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/register">Create an account</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  );
}
