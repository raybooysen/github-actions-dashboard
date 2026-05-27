import type { ReactNode } from 'react';

/**
 * Clickable link that opens GitHub in a new tab.
 * Stops propagation so parent onClick handlers (like expansion) don't fire.
 */
export const GhLink = ({ href, children, className = '', title }: {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`hover:underline hover:text-status-running ${className}`}
      title={title}
    >
      {children}
    </a>
  );
};
