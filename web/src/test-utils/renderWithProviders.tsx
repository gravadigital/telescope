import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nProvider';
import type { Locale } from '../i18n/types';
import { useAuth } from '../context/AuthContext';
import type { AuthContextType, User } from '../types';

export const sampleUser: User = {
  id: 'u-1',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  role: 'participant',
  joinedEventIDs: [],
  createdEventIDs: [],
};

export const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

export interface ProviderOptions {
  locale?: Locale;
  /** Valores para el `useAuth` mockeado (el test debe hacer `jest.mock('.../context/AuthContext')`). */
  auth?: Partial<AuthContextType>;
  route?: string;
}

export const buildAuth = (auth: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  token: null,
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  joinEvent: jest.fn(),
  isAuthenticated: false,
  loading: false,
  ...auth,
});

export const renderWithProviders = (
  ui: React.ReactElement,
  { locale = 'es', auth, route = '/' }: ProviderOptions = {}
): RenderResult & { auth: AuthContextType } => {
  const authValue = buildAuth({ isAuthenticated: Boolean(auth?.user), ...auth });
  if (jest.isMockFunction(useAuth)) {
    (useAuth as jest.Mock).mockReturnValue(authValue);
  }
  const result = render(
    <I18nProvider initialLocale={locale}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
        <LocationDisplay />
      </MemoryRouter>
    </I18nProvider>
  );
  return Object.assign(result, { auth: authValue });
};
