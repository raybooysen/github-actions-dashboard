// src/components/Sparkline.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4, 5]} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders nothing for empty values', () => {
    const { container } = render(<Sparkline values={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for single value', () => {
    const { container } = render(<Sparkline values={[5]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a polyline path for multiple values', () => {
    const { container } = render(<Sparkline values={[10, 20, 15, 30, 25]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute('points')).toBeTruthy();
  });

  it('highlights the last point if it exceeds the average by 50%', () => {
    const { container } = render(<Sparkline values={[10, 10, 10, 10, 30]} />);
    const circles = container.querySelectorAll('circle');
    // Should have a warning dot on the last point (30 is 3x the avg of ~14)
    expect(circles.length).toBeGreaterThan(0);
  });
});
