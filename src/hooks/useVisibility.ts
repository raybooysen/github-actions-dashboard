// src/hooks/useVisibility.ts
import { useEffect, useState, type RefObject } from 'react';

/**
 * Returns `true` when the referenced element is within (or near) the viewport.
 *
 * Uses a 200px rootMargin so elements slightly off-screen are still
 * considered visible, enabling pre-fetching before they scroll into view.
 */
export const useVisibility = (ref: RefObject<HTMLElement | null>): boolean => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '200px' },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isVisible;
}
