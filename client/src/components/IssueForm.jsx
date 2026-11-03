import { useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client.js';
import { issueApi, teamApi } from '../api/services.js';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../constants.js';
import { ErrorMessage, Modal, useToast } from './ui.jsx';

// `projects` is only needed when the issue is not created from inside a project.
export default function IssueForm({ issue, projectId, projects = [], onSaved, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: issue?.title || '',
    description: issue?.description || '',
    status: issue?.status || 'todo',
    priority: issue?.priority || 'medium',
    projectId: projectId || projects[0]?._id || '',
    assignedTo: issue?.assignedTo?._id || issue?.assignedTo || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    teamApi.listAll().then(setAllUsers).catch(() => {});
  }, []);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required');
    if (!issue && !form.projectId) return setError('Choose a project for this issue');

    setSaving(true);
    try {
      const { projectId: project, ...fields } = form;
      // Convert empty string to null for the API (means "unassigned").
      const payload = { ...fields, assignedTo: fields.assignedTo || null };
      const saved = issue
        ? await issueApi.update(issue._id, payload)
        : await issueApi.create({ ...payload, projectId: project });
      toast?.(issue ? 'Issue updated successfully.' : 'Issue created successfully.');
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={issue ? 'Edit issue' : 'New issue'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <ErrorMessage message={error} />

        {!issue && !projectId && (
          <label className="field">
            <span>Project</span>
            <select value={form.projectId} onChange={update('projectId')}>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>Title</span>
          <input value={form.title} onChange={update('title')} maxLength={150} placeholder="Short summary of the issue" />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea value={form.description} onChange={update('description')} maxLength={2000} rows={4} placeholder="Steps to reproduce, context, links…" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={update('status')}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={form.priority} onChange={update('priority')}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Assigned to</span>
          <select value={form.assignedTo} onChange={update('assignedTo')} aria-label="Assigned to">
            <option value="">Unassigned</option>
            {allUsers.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </label>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : issue ? 'Save changes' : 'Create issue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
