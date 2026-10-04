import React from 'react';
import fs from 'fs';
import path from 'path';
import { screen, within } from '@testing-library/react';
import AuthLayout from './AuthLayout';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

describe('AuthLayout', () => {
  it('TS-8: estructura', () => {
    renderWithProviders(
      <AuthLayout
        brandTitle="Vuelve a donde dejaste tus eventos."
        benefits={['Uno', 'Dos', 'Tres']}
        backLink={{ to: '/', label: '← Volver al inicio' }}
        title="Iniciar sesión"
      >
        <p>contenido</p>
      </AuthLayout>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveTextContent('TELESCOPIO');
    expect(screen.getByRole('heading', { level: 2, name: 'Vuelve a donde dejaste tus eventos.' })).toBeInTheDocument();
    expect(within(aside).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: '← Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('TS-9: sin beneficios ni link; el ref apunta al h1', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    renderWithProviders(
      <AuthLayout brandTitle="Ya casi estás." title="Elige tu nombre" headingRef={ref}>
        <p>x</p>
      </AuthLayout>
    );
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(ref.current).toBe(screen.getByRole('heading', { level: 1 }));
  });

  it('TS-10: CSS mobile-first, 5/12 + 7/12 desde 768px', () => {
    const css = fs.readFileSync(path.join(__dirname, 'AuthLayout.css'), 'utf8');
    const mediaIndex = css.indexOf('@media (min-width: 768px)');
    expect(mediaIndex).toBeGreaterThan(-1);
    const base = css.slice(0, mediaIndex);
    const desktop = css.slice(mediaIndex);
    expect(base).toMatch(/\.ly-auth__benefits\s*\{[^}]*display:\s*none/);
    expect(base).toMatch(/\.ly-auth\s*\{[^}]*flex-direction:\s*column/);
    expect(desktop).toMatch(/\.ly-auth__benefits\s*\{[^}]*display:\s*flex/);
    expect(desktop).toMatch(/grid-template-columns:\s*5fr 7fr/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
  });
});
