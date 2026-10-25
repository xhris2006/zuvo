"use client";

import { ArrowDownUp, Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type SortMenuProps = {
  label: string;
  options: { label: string; href: Route; active: boolean }[];
  className?: string;
};

/** Choix du tri (liens : chaque option garde les filtres en cours). */
export function SortMenu({ label, options, className }: SortMenuProps) {
  const t = useT();
  const current = options.find((option) => option.active)?.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
        aria-label={current ? t.explore.sortCurrent(label, current) : label}
      >
        <ArrowDownUp aria-hidden="true" />
        <span className="max-w-32 truncate">{current ?? label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem key={option.href} asChild>
            <Link href={option.href} aria-current={option.active ? "true" : undefined}>
              <Check className={cn(!option.active && "invisible")} aria-hidden="true" />
              {option.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
