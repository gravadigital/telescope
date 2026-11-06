import fs from 'fs';
import path from 'path';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { INSTAGRAM_OPEN_DELAY_MS } from '../../../domain/eventDetail';
import ShareDialog from './ShareDialog';
import type { ShareDialogProps } from './ShareDialog';

const URL_E1 = 'http://localhost/events/e-1';

const baseProps: ShareDialogProps = {
  open: true,
  eventId: 'e-1',
  eventName: 'Concurso de afiches',
  stage: 'participation',
  onClose: jest.fn(),
};

const setClipboard = (value: unknown): void => {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
};

const setShare = (value: unknown): void => {
  Object.defineProperty(navigator, 'share', { value, configurable: true, writable: true });
};

const setUserAgent = (value: string): void => {
  Object.defineProperty(navigator, 'userAgent', { value, configurable: true });
};

const DEFAULT_UA = navigator.userAgent;

const renderDialog = (props: Partial<ShareDialogProps> = {}, locale: 'es' | 'en' = 'es') =>
  renderWithProviders(<ShareDialog {...baseProps} {...props} />, { locale });

describe('ShareDialog', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    setShare(undefined);
    baseProps.onClose = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    setUserAgent(DEFAULT_UA);
    Reflect.deleteProperty(document, 'execCommand');
    Reflect.deleteProperty(window, 'open');
  });

  it('TS-26: render con enlace, eyebrow y foco en Copiar', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Concurso de afiches' });
    expect(within(dialog).getByText('Compartir')).toBeInTheDocument();
    expect(screen.getByText('Quien abra el enlace verá el evento y podrá inscribirse.')).toBeInTheDocument();
    const link = screen.getByRole('textbox', { name: 'Enlace del evento' });
    expect(link).toHaveValue(URL_E1);
    expect(link).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Copiar' })).toHaveFocus();
  });

  it('TS-27: copiar muestra "✓ Copiado" 2 s y lo anuncia', async () => {
    renderDialog();
    userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(await screen.findByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(URL_E1);
    expect(screen.getByRole('status')).toHaveTextContent('✓ Copiado');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('TS-28: si la copia falla avisa y deja el enlace seleccionado', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    renderDialog();
    userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(
      await screen.findByText('No pudimos copiar el enlace. Selecciónalo y cópialo a mano.')
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No pudimos copiar el enlace');
    const link = screen.getByRole('textbox', { name: 'Enlace del evento' }) as HTMLInputElement;
    expect(link).toHaveFocus();
    expect(link.selectionStart).toBe(0);
    expect(link.selectionEnd).toBe(URL_E1.length);
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });

  it('TS-28: sin navigator.clipboard también avisa', async () => {
    setClipboard(undefined);
    renderDialog();
    userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(await screen.findByText(/No pudimos copiar el enlace/)).toBeInTheDocument();
  });

  it('TS-28: sin clipboard API usa execCommand de respaldo', async () => {
    setClipboard(undefined);
    const exec = jest.fn(() => true);
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true });
    renderDialog();
    userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(await screen.findByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();
    expect(exec).toHaveBeenCalledWith('copy');
    expect(screen.queryByText(/No pudimos copiar el enlace/)).toBeNull();
  });

  it('TS-29: redes con nombre accesible y destinos', () => {
    renderDialog();
    expect(screen.getByText('o enviarlo por')).toBeInTheDocument();
    const names = ['WhatsApp', 'X', 'LinkedIn', 'Facebook', 'Instagram', 'Email'];
    const links = names.map((n) => screen.getByRole('link', { name: `Compartir por ${n}` }));
    expect(links[0]).toHaveAttribute(
      'href',
      `https://wa.me/?text=Concurso%20de%20afiches%0A${encodeURIComponent(URL_E1)}`
    );
    expect(links[4]).toHaveAttribute('href', 'https://www.instagram.com/direct/inbox/');
    expect(links[5]).toHaveAttribute(
      'href',
      `mailto:?subject=Concurso%20de%20afiches&body=${encodeURIComponent(URL_E1)}`
    );
    links.slice(0, 5).forEach((l) => {
      expect(l).toHaveAttribute('target', '_blank');
      expect(l).toHaveAttribute('rel', 'noopener noreferrer');
    });
    expect(links[5]).not.toHaveAttribute('target');
  });

  it('TS-29: Instagram copia el enlace al abrir', async () => {
    renderDialog();
    const instagram = screen.getByRole('link', { name: 'Compartir por Instagram' });
    userEvent.click(instagram);
    expect(await screen.findByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(URL_E1);
    expect(screen.getByRole('status')).toHaveTextContent('✓ Copiado');
    expect(instagram).toHaveAttribute('target', '_blank');
  });

  it('TS-29: en celular Instagram abre el "Enviar a…" con el link cargado', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    renderDialog();
    const instagram = screen.getByRole('link', { name: 'Compartir por Instagram' });
    expect(instagram).toHaveAttribute(
      'href',
      `instagram://sharesheet?text=${encodeURIComponent(URL_E1)}`
    );
    userEvent.click(instagram);
    expect(await screen.findByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(URL_E1);
  });

  it('TS-29: en Android Instagram recibe el link por intent de ACTION_SEND', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36');
    renderDialog();
    expect(screen.getByRole('link', { name: 'Compartir por Instagram' })).toHaveAttribute(
      'href',
      `intent://#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=${URL_E1};package=com.instagram.android;end`
    );
  });

  it('TS-29: al compartir por Instagram avisa con un toast que el enlace quedó copiado', async () => {
    renderDialog();
    userEvent.click(screen.getByRole('link', { name: 'Compartir por Instagram' }));
    expect(await screen.findByText('Enlace copiado')).toBeInTheDocument();
    expect(screen.getByText('Pegalo en el chat de Instagram para mandarlo.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(URL_E1);
  });

  it('TS-29: en escritorio Instagram espera 2,5 s desde el aviso antes de abrirse', async () => {
    const open = jest.fn(() => ({} as unknown as Window));
    Object.defineProperty(window, 'open', { value: open, configurable: true });
    renderDialog();
    userEvent.click(screen.getByRole('link', { name: 'Compartir por Instagram' }));
    expect(await screen.findByText('Enlace copiado')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(INSTAGRAM_OPEN_DELAY_MS - 1);
    });
    expect(open).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(open).toHaveBeenCalledWith('https://www.instagram.com/direct/inbox/', '_blank');
  });

  it('TS-29: opciones sociales cuadradas con iconos de tamaño fijo', () => {
    const css = fs.readFileSync(path.join(__dirname, 'ShareDialog.css'), 'utf8');
    expect(css).toMatch(/\.ev-share-dialog__network\s*\{[^}]*aspect-ratio:\s*1/);
    expect(css).toMatch(/\.ev-share-dialog__network-icon-frame\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px/);
    expect(css).not.toMatch(/\.ev-share-dialog__network-name\s*\{[^}]*min-height:/);
    expect(css).toMatch(/\.ev-share-dialog__network-name\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).not.toMatch(/\.ev-share-dialog__network-name\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });

  it('TS-30: texto según la etapa', () => {
    const { unmount } = renderDialog({ stage: 'voting' });
    expect(screen.getByText('Quien abra el enlace verá el evento.')).toBeInTheDocument();
    unmount();
    renderDialog({ stage: 'results' });
    expect(
      screen.getByText('Quien abra el enlace verá los resultados, aunque no tenga cuenta.')
    ).toBeInTheDocument();
  });

  it('TS-31: "Más opciones" abre el menú nativo', () => {
    const share = jest.fn().mockResolvedValue(undefined);
    setShare(share);
    renderDialog();
    userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    expect(share).toHaveBeenCalledWith({ title: 'Concurso de afiches', url: URL_E1 });
  });

  it('TS-32: sin menú nativo no hay botón; cancelar no muestra error', async () => {
    const { unmount } = renderDialog();
    expect(screen.queryByRole('button', { name: 'Más opciones' })).toBeNull();
    unmount();

    const share = jest.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    setShare(share);
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    renderDialog();
    userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
    errorLog.mockRestore();
  });

  it('TS-33: Cerrar y Escape llaman a onClose', () => {
    renderDialog();
    userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    userEvent.keyboard('{esc}');
    expect(baseProps.onClose).toHaveBeenCalledTimes(2);
  });

  it('TS-34: en inglés', () => {
    renderDialog({}, 'en');
    expect(screen.getByRole('textbox', { name: 'Event link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share via WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share via Instagram' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
