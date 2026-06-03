import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChipStack } from './ChipStack';

describe('ChipStack', () => {
  it('displays amount with $ prefix', () => {
    render(<ChipStack amount={500} />);
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('formats large numbers with locale separators', () => {
    render(<ChipStack amount={1500} />);
    expect(screen.getByText('$1,500')).toBeInTheDocument();
  });

  it('displays zero amount', () => {
    render(<ChipStack amount={0} />);
    expect(screen.getByText('$0')).toBeInTheDocument();
  });
});
