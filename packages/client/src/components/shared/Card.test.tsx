import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders a face-down card when faceDown is true', () => {
    render(<Card faceDown />);
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
  });

  it('renders a face-down card when no rank/suit provided', () => {
    render(<Card />);
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
  });

  it('renders rank and suit for a face-up card', () => {
    render(<Card rank="A" suit="spades" />);
    const card = screen.getByLabelText('A of spades');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('A');
    expect(card).toHaveTextContent('♠');
  });

  it('renders red color for hearts', () => {
    render(<Card rank="K" suit="hearts" />);
    const card = screen.getByLabelText('K of hearts');
    expect(card).toHaveClass('text-red-500');
    expect(card).toHaveTextContent('♥');
  });

  it('renders red color for diamonds', () => {
    render(<Card rank="Q" suit="diamonds" />);
    const card = screen.getByLabelText('Q of diamonds');
    expect(card).toHaveClass('text-red-500');
    expect(card).toHaveTextContent('♦');
  });

  it('renders dark color for clubs', () => {
    render(<Card rank="J" suit="clubs" />);
    const card = screen.getByLabelText('J of clubs');
    expect(card).toHaveClass('text-gray-100');
    expect(card).toHaveTextContent('♣');
  });

  it('renders dark color for spades', () => {
    render(<Card rank="10" suit="spades" />);
    const card = screen.getByLabelText('10 of spades');
    expect(card).toHaveClass('text-gray-100');
    expect(card).toHaveTextContent('♠');
  });

  it('has minimum 44px dimensions for touch targets', () => {
    render(<Card rank="5" suit="hearts" />);
    const card = screen.getByLabelText('5 of hearts');
    expect(card).toHaveClass('min-w-[44px]');
    expect(card).toHaveClass('min-h-[44px]');
  });
});
