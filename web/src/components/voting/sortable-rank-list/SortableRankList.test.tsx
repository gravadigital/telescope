import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import SortableRankList from './SortableRankList';
import { formatFileSize } from '../../../domain';
import type { AssignedAttachment } from '../../../types';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const attachments: AssignedAttachment[] = [
  { id: 'f1', label: 'Propuesta 1', mime_type: 'application/pdf', file_size: 1048576, description: 'Logo' },
  { id: 'f2', label: 'Propuesta 2', mime_type: 'image/png', file_size: 524288, description: null },
  { id: 'f3', label: 'Propuesta 3', mime_type: DOCX, file_size: 2097152, description: null },
];

interface HarnessProps {
  initial?: string[];
  onChange?: (order: string[]) => void;
  onOpenFile?: (a: AssignedAttachment, n: number) => void;
  mode?: 'editable' | 'readonly';
}

const Harness: React.FC<HarnessProps> = ({
  initial = ['f1', 'f2', 'f3'],
  onChange,
  onOpenFile = jest.fn(),
  mode = 'editable',
}) => {
  const [order, setOrder] = React.useState(initial);
  return (
    <SortableRankList
      mode={mode}
      attachments={attachments}
      order={order}
      onChange={(next) => {
        setOrder(next);
        onChange?.(next);
      }}
      onOpenFile={onOpenFile}
    />
  );
};

describe('SortableRankList', () => {
  it('TS-11: muestra filas anónimas', () => {
    renderWithProviders(<Harness />);
    const list = screen.getByRole('list', { name: 'Tu ranking de propuestas' });
    expect(list).toBeInTheDocument();
    expect(screen.getByText('Propuesta 1')).toBeInTheDocument();
    expect(screen.getByText(`PDF · ${formatFileSize(1048576, 'es')}`)).toBeInTheDocument();
    expect(screen.getByText(`PNG · ${formatFileSize(524288, 'es')}`)).toBeInTheDocument();
    expect(screen.getByText(`DOCX · ${formatFileSize(2097152, 'es')}`)).toBeInTheDocument();
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Ver archivo/ })).toHaveLength(3);
    expect(screen.getByText('La mejor')).toBeInTheDocument();
    expect(screen.getByText('Intermedia')).toBeInTheDocument();
    expect(screen.getByText('La que menos')).toBeInTheDocument();
  });

  it('TS-12: "Propuesta N" sale del índice en la asignación, no de la posición', () => {
    renderWithProviders(<Harness initial={['f3', 'f1', 'f2']} />);
    const first = within(screen.getAllByRole('listitem')[0]);
    expect(first.getByText('1')).toBeInTheDocument();
    expect(first.getByText('Propuesta 3')).toBeInTheDocument();
    expect(first.getByText('La mejor')).toBeInTheDocument();
  });

  it('TS-13: bordes deshabilitados', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByRole('button', { name: 'Subir Propuesta 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar Propuesta 3' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar Propuesta 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Subir Propuesta 2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Bajar Propuesta 2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Subir Propuesta 3' })).toBeEnabled();
  });

  it('TS-14: mover cambia el orden, mantiene el foco y anuncia', () => {
    const onChange = jest.fn();
    const { container } = renderWithProviders(<Harness onChange={onChange} />);
    userEvent.click(screen.getByRole('button', { name: 'Bajar Propuesta 1' }));
    expect(onChange).toHaveBeenCalledWith(['f2', 'f1', 'f3']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bajar Propuesta 1' }));
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent('Propuesta 1 pasó a la posición 2');
  });

  it('TS-15: si el botón queda deshabilitado el foco pasa al otro de la fila', () => {
    const onChange = jest.fn();
    renderWithProviders(<Harness onChange={onChange} />);
    userEvent.click(screen.getByRole('button', { name: 'Subir Propuesta 2' }));
    expect(onChange).toHaveBeenCalledWith(['f2', 'f1', 'f3']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bajar Propuesta 2' }));
  });

  it('TS-16: funciona con teclado', () => {
    const onChange = jest.fn();
    renderWithProviders(<Harness onChange={onChange} />);
    const target = screen.getByRole('button', { name: 'Bajar Propuesta 1' });
    for (let i = 0; i < 10 && document.activeElement !== target; i++) userEvent.tab();
    expect(document.activeElement).toBe(target);
    userEvent.keyboard('{enter}');
    expect(onChange).toHaveBeenCalledWith(['f2', 'f1', 'f3']);
  });

  it('TS-17: Ver archivo informa la propuesta y su número', () => {
    const onOpenFile = jest.fn();
    renderWithProviders(<Harness onOpenFile={onOpenFile} />);
    userEvent.click(screen.getByRole('button', { name: 'Ver archivo de Propuesta 2' }));
    expect(onOpenFile).toHaveBeenCalledWith(attachments[1], 2);
  });

  it('TS-22: en solo lectura no hay ↑ ↓ pero sí Ver archivo', () => {
    renderWithProviders(<Harness mode="readonly" />);
    expect(screen.queryByRole('button', { name: /^Subir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Bajar/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Ver archivo/ })).toHaveLength(3);
    expect(screen.getByText('La mejor')).toBeInTheDocument();
  });

  it('TS-23: catálogo en inglés', () => {
    renderWithProviders(<Harness />, { locale: 'en' });
    expect(screen.getByText('Proposal 1')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
    expect(screen.getByText('Least')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move up Proposal 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View file of Proposal 1' })).toBeInTheDocument();
    expect(screen.queryByText('Propuesta 1')).not.toBeInTheDocument();
  });

  it('con disabled deshabilita todos los ↑ ↓', () => {
    renderWithProviders(
      <SortableRankList
        mode="editable"
        disabled
        attachments={attachments}
        order={['f1', 'f2', 'f3']}
        onChange={jest.fn()}
        onOpenFile={jest.fn()}
      />
    );
    screen.getAllByRole('button', { name: /^(Subir|Bajar)/ }).forEach((b) => expect(b).toBeDisabled());
  });
});

describe('SortableRankList.css (TS-45, mobile 375px)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const css: string = require('fs').readFileSync(`${__dirname}/SortableRankList.css`, 'utf8');
  const base = css.split('@media')[0];

  it('la regla base es de ancho completo y sin anchos fijos', () => {
    expect(base).toMatch(/\.srl-list__item\s*\{[^}]*width:\s*100%/);
    expect(base).not.toMatch(/(^|[^-])max-width/);
    expect(base).not.toMatch(/(^|[\s;{])width:\s*\d+px/);
  });

  it('los botones ↑ ↓ miden al menos 44px sin media query', () => {
    expect(base).toMatch(/\.srl-list__moves \.ui-button\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/);
  });
});
