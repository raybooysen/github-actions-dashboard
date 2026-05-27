// src/components/SummaryBar.tsx
import type { GitHubWorkflowRun } from '@/lib/github-types';
import { isQueuedStatus } from '@/lib/status-utils';

export type SummaryBarProps = {
  runs: GitHubWorkflowRun[];
}

type CountItem = {
  testId: string;
  label: string;
  count: number;
  dotClass: string;
  pulse: boolean;
}

const computeCounts = (runs: GitHubWorkflowRun[]): CountItem[] => {
  let running = 0;
  let queued = 0;
  let passed = 0;
  let failed = 0;

  for (const run of runs) {
    if (run.status === 'in_progress') {
      running++;
    } else if (isQueuedStatus(run.status)) {
      queued++;
    } else if (run.conclusion === 'success') {
      passed++;
    } else if (run.conclusion === 'failure') {
      failed++;
    }
  }

  return [
    { testId: 'summary-running', label: 'Running', count: running, dotClass: 'bg-status-running', pulse: true },
    { testId: 'summary-queued', label: 'Queued', count: queued, dotClass: 'bg-status-queued', pulse: false },
    { testId: 'summary-passed', label: 'Passed', count: passed, dotClass: 'bg-status-success', pulse: false },
    { testId: 'summary-failed', label: 'Failed', count: failed, dotClass: 'bg-status-failure', pulse: false },
  ];
}

export const SummaryBar = ({ runs }: SummaryBarProps) => {
  const items = computeCounts(runs);

  return (
    <div
      data-testid="summary-bar"
      aria-live="polite"
      role="region"
      aria-label="Workflow run summary"
      className="flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-2 px-1 py-2"
    >
      {items.map((item) => (
        <div
          key={item.testId}
          data-testid={item.testId}
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${item.dotClass}${item.pulse ? ' animate-pulse' : ''}`}
          />
          <span className="font-mono font-semibold tabular-nums text-sm">
            {item.count}
          </span>
          <span className="text-sm text-ink-secondary">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
