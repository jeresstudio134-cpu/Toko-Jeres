import React, { useState, useEffect } from 'react';

interface DelayedFallbackProps {
  delay?: number;
}

export const DelayedFallback: React.FC<DelayedFallbackProps> = ({ delay = 300 }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-1/3"></div>
      <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-2xl"></div>
      <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-2xl"></div>
    </div>
  );
};
