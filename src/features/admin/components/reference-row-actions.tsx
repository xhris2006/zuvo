import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { getT } from "@/i18n/server";

type RowAction = (formData: FormData) => Promise<void>;

/**
 * Activer / désactiver et déplacer un élément de liste (catégorie, ville).
 * Formulaires simples : fonctionnent sans JavaScript.
 */
export async function ReferenceRowActions({
  id,
  name,
  isActive,
  isFirst,
  isLast,
  toggleAction,
  moveAction,
}: {
  id: string;
  name: string;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  toggleAction: RowAction;
  moveAction: RowAction;
}) {
  const t = await getT();
  return (
    <div className="flex shrink-0 items-center gap-1">
      <form action={moveAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="-1" />
        <SubmitButton
          variant="ghost"
          size="sm"
          disabled={isFirst}
          aria-label={t.adminUi.rowActions.moveUp(name)}
          title={t.adminUi.rowActions.up}
        >
          <ArrowUp aria-hidden="true" />
        </SubmitButton>
      </form>
      <form action={moveAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="1" />
        <SubmitButton
          variant="ghost"
          size="sm"
          disabled={isLast}
          aria-label={t.adminUi.rowActions.moveDown(name)}
          title={t.adminUi.rowActions.down}
        >
          <ArrowDown aria-hidden="true" />
        </SubmitButton>
      </form>
      <form action={toggleAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={String(!isActive)} />
        <SubmitButton variant="outline" size="sm">
          {isActive ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {isActive ? t.adminUi.rowActions.deactivate : t.adminUi.rowActions.activate}
        </SubmitButton>
      </form>
    </div>
  );
}
