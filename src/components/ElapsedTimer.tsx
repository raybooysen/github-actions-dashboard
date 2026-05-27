// src/components/ElapsedTimer.tsx
'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/time';

export type ElapsedTimerProps = {
  startedAt: string;
}

export const ElapsedTimer = ({ startedAt }: ElapsedTimerProps) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsed = formatDuration(startedAt);

  return (
    <time
      data-testid="elapsed-timer"
      dateTime={startedAt}
      className="font-mono text-sm tabular-nums"
    >
      {elapsed}
    </time>
  );
}
