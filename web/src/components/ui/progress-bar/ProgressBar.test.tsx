import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('TS-56: expone los atributos ARIA', () => {
    render(<ProgressBar value={13} max={20} label="13 / 20" valueText="13 de 20 lugares ocupados" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '13');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '20');
    expect(bar).toHaveAttribute('aria-valuetext', '13 de 20 lugares ocupados');
    expect(screen.getByText('13 / 20')).toBeInTheDocument();
  });
});
