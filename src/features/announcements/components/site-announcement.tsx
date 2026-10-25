import { Info, Wrench } from "lucide-react";
import type { Route } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { getCurrentAnnouncement } from "../queries";
import { DismissAnnouncement, HIDDEN_ANNOUNCEMENT_COOKIE } from "./dismiss-announcement";

/** Bandeau du message global (annonce ou maintenance), sous l'en-tête. */
export async function SiteAnnouncementBanner() {
  const announcement = await getCurrentAnnouncement();
  if (!announcement) return null;
  const maintenance = announcement.kind === "maintenance";
  // Une simple annonce masquée par le visiteur ne réapparaît pas (cookie).
  const hidden = (await cookies()).get(HIDDEN_ANNOUNCEMENT_COOKIE)?.value;
  if (!maintenance && hidden === announcement.id) return null;
  const t = getDictionary();
  const Icon = maintenance ? Wrench : Info;
  const external = announcement.linkUrl?.startsWith("https://") ?? false;

  return (
    <div
      data-site-banner
      role={maintenance ? "alert" : "status"}
      className={cn(
        "border-b text-sm",
        maintenance
          ? "border-warning/40 bg-warning-soft text-foreground"
          : "border-secondary bg-accent text-accent-foreground",
      )}
    >
      <div className="container-page flex items-start gap-3 py-2.5">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">
            {maintenance ? t.announcement.maintenance : t.announcement.info} :{" "}
          </span>
          {announcement.message}
          {announcement.linkUrl ? (
            <>
              {" "}
              {external ? (
                <a
                  href={announcement.linkUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="font-semibold underline underline-offset-2"
                >
                  {t.announcement.more}
                </a>
              ) : (
                <Link
                  href={announcement.linkUrl as Route}
                  className="font-semibold underline underline-offset-2"
                >
                  {t.announcement.more}
                </Link>
              )}
            </>
          ) : null}
        </p>
        {maintenance ? null : <DismissAnnouncement id={announcement.id} />}
      </div>
    </div>
  );
}
