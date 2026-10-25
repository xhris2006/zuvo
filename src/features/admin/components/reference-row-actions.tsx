import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";

type RowAction = (formData: FormData) => Promise<void>;

/**
 * Activer / désactiver et déplacer un élément de liste (catégorie, ville).
 * Formulaires simples : fonctionnent sans JavaScript.
 */
export function ReferenceRowActions({
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
  return (
    <div className="flex shrink-0 items-center gap-1">
      <form action={moveAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="-1" />
        <SubmitButton
          variant="ghost"
          size="sm"
          disabled={isFirst}
          aria-label={`Monter ${name}`}
          title="Monter"
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
          aria-label={`Descendre ${name}`}
          title="Descendre"
        >
          <ArrowDown aria-hidden="true" />
        </SubmitButton>
      </form>
      <form action={toggleAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={String(!isActive)} />
        <SubmitButton variant="outline" size="sm">
          {isActive ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {isActive ? "Désactiver" : "Activer"}
        </SubmitButton>
      </form>
    </div>
  );
}
