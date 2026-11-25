export type NotificationCategory = 'AI' | 'GPS' | 'System';

export type NotificationItem = {
  id: string;
  title: string;
  text: string;
  time: string;
  createdAt: number;
  read: boolean;
  category: NotificationCategory;
  dedupeKey?: string;
};

export const NOTIFICATIONS_STORAGE_KEY = 'straypulse-notifications';
const NOTIFICATION_EVENT_NAME = 'straypulse:notifications-updated';
const CONNECTION_STATUS_STORAGE_KEY = 'straypulse-connection-status';
const DEFAULT_DEDUPE_WINDOW_MS = 60_000;

const formatNotificationTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const emitUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT_NAME));
};

export const readNotifications = (): NotificationItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addNotification = ({
  title,
  text,
  category = 'System',
  dedupeKey,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
}: {
  title: string;
  text: string;
  category?: NotificationCategory;
  dedupeKey?: string;
  dedupeWindowMs?: number;
}) => {
  const now = Date.now();
  const notifications = readNotifications();
  const key = dedupeKey || `${title}|${text}`;

  const recentDuplicate = notifications.find((notification) => {
    if (notification.dedupeKey !== key) return false;
    return now - notification.createdAt <= dedupeWindowMs;
  });

  if (recentDuplicate) {
    return recentDuplicate;
  }

  const nextItem: NotificationItem = {
    id: `notification-${now}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    text,
    time: formatNotificationTime(now),
    createdAt: now,
    read: false,
    category,
    dedupeKey: key,
  };

  const nextNotifications = [nextItem, ...notifications].slice(0, 30);
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(nextNotifications));
  emitUpdate();
  return nextItem;
};

export const markNotificationRead = (id: string) => {
  const notifications = readNotifications();
  const nextNotifications = notifications.map((notification) => {
    if (notification.id === id) {
      return { ...notification, read: true };
    }
    return notification;
  });

  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(nextNotifications));
  emitUpdate();
  return nextNotifications;
};

export const markAllNotificationsRead = () => {
  const notifications = readNotifications();
  const nextNotifications = notifications.map((notification) => ({ ...notification, read: true }));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(nextNotifications));
  emitUpdate();
  return nextNotifications;
};

export const clearNotifications = () => {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
  emitUpdate();
  return [] as NotificationItem[];
};

export const getUnreadNotificationCount = () => readNotifications().filter((notification) => !notification.read).length;

export const getNotificationEventName = () => NOTIFICATION_EVENT_NAME;

export const notifyConnectionStatus = ({
  service,
  status,
  message,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
}: {
  service: NotificationCategory;
  status: 'connected' | 'disconnected' | 'reconnected' | 'retrying';
  message: string;
  dedupeWindowMs?: number;
}) => {
  if (typeof window === 'undefined') return null;

  const previous = (() => {
    try {
      const raw = localStorage.getItem(CONNECTION_STATUS_STORAGE_KEY);
      if (!raw) return {} as Record<string, { status: string; message: string; timestamp: number }>;
      return JSON.parse(raw) as Record<string, { status: string; message: string; timestamp: number }>;
    } catch {
      return {} as Record<string, { status: string; message: string; timestamp: number }>;
    }
  })();

  const key = `${service}`;
  const previousState = previous[key];
  const now = Date.now();

  if (previousState && previousState.status === status && now - previousState.timestamp <= dedupeWindowMs) {
    return null;
  }

  const result = addNotification({
    title: `${service} connection`,
    text: message,
    category: service,
    dedupeKey: `connection:${service}:${status}`,
    dedupeWindowMs,
  });

  previous[key] = { status, message, timestamp: now };
  localStorage.setItem(CONNECTION_STATUS_STORAGE_KEY, JSON.stringify(previous));
  emitUpdate();
  return result;
};
