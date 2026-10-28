import { Bell } from "lucide-react";
import Link from "next/link";
import { routes } from "@/config/routes";
import { PushAttentionDot } from "@/features/notifications/components/push-attention-dot";
import { UnreadBadge, UnreadLabel } from "@/features/notifications/components/unread-counts";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

/** Cloche des notifications (compteur de non-lues, rappel d'activation) pour les barres de page. */
export async function NotificationsLink({ className }: { className?: string }) {
  const t = await getT();
  return (
    <Link
      href={routes.notifications}
      title={t.nav.notifications}
      className={cn(
        "relative inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      <Bell className="size-[1.375rem]" strokeWidth={1.9} aria-hidden="true" />
      <span className="sr-only">{t.nav.notifications}</span>
      <UnreadLabel kind="notifications" />
      <UnreadBadge kind="notifications" className="top-0.5 right-0.5" />
      <PushAttentionDot className="bottom-1.5 left-1.5" />
    </Link>
  );
}
