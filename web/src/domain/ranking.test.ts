import {
  DRAFT_DEBOUNCE_MS,
  hasChanged,
  initialOrder,
  isValidOrder,
  move,
  positionLabel,
  submittedRankingKey,
  toRankings,
} from './ranking';

const attachments = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }];

describe('move', () => {
  it('TS-1: baja intercambiando con la vecina sin mutar el original', () => {
    const original = ['f1', 'f2', 'f3'];
    expect(move(original, 0, 'down')).toEqual(['f2', 'f1', 'f3']);
    expect(original).toEqual(['f1', 'f2', 'f3']);
  });

  it('TS-2: sube intercambiando con la vecina', () => {
    expect(move(['f1', 'f2', 'f3'], 2, 'up')).toEqual(['f1', 'f3', 'f2']);
  });

  it('TS-3: en los bordes no tiene efecto', () => {
    expect(move(['f1', 'f2', 'f3'], 0, 'up')).toEqual(['f1', 'f2', 'f3']);
    expect(move(['f1', 'f2', 'f3'], 2, 'down')).toEqual(['f1', 'f2', 'f3']);
  });
});

describe('positionLabel', () => {
  it('TS-4: etiqueta por posición', () => {
    expect(positionLabel(1, 3)).toBe('best');
    expect(positionLabel(2, 3)).toBe('middle');
    expect(positionLabel(3, 3)).toBe('worst');
    expect(positionLabel(1, 1)).toBe('best');
    expect(positionLabel(2, 2)).toBe('worst');
  });
});

describe('hasChanged', () => {
  it('TS-5: detecta cambios respecto de lo enviado', () => {
    expect(hasChanged(['f1', 'f2'], ['f1', 'f2'])).toBe(false);
    expect(hasChanged(['f2', 'f1'], ['f1', 'f2'])).toBe(true);
    expect(hasChanged(['f1'], null)).toBe(true);
  });
});

describe('initialOrder', () => {
  it('TS-6: usa el borrador', () => {
    expect(
      initialOrder(attachments, [
        { attachment_id: 'f3', rank: 1 },
        { attachment_id: 'f1', rank: 2 },
        { attachment_id: 'f2', rank: 3 },
      ])
    ).toEqual(['f3', 'f1', 'f2']);
  });

  it('TS-7: borrador vacío, nulo o ajeno cae al orden de la asignación', () => {
    expect(initialOrder(attachments, null)).toEqual(['f1', 'f2', 'f3']);
    expect(initialOrder(attachments, [])).toEqual(['f1', 'f2', 'f3']);
    expect(initialOrder(attachments, [{ attachment_id: 'fx', rank: 1 }])).toEqual(['f1', 'f2', 'f3']);
  });

  it('TS-8: borrador parcial completa con el orden de la asignación', () => {
    expect(initialOrder(attachments, [{ attachment_id: 'f3', rank: 1 }])).toEqual(['f3', 'f1', 'f2']);
  });

  it('ordena por rank y no repite ids', () => {
    expect(
      initialOrder(attachments, [
        { attachment_id: 'f2', rank: 2 },
        { attachment_id: 'f2', rank: 3 },
        { attachment_id: 'f3', rank: 1 },
      ])
    ).toEqual(['f3', 'f2', 'f1']);
  });
});

describe('toRankings', () => {
  it('TS-9: rank 1-based', () => {
    expect(toRankings(['f2', 'f1', 'f3'])).toEqual([
      { attachment_id: 'f2', rank: 1 },
      { attachment_id: 'f1', rank: 2 },
      { attachment_id: 'f3', rank: 3 },
    ]);
  });
});

describe('submittedRankingKey', () => {
  it('TS-10: clave por asignación', () => {
    expect(submittedRankingKey('a1')).toBe('telescopio_submitted_ranking:a1');
  });
});

describe('isValidOrder', () => {
  it('acepta exactamente los ids de la asignación', () => {
    expect(isValidOrder(['f3', 'f1', 'f2'], attachments)).toBe(true);
  });

  it('rechaza id extra, faltante, repetido o no-array', () => {
    expect(isValidOrder(['f1', 'f2', 'f3', 'f4'], attachments)).toBe(false);
    expect(isValidOrder(['f1', 'f2'], attachments)).toBe(false);
    expect(isValidOrder(['f1', 'f1', 'f2'], attachments)).toBe(false);
    expect(isValidOrder('f1', attachments)).toBe(false);
    expect(isValidOrder(null, attachments)).toBe(false);
    expect(isValidOrder([1, 2, 3], attachments)).toBe(false);
  });
});

describe('DRAFT_DEBOUNCE_MS', () => {
  it('es 500', () => {
    expect(DRAFT_DEBOUNCE_MS).toBe(500);
  });
});
