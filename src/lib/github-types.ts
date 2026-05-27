// src/lib/github-types.ts

export type GitHubUser = {
  login: string;
  avatar_url: string;
  name: string | null;
}

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  archived: boolean;
  pushed_at: string;
  html_url: string;
}

export type WorkflowRunStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'waiting'
  | 'pending'
  | 'requested';

export type WorkflowRunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | 'stale'
  | null;

export type GitHubWorkflowRun = {
  id: number;
  workflow_id: number;
  name: string;
  display_title: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  head_branch: string;
  head_sha: string;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  html_url: string;
  run_number: number;
  head_commit: {
    message: string;
    author: { name: string };
  } | null;
  triggering_actor: {
    login: string;
    avatar_url: string;
  } | null;
  pull_requests: { number: number; url: string }[];
}

export type GitHubWorkflowRunsResponse = {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
}

export type GitHubJob = {
  id: number;
  name: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: GitHubStep[];
}

export type GitHubStep = {
  name: string;
  status: 'completed' | 'in_progress' | 'queued';
  conclusion: WorkflowRunConclusion;
  number: number;
}

export type GitHubJobsResponse = {
  total_count: number;
  jobs: GitHubJob[];
}

export type StatusFilter = 'all' | 'running' | 'failed' | 'passed' | 'queued';
