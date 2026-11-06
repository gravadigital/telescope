import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorSwatchPicker from './ColorSwatchPicker';
import { COVER_COLORS } from '../../../domain/coverColors';
import type { CoverColorId } from '../../../domain/coverColors';
import { es } from '../../../i18n/catalogs/es';

const names = es.coverColor.names as Record<CoverColorId, string>;

const setViewport = (desktop: boolean): void => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: desktop && query.includes('min-width: 768px'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
};

/** Mantiene el valor, como lo hace un formulario controlado. */
const Controlled: React.FC<{ initial?: CoverColorId; onChange?: (id: CoverColorId) => void }> = ({
  initial = 'lavender',
  onChange,
}) => {
  const [value, setValue] = React.useState<CoverColorId>(initial);
  return (
    <ColorSwatchPicker
      value={value}
      names={names}
      label="Color de portada"
      onChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
    />
  );
};

describe('ColorSwatchPicker', () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('TS-5: grupo de radios con los 16 colores y el nombre del elegido', () => {
    render(
      <ColorSwatchPicker
        value="lavender"
        names={names}
        label="Color de portada"
        help="Es el fondo del encabezado de tu evento."
        onChange={jest.fn()}
      />
    );

    const group = screen.getByRole('radiogroup', { name: 'Color de portada' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(16);
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(COVER_COLORS.map((id) => names[id]));

    expect(within(group).getByRole('radio', { name: 'Lavanda' })).toHaveAttribute('aria-checked', 'true');
    radios
      .filter((r) => r.getAttribute('aria-label') !== 'Lavanda')
      .forEach((r) => expect(r).toHaveAttribute('aria-checked', 'false'));

    expect(screen.getByText('Lavanda')).toBeVisible();
    expect(screen.getByText('Es el fondo del encabezado de tu evento.')).toBeInTheDocument();
    expect(group).toHaveAccessibleDescription('Es el fondo del encabezado de tu evento.');
  });

  it('TS-6: Tab entra en la elegida y las flechas recorren la grilla de 8 columnas', () => {
    setViewport(true);
    const onChange = jest.fn();
    render(<Controlled onChange={onChange} />);
    const radio = (name: string) => screen.getByRole('radio', { name });

    userEvent.tab();
    expect(radio('Lavanda')).toHaveFocus();

    userEvent.keyboard('{arrowright}');
    expect(radio('Vincapervinca')).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('periwinkle');

    userEvent.keyboard('{arrowdown}');
    expect(radio('Durazno')).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('peach');

    userEvent.keyboard('{arrowleft}');
    expect(radio('Manteca')).toHaveFocus();

    userEvent.keyboard('{arrowup}');
    expect(radio('Lavanda')).toHaveFocus();

    // Un solo radio en el orden de tabulación, siempre el elegido.
    const tabbable = screen.getAllByRole('radio').filter((r) => r.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(radio('Lavanda'));
    expect(radio('Lavanda')).toHaveAttribute('aria-checked', 'true');
  });

  it('TS-6: en mobile las filas son de 4 y los bordes no dan la vuelta', () => {
    setViewport(false);
    render(<Controlled initial="mist" />);
    const radio = (name: string) => screen.getByRole('radio', { name });

    userEvent.tab();
    expect(radio('Bruma')).toHaveFocus();
    userEvent.keyboard('{arrowright}');
    expect(radio('Bruma')).toHaveFocus();
    userEvent.keyboard('{arrowdown}');
    expect(radio('Bruma')).toHaveFocus();

    userEvent.keyboard('{arrowup}');
    expect(radio('Rosa')).toHaveFocus();
    userEvent.keyboard('{arrowup}');
    expect(radio('Limón')).toHaveFocus();
  });

  it('TS-6: Espacio y Enter eligen la muestra enfocada', () => {
    const onChange = jest.fn();
    render(
      <ColorSwatchPicker value="lavender" names={names} label="Color de portada" onChange={onChange} />
    );
    const mint = screen.getByRole('radio', { name: 'Menta' });
    mint.focus();

    userEvent.keyboard('{space}');
    expect(onChange).toHaveBeenLastCalledWith('mint');
    userEvent.keyboard('{enter}');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('TS-7: click elige el color', () => {
    const onChange = jest.fn();
    render(
      <ColorSwatchPicker value="lavender" names={names} label="Color de portada" onChange={onChange} />
    );

    userEvent.click(screen.getByRole('radio', { name: 'Menta' }));

    expect(onChange).toHaveBeenCalledWith('mint');
  });

  it('TS-7: deshabilitado no permite elegir', () => {
    const onChange = jest.fn();
    render(
      <ColorSwatchPicker value="lavender" names={names} label="Color de portada" disabled onChange={onChange} />
    );

    const radios = screen.getAllByRole('radio');
    radios.forEach((r) => expect(r).toBeDisabled());
    userEvent.click(screen.getByRole('radio', { name: 'Menta' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selectedRef apunta a la muestra elegida (foco inicial de un diálogo)', () => {
    const selectedRef = React.createRef<HTMLButtonElement>();
    render(
      <ColorSwatchPicker
        value="mint"
        names={names}
        label="Color de portada"
        selectedRef={selectedRef}
        onChange={jest.fn()}
      />
    );

    expect(selectedRef.current).toBe(screen.getByRole('radio', { name: 'Menta' }));
  });

  it('pinta cada muestra con su token y marca la elegida con un check', () => {
    const { container } = render(
      <ColorSwatchPicker value="peach" names={names} label="Color de portada" onChange={jest.fn()} />
    );

    const dots = container.querySelectorAll<HTMLElement>('.ui-swatch-picker__dot');
    expect(dots).toHaveLength(16);
    expect(dots[0].style.getPropertyValue('--swatch-color')).toBe('var(--bg-cover-lavender)');
    expect(dots[9].style.getPropertyValue('--swatch-color')).toBe('var(--bg-cover-peach)');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'Durazno' }).querySelector('svg')).not.toBeNull();
  });
});

describe('ColorSwatchPicker.css', () => {
  const css = fs
    .readFileSync(path.join(__dirname, 'ColorSwatchPicker.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const mediaStart = css.indexOf('@media');
  const base = css.slice(0, mediaStart);
  const media = css.slice(mediaStart);
  const rule = (source: string, selector: string) =>
    new RegExp(`${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

  it('TS-8: mobile primero (4 × 40px, área de 44px) y 8 × 32px desde 768px', () => {
    expect(rule(base, '.ui-swatch-picker__grid')).toMatch(/grid-template-columns:\s*repeat\(4,/);
    expect(rule(base, '.ui-swatch-picker__swatch')).toMatch(/min-width:\s*44px/);
    expect(rule(base, '.ui-swatch-picker__swatch')).toMatch(/min-height:\s*44px/);
    expect(rule(base, '.ui-swatch-picker__dot')).toMatch(/width:\s*40px/);
    expect(rule(base, '.ui-swatch-picker__dot')).toMatch(/height:\s*40px/);

    expect(media).toMatch(/@media \(min-width: 768px\)/);
    expect(rule(media, '.ui-swatch-picker__grid')).toMatch(/grid-template-columns:\s*repeat\(8,/);
    expect(rule(media, '.ui-swatch-picker__dot')).toMatch(/width:\s*32px/);
    expect(rule(media, '.ui-swatch-picker__dot')).toMatch(/height:\s*32px/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
  });

  it('TS-8: foco, selección y deshabilitado con tokens, sin hex', () => {
    expect(rule(css, '.ui-swatch-picker__swatch:focus-visible .ui-swatch-picker__dot')).toMatch(
      /box-shadow:\s*var\(--focus-ring\)/
    );
    expect(rule(css, '.ui-swatch-picker__swatch[aria-checked="true"] .ui-swatch-picker__dot')).toMatch(
      /var\(--bg-action-primary\)/
    );
    expect(rule(css, '.ui-swatch-picker__swatch:disabled')).toMatch(/opacity:\s*0\.4/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
