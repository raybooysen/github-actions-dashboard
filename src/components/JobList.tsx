'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/lib/github-client';
import { formatDuration } from '@/lib/time';
import { StatusIndicator } from './StatusIndicator';
import { ElapsedTimer } from './ElapsedTimer';
import type { GitHubJob } from '@/lib/github-types';
import { useAuth } from '@/hooks/useAuth';
import { computeJobSummary, formatJobSummary } from '@/lib/job-summary';

type JobListProps = {
  owner: string;
  repo: string;
  runId: number;
}

const JobRow = ({ job }: { job: GitHubJob }) => {
  const isActive = job.status === 'in_progress';
  const duration =
    job.started_at && job.completed_at
      ? formatDuration(job.started_at, job.completed_at)
      : null;

  return (
    <a
      href={job.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-1.5 px-3 hover:bg-surface-raised active:bg-surface-raised rounded transition-colors"
      title={`View job "${job.name}" on GitHub`}
    >
      <span className="text-ink-muted text-xs">└</span>
      <StatusIndicator status={job.status} conclusion={job.conclusion} />
      <span className="text-sm text-ink truncate flex-1 hover:underline">{job.name}</span>
      {isActive && job.started_at ? (
        <ElapsedTimer startedAt={job.started_at} />
      ) : duration ? (
        <span className="text-xs font-mono tabular-nums text-ink-muted">
          {duration}
        </span>
      ) : null}
      <span className="text-[11px] text-ink-muted">↗</span>
    </a>
  );
}

export const JobList = ({ owner, repo, runId }: JobListProps) => {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', owner, repo, runId],
    queryFn: () => fetchJobs(token!, owner, repo, runId),
    enabled: !!token,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="py-2 px-3 space-y-2 animate-pulse">
        <div className="h-6 w-40 rounded bg-ink/5" />
        <div className="h-6 w-32 rounded bg-ink/5" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-2 px-3 text-xs text-ink-muted">
        Failed to load jobs
      </div>
    );
  }

  const summary = computeJobSummary(data.jobs);

  return (
    <div className="border-t border-edge/50 bg-canvas/50 rounded-b-lg py-1">
      <div className="px-4 py-2 text-xs text-ink-secondary border-b border-edge/30 font-mono">
        {summary.total} jobs: {formatJobSummary(summary)}
      </div>
      {data.jobs.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </div>
  );
}
