import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { className: "size-8 text-xs", pixels: 32 },
  md: { className: "size-10 text-sm", pixels: 40 },
  lg: { className: "size-16 text-lg", pixels: 64 },
  xl: { className: "size-24 text-2xl", pixels: 96 },
} as const;

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const { className: sizeClass, pixels } = sizes[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground",
        sizeClass,
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={`Photo de profil de ${name}`}
          width={pixels}
          height={pixels}
          sizes={`${pixels}px`}
          // Aperçu local (blob:) avant envoi : pas d'optimisation possible.
          unoptimized={src.startsWith("blob:")}
          className="size-full object-cover"
        />
      ) : (
        <span aria-label={name} role="img">
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}
