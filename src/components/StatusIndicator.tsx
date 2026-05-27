// src/components/StatusIndicator.tsx
import { resolveStatus } from '@/lib/status-utils';
import type { WorkflowRunStatus, WorkflowRunConclusion } from '@/lib/github-types';

export type StatusIndicatorProps = {
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
}

export const StatusIndicator = ({ status, conclusion }: StatusIndicatorProps) => {
  const { label, dotClass, pulse } = resolveStatus(status, conclusion);

  return (
    <span
      data-testid="status-indicator"
      className="inline-flex items-center"
      aria-label={label}
    >
      <span
        data-testid="status-dot"
        aria-hidden="true"
        className={`h-3 w-3 rounded-full ${dotClass}${pulse ? ' animate-pulse' : ''}`}
      />
    </span>
  );
}
