// src/lib/time.ts

export const formatDuration = (startedAt: string, endedAt?: string): string => {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const totalSeconds = Math.floor((end - start) / 1000);

  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) return `${minutes}m ${seconds}s`;

  // For durations of 1h+ we intentionally drop the trailing seconds: at that
  // scale, sub-minute precision is noise and would crowd the workflow row.
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export const formatRelativeTime = (dateString: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
