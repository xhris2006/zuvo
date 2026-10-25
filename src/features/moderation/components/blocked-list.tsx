import { Avatar } from "@/components/ui/avatar";
import { avatarUrl } from "@/features/profiles/avatar-url";
import type { BlockedUser } from "../queries";
import { BlockButton } from "./block-button";
import { getT } from "@/i18n/server";

export async function BlockedList({ users }: { users: BlockedUser[] }) {
  const t = await getT();
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.moderation.noneBlocked}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {users.map((user) => {
        const name = user.displayName ?? t.moderation.unavailableUser;
        return (
          <li key={user.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Avatar name={name} src={avatarUrl(user.avatarPath)} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{name}</span>
              {user.username ? (
                <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
              ) : null}
            </span>
            <BlockButton
              userId={user.id}
              username={user.username ?? ""}
              displayName={name}
              initialBlocked
            />
          </li>
        );
      })}
    </ul>
  );
}
