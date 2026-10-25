import { formatCount } from "@/lib/format";
import { barPercent } from "../chart-scale";

type RankedBarsProps = {
  title: string;
  description?: string;
  rows: { key: string; label: string; value: number }[];
  /** Au-delà, les lignes suivantes sont regroupées sous `restLabel`. */
  limit?: number;
  restLabel: string;
  emptyText: string;
};

/**
 * Comparaison de grandeurs : barres horizontales d'une seule teinte, triées,
 * valeur au bout de chaque barre (texte en couleur de texte, jamais de série).
 */
export function RankedBars({
  title,
  description,
  rows,
  limit = 8,
  restLabel,
  emptyText,
}: RankedBarsProps) {
  const sorted = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((sum, row) => sum + row.value, 0);
  const items = rest > 0 ? [...shown, { key: "__reste", label: restLabel, value: rest }] : shown;
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
              <span className="truncate text-sm" title={item.label}>
                {item.label}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-3.5 rounded-r-[4px] bg-brand-600"
                  style={{ width: `${Math.max(2, barPercent(item.value, max))}%` }}
                  aria-hidden="true"
                />
                <span className="shrink-0 text-xs font-semibold tabular-nums">
                  {formatCount(item.value)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
