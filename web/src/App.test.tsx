import { render, screen } from '@testing-library/react';
import App from './App';

test('renders telescopio app', () => {
  render(<App />);
  const titleElement = screen.getByText(/TELESCOPIO/i);
  expect(titleElement).toBeInTheDocument();
});
