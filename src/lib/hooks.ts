import { useState, useEffect, useRef } from 'react';

/**
 * A hook that ensures a loading state persists for at least a minimum duration
 * to prevent UI flickering for fast operations.
 * 
 * @param isLoading The actual loading state
 * @param minDuration Minimum duration in ms to show loading state (default: 150ms)
 * @returns A boolean that stays true for at least minDuration
 */
export function useMinLoadingTime(isLoading: boolean, minDuration: number = 150) {
  const [showLoading, setShowLoading] = useState(isLoading);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setShowLoading(true);
    } else {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = minDuration - elapsed;

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false);
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        setShowLoading(false);
      }
    }
  }, [isLoading, minDuration]);

  return showLoading;
}
