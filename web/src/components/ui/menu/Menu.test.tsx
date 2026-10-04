import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Menu from './Menu';
import Button from '../button/Button';

describe('Menu', () => {
  it('TS-51: abre, navega con flechas y activa con Enter', () => {
    const a = jest.fn();
    const b = jest.fn();
    render(
      <Menu
        trigger={<Button variant="onBand">Ana</Button>}
        items={[
          { id: 'my', label: 'Mis eventos', onSelect: a },
          { id: 'out', label: 'Cerrar sesión', onSelect: b },
        ]}
      />
    );
    const trigger = screen.getByRole('button', { name: 'Ana' });
    userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: 'Mis eventos' })).toHaveFocus();

    userEvent.keyboard('{arrowdown}');
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toHaveFocus();
    userEvent.keyboard('{enter}');
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('TS-52: Escape devuelve el foco al disparador; select usa menuitemradio', () => {
    const { unmount } = render(
      <Menu
        trigger={<Button variant="onBand">Ana</Button>}
        items={[{ id: 'my', label: 'Mis eventos', onSelect: jest.fn() }]}
      />
    );
    const trigger = screen.getByRole('button', { name: 'Ana' });
    userEvent.click(trigger);
    userEvent.keyboard('{esc}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
    unmount();

    render(
      <Menu
        variant="select"
        trigger={<Button variant="onBand">Idioma</Button>}
        items={[
          { id: 'es', label: 'Español', selected: true, onSelect: jest.fn() },
          { id: 'en', label: 'English', onSelect: jest.fn() },
        ]}
      />
    );
    userEvent.click(screen.getByRole('button', { name: 'Idioma' }));
    expect(screen.getByRole('menuitemradio', { name: 'Español' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
  });

  it('cierra al hacer click afuera', () => {
    render(
      <div>
        <Menu trigger={<Button>Abrir</Button>} items={[{ id: 'a', label: 'Uno', onSelect: jest.fn() }]} />
        <p>Afuera</p>
      </div>
    );
    userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    userEvent.click(screen.getByText('Afuera'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('TS-45: ítems radio dentro de un menú de acciones', () => {
    render(
      <Menu
        trigger={<button type="button">Abrir</button>}
        label="Menú"
        items={[
          { id: 'a', label: 'Acción', onSelect: jest.fn() },
          { id: 'es', label: 'Español', selected: true, onSelect: jest.fn() },
          { id: 'en', label: 'English', selected: false, onSelect: jest.fn() },
        ]}
      />
    );
    userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const action = screen.getByRole('menuitem', { name: 'Acción' });
    expect(action).not.toHaveAttribute('aria-checked');
    const es = screen.getByRole('menuitemradio', { name: 'Español' });
    const en = screen.getByRole('menuitemradio', { name: 'English' });
    expect(es).toHaveAttribute('aria-checked', 'true');
    expect(en).toHaveAttribute('aria-checked', 'false');
    expect(es.querySelector('.ui-menu__check')).not.toBeNull();
    expect(en.querySelector('.ui-menu__check')).toBeNull();
  });
});
