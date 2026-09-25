export function CatalogStats({
  total,
  stories,
  solved,
  remaining,
}: {
  total: number;
  stories?: number;
  solved: number;
  remaining: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] tabular-nums text-muted-foreground">
      <span>
        <span className="font-semibold text-foreground">{total}</span> problems
      </span>
      {typeof stories === "number" ? (
        <>
          <span className="text-steel-700">·</span>
          <span>
            <span className="font-semibold text-foreground">{stories}</span> stories
          </span>
        </>
      ) : null}
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
