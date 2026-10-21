import { Ban, Heart, MessageCircle, Package, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { openNotificationAction } from "../actions";
import type { NotificationType } from "../content";
import type { NotificationItem } from "../queries";

const icons = {
  new_message: MessageCircle,
  new_follower: UserPlus,
  followed_user_listing: Package,
  listing_favorited: Heart,
  listing_removed: Ban,
} satisfies Record<NotificationType, unknown>;

export function NotificationList({ items }: { items: NotificationItem[] }) {
  return (
    <ul className="-mx-4 divide-y divide-border border-y border-border bg-card sm:mx-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-card">
      {items.map((item) => {
        const Icon = icons[item.type];
        return (
          <li key={item.id}>
            <form action={openNotificationAction}>
              <input type="hidden" name="notificationId" value={item.id} />
              <button
                type="submit"
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                  !item.isRead && "bg-secondary/40",
                )}
              >
                <span className="relative shrink-0">
                  {item.type === "listing_removed" ? (
                    <span className="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  ) : (
                    <>
                      <Avatar name={item.actorName ?? "?"} src={avatarUrl(item.actorAvatarPath)} />
                      <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                    </>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("text-sm", !item.isRead && "font-semibold")}>
                    {item.body}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
                {item.isRead ? null : (
                  <span className="mt-1.5 flex items-center">
                    <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
                    <span className="sr-only">Non lue</span>
                  </span>
                )}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
