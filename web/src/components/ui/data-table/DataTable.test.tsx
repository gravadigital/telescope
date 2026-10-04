import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from './DataTable';

interface Row {
  id: string;
  name: string;
  stage: string;
}

const columns = [
  { key: 'name', header: 'EVENTO' },
  { key: 'stage', header: 'ETAPA' },
];
const rows: Row[] = [
  { id: 'e1', name: 'Evento 1', stage: 'Votación' },
  { id: 'e2', name: 'Evento 2', stage: 'Resultados' },
];

describe('DataTable', () => {
  it('TS-26: semántica de tabla', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} caption="Eventos" />);
    expect(screen.getByRole('table', { name: 'Eventos' })).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'));
    expect(headers.map((h) => h.textContent)).toEqual(['EVENTO', 'ETAPA']);
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('TS-27: etiqueta por celda para el apilado', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Eventos"
        rowAction={(r) => ({ label: `Gestionar ${r.name}`, onClick: jest.fn() })}
      />
    );
    const firstRow = screen.getAllByRole('row')[1];
    const cells = within(firstRow).getAllByRole('cell');
    expect(cells.map((c) => c.getAttribute('data-label'))).toEqual(['EVENTO', 'ETAPA', '']);
  });

  it('TS-28: acción única por fila', () => {
    const fn = jest.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Eventos"
        rowAction={(r) => ({ label: `Gestionar ${r.name}`, onClick: () => fn(r), variant: 'secondary' })}
      />
    );
    userEvent.click(screen.getByRole('button', { name: 'Gestionar Evento 1' }));
    expect(fn).toHaveBeenCalledWith(rows[0]);
    screen.getAllByRole('row').slice(1).forEach((row) => {
      expect(within(row).getAllByRole('button')).toHaveLength(1);
    });
  });

  it('TS-29: carga con skeleton y fila resaltada', () => {
    const { rerender, container } = render(
      <DataTable columns={columns} rows={[]} rowKey={(r: Row) => r.id} caption="Eventos" loading />
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.ui-data-table__row--skeleton')).toHaveLength(3);

    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Eventos"
        highlightRow={(r) => r.id === 'e2'}
      />
    );
    const highlighted = container.querySelectorAll('.ui-data-table__row--highlighted');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toHaveTextContent('Evento 2');
  });

  it('muestra "—" para valores vacíos y usa render cuando existe', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', header: 'EVENTO' },
          { key: 'stage', header: 'ETAPA', render: (r: Row) => <b>{r.id}</b> },
        ]}
        rows={[{ id: 'e1', name: '', stage: 'x' }]}
        rowKey={(r) => r.id}
        caption="Eventos"
      />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('e1')).toBeInTheDocument();
  });

  it('TS-30: CSS mobile-first apilado', () => {
    const css = fs.readFileSync(path.join(__dirname, 'DataTable.css'), 'utf8');
    const idx = css.indexOf('@media (min-width: 768px)');
    const base = css.slice(0, idx);
    const desktop = css.slice(idx);
    expect(base).toMatch(/\.ui-data-table__row\s*\{[^}]*display:\s*block/);
    expect(base).toMatch(/\.ui-data-table__cell\s*\{[^}]*display:\s*block/);
    expect(base).toMatch(/content:\s*attr\(data-label\)/);
    expect(desktop).toMatch(/display:\s*table-row;/);
    expect(desktop).toMatch(/display:\s*table-cell/);
    expect(desktop).toMatch(/::before\s*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/max-width:\s*\d+px\)/);
    expect(css).not.toMatch(/overflow-x/);
  });
});
