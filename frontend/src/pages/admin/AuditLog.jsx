import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { History, ShieldAlert } from 'lucide-react';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/audit-log');
        if (res.data?.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center gap-3 border-red-500/20 bg-red-500/5">
        <ShieldAlert className="text-red-500 w-6 h-6" />
        <div>
          <h4 className="font-bold text-text-primary text-sm">System Compliance Operations Log</h4>
          <p className="text-xs text-text-secondary mt-0.5">Chronological record of user accounts suspensions, job listings reviews, and administrative status updates.</p>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="p-0 overflow-hidden border border-border-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-bg-elevated border-b border-border-subtle text-text-secondary text-xs">
                <th className="p-4">Action</th>
                <th className="p-4">Actor (Admin)</th>
                <th className="p-4">Target Type</th>
                <th className="p-4">Operation Details</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-text-secondary">No audit entries logged yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="border-b border-border-subtle hover:bg-bg-elevated/20 text-xs">
                    <td className="p-4 font-bold text-text-primary">
                      <Badge variant={
                        log.action.includes('SUSPEND') || log.action.includes('REJECT') ? 'danger' : 'success'
                      } className="text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-text-primary block">{log.actor?.name}</span>
                      <span className="text-[10px] text-text-muted">{log.actor?.email}</span>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-text-secondary">{log.targetType}</td>
                    <td className="p-4 text-text-secondary max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="p-4 text-text-muted font-mono text-[10px]">
                      {new Date(log.createdAt).toLocaleString()}
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

export default AuditLog;
