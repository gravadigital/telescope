import { render, screen } from '@testing-library/react';
import App from './App';

test('renders telescopio app', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/TELESCOPIO/i);
  expect(titleElements.length).toBeGreaterThan(0);
});
