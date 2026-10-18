import { MapPinOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";
import { getDictionary } from "@/i18n";

export default function NotFound() {
  const t = getDictionary();
  return (
    <div className="container-page max-w-xl pt-12 sm:pt-20">
      <EmptyState
        icon={MapPinOff}
        headingLevel="h1"
        title={t.errors.notFoundTitle}
        description={t.errors.notFoundBody}
        action={
          <Button asChild>
            <Link href={routes.home}>{t.common.backHome}</Link>
          </Button>
        }
      />
    </div>
  );
}
