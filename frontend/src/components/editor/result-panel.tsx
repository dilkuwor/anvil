import { CheckCircle2, Clock, Cpu, FileCode2, XCircle } from "lucide-react";
import type { ExecutionResult, TestResult } from "@/lib/api";
import { cn, formatMemory, formatRuntime, statusLabel } from "@/lib/utils";

export function ResultPanel({ result }: { result: ExecutionResult | null }) {
  if (!result) {
    return (
      <div className="flex items-center gap-2.5 py-3 text-sm text-muted-foreground">
        <FileCode2 className="h-4 w-4 opacity-50 text-accent" />
        <span>Run sample tests or submit a solution to see results here.</span>
      </div>
    );
  }

  const accepted = result.status === "ACCEPTED";
  const failed = result.test_results.find((test) => test.status !== "PASSED");

  return (
    <div className="space-y-4">
      <header className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-2xs",
        accepted
          ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30"
          : "border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30",
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            accepted ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500",
          )}>
            {accepted ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <div>
            <h3
              className={`text-base font-bold tracking-tight ${
                accepted ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {accepted ? "Accepted" : statusLabel(result.status)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {accepted
                ? "All test cases passed successfully"
                : result.total > 0
                  ? `Passed ${result.passed} of ${result.total} test cases`
                  : "Execution failed"}
            </p>
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Stat icon={Clock} label="Runtime" value={formatRuntime(result.runtime_ms)} />
        <Stat icon={Cpu} label="Memory" value={formatMemory(result.memory_kb)} />
        <Stat icon={CheckCircle2} label="Passed" value={`${result.passed} / ${result.total}`} />
      </dl>

      {result.compile_output ? (
        <pre className="overflow-auto rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 font-mono text-xs text-rose-400">
          {result.compile_output}
        </pre>
      ) : null}

      {accepted ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
          <ul className="space-y-2 text-xs">
            {result.test_results.map((test, index) => (
              <li key={`${test.test_case_id}-${index}`} className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {test.hidden ? `Hidden Test ${index + 1}` : `Test Case ${index + 1}`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!accepted && failed && !failed.hidden ? <FailedCase test={failed} /> : null}

      {!accepted && failed?.hidden ? (
        <p className="rounded-xl border border-steel-800/90 bg-steel-950/40 p-3.5 text-xs text-muted-foreground">
          A hidden test failed. Hidden test details are concealed to prevent overfitting.
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-steel-800/90 bg-steel-950/60 p-3 shadow-2xs">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <span>{label}</span>
      </div>
      <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function FailedCase({ test }: { test: TestResult }) {
  return (
    <div className="space-y-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">Failed Test Case</h4>
      <Block label="Input" value={test.input} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Block label="Expected Output" value={test.expected_output} tone="text-emerald-400" />
        <Block label="Actual Output" value={test.actual_output} tone="text-rose-400" />
      </div>
      {test.error_message ? <Block label="Error" value={test.error_message} tone="text-rose-400" /> : null}
    </div>
  );
}

function Block({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string | null;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-steel-800/90 bg-steel-950/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <pre className={`mt-1.5 whitespace-pre-wrap font-mono text-xs font-medium ${tone}`}>{value ?? "—"}</pre>
    </div>
  );
}
