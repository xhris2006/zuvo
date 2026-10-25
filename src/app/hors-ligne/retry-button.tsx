"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function RetryButton() {
  const t = useT();
  return (
    <Button onClick={() => window.location.reload()}>
      <RotateCw aria-hidden="true" />
      {t.common.retry}
    </Button>
  );
}
