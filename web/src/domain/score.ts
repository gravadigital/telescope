/** Puntaje MBC normalizado en [0,1] -> escala de 0 a 10 con un decimal. */
export const formatScore = (mbcScore: number, locale: string): string =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    mbcScore * 10
  );
