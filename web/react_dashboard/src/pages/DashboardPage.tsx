import { useEffect, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PawPrint, Eye, Target, TrendingUp, MapPin,
  Calendar, Brain, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { adminApi, animalsApi, predictionsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { Analytics } from '../types';
import { format } from 'date-fns';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6'];

const StatCard: FC<{ label: string; value: string | number; icon: any; color?: string; sub?: string }> = ({
  label, value, icon: Icon, color = 'text-primary-400', sub
}) => (
  <div className="stat-card">
    <div className="flex items-center justify-between mb-3">
      <p className="stat-label">{label}</p>
      <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="stat-value">{value.toLocaleString()}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-dark-700 border border-white/[0.08] rounded-xl px-3 py-2 text-sm">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-semibold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const DashboardPage: FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ['analytics'],
    queryFn: () => adminApi.analytics().then((r) => r.data),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: countData } = useQuery({
    queryKey: ['animals-count'],
    queryFn: () => animalsApi.count().then((r) => r.data),
  });

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-dashboard'],
    queryFn: () => animalsApi.list({ limit: 5 }).then((r) => r.data),
  });

  const { data: predictions = [] } = useQuery({
    queryKey: ['predictions-dashboard'],
    queryFn: () => predictionsApi.list(0.6).then((r) => r.data),
  });

  // Convert sightings_by_day to chart format
  const dayData = analytics
    ? Object.entries(analytics.sightings_by_day).map(([day, count]) => ({ day, count }))
    : [];

  const hourData = analytics
    ? Object.entries(analytics.sightings_by_hour)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([h, count]) => ({ hour: `${h}:00`, count }))
    : [];

  const pieData = analytics
    ? Object.entries(analytics.animal_distribution).map(([type, count], i) => ({
        name: type, value: count, fill: CHART_COLORS[i % CHART_COLORS.length]
      }))
    : [];

  if (analyticsLoading && isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="text-primary-400">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
        </div>
        <div className="badge-green">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-slow" />
          System Active
        </div>
      </div>

      {/* Stats grid */}
      {isAdmin && analytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Animals" value={analytics.total_animals} icon={PawPrint} color="text-primary-400" />
          <StatCard label="Total Sightings" value={analytics.total_sightings} icon={Eye} color="text-blue-400" />
          <StatCard label="Active Animals" value={analytics.active_animals} icon={Target} color="text-green-400" />
          <StatCard label="Today's Reports" value={analytics.todays_sightings} icon={Calendar} color="text-orange-400" />
          <StatCard label="Predictions" value={analytics.predictions_generated} icon={Brain} color="text-purple-400" />
          <StatCard label="High Confidence" value={analytics.high_confidence_predictions} icon={TrendingUp} color="text-teal-400" sub="≥70% confidence" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Animals Registered" value={countData?.count ?? animals.length} icon={PawPrint} />
          <StatCard label="High Conf. Predictions" value={predictions.length} icon={Brain} color="text-purple-400" />
          <StatCard label="Today" value={format(new Date(), 'MMM d')} icon={Calendar} color="text-orange-400" />
          <StatCard label="Your Sightings" value={user?.total_sightings ?? 0} icon={Eye} color="text-blue-400" />
        </div>
      )}

      {/* Charts row */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sightings by day */}
          <div className="card lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-4">Sightings by Day of Week</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dayData}>
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Animal distribution pie */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Animal Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sightings by hour */}
      {isAdmin && analytics && hourData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Sightings by Hour of Day</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={hourData}>
              <defs>
                <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} fill="url(#hourGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent animals + predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent animals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Animals</h3>
            <a href="/animals" className="text-xs text-primary-400 hover:text-primary-300">View all →</a>
          </div>
          <div className="space-y-3">
            {animals.slice(0, 5).map((a: any) => (
              <a key={a.animal_id} href={`/animals/${a.animal_id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-dark-700 border border-white/[0.08] flex items-center justify-center text-primary-400 font-bold text-xs overflow-hidden flex-shrink-0">
                  {a.primary_photo ? (
                    <img src={a.primary_photo} alt={a.animal_id} className="w-full h-full object-cover" />
                  ) : (
                    a.animal_type[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.animal_id}</p>
                  <p className="text-xs text-gray-500">{a.name_label || a.animal_type} • {a.total_sightings} sightings</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>
                  {a.status === 'Active' ? '🟢' : '⚫'} {a.status}
                </span>
              </a>
            ))}
            {animals.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No animals yet. Seed demo data first.</p>}
          </div>
        </div>

        {/* High-confidence predictions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">High-Confidence Predictions</h3>
            <span className="badge-purple"><Brain className="w-3 h-3" /> AI</span>
          </div>
          <div className="space-y-3">
            {predictions.filter((p: any) => p.confidence >= 0.6).slice(0, 4).map((p: any) => (
              <a key={`${p.animal_id}-${p.generated_at}`} href={`/animals/${p.animal_id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{p.animal_id}</p>
                  <p className="text-xs text-gray-500 truncate">{p.predicted_zone} · {p.time_start}–{p.time_end}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${p.confidence >= 0.75 ? 'text-primary-400' : 'text-orange-400'}`}>
                    {p.confidence_percent}%
                  </p>
                  <p className="text-[10px] text-gray-500">{p.confidence_label}</p>
                </div>
              </a>
            ))}
            {predictions.length === 0 && (
              <div className="text-center py-4">
                <Brain className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No predictions yet</p>
                <p className="text-gray-600 text-xs">Visit an animal profile to generate a prediction</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
