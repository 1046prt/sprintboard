import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client.js';
import { projectApi } from '../api/services.js';
import ProjectForm from '../components/ProjectForm.jsx';
import { ConfirmDialog, EmptyState, ErrorMessage, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useLiveUpdates from '../hooks/useLiveUpdates.js';
import { formatDate } from '../utils/format.js';

function ProjectCard({ project, canManage, onEdit, onDelete }) {
  const { stats } = project;
  const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <article className="card project-card">
      <h3>
        <Link to={`/projects/${project._id}`}>{project.name}</Link>
      </h3>
      <p className="muted clamp-3">{project.description || 'No description'}</p>

      <div className="progress" role="img" aria-label={`${progress}% of issues done`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="small muted">
        {stats.total} {stats.total === 1 ? 'issue' : 'issues'} · {stats.todo} to do · {stats.inProgress} in progress · {stats.done} done
      </p>

      <div className="card-footer">
        <span className="small muted">
          {project.createdBy?.name || 'Unknown'} · {formatDate(project.createdAt)}
        </span>
        {canManage && (
          <div>
            <button type="button" className="btn btn-small" onClick={() => onEdit(project)}>Edit</button>
            <button type="button" className="btn btn-small btn-danger-outline" onClick={() => onDelete(project)}>Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [editing, setEditing] = useState(null); // project | 'new' | null
  const [deleting, setDeleting] = useState(null);
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' });

  const load = useCallback(async () => {
    try {
      setProjects(await projectApi.list());
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveUpdates(load);

  async function confirmDelete() {
    setDeleteState({ busy: true, error: '' });
    try {
      await projectApi.remove(deleting._id);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteState({ busy: false, error: getErrorMessage(err) });
    }
  }

  const visible = (projects || []).filter((p) => !onlyMine || p.createdBy?._id === user._id);
  const canManage = (p) => isAdmin || p.createdBy?._id === user._id;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="muted">All projects across your workspace.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + New project
        </button>
      </div>

      <label className="check">
        <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
        Show only my projects
      </label>

      <ErrorMessage message={error} onRetry={load} />
      {!projects && !error && <Spinner label="Loading projects…" />}

      {projects && visible.length === 0 && (
        <EmptyState title={onlyMine ? "You haven't created any projects yet" : 'No projects yet'}>
          Create a project to start adding issues.
        </EmptyState>
      )}

      <div className="card-grid">
        {visible.map((project) => (
          <ProjectCard
            key={project._id}
            project={project}
            canManage={canManage(project)}
            onEdit={setEditing}
            onDelete={(p) => {
              setDeleteState({ busy: false, error: '' });
              setDeleting(p);
            }}
          />
        ))}
      </div>

      {editing && (
        <ProjectForm
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${deleting.name}" and all of its issues and activity? This cannot be undone.`}
          busy={deleteState.busy}
          error={deleteState.error}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
