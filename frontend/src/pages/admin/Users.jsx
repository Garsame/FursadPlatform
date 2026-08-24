import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Search, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Deleting is permanent, so the admin is shown exactly what goes with the
  // account before they confirm, and has to type the name to proceed.
  const [target, setTarget] = useState(null);
  const [impact, setImpact] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const openDelete = async (user) => {
    setTarget(user);
    setImpact(null);
    setConfirmText('');
    try {
      const res = await api.get(`/admin/users/${user._id}/impact`);
      if (res.data?.success) setImpact(res.data.data);
    } catch (err) {
      setImpact({ error: err.response?.data?.message || 'Could not check what this would remove.' });
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/users/${target._id}`);
      if (res.data?.success) {
        const r = res.data.removed;
        setUsers((prev) => prev.filter((u) => u._id !== target._id));
        setNotice(
          `${res.data.message} Also removed ${r.jobs} job(s), ${r.applications} application(s), ` +
          `${r.cvs} CV(s) and ${r.messages} message(s).`
        );
        setTarget(null);
      }
    } catch (err) {
      setImpact((p) => ({ ...(p || {}), error: err.response?.data?.message || 'Delete failed.' }));
    } finally {
      setDeleting(false);
    }
  };
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      let query = '?';
      if (roleFilter) query += `role=${roleFilter}&`;
      if (statusFilter) query += `status=${statusFilter}&`;
      if (searchTerm) query += `search=${searchTerm}&`;
      
      const res = await api.get(`/admin/users${query}`);
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users list:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, searchTerm]);

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const res = await api.put(`/admin/users/${userId}/status`, {
        isActive: !currentStatus
      });

      if (res.data?.success) {
        setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle account status');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className="bg-success/10 border border-success/25 text-success rounded-input p-3 text-sm">
          {notice}
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-text-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full px-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary"
        >
          <option value="">All Roles</option>
          <option value="jobseeker">Jobseeker</option>
          <option value="employer">Employer</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden border border-border-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-bg-elevated border-b border-border-subtle text-text-secondary">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-text-secondary">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="border-b border-border-subtle hover:bg-bg-elevated/20">
                    <td className="p-4 font-semibold text-text-primary">{u.name}</td>
                    <td className="p-4 text-text-secondary">{u.email}</td>
                    <td className="p-4 capitalize">
                      <Badge variant={u.role === 'admin' ? 'danger' : 'neutral'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-4 text-text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <Badge variant={u.isActive ? 'success' : 'danger'}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant={u.isActive ? 'secondary' : 'primary'}
                          className="h-8 text-xs px-3"
                          onClick={() => handleToggleStatus(u._id, u.isActive)}
                        >
                          {u.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                        <button
                          onClick={() => openDelete(u)}
                          title={`Permanently delete ${u.name}`}
                          aria-label={`Permanently delete ${u.name}`}
                          className="h-8 w-8 grid place-items-center rounded-btn text-danger
                            hover:bg-danger/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Permanent deletion */}
      <Modal
        isOpen={!!target}
        onClose={() => !deleting && setTarget(null)}
        title="Delete this account permanently"
        subtitle={target ? `${target.name} · ${target.email}` : ''}
      >
        {target && (
          <div className="flex flex-col gap-4">
            {!impact ? (
              <p className="flex items-center gap-2 text-sm text-text-muted py-4">
                <Loader2 size={15} className="animate-spin" /> Checking what this would remove...
              </p>
            ) : impact.error ? (
              <p className="text-sm text-danger">{impact.error}</p>
            ) : impact.blocked ? (
              <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/25 rounded-input p-3">
                <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{impact.blocked}</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/25 rounded-input p-3">
                  <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-danger leading-relaxed">
                    This cannot be undone. If you only want to stop them signing in,
                    close this and use <strong>Suspend</strong> instead — that is reversible.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-text-primary mb-2">This will also delete:</p>
                  <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
                    {impact.impact.company && (
                      <li className="flex justify-between border-b border-border-subtle pb-1.5">
                        <span>Company profile</span><span className="font-semibold text-text-primary">{impact.impact.company}</span>
                      </li>
                    )}
                    {[
                      ['Job postings', impact.impact.jobs],
                      ['Applications', impact.impact.applications],
                      ['CVs on file', impact.impact.cvs],
                      ['Messages', impact.impact.messages],
                    ].map(([label, n]) => (
                      <li key={label} className="flex justify-between border-b border-border-subtle pb-1.5 last:border-0">
                        <span>{label}</span>
                        <span className={`font-semibold tabular-nums ${n > 0 ? 'text-danger' : 'text-text-muted'}`}>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">
                    Type <span className="font-mono text-danger">{target.name}</span> to confirm
                  </label>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoComplete="off"
                    className="w-full h-input px-4 bg-bg-primary border border-border-subtle rounded-input
                      text-sm text-text-primary focus:outline-none focus:border-danger focus:ring-4 focus:ring-danger/15"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth disabled={deleting} onClick={() => setTarget(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    disabled={deleting || confirmText.trim() !== target.name}
                    onClick={confirmDelete}
                  >
                    {deleting ? 'Deleting...' : 'Delete permanently'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Users;
