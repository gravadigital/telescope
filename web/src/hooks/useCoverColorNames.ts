import { useMemo } from 'react';
import { COVER_COLORS } from '../domain/coverColors';
import type { CoverColorId } from '../domain/coverColors';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n';

/** Nombre de cada color de portada en el idioma activo (lo reciben los selectores). */
export const useCoverColorNames = (): Record<CoverColorId, string> => {
  const { t } = useT();
  return useMemo(
    () =>
      Object.fromEntries(
        COVER_COLORS.map((id) => [id, t(`coverColor.names.${id}` as TranslationKey)])
      ) as Record<CoverColorId, string>,
    [t]
  );
};
