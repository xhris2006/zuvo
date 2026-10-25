"use client";

import { type KeyboardEvent, type PointerEvent, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { barPercent, niceMax } from "../chart-scale";

export type TrendPoint = {
  /** Date affichée (« 25 oct. »). */
  label: string;
  value: number;
};

type TrendColumnsProps = {
  title: string;
  /** Texte du total sur la période (« 42 sur 30 jours »). */
  summary: string;
  points: TrendPoint[];
  /** Unité lue dans l'infobulle et le tableau (« inscriptions »). */
  unit: string;
};

/**
 * Colonnes quotidiennes d'une seule série : barres de 24 px au plus, coins
 * arrondis côté valeur, ligne de base et graduation discrètes. Survol ou
 * flèches du clavier : infobulle avec la valeur et la date. Le tableau des
 * données reste accessible sans survol.
 */
export function TrendColumns({ title, summary, points, unit }: TrendColumnsProps) {
  const id = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const empty = points.every((point) => point.value === 0);
  const current = active === null ? null : points[active];

  const indexAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || points.length === 0) return null;
    const ratio = (event.clientX - box.left) / box.width;
    return Math.min(points.length - 1, Math.max(0, Math.floor(ratio * points.length)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const last = points.length - 1;
    const keys: Record<string, number> = {
      ArrowLeft: Math.max(0, (active ?? last + 1) - 1),
      ArrowRight: Math.min(last, (active ?? -1) + 1),
      Home: 0,
      End: last,
    };
    if (event.key in keys) {
      event.preventDefault();
      setActive(keys[event.key]!);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  return (
    <figure className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <figcaption className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{summary}</span>
      </figcaption>

      <div className="relative pt-5">
        <span className="absolute top-0 left-0 text-[0.6875rem] text-muted-foreground tabular-nums">
          {max}
        </span>
        <div
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-label={`${title} : graphique, flèches gauche et droite pour lire chaque jour`}
          aria-describedby={`${id}-live`}
          onPointerMove={(event) => setActive(indexAt(event))}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className="relative flex h-32 items-end gap-0.5 border-t border-b border-border/70 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {points.map((point, index) => (
            <div key={point.label} className="flex h-full flex-1 items-end justify-center">
              <div
                className={cn(
                  "w-full max-w-6 rounded-t-[4px] transition-colors",
                  index === active
                    ? "bg-brand-800 dark:bg-brand-300"
                    : "bg-brand-600 dark:bg-brand-400",
                )}
                style={{ height: `${barPercent(point.value, max)}%` }}
              />
            </div>
          ))}
          {empty ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Aucune activité sur la période
            </p>
          ) : null}
          {active !== null ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25"
              style={{ left: `${((active + 0.5) / points.length) * 100}%` }}
            />
          ) : null}
          {current && active !== null ? (
            <div
              className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-raised"
              style={{
                left: `${((active + 0.5) / points.length) * 100}%`,
              }}
            >
              <span className="block text-sm font-bold tabular-nums">{current.value}</span>
              <span className="text-muted-foreground">
                {unit} · {current.label}
              </span>
            </div>
          ) : null}
        </div>
        <div className="mt-1.5 flex justify-between text-[0.6875rem] text-muted-foreground">
          <span>{points[0]?.label}</span>
          <span>{points.at(-1)?.label}</span>
        </div>
        <p id={`${id}-live`} className="sr-only" aria-live="polite">
          {current ? `${current.label} : ${current.value} ${unit}` : ""}
        </p>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
          Voir les données
        </summary>
        <div
          className="mt-2 max-h-56 overflow-y-auto"
          tabIndex={0}
          role="region"
          aria-label={title}
        >
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 font-medium">
                  Jour
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  {unit}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {points.map((point) => (
                <tr key={point.label}>
                  <td className="py-1">{point.label}</td>
                  <td className="py-1 text-right tabular-nums">{point.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
