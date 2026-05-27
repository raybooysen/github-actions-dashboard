import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';

// ---------------------------------------------------------------------------
// Design tokens (matching the app's zinc theme from globals.css)
// ---------------------------------------------------------------------------
const colors = {
  canvas: '#fafafa',
  surface: '#ffffff',
  surfaceRaised: '#f4f4f5',
  ink: '#18181b',
  inkSecondary: '#52525b',
  inkMuted: '#a1a1aa',
  edge: '#e4e4e7',
  success: '#48a858',
  failure: '#d64545',
  running: '#3b82f6',
  queued: '#d4a017',
  cancelled: '#71717a',
};

const fontFamily =
  'Geist, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const monoFamily =
  'Geist Mono, ui-monospace, "Cascadia Code", "Fira Code", monospace';

// Shadows matching Tailwind shadow-sm / shadow-md
const shadowSm = '0 1px 2px rgba(24,24,27,0.04)';
const shadowMd = '0 4px 12px rgba(24,24,27,0.06), 0 1px 3px rgba(24,24,27,0.04)';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
type RepoRow = {
  name: string;
  branch: string;
  workflow: string;
  status: 'success' | 'running' | 'failure' | 'queued';
  duration: string;
  timeAgo: string;
  commitMsg: string;
  runNumber: number;
  actor: string;
  isPinned: boolean;
};

const repos: RepoRow[] = [
  { name: 'acme/api-gateway', branch: 'main', workflow: 'CI Pipeline', status: 'success', duration: '2m 14s', timeAgo: '3m ago', commitMsg: 'Fix connection pool timeout', runNumber: 847, actor: 'MR', isPinned: true },
  { name: 'acme/web-client', branch: 'feat/auth', workflow: 'Build & Test', status: 'running', duration: '1m 03s', timeAgo: 'just now', commitMsg: 'Add OAuth2 PKCE flow', runNumber: 312, actor: 'KL', isPinned: false },
  { name: 'acme/shared-libs', branch: 'main', workflow: 'Publish', status: 'success', duration: '0m 48s', timeAgo: '12m ago', commitMsg: 'Bump version to 4.2.1', runNumber: 156, actor: 'TS', isPinned: false },
  { name: 'acme/infra-deploy', branch: 'release/v2', workflow: 'Deploy Prod', status: 'failure', duration: '4m 31s', timeAgo: '8m ago', commitMsg: 'Rolling update k8s manifests', runNumber: 89, actor: 'JW', isPinned: false },
  { name: 'acme/docs-site', branch: 'main', workflow: 'Deploy Pages', status: 'queued', duration: '--', timeAgo: '1m ago', commitMsg: 'Update API reference docs', runNumber: 203, actor: 'AN', isPinned: false },
  { name: 'acme/mobile-app', branch: 'main', workflow: 'iOS Build', status: 'success', duration: '6m 22s', timeAgo: '25m ago', commitMsg: 'Fix push notification handler', runNumber: 441, actor: 'MR', isPinned: false },
];

const expandedJobs = [
  { name: 'Lint', status: 'success' as const, duration: '0m 18s' },
  { name: 'Unit Tests', status: 'success' as const, duration: '1m 42s' },
  { name: 'Integration Tests', status: 'running' as const, duration: '0m 57s' },
  { name: 'Deploy Preview', status: 'queued' as const, duration: '--' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusColor = (status: string) => {
  switch (status) {
    case 'success': return colors.success;
    case 'running': return colors.running;
    case 'failure': return colors.failure;
    case 'queued': return colors.queued;
    default: return colors.inkMuted;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'success': return 'Passed';
    case 'running': return 'Running';
    case 'failure': return 'Failed';
    case 'queued': return 'Queued';
    default: return '';
  }
};

const Avatar = ({ initials, size = 20 }: { initials: string; size?: number }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors.edge,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        color: colors.inkSecondary,
        fontFamily,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};

const StatusDot = ({ status, size = 12, pulse = false }: { status: string; size?: number; pulse?: boolean }) => {
  const frame = useCurrentFrame();
  const opacity = pulse ? interpolate(Math.sin(frame * 0.15), [-1, 1], [0.4, 1]) : 1;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: statusColor(status),
        opacity,
        flexShrink: 0,
      }}
    />
  );
};

// Pin icon matching the app's SVG
const PinIcon = ({ pinned, size = 12 }: { pinned: boolean; size?: number }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill={pinned ? colors.queued : 'none'}
      stroke={pinned ? colors.queued : `${colors.inkMuted}50`}
      strokeWidth="1.5"
    >
      <path d="M4.456 2.193c.282-.282.7-.36 1.063-.199l5.25 2.333c.259.115.442.355.483.634l.512 3.483 1.575 1.575a.75.75 0 0 1-.53 1.281H9.28l-1.03 3.03a.75.75 0 0 1-1.42.02L5.5 11.28H1.31a.75.75 0 0 1-.53-1.281l1.575-1.575.512-3.483a.75.75 0 0 1 .483-.634l1.106-.49Z" />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
const SkeletonCard = ({ delay }: { delay: number }) => {
  const frame = useCurrentFrame();
  const shimmerX = interpolate((frame - delay) % 60, [0, 60], [-200, 600]);
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${colors.edge}`,
        background: colors.surface,
        boxShadow: shadowSm,
        overflow: 'hidden',
        opacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: `${colors.ink}10` }} />
        <div style={{ width: 50, height: 13, borderRadius: 4, background: `${colors.ink}08` }} />
        <div
          style={{
            width: 120,
            height: 13,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${colors.ink}05 0%, ${colors.ink}0A 50%, ${colors.ink}05 100%)`,
            backgroundSize: '400px 13px',
            backgroundPosition: `${shimmerX}px 0`,
          }}
        />
        <div style={{ width: 50, height: 13, borderRadius: 4, background: `${colors.ink}08` }} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 80, height: 12, borderRadius: 4, background: `${colors.ink}08` }} />
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${colors.ink}08` }} />
        <div style={{ width: 40, height: 12, borderRadius: 4, background: `${colors.ink}08` }} />
        <div style={{ width: 40, height: 12, borderRadius: 4, background: `${colors.ink}08` }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Repo card
// ---------------------------------------------------------------------------
const RepoCard = ({
  repo,
  delay,
  expanded = false,
  expandProgress = 0,
  hovered = false,
}: {
  repo: RepoRow;
  delay: number;
  expanded?: boolean;
  expandProgress?: number;
  hovered?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterSpring = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 100 } });
  const opacity = enterSpring;
  const translateY = interpolate(enterSpring, [0, 1], [8, 0]);
  const isFailed = repo.status === 'failure';

  // Hover lift animation
  const hoverLift = hovered ? -1 : 0;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY + hoverLift}px)`,
      }}
    >
      {/* Card wrapper — matches rounded-xl border bg-surface shadow-sm */}
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${isFailed ? `${colors.failure}30` : colors.edge}`,
          background: colors.surface,
          boxShadow: hovered ? shadowMd : shadowSm,
          overflow: 'hidden',
          transition: 'box-shadow 0.15s, transform 0.15s',
        }}
      >
        {/* Inner row with optional failed border */}
        <div
          style={{
            borderLeft: isFailed ? `2px solid ${colors.failure}` : 'none',
            borderRadius: isFailed ? '0 8px 8px 0' : 8,
            overflow: 'hidden',
          }}
        >
          {/* Collapsed summary row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 12px',
              fontFamily,
              fontSize: 13,
            }}
          >
            {/* Pin icon */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 2px' }}>
              <PinIcon pinned={repo.isPinned} size={11} />
            </div>

            <StatusDot status={repo.status} size={12} pulse={repo.status === 'running'} />
            <span style={{ fontSize: 12, fontWeight: 500, color: colors.inkSecondary }}>
              {statusLabel(repo.status)}
            </span>
            <span style={{ fontWeight: 600, color: colors.ink, fontSize: 13 }}>{repo.name}</span>
            <span
              style={{
                fontSize: 11,
                fontFamily: monoFamily,
                color: colors.inkMuted,
                background: `${colors.ink}0D`,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {repo.branch}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: colors.inkSecondary }}>{repo.workflow}</span>
            <Avatar initials={repo.actor} size={18} />
            <span
              style={{
                fontSize: 11,
                fontFamily: monoFamily,
                color: repo.status === 'running' ? colors.running : colors.inkSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {repo.duration}
            </span>
            <span style={{ fontSize: 11, color: colors.inkMuted, minWidth: 48, textAlign: 'right' }}>
              {repo.timeAgo}
            </span>
            <span style={{ fontSize: 11, color: colors.inkMuted }}>{expanded ? '\u25BE' : '\u25B8'}</span>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && expandProgress > 0 && (
          <div
            style={{
              overflow: 'hidden',
              maxHeight: interpolate(expandProgress, [0, 1], [0, 220]),
              opacity: expandProgress,
              borderTop: `1px solid ${colors.edge}80`,
              background: `${colors.canvas}4D`,
            }}
          >
            {/* Workflow run detail — two-line layout matching WorkflowRunRow */}
            <div style={{ padding: '8px 12px 8px 28px' }}>
              {/* Line 1: status dot, label, workflow, run number, event badge, actor, duration, time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily }}>
                <StatusDot status={repo.status} size={10} pulse={repo.status === 'running'} />
                <span style={{ fontSize: 12, fontWeight: 500, color: colors.inkSecondary }}>
                  {statusLabel(repo.status)}
                </span>
                <span style={{ fontWeight: 600, color: colors.ink }}>{repo.workflow}</span>
                <span style={{ fontFamily: monoFamily, fontSize: 11, color: colors.inkMuted }}>
                  #{repo.runNumber}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: `${colors.ink}0D`,
                    color: colors.inkSecondary,
                    fontWeight: 500,
                  }}
                >
                  push
                </span>
                <span style={{ flex: 1 }} />
                <Avatar initials={repo.actor} size={16} />
                <span style={{ fontFamily: monoFamily, fontSize: 11, color: colors.inkSecondary }}>
                  {repo.duration}
                </span>
                <span style={{ fontSize: 11, color: colors.inkMuted }}>{repo.timeAgo}</span>
                <span style={{ fontSize: 11, color: colors.inkMuted }}>{'\u25B8'}</span>
              </div>
              {/* Line 2: commit message, branch badge, sha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 16, fontSize: 11 }}>
                <span style={{ color: colors.inkSecondary }}>{repo.commitMsg}</span>
                <span style={{ fontFamily: monoFamily, color: colors.inkMuted, background: `${colors.ink}0D`, padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>
                  {repo.branch}
                </span>
                <span style={{ fontFamily: monoFamily, color: colors.inkMuted, fontSize: 10 }}>
                  a3f8c21
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ color: colors.inkMuted, fontSize: 10 }}>view &#8599;</span>
              </div>
            </div>

            {/* Jobs */}
            <div style={{ borderTop: `1px solid ${colors.edge}80` }}>
              {expandedJobs.map((job, i) => {
                const jobOpacity = interpolate(expandProgress, [0.3 + i * 0.15, 0.5 + i * 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (
                  <div
                    key={job.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 12px 5px 36px',
                      fontSize: 12,
                      fontFamily,
                      opacity: jobOpacity,
                    }}
                  >
                    <span style={{ fontSize: 11, color: colors.inkMuted }}>{'\u2514'}</span>
                    <StatusDot status={job.status} size={7} pulse={job.status === 'running'} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: statusColor(job.status) }}>
                      {statusLabel(job.status)}
                    </span>
                    <span style={{ color: colors.ink, flex: 1 }}>{job.name}</span>
                    <span style={{ fontFamily: monoFamily, fontSize: 11, color: colors.inkMuted }}>
                      {job.duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------
const SummaryBar = ({ counts, opacity }: { counts: { running: number; queued: number; passed: number; failed: number }; opacity: number }) => {
  const items = [
    { label: 'Running', count: counts.running, status: 'running', pulse: true },
    { label: 'Queued', count: counts.queued, status: 'queued', pulse: false },
    { label: 'Passed', count: counts.passed, status: 'success', pulse: false },
    { label: 'Failed', count: counts.failed, status: 'failure', pulse: false },
  ];

  return (
    <div style={{ display: 'flex', gap: 24, padding: '8px 4px', fontSize: 13, fontFamily, opacity }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusDot status={item.status} size={8} pulse={item.pulse} />
          <span style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>
          <span style={{ color: colors.inkSecondary, fontSize: 13 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Search typing animation
// ---------------------------------------------------------------------------
const SearchTyping = ({ text, progress }: { text: string; progress: number }) => {
  const chars = Math.floor(progress * text.length);
  const showCursor = Math.sin(progress * 20) > 0;

  return (
    <div
      style={{
        flex: 1,
        padding: '7px 14px',
        borderRadius: 12,
        border: `1px solid ${colors.running}80`,
        fontSize: 12,
        color: colors.ink,
        fontFamily,
        background: colors.surface,
        boxShadow: `0 0 0 2px rgba(59,130,246,0.12)`,
      }}
    >
      {text.slice(0, chars)}
      {showCursor && <span style={{ borderRight: `2px solid ${colors.running}`, marginLeft: 1 }}>&nbsp;</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------
export const DashboardVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline phases (at 30fps):
  // 0-30: Skeletons loading
  // 30-90: Repos fade in staggered
  // 90-150: Pause, status dot changes queued -> running
  // 150-210: Expand a repo (web-client)
  // 210-270: Search filter types "api"
  // 270-300: Clear filter, all repos return

  // Phase 1: skeleton -> real data transition
  const showSkeletons = frame < 35;
  const dataAppeared = frame >= 30;

  // Phase 2: status change (docs-site queued -> running at frame 100)
  const docsStatus = frame >= 100 ? 'running' : 'queued';

  // Phase 3: expand web-client at frame 150
  const expandFrame = 150;
  const expandTarget = frame >= expandFrame ? 1 : 0;
  const expandProgress = spring({ frame: Math.max(0, frame - expandFrame), fps, config: { damping: 18, stiffness: 80 } }) * expandTarget;

  // Phase 4: search "api" at frame 210
  const searchStart = 210;
  const searchEnd = 240;
  const searchActive = frame >= searchStart && frame < 275;
  const searchProgress = searchActive ? interpolate(frame, [searchStart, searchEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const searchText = 'api';

  // Phase 5: clear at frame 275
  const clearFrame = 275;
  const searchCleared = frame >= clearFrame;

  // Which repos are visible during search
  const visibleRepos = searchActive && !searchCleared
    ? repos.filter((r) => r.name.toLowerCase().includes(searchText.slice(0, Math.floor(searchProgress * searchText.length) || 1)))
    : repos;

  // Summary/filter opacity
  const summaryOpacity = dataAppeared ? interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const filterOpacity = summaryOpacity;

  // Modify docs-site status dynamically
  const displayRepos = visibleRepos.map((r) => {
    if (r.name === 'acme/docs-site') {
      return { ...r, status: docsStatus as RepoRow['status'], duration: docsStatus === 'running' ? '0m 12s' : '--' };
    }
    return r;
  });

  const counts = {
    running: displayRepos.filter((r) => r.status === 'running').length,
    queued: displayRepos.filter((r) => r.status === 'queued').length,
    passed: displayRepos.filter((r) => r.status === 'success').length,
    failed: displayRepos.filter((r) => r.status === 'failure').length,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.canvas, fontFamily }}>
      <div
        style={{
          margin: '16px 24px',
          width: 672,
          overflow: 'hidden',
        }}
      >
        {/* Header — sticky nav bar with backdrop blur appearance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 4px 10px 4px',
            borderBottom: `1px solid ${colors.edge}`,
            background: `${colors.surface}CC`,
            marginBottom: 12,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: colors.ink, fontFamily, letterSpacing: '-0.02em' }}>
            Actions Dashboard
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar initials="RB" size={22} />
            <span style={{ fontSize: 12, color: colors.inkSecondary }}>Logout</span>
          </div>
        </div>

        {/* Summary bar + repo count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: summaryOpacity }}>
          <SummaryBar counts={counts} opacity={1} />
          <span style={{ fontSize: 11, color: colors.inkMuted }}>
            {displayRepos.length} repositories
            {counts.failed > 0 && <span style={{ color: colors.failure }}> &middot; {counts.failed} failing</span>}
            {counts.running > 0 && <span style={{ color: colors.running }}> &middot; {counts.running} running</span>}
          </span>
        </div>

        {/* Filter bar — search + pill group, both in bordered containers */}
        <div style={{ display: 'flex', gap: 10, padding: '8px 0 12px', alignItems: 'center', opacity: filterOpacity, fontFamily }}>
          {searchActive && !searchCleared ? (
            <SearchTyping text={searchText} progress={searchProgress} />
          ) : (
            <div
              style={{
                flex: 1,
                padding: '7px 14px',
                borderRadius: 12,
                border: `1px solid ${colors.edge}`,
                background: colors.surface,
                fontSize: 12,
                color: colors.inkMuted,
              }}
            >
              Search repositories...
            </div>
          )}
          <div
            style={{
              display: 'flex',
              gap: 2,
              borderRadius: 12,
              border: `1px solid ${colors.edge}`,
              background: colors.surface,
              padding: 3,
            }}
          >
            {['All', 'Running', 'Failed', 'Passed', 'Queued'].map((f) => (
              <div
                key={f}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: f === 'All' ? colors.ink : 'transparent',
                  color: f === 'All' ? '#fff' : colors.inkSecondary,
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Repo list — card-based layout with gaps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {showSkeletons && !dataAppeared && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} delay={i * 3} />
              ))}
            </>
          )}

          {dataAppeared &&
            displayRepos.map((repo, i) => {
              const isExpanded = repo.name === 'acme/web-client' && frame >= expandFrame;
              return (
                <RepoCard
                  key={repo.name}
                  repo={repo}
                  delay={30 + i * 6}
                  expanded={isExpanded}
                  expandProgress={isExpanded ? expandProgress : 0}
                />
              );
            })}

          {/* Search empty -> filtered message */}
          {searchActive && !searchCleared && displayRepos.length === 0 && (
            <div style={{ padding: '30px 16px', textAlign: 'center', fontSize: 13, color: colors.inkMuted, fontFamily }}>
              No repositories match your search.
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
