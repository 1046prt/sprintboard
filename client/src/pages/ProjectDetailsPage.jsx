import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client.js';
import { projectApi } from '../api/services.js';
import ActivityFeed from '../components/ActivityFeed.jsx';
import IssueList from '../components/IssueList.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import { ConfirmDialog, ErrorMessage, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useLiveUpdates from '../hooks/useLiveUpdates.js';
import { formatDate } from '../utils/format.js';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' });

  const load = useCallback(async () => {
    try {
      const [details, feed] = await Promise.all([projectApi.get(id), projectApi.activity(id, 15)]);
      setProject(details);
      setActivities(feed);
      setError('');
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) setNotFound(true);
      else setError(getErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    setProject(null);
    setNotFound(false);
    load();
  }, [load]);

  // A project deleted by someone else while we are looking at it.
  useLiveUpdates((event, payload) => {
    if (event === 'project:deleted' && payload?.projectId === id) return setNotFound(true);
    if (!payload?.projectId || payload.projectId === id) load();
  });

  async function confirmDelete() {
    setDeleteState({ busy: true, error: '' });
    try {
      await projectApi.remove(id);
      navigate('/projects', { replace: true });
    } catch (err) {
      setDeleteState({ busy: false, error: getErrorMessage(err) });
    }
  }

  if (notFound) {
    return (
      <div className="empty">
        <h3>Project not found</h3>
        <p>It may have been deleted.</p>
        <Link to="/projects" className="btn">Back to projects</Link>
      </div>
    );
  }

  if (!project) {
    return error ? <ErrorMessage message={error} onRetry={load} /> : <Spinner label="Loading project…" />;
  }

  const canManage = isAdmin || project.createdBy?._id === user._id;
  const { stats } = project;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/projects">Projects</Link> / {project.name}
      </p>

      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.description || 'No description'}</p>
          <p className="small muted">
            Created by {project.createdBy?.name || 'Unknown'} on {formatDate(project.createdAt)}
          </p>
        </div>
        {canManage && (
          <div className="header-actions">
            <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
            <button
              type="button"
              className="btn btn-danger-outline"
              onClick={() => {
                setDeleteState({ busy: false, error: '' });
                setDeleting(true);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <ErrorMessage message={error} onRetry={load} />

      <div className="chips">
        <span className="chip chip-total"><strong>{stats.total}</strong><span>Total issues</span></span>
        <span className="chip chip-todo"><strong>{stats.todo}</strong><span>To do</span></span>
        <span className="chip chip-progress"><strong>{stats.inProgress}</strong><span>In progress</span></span>
        <span className="chip chip-done"><strong>{stats.done}</strong><span>Done</span></span>
      </div>

      <div className="details-layout">
        <div>
          <h2>Issues</h2>
          <IssueList projectId={id} onChanged={load} />
        </div>
        <aside className="panel">
          <h2>Recent activity</h2>
          <ActivityFeed activities={activities} />
        </aside>
      </div>

      {editing && (
        <ProjectForm
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${project.name}" and all of its issues and activity? This cannot be undone.`}
          busy={deleteState.busy}
          error={deleteState.error}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </>
  );
}
