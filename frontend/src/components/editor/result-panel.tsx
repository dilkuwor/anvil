import type { ExecutionResult, TestResult } from "@/lib/api";
import { formatMemory, formatRuntime, statusLabel } from "@/lib/utils";

export function ResultPanel({ result }: { result: ExecutionResult | null }) {
  if (!result) {
    return <p className="text-sm text-muted-foreground">Run sample tests or submit a solution to see results here.</p>;
  }

  const accepted = result.status === "ACCEPTED";
  const failed = result.test_results.find((test) => test.status !== "PASSED");

  return (
    <div className="space-y-5">
      <header>
        <h3 className={`text-lg font-semibold ${accepted ? "text-success" : "text-coral"}`}>
          {accepted ? "✓ Accepted" : `✕ ${statusLabel(result.status)}`}
        </h3>
        {accepted ? (
          <p className="mt-1 text-sm text-muted-foreground">All test cases passed</p>
        ) : result.total > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Passed {result.passed} / {result.total}
          </p>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Stat label="Runtime" value={formatRuntime(result.runtime_ms)} />
        <Stat label="Memory" value={formatMemory(result.memory_kb)} />
        <Stat label="Test Cases" value={`${result.passed} / ${result.total}`} />
      </dl>

      {result.compile_output ? (
        <pre className="overflow-auto rounded-lg border border-coral/30 bg-coral/5 p-3 font-mono text-xs text-coral">
          {result.compile_output}
        </pre>
      ) : null}

      {accepted ? (
        <ul className="space-y-1.5 text-sm">
          {result.test_results.map((test, index) => (
            <li key={`${test.test_case_id}-${index}`} className="text-success">
              ✓ {test.hidden ? `Hidden Test ${index + 1}` : `Test Case ${index + 1}`}
            </li>
          ))}
        </ul>
      ) : null}

      {!accepted && failed && !failed.hidden ? <FailedCase test={failed} /> : null}

      {!accepted && failed?.hidden ? (
        <p className="text-sm text-muted-foreground">A hidden test failed. Hidden case details are not shown.</p>
      ) : null}

      {!accepted && !failed && result.test_results.length > 0 ? (
        <ul className="space-y-2">
          {result.test_results.map((test, index) => (
            <li key={`${test.test_case_id}-${index}`} className="rounded-lg border border-steel-800 p-3 text-sm">
              <div className={test.status === "PASSED" ? "text-success" : "text-coral"}>
                {test.status === "PASSED" ? "✓" : "✕"}{" "}
                {test.hidden ? `Hidden Test ${index + 1}` : `Test Case ${index + 1}`} · {statusLabel(test.status)}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-steel-800 bg-steel-950/50 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function FailedCase({ test }: { test: TestResult }) {
  return (
    <div className="space-y-3 rounded-lg border border-coral/30 bg-coral/5 p-4">
      <h4 className="text-sm font-semibold text-coral">Failed Test</h4>
      <Block label="Input" value={test.input} />
      <Block label="Expected" value={test.expected_output} />
      <Block label="Output" value={test.actual_output} />
      {test.error_message ? <Block label="Error" value={test.error_message} /> : null}
    </div>
  );
}

function Block({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground">{value ?? "—"}</pre>
    </div>
  );
}
