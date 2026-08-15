export function Meter({
  value,
  tone = "bg-accent",
  label,
}: {
  value: number;
  tone?: string;
  label: string;
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-steel-800"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}
