import { useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { adminApi } from '../lib/api';
import { formatDateIST } from '../lib/date';

type TabKey = 'overview' | 'users';

const AdminPage: FC = () => {
  const [tab, setTab] = useState<TabKey>('overview');

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.analytics().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users().then((r) => r.data),
    enabled: tab === 'users',
  });

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'users', label: 'Users', icon: Users },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Operations</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Admin Panel</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
          <BarChart3 className="h-4 w-4" />
          System health online
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="card flex min-h-[200px] items-center justify-center">
              <div className="spinner" />
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total animals', value: analytics.total_animals, color: 'text-blue-600' },
                  { label: 'Total sightings', value: analytics.total_sightings, color: 'text-sky-600' },
                  { label: 'Predictions', value: analytics.predictions_generated, color: 'text-violet-600' },
                  { label: "Today's reports", value: analytics.todays_sightings, color: 'text-amber-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card p-5">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="card p-5">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Top locations by sighting count</h3>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Updated live</span>
                </div>

                <div className="space-y-4">
                  {analytics.top_locations?.slice(0, 5).map((loc: { zone: string; count: number }, index: number) => (
                    <div key={`${loc.zone}-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{index + 1}. {loc.zone}</span>
                        <span className="text-slate-500">{loc.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${Math.max((loc.count / (analytics.top_locations[0]?.count || 1)) * 100, 12)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-slate-500">No analytics data available.</div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Registered users</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {users.length} total
            </span>
          </div>

          {usersLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <div className="spinner" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Sightings</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-t border-slate-200 text-sm text-slate-700">
                      <td className="px-5 py-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="px-5 py-3">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={u.role === 'admin' ? 'badge-red' : u.role === 'ngo' ? 'badge-blue' : 'badge-gray'}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-5 py-3">{u.total_sightings}</td>
                      <td className="px-5 py-3">{u.created_at ? formatDateIST(u.created_at) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
