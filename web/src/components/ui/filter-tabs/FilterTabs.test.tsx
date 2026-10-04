import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterTabs from './FilterTabs';

const options = [
  { value: 'all', label: 'Todos', count: 7, accessibleLabel: 'Todos, 7 eventos' },
  { value: 'participation', label: 'Inscripción abierta', count: 4, accessibleLabel: 'Inscripción abierta, 4 eventos' },
  { value: 'voting', label: 'En votación', count: 0, accessibleLabel: 'En votación, 0 eventos' },
];

describe('FilterTabs', () => {
  it('TS-53: roles, conteo visible y navegación con teclado', () => {
    const fn = jest.fn();
    render(<FilterTabs options={options} value="all" onChange={fn} label="Etapa" />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const selected = screen.getByRole('tab', { name: 'Todos, 7 eventos' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('En votación').parentElement).toHaveTextContent('En votación · 0');

    selected.focus();
    userEvent.keyboard('{arrowright}');
    expect(fn).toHaveBeenLastCalledWith('participation');
    userEvent.keyboard('{end}');
    expect(fn).toHaveBeenLastCalledWith('voting');
  });

  it('click selecciona y loading oculta los conteos', () => {
    const fn = jest.fn();
    render(<FilterTabs options={options} value="all" onChange={fn} loading />);
    expect(screen.queryByText(/· 7/)).toBeNull();
    userEvent.click(screen.getByRole('tab', { name: 'En votación, 0 eventos' }));
    expect(fn).toHaveBeenCalledWith('voting');
  });
});
