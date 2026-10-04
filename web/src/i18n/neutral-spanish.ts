/** Formas de voseo rioplatense que no deben aparecer en el catálogo `es` (español neutro). */
export const VOSEO_FORMS: readonly string[] = [
  'vos', 'sos', 'podés', 'querés', 'tenés', 'sabés', 'hacés', 'organizás', 'participás',
  'elegí', 'subí', 'ordená', 'inscribite', 'iniciá', 'creá', 'compartí', 'probá', 'intentá',
  'volvé', 'mirá', 'hacé', 'tocá', 'revisá', 'ingresá', 'escribí', 'completá', 'usá', 'cerrá',
  'abrí', 'enviá', 'pedí', 'seguí', 'andá', 'fijate', 'acordate',
];

const LETTER = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';

const wordRegex = (word: string): RegExp =>
  new RegExp(`(?<![${LETTER}])${word}(?![${LETTER}])`, 'i');

const VOSEO_REGEXES = VOSEO_FORMS.map((form) => ({ form, regex: wordRegex(form) }));

export const findVoseo = (text: string): string[] =>
  VOSEO_REGEXES.filter(({ regex }) => regex.test(text)).map(({ form }) => form);

const GENDER_PATTERNS: readonly RegExp[] = [
  /\b\w+(?:o\/a|a\/o|os\/as|as\/os)\b/gi,
  /\w@\w/g,
  /\b(?:todxs|inscriptxs|participantxs)\b/gi,
];

export const findGenderMarks = (text: string): string[] =>
  GENDER_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []);
