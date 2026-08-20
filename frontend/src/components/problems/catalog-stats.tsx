export function CatalogStats({
  total,
  solved,
  remaining,
}: {
  total: number;
  solved: number;
  remaining: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] tabular-nums text-muted-foreground">
      <span>
        <span className="font-semibold text-foreground">{total}</span> problems
      </span>
      <span className="text-steel-700">·</span>
      <span>
        <span className="font-semibold text-success">{solved}</span> solved
      </span>
      <span className="text-steel-700">·</span>
      <span>
        <span className="font-semibold text-foreground">{remaining}</span> remaining
      </span>
    </div>
  );
}
