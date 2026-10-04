import { findGenderMarks, findVoseo } from './neutral-spanish';

describe('neutral-spanish', () => {
  it('TS-26: el detector de voseo detecta', () => {
    expect(findVoseo('¿Querés participar?')).toEqual(['querés']);
    expect(findVoseo('Podés subir tu archivo')).toEqual(['podés']);
    expect(findVoseo('Iniciá sesión')).toEqual(['iniciá']);
    expect(findVoseo('¿Quieres participar?')).toEqual([]);
    expect(findVoseo('Además, después')).toEqual([]);
  });

  it('TS-27: findGenderMarks', () => {
    expect(findGenderMarks('inscripto/a')).toEqual(['inscripto/a']);
    expect(findGenderMarks('todxs')).toEqual(['todxs']);
    expect(findGenderMarks('Inscritos en el evento')).toEqual([]);
  });
});
