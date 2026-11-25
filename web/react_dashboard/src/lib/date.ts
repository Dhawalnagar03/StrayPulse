export const IST_TIMEZONE = 'Asia/Kolkata';

const hasTimezoneInfo = (value: string): boolean => /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);

export function parseApiDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = value.trim();
  if (!raw) return null;

  const normalized = hasTimezoneInfo(raw) ? raw : `${raw}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatInTimeZone(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
  timeZone = IST_TIMEZONE
): string {
  const date = parseApiDate(value);
  if (!date) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    ...options,
  }).format(date);
}

export function formatDateTimeIST(value: string | Date | null | undefined): string {
  return formatInTimeZone(value, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateIST(value: string | Date | null | undefined): string {
  return formatInTimeZone(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeIST(value: string | Date | null | undefined): string {
  return formatInTimeZone(value, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDayOnlyIST(value: string | Date | null | undefined): string {
  return formatInTimeZone(value, {
    month: 'short',
    day: 'numeric',
  });
}

export function getGreetingByIst(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      hour12: false,
    }).format(now)
  );

  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
