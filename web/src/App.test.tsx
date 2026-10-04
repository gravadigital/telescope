import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
    jest.spyOn(window.navigator, 'languages', 'get').mockReturnValue([]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('TS-65: smoke de la app con la barra nueva', async () => {
    render(<App />);
    expect(screen.getAllByText(/TELESCOPIO/i).length).toBeGreaterThan(0);
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    ['Home', 'Events', 'How it works'].forEach((name) =>
      expect(nav).toHaveTextContent(name)
    );
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByText('About')).toBeNull();
    expect(screen.queryByText('See Demo')).toBeNull();
  });
});
