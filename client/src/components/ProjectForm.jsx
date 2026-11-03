import { useState } from 'react';
import { getErrorMessage } from '../api/client.js';
import { projectApi } from '../api/services.js';
import { ErrorMessage, Modal, useToast } from './ui.jsx';

export default function ProjectForm({ project, onSaved, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: project?.name || '', description: project?.description || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.name.trim().length < 2) {
      setError('Project name must be at least 2 characters');
      return;
    }
    setSaving(true);
    try {
      const saved = project ? await projectApi.update(project._id, form) : await projectApi.create(form);
      toast?.(project ? 'Project updated successfully.' : 'Project created successfully.');
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <ErrorMessage message={error} />
        <label className="field">
          <span>Name</span>
          <input value={form.name} onChange={update('name')} maxLength={100} placeholder="e.g. Website redesign" />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea value={form.description} onChange={update('description')} maxLength={1000} rows={4} placeholder="What is this project about?" />
        </label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
