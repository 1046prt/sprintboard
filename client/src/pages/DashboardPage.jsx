import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client.js';
import { dashboardApi, issueApi, projectApi } from '../api/services.js';
import ActivityFeed from '../components/ActivityFeed.jsx';
import { Badge, ErrorMessage, Spinner } from '../components/ui.jsx';
import { PRIORITY_OPTIONS, ROLE_LABELS, STATUS_OPTIONS, labelFor } from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import useLiveUpdates from '../hooks/useLiveUpdates.js';
import { formatDate } from '../utils/format.js';

const CARDS = [
  { key: 'totalProjects', label: 'Total projects', tone: 'indigo' },
  { key: 'totalIssues', label: 'Visible issues', tone: 'slate' },
  { key: 'openIssues', label: 'Open issues', tone: 'amber' },
  { key: 'inProgressIssues', label: 'In progress', tone: 'blue' },
  { key: 'completedIssues', label: 'Completed', tone: 'green' },
  { key: 'highPriorityIssues', label: 'High priority', tone: 'red' },
];

function StatusBar({ stats }) {
  const total = stats.totalIssues;
  const parts = [
    { label: 'To Do', value: stats.openIssues, className: 'seg-todo' },
    { label: 'In Progress', value: stats.inProgressIssues, className: 'seg-progress' },
    { label: 'Done', value: stats.completedIssues, className: 'seg-done' },
  ];

  return (
    <div>
      <div className="stack-bar" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {total === 0 ? (
          <span className="seg seg-empty" style={{ width: '100%' }} />
        ) : (
          parts.map((p) => p.value > 0 && <span key={p.label} className={`seg ${p.className}`} style={{ width: `${(p.value / total) * 100}%` }} />)
        )}
      </div>
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.label}>
            <span className={`swatch ${p.className}`} /> {p.label} <strong>{p.value}</strong>
            {total > 0 && <span className="muted"> ({Math.round((p.value / total) * 100)}%)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriorityBars({ byPriority, total }) {
  return (
    <ul className="bars">
      {['high', 'medium', 'low'].map((level) => (
        <li key={level}>
          <span className="bar-label">{level[0].toUpperCase() + level.slice(1)}</span>
          <span className="bar-track">
            <span className={`bar-fill bar-${level}`} style={{ width: total ? `${(byPriority[level] / total) * 100}%` : 0 }} />
          </span>
          <strong>{byPriority[level]}</strong>
        </li>
      ))}
    </ul>
  );
}

function ProjectOverview({ projects }) {
  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Workspace map</span>
          <h2>Project overview</h2>
        </div>
        <Link to="/projects" className="section-link">View all projects →</Link>
      </div>
      <div className="dashboard-project-grid">
        {projects.slice(0, 4).map((project) => {
          const total = project.stats?.total || 0;
          const done = project.stats?.done || 0;
          const progress = total ? Math.round((done / total) * 100) : 0;
          return (
            <Link to={`/projects/${project._id}`} className="dashboard-project-card" key={project._id}>
              <div className="project-card-title"><strong>{project.name}</strong><span>→</span></div>
              <p>{project.description || 'No description'}</p>
              <div className="project-progress-meta"><span>{progress}% complete</span><span>{total} issues</span></div>
              <div className="project-progress-track"><span style={{ width: `${progress}%` }} /></div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PersonalWorkload({ issues }) {
  const completed = issues.filter((issue) => issue.status === 'done').length;
  const active = issues.filter((issue) => issue.status === 'in-progress').length;
  const todo = issues.filter((issue) => issue.status === 'todo').length;
  return (
    <section className="panel personal-workload">
      <div className="section-heading">
        <div><span className="eyebrow">Your focus</span><h2>Personal workload</h2></div>
        <Link to="/issues" className="section-link">Open issues →</Link>
      </div>
      <div className="workload-summary">
        <div><strong>{issues.length}</strong><span>Total assigned</span></div>
        <div><strong>{active}</strong><span>In progress</span></div>
        <div><strong>{todo}</strong><span>To do</span></div>
        <div><strong>{completed}</strong><span>Completed</span></div>
      </div>
      {issues.length === 0 ? <p className="muted workload-empty">Nothing assigned to you yet.</p> : (
        <ul className="workload-list">
          {issues.slice(0, 4).map((issue) => (
            <li key={issue._id}><span className={`workload-dot status-${issue.status}`} /><span>{issue.title}</span><Badge kind="priority" value={issue.priority}>{labelFor(PRIORITY_OPTIONS, issue.priority)}</Badge></li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamStatCard({ label, value, tone }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function TeamTasksSection({ teamTasks }) {
  const [memberFilter, setMemberFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = teamTasks.issues.filter((issue) => {
    if (memberFilter && issue.assignedTo?._id !== memberFilter) return false;
    if (statusFilter && issue.status !== statusFilter) return false;
    return true;
  });

  return (
    <section className="panel team-panel">
      <div className="team-panel-header">
        <h2>Team tasks</h2>
        <div className="team-stats-row">
          <TeamStatCard label="Team tasks" value={teamTasks.total} tone="slate" />
          <TeamStatCard label="In progress" value={teamTasks.inProgress} tone="blue" />
          <TeamStatCard label="Completed" value={teamTasks.completed} tone="green" />
          <TeamStatCard label="High priority" value={teamTasks.overdue} tone="red" />
        </div>
      </div>

      <div className="toolbar toolbar-compact">
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          aria-label="Filter by team member"
        >
          <option value="">All members</option>
          {teamTasks.members.map((m) => (
            <option key={m._id} value={m._id}>{m.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="muted" style={{ padding: '1rem 0' }}>No tasks match the current filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="issues">
            <thead>
              <tr>
                <th>Member</th>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                {filtered[0]?.project && <th className="hide-sm">Project</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((issue) => (
                <tr key={issue._id}>
                  <td data-label="Member">
                    <strong>{issue.assignedTo?.name || '—'}</strong>
                    {issue.assignedTo?.role && (
                      <p className="muted small">{ROLE_LABELS[issue.assignedTo.role] || issue.assignedTo.role}</p>
                    )}
                  </td>
                  <td data-label="Task">
                    <strong>{issue.title}</strong>
                  </td>
                  <td data-label="Status">
                    <span className={`status-select status-${issue.status}`}>
                      {labelFor(STATUS_OPTIONS, issue.status)}
                    </span>
                  </td>
                  <td data-label="Priority">
                    <Badge kind="priority" value={issue.priority}>{labelFor(PRIORITY_OPTIONS, issue.priority)}</Badge>
                  </td>
                  {issue.project && (
                    <td data-label="Project" className="hide-sm">
                      <Link to={`/projects/${issue.project._id}`}>{issue.project.name}</Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { user, isManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [personalIssues, setPersonalIssues] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [dashboard, projectList, issueList] = await Promise.all([
        dashboardApi.stats(),
        projectApi.list(),
        issueApi.list({ assignedTo: user._id, limit: 50 }),
      ]);
      setStats(dashboard);
      setProjects(projectList);
      setPersonalIssues(issueList.issues);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [user._id]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveUpdates(load, ['stats:changed']);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Overview for {user.name.split(' ')[0]}.</p>
        </div>
      </div>

      <ErrorMessage message={error} onRetry={load} />
      {!stats && !error && <Spinner label="Loading dashboard…" />}

      {stats && (
        <>
          <section className="dashboard-hero">
            <div>
              <span className="eyebrow">Workspace pulse</span>
              <h2>Good to see you, {user.name.split(' ')[0]}.</h2>
              <p>Here is what needs your attention today.</p>
            </div>
            <div className="dashboard-hero-actions">
              <Link to="/issues" className="btn btn-primary">Review issues</Link>
              <Link to="/projects" className="hero-link">Browse projects →</Link>
            </div>
          </section>
          <div className="stat-grid">
            {CARDS.map((card) => (
              <div key={card.key} className={`stat-card tone-${card.tone}`}>
                <span className="stat-label">{card.label}</span>
                <span className="stat-value">{stats[card.key]}</span>
              </div>
            ))}
          </div>

          <div className="quick-actions" aria-label="Quick actions">
            <div>
              <span className="eyebrow">Keep momentum</span>
              <h2>What would you like to move forward?</h2>
            </div>
            <div className="quick-actions-buttons">
              <Link to="/projects" className="btn btn-primary">View projects</Link>
              <Link to="/issues" className="btn">Review issues</Link>
            </div>
          </div>

          <div className="dashboard-two-column">
            <PersonalWorkload issues={personalIssues} />
            <section className="attention-panel">
              <div className="attention-heading">
                <div>
                  <span className="eyebrow">Focus next</span>
                  <h2>Needs attention</h2>
                  <p>Start with the work that can unblock your team.</p>
                </div>
                <span className="attention-badge">Priority view</span>
              </div>
              <div className="attention-items">
                <Link to="/issues" className="attention-item attention-danger">
                  <span className="attention-icon">!</span>
                  <span className="attention-copy"><strong>{stats.highPriorityIssues}</strong><span>High priority</span></span>
                  <span className="attention-arrow">→</span>
                </Link>
                <Link to="/issues" className="attention-item attention-orange">
                  <span className="attention-icon">↗</span>
                  <span className="attention-copy"><strong>{stats.inProgressIssues}</strong><span>In progress</span></span>
                  <span className="attention-arrow">→</span>
                </Link>
                <Link to="/issues" className="attention-item attention-neutral">
                  <span className="attention-icon">○</span>
                  <span className="attention-copy"><strong>{stats.openIssues}</strong><span>Ready to start</span></span>
                  <span className="attention-arrow">→</span>
                </Link>
              </div>
            </section>
          </div>
          <ProjectOverview projects={projects} />

          <div className="grid-2">
            <section className="panel">
              <h2>Issues by status</h2>
              <StatusBar stats={stats} />
              <h2 className="panel-sub">Issues by priority</h2>
              <PriorityBars byPriority={stats.byPriority} total={stats.totalIssues} />
            </section>

            <section className="panel">
              <h2>Recent activity</h2>
              <ActivityFeed activities={stats.recentActivity.slice(0, 4)} />
            </section>
          </div>

          {/* Team task table for leads and project heads */}
          {isManager && stats.teamTasks && stats.teamTasks.total > 0 && (
            <div className="dashboard-team-section">
              <TeamTasksSection teamTasks={stats.teamTasks} />
            </div>
          )}
        </>
      )}
    </>
  );
}
