import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GhLink } from './GhLink';
import React from 'react';

describe('GhLink', () => {
  it('renders a link with correct href and target', () => {
    render(<GhLink href="https://github.com/test">Test Link</GhLink>);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/test');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('Test Link');
  });

  it('stops propagation on click', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <GhLink href="https://github.com/test">Test Link</GhLink>
      </div>
    );
    
    const link = screen.getByRole('link');
    fireEvent.click(link);
    
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<GhLink href="#" className="custom-class">Link</GhLink>);
    const link = screen.getByRole('link');
    expect(link.className).toContain('custom-class');
  });

  it('applies title attribute', () => {
    render(<GhLink href="#" title="Link Title">Link</GhLink>);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('title', 'Link Title');
  });
});
