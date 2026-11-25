import { type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { adminApi } from '../lib/api';
import type { Analytics } from '../types';

const CHART_COLORS = ['#2563eb', '#14b8a6', '#7c3aed', '#f59e0b', '#f472b6', '#22c55e'];

const AnalyticsPage: FC = () => {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ['analytics-page'],
    queryFn: () => adminApi.analytics().then((r) => r.data),
    refetchInterval: 30000,
  });

  const dailyData = analytics
    ? Object.entries(analytics.sightings_by_day).map(([day, count]) => ({ day, count }))
    : [];

  const hourlyData = analytics
    ? Object.entries(analytics.sightings_by_hour)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    : [];

  const distributionData = analytics
    ? Object.entries(analytics.animal_distribution).map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Overview</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Analytics</h1>
      </div>

      {isLoading ? (
        <div className="card flex min-h-[260px] items-center justify-center">
          <div className="spinner" />
        </div>
      ) : !analytics ? (
        <div className="card p-12 text-center text-slate-500">Analytics are not available yet.</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total animals', value: analytics.total_animals },
              { label: 'Sightings', value: analytics.total_sightings },
              { label: 'Active animals', value: analytics.active_animals },
              { label: 'High-confidence predictions', value: analytics.high_confidence_predictions },
            ].map((item) => (
              <div key={item.label} className="card p-5">
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="card p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Sightings by day</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Animal mix</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={2}>
                    {distributionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Sighting activity by hour</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={3} fill="url(#activityFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
