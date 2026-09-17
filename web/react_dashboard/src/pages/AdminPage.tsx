import { useState, type FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Users, AlertTriangle, Database, RefreshCw, TrendingUp, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import toast from 'react-hot-toast';

const AdminPage: FC = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'users' | 'models' | 'suspicious'>('overview');

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.analytics().then((r) => r.data),
    refetchInterval: 30000,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users().then((r) => r.data),
    enabled: tab === 'users',
  });
  const { data: models = [] } = useQuery({
    queryKey: ['model-versions'],
    queryFn: () => adminApi.modelVersions().then((r) => r.data),
    enabled: tab === 'models',
  });
  const { data: mlStatus } = useQuery({
    queryKey: ['ml-status'],
    queryFn: () => adminApi.mlStatus().then((r) => r.data),
    enabled: tab === 'models',
  });
  const { data: evalResults } = useQuery({
    queryKey: ['ml-eval'],
    queryFn: () => adminApi.mlEvaluation().then((r) => r.data),
    enabled: tab === 'models',
  });
  const { data: suspicious = [] } = useQuery({
    queryKey: ['suspicious'],
    queryFn: () => adminApi.suspicious().then((r) => r.data),
    enabled: tab === 'suspicious',
  });

  const trainMutation = useMutation({
    mutationFn: () => adminApi.triggerTraining().then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || 'Training triggered!');
      qc.invalidateQueries({ queryKey: ['ml-status'] });
    },
    onError: () => toast.error('Failed to trigger training'),
  });

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'models', label: 'ML Models', icon: Brain },
    { key: 'suspicious', label: 'Suspicious', icon: AlertTriangle },
  ] as const;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400 text-sm mt-0.5">System management and analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === key
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Animals', value: analytics.total_animals, color: 'text-primary-400' },
              { label: 'Total Sightings', value: analytics.total_sightings, color: 'text-blue-400' },
              { label: 'Predictions', value: analytics.predictions_generated, color: 'text-purple-400' },
              { label: "Today's Reports", value: analytics.todays_sightings, color: 'text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card">
                <p className="text-gray-400 text-sm">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Top Locations by Sighting Count</h3>
            <div className="space-y-2">
              {analytics.top_locations.slice(0, 5).map((loc: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6">{i + 1}.</span>
                  <p className="text-sm text-gray-300 flex-1 font-mono text-xs">{loc.zone}</p>
                  <div className="flex-1 confidence-bar">
                    <div className="confidence-fill bg-primary-500"
                      style={{ width: `${(loc.count / (analytics.top_locations[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-white w-8 text-right">{loc.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Registered Users ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>{['Name', 'Email', 'Role', 'Status', 'Sightings', 'Joined'].map((h) => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell font-medium text-white">{u.name}</td>
                    <td className="table-cell text-xs">{u.email}</td>
                    <td className="table-cell">
                      <span className={u.role === 'admin' ? 'badge-red' : u.role === 'ngo' ? 'badge-blue' : 'badge-gray'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="table-cell">{u.total_sightings}</td>
                    <td className="table-cell text-xs">{u.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ML Models */}
      {tab === 'models' && (
        <div className="space-y-5">
          {/* Status */}
          <div className="card flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">ML Model Status</h3>
              {mlStatus && (
                <p className="text-xs text-gray-400 mt-1">
                  {mlStatus.status === 'ready'
                    ? `${mlStatus.model_name} v${mlStatus.version} • Accuracy: ${(mlStatus.accuracy * 100).toFixed(1)}%`
                    : 'No model trained yet'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={mlStatus?.status === 'ready' ? 'badge-green' : 'badge-orange'}>
                {mlStatus?.status === 'ready' ? <><CheckCircle2 className="w-3 h-3" /> Ready</> : 'No Model'}
              </span>
              <button
                onClick={() => trainMutation.mutate()}
                disabled={trainMutation.isPending}
                className="btn-secondary text-xs py-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${trainMutation.isPending ? 'animate-spin' : ''}`} />
                {trainMutation.isPending ? 'Training…' : 'Trigger Training'}
              </button>
            </div>
          </div>

          {/* Evaluation results */}
          {evalResults?.comparison && (
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Model Comparison</h3>
              </div>
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>{['Model', 'Accuracy', 'F1 Score', 'Avg Error (km)', 'Med Error (km)'].map((h) => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {evalResults.comparison.map((m: any, i: number) => (
                    <tr key={i} className={`table-row ${m.model_name === evalResults.best_model ? 'bg-primary-500/5' : ''}`}>
                      <td className="table-cell font-medium">
                        {m.model_name}
                        {m.model_name === evalResults.best_model && <span className="badge-green ml-2 text-[10px]">Best</span>}
                      </td>
                      <td className="table-cell">{m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : '—'}</td>
                      <td className="table-cell">{m.f1_score ? (m.f1_score).toFixed(3) : '—'}</td>
                      <td className="table-cell">{m.mean_distance_error_km?.toFixed(2) || '—'}</td>
                      <td className="table-cell">{m.median_distance_error_km?.toFixed(2) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!evalResults && (
            <div className="card text-center py-10">
              <Brain className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No evaluation results found.</p>
              <p className="text-gray-600 text-sm mt-1">Run training pipeline first: <code className="text-primary-400">python ml/run_pipeline.py</code></p>
            </div>
          )}
        </div>
      )}

      {/* Suspicious sightings */}
      {tab === 'suspicious' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Suspicious Sightings ({suspicious.length})
            </h3>
          </div>
          {suspicious.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-primary-400 mx-auto mb-3" />
              <p className="text-gray-300 font-medium">No suspicious sightings detected</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>{['Animal', 'Location', 'Reason', 'Time'].map((h) => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {suspicious.map((s: any) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell font-medium text-white">{s.animal_id}</td>
                    <td className="table-cell text-xs font-mono">{s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}</td>
                    <td className="table-cell text-orange-400 text-xs">{s.suspicious_reason}</td>
                    <td className="table-cell text-xs">{s.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
