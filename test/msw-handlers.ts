// test/msw-handlers.ts
import { http, HttpResponse } from 'msw';
import { mockUser, mockRepos, mockPassed, mockWorkflowRunsResponse } from './fixtures';

export const handlers = [
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json(mockUser);
  }),

  http.get('https://api.github.com/user/repos', () => {
    return HttpResponse.json(mockRepos);
  }),

  http.get('https://api.github.com/repos/:owner/:repo/actions/runs', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('status') === 'completed') {
      return HttpResponse.json({
        total_count: 3,
        workflow_runs: [
          { ...mockPassed, id: 201, run_started_at: '2026-04-18T09:00:00Z', updated_at: '2026-04-18T09:02:30Z' },
          { ...mockPassed, id: 202, run_started_at: '2026-04-17T14:00:00Z', updated_at: '2026-04-17T14:03:00Z' },
          { ...mockPassed, id: 203, run_started_at: '2026-04-16T10:00:00Z', updated_at: '2026-04-16T10:01:45Z' },
        ],
      });
    }
    return HttpResponse.json(mockWorkflowRunsResponse);
  }),

  http.get('https://api.github.com/repos/:owner/:repo/actions/workflows/:workflowId/runs', () => {
    return HttpResponse.json({
      total_count: 3,
      workflow_runs: [
        { ...mockPassed, id: 201, run_started_at: '2026-04-18T09:00:00Z', updated_at: '2026-04-18T09:02:30Z' },
        { ...mockPassed, id: 202, run_started_at: '2026-04-17T14:00:00Z', updated_at: '2026-04-17T14:03:00Z' },
        { ...mockPassed, id: 203, run_started_at: '2026-04-16T10:00:00Z', updated_at: '2026-04-16T10:01:45Z' },
      ],
    });
  }),

  http.get('https://api.github.com/repos/:owner/:repo/actions/runs/:runId/jobs', () => {
    return HttpResponse.json({
      total_count: 2,
      jobs: [
        {
          id: 1001,
          name: 'build',
          status: 'completed',
          conclusion: 'success',
          started_at: '2026-04-18T10:30:10Z',
          completed_at: '2026-04-18T10:31:20Z',
          html_url: 'https://github.com/testuser/api-server/actions/runs/100/job/1001',
          steps: [
            { name: 'Checkout', status: 'completed', conclusion: 'success', number: 1 },
            { name: 'Install', status: 'completed', conclusion: 'success', number: 2 },
            { name: 'Build', status: 'completed', conclusion: 'success', number: 3 },
          ],
        },
        {
          id: 1002,
          name: 'test',
          status: 'in_progress',
          conclusion: null,
          started_at: '2026-04-18T10:31:25Z',
          completed_at: null,
          html_url: 'https://github.com/testuser/api-server/actions/runs/100/job/1002',
          steps: [
            { name: 'Checkout', status: 'completed', conclusion: 'success', number: 1 },
            { name: 'Install', status: 'completed', conclusion: 'success', number: 2 },
            { name: 'Run tests', status: 'in_progress', conclusion: null, number: 3 },
          ],
        },
      ],
    });
  }),

  http.post('https://api.github.com/repos/:owner/:repo/actions/runs/:runId/rerun', () => {
    return new HttpResponse(null, { status: 201 });
  }),

  http.post('https://github.com/login/oauth/access_token', () => {
    return HttpResponse.json({
      access_token: 'gho_mock_token_abc123',
      token_type: 'bearer',
      scope: 'repo',
    });
  }),
];
