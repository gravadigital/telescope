// Reglas puras del ranking de propuestas (S-017). Sin efectos ni React.

export const DRAFT_DEBOUNCE_MS = 500;

export type PositionLabel = 'best' | 'middle' | 'worst';

interface RankedItem {
  attachment_id: string;
  rank: number;
}

// Intercambia el elemento con su vecina; en los bordes devuelve una copia igual.
export const move = (
  order: readonly string[],
  index: number,
  direction: 'up' | 'down'
): string[] => {
  const next = [...order];
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const positionLabel = (position: number, total: number): PositionLabel => {
  if (position === 1) return 'best';
  if (position === total && total > 1) return 'worst';
  return 'middle';
};

// Sin referencia de lo enviado (null) cualquier orden cuenta como cambio.
export const hasChanged = (
  order: readonly string[],
  submitted: readonly string[] | null
): boolean => {
  if (!submitted) return true;
  return order.length !== submitted.length || order.some((id, i) => id !== submitted[i]);
};

// Los ids del borrador primero (por rank), el resto en el orden de la asignación.
export const initialOrder = (
  attachments: readonly { id: string }[],
  draft: readonly RankedItem[] | null
): string[] => {
  const assigned = attachments.map((a) => a.id);
  if (!draft || draft.length === 0) return assigned;
  const known = new Set(assigned);
  const fromDraft: string[] = [];
  [...draft]
    .sort((a, b) => a.rank - b.rank)
    .forEach(({ attachment_id }) => {
      if (known.has(attachment_id) && !fromDraft.includes(attachment_id)) {
        fromDraft.push(attachment_id);
      }
    });
  return [...fromDraft, ...assigned.filter((id) => !fromDraft.includes(id))];
};

export const toRankings = (order: readonly string[]): RankedItem[] =>
  order.map((attachment_id, i) => ({ attachment_id, rank: i + 1 }));

// Valida lo leído de localStorage: exactamente los ids de la asignación, sin repetidos.
export const isValidOrder = (
  order: unknown,
  attachments: readonly { id: string }[]
): order is string[] => {
  if (!Array.isArray(order) || order.length !== attachments.length) return false;
  const ids = new Set(attachments.map((a) => a.id));
  const seen = new Set<unknown>();
  return order.every((id) => {
    if (typeof id !== 'string' || !ids.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const submittedRankingKey = (assignmentId: string): string =>
  `telescopio_submitted_ranking:${assignmentId}`;
