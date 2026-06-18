import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Search } from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
                    <td className="p-4 text-right">
                      {u.role !== 'admin' && (
                        <Button
                          variant={u.isActive ? 'secondary' : 'primary'}
                          className="h-8 text-xs px-3"
                          onClick={() => handleToggleStatus(u._id, u.isActive)}
                        >
                          {u.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Users;
