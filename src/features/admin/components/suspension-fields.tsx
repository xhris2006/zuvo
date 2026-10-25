"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { suspensionDurationLabels, suspensionDurations } from "../suspension";

/** Durée d'une suspension (définitive, durée fixe ou date de fin), dans la fenêtre de suspension. */
export function SuspensionFields() {
  const id = useId();
  const [duration, setDuration] = useState<string>("permanent");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-duration`} className="text-sm font-medium">
          Durée
        </label>
        <Select
          id={`${id}-duration`}
          name="duration"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        >
          {suspensionDurations.map((value) => (
            <option key={value} value={value}>
              {suspensionDurationLabels[value]}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          Une suspension temporaire est levée automatiquement à son terme.
        </p>
      </div>
      {duration === "date" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-until`} className="text-sm font-medium">
            Suspendu jusqu&apos;au (inclus)
          </label>
          <Input id={`${id}-until`} name="until" type="date" required />
        </div>
      ) : null}
    </div>
  );
}
