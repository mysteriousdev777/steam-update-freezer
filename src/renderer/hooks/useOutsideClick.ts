import { useEffect, useRef, type RefObject } from 'react';

/**
 * Closes a popover/dropdown on an outside click: calls `onOutsideClick` when a mousedown lands
 * outside `ref`. Only listens while `isActive` is true, so a closed menu attaches no listener.
 */
export const useOutsideClick = <T extends HTMLElement>(
  ref: RefObject<T | null>,
  isActive: boolean,
  onOutsideClick: () => void,
): void => {
  // Keep the latest callback in a ref so the listener isn't re-subscribed on every render (e.g.
  // GameSelect re-renders on each keystroke while open).
  const callbackRef = useRef(onOutsideClick);
  callbackRef.current = onOutsideClick;

  useEffect(() => {
    if (!isActive) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [ref, isActive]);
};
