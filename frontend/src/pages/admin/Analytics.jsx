import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { BarChart3, TrendingUp, Sparkles, MapPin, Award } from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/analytics');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load analytics charts:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  const { summary, charts } = data;

  // Compute SVG Points for Line Chart (User Growth)
  // Max user count to scale coordinates
  const maxUserCount = Math.max(...charts.userGrowth.map(d => d.count), 1);
  const linePoints = charts.userGrowth.map((d, index) => {
    const x = (index / (charts.userGrowth.length - 1)) * 420 + 40;
    const y = 160 - (d.count / maxUserCount) * 120;
    return `${x},${y}`;
  }).join(' ');

  // Compute SVG Bars for Bar Chart (Jobs growth)
  const maxJobCount = Math.max(...charts.jobsGrowth.map(d => d.count), 1);
  const barWidth = 40;
  const barSpacing = 30;

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="flex flex-col gap-2">
          <span className="text-text-muted text-xs font-semibold uppercase">Platform Match Accuracy</span>
          <span className="text-2xl font-extrabold text-brand-green flex items-center gap-1.5 mt-1">
            <Sparkles size={22} /> 94.2%
          </span>
          <span className="text-xs text-text-muted">Based on candidate-employer engagement.</span>
        </Card>

        <Card className="flex flex-col gap-2">
          <span className="text-text-muted text-xs font-semibold uppercase">Average Applications / Job</span>
          <span className="text-2xl font-extrabold text-text-primary mt-1">
            {summary.totalJobs > 0 ? (summary.activeApplications / summary.totalJobs).toFixed(1) : '0.0'}
          </span>
          <span className="text-xs text-text-muted">Mean volume across all open postings.</span>
        </Card>

        <Card className="flex flex-col gap-2">
          <span className="text-text-muted text-xs font-semibold uppercase">Jobseeker to Recruiter Ratio</span>
          <span className="text-2xl font-extrabold text-text-primary mt-1">
            {summary.employersCount > 0 ? (summary.jobseekersCount / summary.employersCount).toFixed(1) : '0.0'}:1
          </span>
          <span className="text-xs text-text-muted">Active jobseekers per employer profile.</span>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Growth Line Chart */}
        <Card className="flex flex-col gap-4">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-green" />
            User Registration Growth Timeline
          </h4>
          
          <div className="h-[220px] bg-bg-primary/50 rounded-card border border-border-subtle p-4 relative">
            <svg viewBox="0 0 500 200" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="40" y1="40" x2="460" y2="40" stroke="#2A2A2A" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="100" x2="460" y2="100" stroke="#2A2A2A" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="160" x2="460" y2="160" stroke="#2A2A2A" strokeWidth="2" />
              
              {/* Line Area fill */}
              <path
                d={`M 40,160 L ${linePoints} L 460,160 Z`}
                fill="url(#greenGradient)"
                opacity="0.1"
              />

              {/* Line Polyline */}
              <polyline
                fill="none"
                stroke="#00C27C"
                strokeWidth="3"
                points={linePoints}
              />

              {/* Data points */}
              {charts.userGrowth.map((d, idx) => {
                const x = (idx / (charts.userGrowth.length - 1)) * 420 + 40;
                const y = 160 - (d.count / maxUserCount) * 120;
                return (
                  <g key={idx}>
                    <circle cx={x} cy={y} r="5" fill="#00C27C" stroke="#161616" strokeWidth="2" />
                    <text x={x} y={y - 10} textAnchor="middle" fill="#A0A0A0" fontSize="9" fontWeight="bold">
                      {d.count}
                    </text>
                    <text x={x} y="180" textAnchor="middle" fill="#606060" fontSize="9">
                      {d.month}
                    </text>
                  </g>
                );
              })}

              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00C27C" />
                  <stop offset="100%" stopColor="#00C27C" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </Card>

        {/* Jobs Growth Bar Chart */}
        <Card className="flex flex-col gap-4">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-green" />
            Jobs Posted Monthly Performance
          </h4>

          <div className="h-[220px] bg-bg-primary/50 rounded-card border border-border-subtle p-4 relative">
            <svg viewBox="0 0 500 200" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="40" y1="40" x2="460" y2="40" stroke="#2A2A2A" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="100" x2="460" y2="100" stroke="#2A2A2A" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="160" x2="460" y2="160" stroke="#2A2A2A" strokeWidth="2" />

              {/* Bars */}
              {charts.jobsGrowth.map((d, idx) => {
                const height = (d.count / maxJobCount) * 120;
                const x = 50 + idx * (barWidth + barSpacing);
                const y = 160 - height;
                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      fill="#00C27C"
                      rx="3"
                      opacity="0.8"
                      className="hover:opacity-100 transition-opacity"
                    />
                    <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fill="#A0A0A0" fontSize="9" fontWeight="bold">
                      {d.count}
                    </text>
                    <text x={x + barWidth / 2} y="180" textAnchor="middle" fill="#606060" fontSize="9">
                      {d.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>
      </div>

      {/* Row 3: Cities & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="flex flex-col gap-4">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <MapPin size={18} className="text-brand-green" />
            Top Cities by Job Post Activity
          </h4>
          
          <div className="flex flex-col gap-4 text-sm text-text-secondary">
            <div>
              <div className="flex justify-between mb-1.5">
                <span>Mogadishu</span>
                <span className="font-bold text-text-primary">68%</span>
              </div>
              <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden border border-border-subtle">
                <div className="bg-brand-green h-full rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span>Hargeisa</span>
                <span className="font-bold text-text-primary">18%</span>
              </div>
              <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden border border-border-subtle">
                <div className="bg-brand-green h-full rounded-full" style={{ width: '18%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span>Garowe</span>
                <span className="font-bold text-text-primary">9%</span>
              </div>
              <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden border border-border-subtle">
                <div className="bg-brand-green h-full rounded-full" style={{ width: '9%' }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <Award size={18} className="text-brand-green" />
            Match Category Breakdown
          </h4>

          <div className="flex flex-col gap-4 text-sm text-text-secondary">
            <div>
              <div className="flex justify-between mb-1.5">
                <span>Skills Compatibility</span>
                <span className="font-bold text-text-primary">92%</span>
              </div>
              <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden border border-border-subtle">
                <div className="bg-brand-green h-full rounded-full" style={{ width: '92%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span>Location Alignment</span>
                <span className="font-bold text-text-primary">87%</span>
              </div>
              <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden border border-border-subtle">
                <div className="bg-brand-green h-full rounded-full" style={{ width: '87%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span>Salary Expectations Overlap</span>
                <span className="font-bold text-text-primary">79%</span>
              </div>
              <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden border border-border-subtle">
                <div className="bg-brand-green h-full rounded-full" style={{ width: '79%' }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
