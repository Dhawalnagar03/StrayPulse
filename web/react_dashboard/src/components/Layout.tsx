import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PawPrint,
  Eye,
  MapPin,
  Brain,
  Utensils,
  BarChart3,
  Shield,
  Bell,
  LogOut,
  Menu,
  Search,
  User,
  Settings,
  ChevronDown,
  Check,
  SunMedium,
  MoonStar,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { animalsApi, authApi, envApi, feedingApi, sightingsApi } from '../lib/api';
import {
  clearNotifications,
  getNotificationEventName,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  readNotifications,
  type NotificationItem,
} from '../lib/notifications';
import type { Animal, EnvironmentalLocation, FeedingLocation, Sighting } from '../types';

const SETTINGS_STORAGE_KEY = 'straypulse-settings';

type ThemeMode = 'light' | 'dark';

type DisplaySettings = {
  compactMode: boolean;
  theme: ThemeMode;
};

const defaultSettings: DisplaySettings = {
  compactMode: false,
  theme: 'light',
};

const readSettings = (): DisplaySettings => {
  try {
    const serialized = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!serialized) return defaultSettings;
    const parsed = JSON.parse(serialized);
    return {
      ...defaultSettings,
      ...parsed,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return defaultSettings;
  }
};

const normalizeAccessRole = (role?: string | null) => {
  if (!role) return 'citizen';
  if (['individual', 'rescuer', 'volunteer', 'feeder'].includes(role)) return 'citizen';
  return role;
};

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'citizen', 'ngo', 'individual', 'rescuer', 'volunteer', 'feeder'] },
  { to: '/animals', icon: PawPrint, label: 'Animals', roles: ['admin', 'citizen', 'ngo', 'individual', 'rescuer', 'volunteer', 'feeder'] },
  { to: '/sightings', icon: Eye, label: 'Sightings', roles: ['admin', 'citizen', 'ngo', 'individual', 'rescuer', 'volunteer', 'feeder'] },
  { to: '/map', icon: MapPin, label: 'Map Explorer', roles: ['admin', 'citizen', 'ngo', 'individual', 'rescuer', 'volunteer', 'feeder'] },
  { to: '/predictions', icon: Brain, label: 'AI Predictions', roles: ['admin', 'citizen', 'ngo', 'individual', 'rescuer', 'volunteer', 'feeder'] },
  { to: '/feeding', icon: Utensils, label: 'Feeding Points', roles: ['admin', 'citizen', 'ngo', 'individual', 'rescuer', 'volunteer', 'feeder'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin'] },
];

const adminItems = [{ to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['admin'] }];

type SearchResultType = 'animals' | 'zones' | 'reports';

type SearchResultItem = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  path: string;
  badge: string;
};

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_DEFAULT_CENTER_LAT = 12.9716;
const SEARCH_DEFAULT_CENTER_LNG = 77.5946;

const normalizeSearchText = (value: string) => value.trim().toLowerCase();

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settings, setSettings] = useState<DisplaySettings>(readSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.colorScheme = settings.theme;
  }, [settings]);

  useEffect(() => {
    const syncNotifications = () => setNotificationItems(readNotifications());
    syncNotifications();

    const handleNotificationsUpdated = () => syncNotifications();
    window.addEventListener(getNotificationEventName(), handleNotificationsUpdated);

    return () => {
      window.removeEventListener(getNotificationEventName(), handleNotificationsUpdated);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) setNotificationOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(target)) setSettingsOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationOpen(false);
        setSettingsOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const trimmed = normalizeSearchText(searchQuery);

    if (!trimmed) {
      setSearchResults([]);
      setSearchError('');
      setSearchOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const runSearch = async () => {
        setSearchLoading(true);
        setSearchError('');
        setSearchOpen(true);

        try {
          const [animalResult, feedingResult, envResult, sightingsResult] = await Promise.allSettled([
            animalsApi.list({ search: trimmed, limit: 6 }),
            feedingApi.list(),
            envApi.list(),
            sightingsApi.getNearby(SEARCH_DEFAULT_CENTER_LAT, SEARCH_DEFAULT_CENTER_LNG, 25),
          ]);

          const nextResults: SearchResultItem[] = [];

          if (animalResult.status === 'fulfilled') {
            const animals = Array.isArray(animalResult.value.data) ? animalResult.value.data as Animal[] : [];
            animals.forEach((animal) => {
              const haystack = [
                animal.animal_id,
                animal.name_label || '',
                animal.animal_type || '',
                animal.breed || '',
                animal.color || '',
              ].join(' ').toLowerCase();

              if (haystack.includes(trimmed)) {
                nextResults.push({
                  id: animal.animal_id,
                  type: 'animals',
                  title: animal.name_label || animal.animal_id,
                  subtitle: `${animal.animal_id} • ${animal.animal_type} • ${animal.breed || 'Breed not set'}`,
                  path: `/animals/${animal.animal_id}`,
                  badge: 'Animal',
                });
              }
            });
          }

          if (feedingResult.status === 'fulfilled') {
            const feedingLocations = Array.isArray(feedingResult.value.data) ? feedingResult.value.data as FeedingLocation[] : [];
            feedingLocations.forEach((location) => {
              const haystack = [location.name, location.notes || '', location.animal_ids.join(' ')].join(' ').toLowerCase();
              if (haystack.includes(trimmed)) {
                nextResults.push({
                  id: location.id,
                  type: 'zones',
                  title: location.name,
                  subtitle: `${location.feeding_time || 'Feeding point'} • ${location.animal_ids.length} linked animal(s)`,
                  path: '/feeding',
                  badge: 'Zone',
                });
              }
            });
          }

          if (envResult.status === 'fulfilled') {
            const envLocations = Array.isArray(envResult.value.data) ? envResult.value.data as EnvironmentalLocation[] : [];
            envLocations.forEach((location) => {
              const haystack = [location.name, location.env_type, location.description || ''].join(' ').toLowerCase();
              if (haystack.includes(trimmed)) {
                nextResults.push({
                  id: location.id,
                  type: 'zones',
                  title: location.name,
                  subtitle: `${location.env_type} • ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
                  path: '/map',
                  badge: 'Zone',
                });
              }
            });
          }

          if (sightingsResult.status === 'fulfilled') {
            const sightings = Array.isArray(sightingsResult.value.data) ? sightingsResult.value.data as Sighting[] : [];
            sightings.forEach((sighting) => {
              const haystack = [
                sighting.animal_id,
                sighting.zone_id || '',
                sighting.notes || '',
                sighting.time_of_day || '',
                sighting.verification_status || '',
              ].join(' ').toLowerCase();

              if (haystack.includes(trimmed)) {
                nextResults.push({
                  id: sighting.id,
                  type: 'reports',
                  title: `Report for ${sighting.animal_id}`,
                  subtitle: `${sighting.zone_id || 'Unknown zone'} • ${new Date(sighting.timestamp).toLocaleDateString()} • ${sighting.verification_status}`,
                  path: '/sightings',
                  badge: 'Report',
                });
              }
            });
          }

          setSearchResults(nextResults);
          if (nextResults.length === 0) {
            setSearchError('No matching animals, zones, or reports were found.');
          }
        } catch {
          setSearchResults([]);
          setSearchError('Search is temporarily unavailable. Please try again in a moment.');
        } finally {
          setSearchLoading(false);
        }
      };

      void runSearch();
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors and redirect to login.
    }
    logout();
    navigate('/login');
  };

  const updateSetting = (key: keyof DisplaySettings, value: boolean | ThemeMode) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const accessRole = normalizeAccessRole(user?.role);
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(accessRole));
  const visibleAdminItems = adminItems.filter((item) => !item.roles || item.roles.includes(accessRole));
  const unreadNotificationCount = getUnreadNotificationCount();
  const notificationCategoryStyles: Record<string, string> = {
    AI: 'border-violet-200 bg-violet-50 text-violet-700',
    GPS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    System: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  const groupedSearchResults = {
    animals: searchResults.filter((item) => item.type === 'animals'),
    zones: searchResults.filter((item) => item.type === 'zones'),
    reports: searchResults.filter((item) => item.type === 'reports'),
  };

  const handleSearchSelection = (result: SearchResultItem) => {
    setSearchQuery('');
    setSearchOpen(false);
    setSearchResults([]);
    navigate(result.path);
  };

  const handleMarkNotificationRead = (notificationId: string) => {
    setNotificationItems(markNotificationRead(notificationId));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotificationItems(markAllNotificationsRead());
  };

  const handleClearNotifications = () => {
    setNotificationItems(clearNotifications());
  };

  const Sidebar = () => (
    <aside className="flex h-full w-72 flex-col border-r border-[#efe5dc] bg-[var(--page-surface)] px-4 py-5 text-[var(--text)]" style={{ borderColor: 'var(--line)' }}>
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dc2101] to-[#f15c3d] shadow-[0_12px_18px_rgba(220,33,1,0.22)]">
          <PawPrint className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight text-slate-900">StrayPulse</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#dc2101]">AI welfare ops</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {visibleNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}

        {visibleAdminItems.length > 0 && (
          <>
            <div className="my-3 border-t border-[#efe5dc]" />
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Management</p>
            {visibleAdminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-[#efe5dc] pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#f0e7df] bg-[var(--page-surface-soft)] px-3 py-2 shadow-sm" style={{ borderColor: 'var(--line)' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fbe8df] text-[#dc2101] ring-1 ring-inset ring-[#f1c9b5]">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost w-full justify-start rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--text)]" data-theme={settings.theme}>
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[#efe5dc] px-4 py-3 backdrop-blur-sm lg:px-6" style={{ backgroundColor: 'var(--page-surface)', borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-3 lg:hidden">
            <button type="button" onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 text-slate-700" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#dc2101] text-white">
                <PawPrint className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">StrayPulse</span>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-between lg:flex">
            <div ref={searchRef} className="relative block max-w-xl flex-1">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                  placeholder="Search animals, zones, or reports"
                  className="input w-full pl-11"
                  aria-label="Global search"
                  aria-expanded={searchOpen}
                  aria-controls="global-search-results"
                />
              </label>

              {searchOpen && (
                <div id="global-search-results" className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-[70] overflow-hidden rounded-2xl border border-[#efe5dc] shadow-[0_18px_45px_rgba(15,23,42,0.16)]" style={{ backgroundColor: 'var(--page-surface)', borderColor: 'var(--line)' }}>
                  <div className="border-b border-[#efe5dc] bg-[#fffaf6] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Search results
                  </div>

                  {searchLoading && (
                    <div className="flex items-center justify-center gap-3 px-4 py-6 text-sm text-slate-600">
                      <div className="spinner h-5 w-5" />
                      Searching registered animals, zones, and reports…
                    </div>
                  )}

                  {!searchLoading && searchError && (
                    <div className="px-4 py-5 text-sm text-slate-600">
                      <p className="font-medium text-slate-800">Search limitation</p>
                      <p className="mt-1">{searchError}</p>
                      <p className="mt-2 text-xs text-slate-500">This dashboard only supports the search endpoints currently exposed by the backend: animals plus available zone/report data.</p>
                    </div>
                  )}

                  {!searchLoading && !searchError && searchQuery.trim() && Object.values(groupedSearchResults).every((items) => items.length === 0) && (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                      <p>No matching animals, zones, or reports found.</p>
                      <p className="mt-2 text-xs text-slate-500">Backend limitation: the dashboard uses the supported animal, zone, and nearby report APIs only; there is no single global backend search endpoint.</p>
                    </div>
                  )}

                  {!searchLoading && !searchError && Object.values(groupedSearchResults).some((items) => items.length > 0) && (
                    <div className="max-h-[420px] overflow-y-auto">
                      {(['animals', 'zones', 'reports'] as SearchResultType[]).map((groupKey) => {
                        const items = groupedSearchResults[groupKey];
                        if (items.length === 0) return null;

                        const labelMap: Record<SearchResultType, string> = {
                          animals: 'Animals',
                          zones: 'Zones',
                          reports: 'Reports',
                        };

                        return (
                          <div key={groupKey} className="border-b border-[#f1e7df] last:border-b-0">
                            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{labelMap[groupKey]}</div>
                            {items.map((result) => (
                              <button
                                key={`${result.type}-${result.id}`}
                                type="button"
                                onClick={() => handleSearchSelection(result)}
                                className="flex w-full items-start justify-between gap-3 border-t border-[#f6efe8] px-4 py-3 text-left transition-colors hover:bg-[#fff8f3]"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-900">{result.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">{result.subtitle}</p>
                                </div>
                                <span className="shrink-0 rounded-full border border-[#f1d8c6] bg-[#fff3ee] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#c23d13]">
                                  {result.badge}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ml-5 flex items-center gap-3">
              <div ref={notificationRef} className="relative">
                <button
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={notificationOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setNotificationOpen((current) => !current);
                    setSettingsOpen(false);
                    setProfileOpen(false);
                  }}
                  className="btn-secondary relative h-11 w-11 justify-center rounded-xl p-0"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2101] px-1 text-[10px] font-semibold text-white">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-full z-[60] mt-3 w-[360px] overflow-hidden rounded-2xl border border-[#efe5dc] shadow-[0_18px_45px_rgba(15,23,42,0.16)]" style={{ backgroundColor: 'var(--page-surface)', borderColor: 'var(--line)' }}>
                    <div className="flex items-center justify-between border-b border-[#efe5dc] px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">Notifications</p>
                      <div className="flex items-center gap-2">
                        {notificationItems.length > 0 && (
                          <button type="button" onClick={handleMarkAllNotificationsRead} className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#dc2101] hover:text-[#b51d00]">
                            Mark all read
                          </button>
                        )}
                        {notificationItems.length > 0 && (
                          <button type="button" onClick={handleClearNotifications} className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 hover:text-slate-700">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[320px] overflow-auto" style={{ backgroundColor: 'var(--page-surface-soft)' }}>
                      {notificationItems.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet</div>
                      ) : (
                        notificationItems.map((notification) => (
                          <div
                            key={notification.id}
                            className={`border-b border-[#f0e7df] px-4 py-3 last:border-b-0 ${!notification.read ? 'bg-[#fffaf6]' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {!notification.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#dc2101]" />}
                                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${notificationCategoryStyles[notification.category] || 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                                    {notification.category}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{notification.time}</span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-600">{notification.text}</p>
                              </div>
                            </div>

                            {!notification.read && (
                              <div className="mt-3 flex justify-end">
                                <button type="button" onClick={() => handleMarkNotificationRead(notification.id)} className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#dc2101] hover:text-[#b51d00]">
                                  Mark as read
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div ref={settingsRef} className="relative">
                <button
                  type="button"
                  aria-label="Settings"
                  aria-expanded={settingsOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setSettingsOpen((current) => !current);
                    setNotificationOpen(false);
                    setProfileOpen(false);
                  }}
                  className="btn-secondary h-11 w-11 justify-center rounded-xl p-0"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {settingsOpen && (
                  <div className="settings-popover absolute right-0 top-full z-[60] mt-3 w-[280px] rounded-2xl border p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)]" role="dialog" aria-label="Settings">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="settings-popover-header-title text-sm font-semibold">Settings</p>
                      <Settings className="settings-popover-header-icon h-4 w-4" />
                    </div>

                    <div className="space-y-4">
                      <button
                        type="button"
                        aria-pressed={settings.compactMode}
                        onClick={() => updateSetting('compactMode', !settings.compactMode)}
                        className="settings-popover-row flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors"
                      >
                        <span className="settings-popover-label">Compact density</span>
                        <span className={`settings-popover-check flex h-5 w-5 items-center justify-center rounded-md border ${settings.compactMode ? 'is-checked' : ''}`}>
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>

                      <div className="settings-popover-section rounded-xl border p-2">
                        <div className="mb-2 flex items-center justify-between gap-3 px-1">
                          <p className="settings-popover-label text-sm font-medium">Theme</p>
                        </div>
                        <div className="settings-theme-group grid grid-cols-2 gap-2 rounded-xl p-1">
                          {[
                            { value: 'light', label: 'Light Mode', icon: SunMedium },
                            { value: 'dark', label: 'Dark Mode', icon: MoonStar },
                          ].map(({ value, label, icon: Icon }) => {
                            const isActive = settings.theme === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => updateSetting('theme', value as ThemeMode)}
                                className={`settings-theme-button flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                  isActive ? 'is-active' : ''
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  aria-label="User menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setProfileOpen((current) => !current);
                    setNotificationOpen(false);
                    setSettingsOpen(false);
                  }}
                  className="profile-menu-button flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#dc2101]/20"
                >
                  <div className="profile-menu-button-avatar flex h-8 w-8 items-center justify-center rounded-full text-[#dc2101]">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden text-left xl:block">
                    <p className="profile-menu-button-label text-sm font-semibold">{user?.name}</p>
                    <p className="profile-menu-button-meta text-[11px] capitalize">{user?.role}</p>
                  </div>
                  <ChevronDown className="profile-menu-button-icon hidden h-4 w-4 xl:block" />
                </button>

                {profileOpen && (
                  <div className="profile-menu-panel absolute right-0 top-full z-[60] mt-3 w-[240px] overflow-hidden rounded-2xl border shadow-[0_18px_45px_rgba(15,23,42,0.16)]" role="menu" aria-label="User account menu">
                    <div className="profile-menu-header border-b px-4 py-3">
                      <p className="profile-menu-header-label text-sm font-semibold">{user?.name}</p>
                      <p className="profile-menu-header-role mt-1 text-[11px] uppercase tracking-[0.16em]">{user?.role}</p>
                    </div>

                    <div className="p-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/dashboard');
                        }}
                        className="profile-menu-item flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors"
                        role="menuitem"
                      >
                        <User className="profile-menu-item-icon h-4 w-4" />
                        Dashboard
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="profile-menu-logout flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--page-bg)' }}>
          <div className={`mx-auto max-w-[1600px] ${settings.compactMode ? 'p-3 md:p-4' : 'p-4 md:p-6'}`}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
