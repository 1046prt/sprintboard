import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client.js';
import { issueApi, projectApi, teamApi } from '../api/services.js';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, labelFor } from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import useLiveUpdates from '../hooks/useLiveUpdates.js';
import { formatDate } from '../utils/format.js';
import IssueForm from './IssueForm.jsx';
import { Badge, ConfirmDialog, EmptyState, ErrorMessage, Spinner } from './ui.jsx';

const PAGE_SIZE = 10;

/**
 * Issue table with backend filtering, search and pagination.
 * When `projectId` is given the list is locked to that project.
 */
export default function IssueList({ projectId, onChanged }) {
  const { user, isAdmin, isManager } = useAuth();

  const [filters, setFilters] = useState({ status: '', priority: '', project: '', assignedTo: '' });
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounce(searchText.trim(), 400);

  const [data, setData] = useState({ issues: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  // Team members visible to this user (for the assignee filter dropdown).
  const [teamMembers, setTeamMembers] = useState([]);

  const [editing, setEditing] = useState(null); // issue | 'new' | null
  const [deleting, setDeleting] = useState(null);
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' });
  const [actionError, setActionError] = useState('');

  const activeProject = projectId || filters.project;

  // Projects feed the filter dropdown and the "new issue" form.
  const loadProjects = useCallback(() => {
    if (projectId) return;
    projectApi.list().then(setProjects).catch(() => {});
  }, [projectId]);
  useEffect(loadProjects, [loadProjects]);

  // Load team members for the assignee filter (managers and admins see their team).
  useEffect(() => {
    if (!isManager && !isAdmin) return;
    teamApi.list().then(setTeamMembers).catch(() => {});
  }, [isAdmin, isManager]);

  // Only the latest request is allowed to update the screen, so quick typing or
  // fast filter changes can never show stale results.
  const controller = useRef(null);
  const load = useCallback(
    async ({ silent = false } = {}) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;

      if (!silent) setLoading(true);
      setError('');
      try {
        const params = { page, limit: PAGE_SIZE };
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (activeProject) params.project = activeProject;
        if (filters.assignedTo) params.assignedTo = filters.assignedTo;
        if (search) params.search = search;

        const result = await issueApi.list(params, current.signal);
        setData(result);
        // The last item on a page was removed: step back instead of showing nothing.
        if (result.issues.length === 0 && page > 1) setPage(result.pagination.pages);
        setLoading(false);
      } catch (err) {
        const message = getErrorMessage(err);
        if (!message) return; // aborted
        setError(message);
        setLoading(false);
      }
    },
    [page, filters.status, filters.priority, filters.assignedTo, activeProject, search]
  );

  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  useLiveUpdates(() => {
    load({ silent: true });
    loadProjects();
  });

  const changeFilter = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    setPage(1);
  };

  const onSearch = (event) => {
    setSearchText(event.target.value);
    setPage(1);
  };

  const hasFilters = Boolean(filters.status || filters.priority || filters.project || filters.assignedTo || searchText);
  const clearFilters = () => {
    setFilters({ status: '', priority: '', project: '', assignedTo: '' });
    setSearchText('');
    setPage(1);
  };

  const canEdit = (issue) =>
    isAdmin ||
    issue.createdBy?._id === user._id ||
    String(issue.project?.createdBy) === user._id;

  async function changeStatus(issue, status) {
    setActionError('');
    // Optimistic update, rolled back if the server says no.
    const previous = data;
    setData((d) => ({ ...d, issues: d.issues.map((i) => (i._id === issue._id ? { ...i, status } : i)) }));
    try {
      await issueApi.setStatus(issue._id, status);
      onChanged?.();
    } catch (err) {
      setData(previous);
      setActionError(getErrorMessage(err));
    }
  }

  async function confirmDelete() {
    setDeleteState({ busy: true, error: '' });
    try {
      await issueApi.remove(deleting._id);
      setDeleting(null);
      setDeleteState({ busy: false, error: '' });
      load({ silent: true });
      onChanged?.();
    } catch (err) {
      setDeleteState({ busy: false, error: getErrorMessage(err) });
    }
  }

  const saved = () => {
    setEditing(null);
    load({ silent: true });
    onChanged?.();
  };

  const { issues, pagination } = data;
  const noProjects = !projectId && projects.length === 0;
  // Show the assignee column when there are team members to distinguish.
  const showAssignee = isAdmin || isManager;

  return (
    <section aria-label="Issues">
      <div className="issues-toolbar">
        <div className="issues-toolbar-heading">
          <div>
            <span className="eyebrow">Work queue</span>
            <h2>{projectId ? 'Project issues' : 'Issue workspace'}</h2>
          </div>
          <span className="issues-result-count">
            {pagination.total} {pagination.total === 1 ? 'issue' : 'issues'}
          </span>
        </div>
        <div className="issues-toolbar-main">
          <div className="issues-search">
            <span className="issues-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              className="search"
              placeholder="Search issues by title…"
              value={searchText}
              onChange={onSearch}
              maxLength={100}
              aria-label="Search issues by title"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditing('new')}
            disabled={noProjects}
            title={noProjects ? 'Create a project first' : undefined}
          >
            + New issue
          </button>
        </div>

        <div className="issues-filter-row">
          <span className="filter-label">Filter by</span>
          <select value={filters.status} onChange={changeFilter('status')} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select value={filters.priority} onChange={changeFilter('priority')} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {!projectId && (
            <select value={filters.project} onChange={changeFilter('project')} aria-label="Filter by project">
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          )}

          {showAssignee && teamMembers.length > 1 && (
            <select value={filters.assignedTo} onChange={changeFilter('assignedTo')} aria-label="Filter by assignee">
              <option value="">All assignees</option>
              {teamMembers.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button type="button" className="btn btn-small clear-filters" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <ErrorMessage message={actionError} />
      <ErrorMessage message={error} onRetry={() => load()} />

      {loading ? (
        <Spinner label="Loading issues…" />
      ) : !error && issues.length === 0 ? (
        <EmptyState title={hasFilters ? 'No issues match your filters' : 'No issues yet'}>
          {hasFilters ? 'Try a different search or clear the filters.' : 'Create the first issue to get started.'}
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap">
            <table className="issues">
              <thead>
                <tr>
                  <th>Issue</th>
                  {!projectId && <th>Project</th>}
                  {showAssignee && <th className="hide-sm">Assigned to</th>}
                  <th>Status</th>
                  <th>Priority</th>
                  <th className="hide-sm">Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue._id}>
                    <td data-label="Issue">
                      <strong className="issue-title">{issue.title}</strong>
                      {issue.description && <p className="muted clamp">{issue.description}</p>}
                      <span className="muted small">by {issue.createdBy?.name || 'Unknown'}</span>
                    </td>
                    {!projectId && (
                      <td data-label="Project">
                        {issue.project ? <Link to={`/projects/${issue.project._id}`}>{issue.project.name}</Link> : '—'}
                      </td>
                    )}
                    {showAssignee && (
                      <td data-label="Assigned to" className="hide-sm">
                        {issue.assignedTo ? (
                          <span>{issue.assignedTo.name}</span>
                        ) : (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td data-label="Status">
                      <div className={`status-control status-${issue.status}`}>
                        <span className="status-dot" aria-hidden="true" />
                        <select
                          className="status-select"
                          value={issue.status}
                          onChange={(e) => changeStatus(issue, e.target.value)}
                          aria-label={`Status of ${issue.title}`}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td data-label="Priority">
                      <Badge kind="priority" value={issue.priority}>{labelFor(PRIORITY_OPTIONS, issue.priority)}</Badge>
                    </td>
                    <td data-label="Created" className="hide-sm">{formatDate(issue.createdAt)}</td>
                    <td className="row-actions">
                      {canEdit(issue) && (
                        <>
                          <button type="button" className="btn btn-small" onClick={() => setEditing(issue)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-small btn-danger-outline"
                            onClick={() => {
                              setDeleteState({ busy: false, error: '' });
                              setDeleting(issue);
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="muted">
              {pagination.total} {pagination.total === 1 ? 'issue' : 'issues'}
            </span>
            {pagination.pages > 1 && (
              <div>
                <button type="button" className="btn btn-small" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  Previous
                </button>
                <span className="page-label">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button type="button" className="btn btn-small" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.pages}>
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <IssueForm
          issue={editing === 'new' ? null : editing}
          projectId={projectId || (editing === 'new' ? filters.project : '')}
          projects={projects}
          onSaved={saved}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete issue"
          message={`Delete "${deleting.title}"? This cannot be undone.`}
          busy={deleteState.busy}
          error={deleteState.error}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
