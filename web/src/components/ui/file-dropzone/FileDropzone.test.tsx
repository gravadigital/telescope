import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileDropzone, { FileDropzoneLabels, FileDropzoneProps } from './FileDropzone';

const labels: FileDropzoneLabels = {
  prompt: 'Arrastrá tu archivo acá o',
  promptAction: 'elegilo desde tu equipo',
  formats: 'JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX · hasta 10 MB',
  ready: 'listo para enviar',
  change: 'Cambiar',
  changeAccessible: 'Cambiar archivo {name}',
  submittedOn: 'Enviada el {date}',
  replace: 'Reemplazar archivo',
};

const setup = (over: Partial<FileDropzoneProps> = {}) => {
  const handlers = { onSelect: jest.fn(), onReject: jest.fn(), onClear: jest.fn() };
  const utils = render(<FileDropzone labels={labels} locale="es" {...handlers} {...over} />);
  return { ...handlers, ...utils };
};

const pdf = () => new File(['x'], 'propuesta.pdf', { type: 'application/pdf' });

describe('FileDropzone', () => {
  it('TS-44: archivo válido', () => {
    const { onSelect, onReject } = setup();
    const input = screen.getByLabelText(/Arrastrá tu archivo/) as HTMLInputElement;
    const file = pdf();
    userEvent.upload(input, file);
    expect(onSelect).toHaveBeenCalledWith(file);
    expect(onReject).not.toHaveBeenCalled();
    const accept = input.getAttribute('accept') ?? '';
    expect(accept).toContain('application/pdf');
    expect(accept).toContain('.docx');
    expect(accept.split(',').filter((p) => p.includes('/'))).toHaveLength(8);
  });

  it('TS-45: demasiado grande', () => {
    const { onSelect, onReject } = setup();
    const file = pdf();
    Object.defineProperty(file, 'size', { value: 10485761 });
    userEvent.upload(screen.getByLabelText(/Arrastrá tu archivo/), file);
    expect(onReject).toHaveBeenCalledWith('too_large');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('TS-46: tipo no permitido', () => {
    const { onSelect, onReject } = setup();
    const file = new File(['x'], 'setup.exe', { type: 'application/x-msdownload' });
    fireEvent.change(screen.getByLabelText(/Arrastrá tu archivo/), { target: { files: [file] } });
    expect(onReject).toHaveBeenCalledWith('invalid_type');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('TS-47: varios archivos arrastrados', () => {
    const { onSelect, onReject, container } = setup();
    const zone = container.querySelector('.ui-file-dropzone__zone') as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: { files: [pdf(), pdf()] } });
    expect(onReject).toHaveBeenCalledWith('multiple');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('un archivo soltado válido se selecciona', () => {
    const { onSelect, container } = setup();
    const zone = container.querySelector('.ui-file-dropzone__zone') as HTMLElement;
    const file = pdf();
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('TS-48: error visible dentro de la zona', () => {
    setup({ error: 'El archivo supera los 10 MB.' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('El archivo supera los 10 MB.');
    expect(screen.getByLabelText(/Arrastrá tu archivo/)).toHaveAttribute('aria-describedby', alert.id);
  });

  it('TS-49: FileChip con archivo elegido', () => {
    const file = pdf();
    Object.defineProperty(file, 'size', { value: 2516582 });
    const { onClear } = setup({ file });
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('propuesta.pdf')).toBeInTheDocument();
    expect(screen.getByText('2,4 MB')).toBeInTheDocument();
    expect(screen.getByText('listo para enviar')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Cambiar archivo propuesta.pdf' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('TS-50: enviado, reemplazo y deshabilitado', () => {
    const { unmount } = setup({ submitted: { name: 'propuesta.pdf', size: 2516582, date: '2026-10-02' } });
    expect(screen.getByText('Enviada el 2 oct 2026')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Reemplazar archivo' }));
    expect(screen.getByLabelText(/Arrastrá tu archivo/)).toBeInTheDocument();
    unmount();

    setup({ disabled: true });
    expect(screen.getByLabelText(/Arrastrá tu archivo/)).toBeDisabled();
  });

  it('uploading deshabilita "Cambiar"', () => {
    setup({ file: pdf(), uploading: true });
    expect(screen.getByRole('button', { name: 'Cambiar archivo propuesta.pdf' })).toBeDisabled();
  });

  describe('reemplazo (S-015)', () => {
    const submitted = { name: 'afiche.pdf', size: 2516582, date: '2026-10-03' };

    it('TS-20: "Cambiar" durante un reemplazo vuelve a la zona, no a la ficha enviada', () => {
      const { rerender, onSelect, onClear } = setup({ submitted });
      userEvent.click(screen.getByRole('button', { name: 'Reemplazar archivo' }));
      const file = pdf();
      userEvent.upload(screen.getByLabelText(/Arrastrá tu archivo/), file);
      expect(onSelect).toHaveBeenCalledWith(file);

      rerender(<FileDropzone labels={labels} locale="es" submitted={submitted} file={file} onSelect={onSelect} onClear={onClear} />);
      userEvent.click(screen.getByRole('button', { name: 'Cambiar archivo propuesta.pdf' }));
      rerender(<FileDropzone labels={labels} locale="es" submitted={submitted} file={null} onSelect={onSelect} onClear={onClear} />);

      expect(screen.getByLabelText(/Arrastrá tu archivo/)).toBeInTheDocument();
      expect(screen.queryByText(/Enviada el/)).not.toBeInTheDocument();
    });

    it('TS-21: onReplace se llama una vez y se ve la zona', () => {
      const onReplace = jest.fn();
      setup({ submitted, onReplace });
      userEvent.click(screen.getByRole('button', { name: 'Reemplazar archivo' }));
      expect(onReplace).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(/Arrastrá tu archivo/)).toBeInTheDocument();
    });

    it('TS-22: un submitted nuevo reinicia el reemplazo', () => {
      const handlers = { onSelect: jest.fn(), onClear: jest.fn() };
      const { rerender } = render(<FileDropzone labels={labels} locale="es" submitted={submitted} {...handlers} />);
      userEvent.click(screen.getByRole('button', { name: 'Reemplazar archivo' }));
      rerender(
        <FileDropzone
          labels={labels}
          locale="es"
          submitted={{ name: 'propuesta.pdf', size: 1000, date: '2026-10-05' }}
          file={null}
          {...handlers}
        />
      );
      expect(screen.getByText('propuesta.pdf')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reemplazar archivo' })).toBeInTheDocument();
    });
  });
});
