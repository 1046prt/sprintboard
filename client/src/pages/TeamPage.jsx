import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client.js';
import { teamApi } from '../api/services.js';
import { ROLE_LABELS, ROLE_OPTIONS } from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorMessage, Modal, Spinner } from '../components/ui.jsx';

function RoleBadge({ role }) {
  const label = ROLE_LABELS[role] || role;
  return <span className={`role-badge role-badge-${role}`}>{label}</span>;
}

function MemberAvatar({ name, role }) {
  const initials = name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();
  return <span className={`member-avatar avatar-${role}`} aria-hidden="true">{initials}</span>;
}

function EditRoleModal({ member, allUsers, onSave, onClose }) {
  const [role, setRole] = useState(member.role);
  const [managerId, setManagerId] = useState(member.managerId?._id || member.managerId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(member._id, { role, managerId: managerId || null });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }

  }

  // Exclude the member themselves from the manager dropdown.
  const eligibleManagers = allUsers.filter((u) => String(u._id) !== String(member._id));

  return (
    <Modal title={`Edit ${member.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <ErrorMessage message={error} />

        <label className="field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Reports to (manager)</span>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} aria-label="Reports to">
            <option value="">No manager (top of hierarchy)</option>
            {eligibleManagers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} — {ROLE_LABELS[u.role] || u.role}
              </option>
            ))}
          </select>
        </label>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TeamPage() {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // user object | null
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [visible, all] = await Promise.all([teamApi.list(), teamApi.listAll()]);
      setUsers(visible);
      setAllUsers(all);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(id, { role, managerId }) {
    // Fire both patches concurrently only when both changed; otherwise fire just
    // the relevant one. For simplicity we always fire both — the server is
    // idempotent and there are at most two small requests.
    await Promise.all([
      teamApi.updateRole(id, role),
      teamApi.updateManager(id, managerId),
    ]);
    await load();
  }

  // Build a quick lookup: id → user
  const byId = Object.fromEntries(allUsers.map((u) => [String(u._id), u]));

  const roleCounts = allUsers.reduce((counts, member) => {
    counts[member.role] = (counts[member.role] || 0) + 1;
    return counts;
  }, {});
  const filteredUsers = users.filter((member) => {
    const query = search.trim().toLowerCase();
    const managerId = String(member.managerId?._id || member.managerId || '');
    const matchesSearch = !query || `${member.name} ${member.email}`.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesManager = managerFilter === 'all'
      || (managerFilter === 'none' ? !managerId : managerId === managerFilter);
    return matchesSearch && matchesRole && matchesManager;
  });
  const hasFilters = Boolean(search.trim() || roleFilter !== 'all' || managerFilter !== 'all');

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="muted">
            {isAdmin
              ? "Manage roles and reporting relationships."
              : "Your team's structure."}
          </p>
        </div>
      </div>

      <ErrorMessage message={error} onRetry={load} />

      {loading ? (
        <Spinner label="Loading team…" />
      ) : users.length === 0 ? (
        <div className="panel">
          <p className="muted">No team members visible to your account yet.</p>
          {isAdmin && (
            <p className="muted">
              Assign managers to users from this page after they register.
            </p>
          )}
        </div>
      ) : (
        <>
          <section className="team-hero">
            <div>
              <span className="eyebrow">Workspace directory</span>
              <h2>{allUsers.length} {allUsers.length === 1 ? 'person' : 'people'} building together</h2>
              <p className="muted">See who is on the team and how responsibilities are organised.</p>
            </div>
            <div className="team-role-summary">
              <span><strong>{roleCounts.admin || 0}</strong> Admin</span>
              <span><strong>{roleCounts.lead || 0}</strong> Leads</span>
              <span><strong>{roleCounts.member || 0}</strong> Members</span>
            </div>
          </section>
          <div className="panel org-tree">
            <div className="team-directory-head">
              <div>
                <h2>People directory</h2>
                <p className="muted small">Find teammates by name, role, or reporting relationship.</p>
              </div>
              {isAdmin && <span className="directory-note">Admin controls enabled</span>}
            </div>
            <div className="team-filters">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                aria-label="Search team members"
              />
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role">
                <option value="all">All roles</option>
                {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)} aria-label="Filter by manager">
                <option value="all">All reporting lines</option>
                <option value="none">No manager</option>
                {allUsers.filter((member) => member._id).map((manager) => (
                  <option key={manager._id} value={manager._id}>{manager.name}</option>
                ))}
              </select>
              {hasFilters && (
                <button type="button" className="btn btn-small" onClick={() => { setSearch(''); setRoleFilter('all'); setManagerFilter('all'); }}>
                  Clear filters
                </button>
              )}
            </div>
            {filteredUsers.length === 0 ? (
              <div className="team-empty">No team members match these filters.</div>
            ) : (
              <div className="team-directory-grid">
                {filteredUsers.map((member) => {
                  const managerId = member.managerId?._id || member.managerId;
                  const manager = managerId ? byId[String(managerId)] : null;
                  return (
                    <div key={member._id} className="org-card">
                      <MemberAvatar name={member.name} role={member.role} />
                      <div className="org-info">
                        <div className="org-name-row">
                          <strong>{member.name}</strong>
                          <RoleBadge role={member.role} />
                        </div>
                        <span className="muted small">{member.email}</span>
                        <span className="member-manager">{manager ? `Reports to ${manager.name}` : 'Top-level member'}</span>
                      </div>
                      {isAdmin && <button type="button" className="btn btn-small member-edit" onClick={() => setEditing(member)}>Edit member</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <EditRoleModal
          member={editing}
          allUsers={allUsers}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
