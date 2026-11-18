import clsx from "clsx";

export function RelevanceBars({ relevance }: { relevance: number | null }) {
  return (
    <div className="flex items-center gap-0.5" title={relevance !== null ? `Relevanz ${relevance}/5` : "Noch nicht bewertet"}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={clsx(
            "h-2.5 w-1 rounded-sm",
            relevance !== null && i <= relevance ? "bg-cyan" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
