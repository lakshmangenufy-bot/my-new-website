export type MedicationPeriod = 'morning' | 'afternoon' | 'night';
export type MedicationId = 'med1' | 'med2' | 'med3' | 'med4';

export interface MedicationReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  schedules: Record<MedicationPeriod, string>; // "HH:MM" 24-hour format
  snoozedUntil: Partial<Record<MedicationPeriod, number>>;
  lastTriggeredDate: Partial<Record<MedicationPeriod, string>>;
}

export const DEFAULT_MED_REMINDER_SETTINGS: MedicationReminderSettings = {
  enabled: true,
  soundEnabled: true,
  voiceEnabled: true,
  schedules: {
    morning: '08:00',
    afternoon: '13:30',
    night: '21:00',
  },
  snoozedUntil: {},
  lastTriggeredDate: {},
};

export interface PeriodMedicationMeta {
  period: MedicationPeriod;
  label_ta: string;
  label_en: string;
  context_ta: string;
  context_en: string;
  medIds: MedicationId[];
}

export const PERIOD_METADATA: Record<MedicationPeriod, PeriodMedicationMeta> = {
  morning: {
    period: 'morning',
    label_ta: 'காலை மருந்துகள்',
    label_en: 'Morning Medications',
    context_ta: 'உணவுக்குப் பின்',
    context_en: 'After breakfast',
    medIds: ['med1', 'med2'],
  },
  afternoon: {
    period: 'afternoon',
    label_ta: 'மதியம் மருந்துகள்',
    label_en: 'Afternoon Medications',
    context_ta: 'மதிய உணவுக்குப் பின்',
    context_en: 'After lunch',
    medIds: ['med3'],
  },
  night: {
    period: 'night',
    label_ta: 'இரவு மருந்துகள்',
    label_en: 'Night Medications',
    context_ta: 'தூங்கும் முன்',
    context_en: 'Before sleep',
    medIds: ['med4'],
  },
};

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerMedNotificationWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw-meds.js', { scope: '/' });
    return swRegistration;
  } catch {
    return null;
  }
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    await registerMedNotificationWorker();
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

export function parseHHMMToMinutes(hhmm: string): number {
  const parts = (hhmm || '').split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.max(0, Math.min(23, h)) * 60 + Math.max(0, Math.min(59, m));
}

export function formatTimeDisplay(hhmm: string): string {
  const parts = (hhmm || '08:00').split(':');
  const hour24 = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return hhmm;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minPadded = String(minute).padStart(2, '0');
  return `${hour12}:${minPadded} ${suffix}`;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPendingMedIdsForPeriod(
  period: MedicationPeriod,
  medications: Record<MedicationId, boolean>
): MedicationId[] {
  return PERIOD_METADATA[period].medIds.filter((id) => !medications[id]);
}

export interface NextReminderInfo {
  period: MedicationPeriod;
  timeDisplay: string;
  hhmm: string;
  isOverdueToday: boolean;
  minutesDelta: number; // negative if overdue, >= 0 if upcoming
}

export function getNextPendingReminder(
  now: Date,
  settings: MedicationReminderSettings,
  medications: Record<MedicationId, boolean>
): NextReminderInfo | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const periods: MedicationPeriod[] = ['morning', 'afternoon', 'night'];

  const pendingPeriods = periods.filter((p) => getPendingMedIdsForPeriod(p, medications).length > 0);
  if (pendingPeriods.length === 0) return null;

  // Prefer the earliest upcoming pending slot today; if none left today, return overdue slot or tomorrow's earliest
  const enriched = pendingPeriods
    .map((p) => {
      const hhmm = settings.schedules[p] || DEFAULT_MED_REMINDER_SETTINGS.schedules[p];
      const targetMin = parseHHMMToMinutes(hhmm);
      return {
        period: p,
        hhmm,
        timeDisplay: formatTimeDisplay(hhmm),
        targetMin,
        delta: targetMin - nowMinutes,
      };
    })
    .sort((a, b) => a.targetMin - b.targetMin);

  const upcoming = enriched.find((item) => item.delta >= 0);
  if (upcoming) {
    return {
      period: upcoming.period,
      timeDisplay: upcoming.timeDisplay,
      hhmm: upcoming.hhmm,
      isOverdueToday: false,
      minutesDelta: upcoming.delta,
    };
  }

  // Otherwise show the overdue slot from earlier today
  const overdue = enriched[0];
  return {
    period: overdue.period,
    timeDisplay: overdue.timeDisplay,
    hhmm: overdue.hhmm,
    isOverdueToday: true,
    minutesDelta: overdue.delta,
  };
}

export function checkDueMedicationPeriod(
  now: Date,
  settings: MedicationReminderSettings,
  medications: Record<MedicationId, boolean>
): MedicationPeriod | null {
  if (!settings.enabled) return null;

  const nowMs = now.getTime();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = getLocalDateKey(now);
  const periods: MedicationPeriod[] = ['morning', 'afternoon', 'night'];

  // 1. Check any expired snooze first
  for (const period of periods) {
    const pending = getPendingMedIdsForPeriod(period, medications);
    if (pending.length === 0) continue;

    const snoozeTarget = settings.snoozedUntil[period];
    if (typeof snoozeTarget === 'number' && snoozeTarget > 0 && nowMs >= snoozeTarget) {
      return period;
    }
  }

  // 2. Check scheduled window (triggers within a 2-minute window of scheduled HH:MM)
  for (const period of periods) {
    const pending = getPendingMedIdsForPeriod(period, medications);
    if (pending.length === 0) continue;

    if (settings.lastTriggeredDate[period] === todayKey) continue;

    const scheduledMinutes = parseHHMMToMinutes(settings.schedules[period]);
    if (nowMinutes >= scheduledMinutes && nowMinutes <= scheduledMinutes + 2) {
      return period;
    }
  }

  return null;
}

export async function dispatchSystemMedicationNotification(
  period: MedicationPeriod,
  title: string,
  body: string,
  lang: 'ta' | 'en',
  onFallbackClick?: () => void
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const options: NotificationOptions & {
    actions?: Array<{ action: string; title: string }>;
    renotify?: boolean;
  } = {
    body,
    tag: `strokecare-med-${period}`,
    renotify: true,
    requireInteraction: true,
    data: { period },
    actions: [
      {
        action: 'mark_taken',
        title: lang === 'ta' ? 'உட்கொண்டேன்' : 'Mark Taken',
      },
      {
        action: 'snooze',
        title: lang === 'ta' ? '10 நிமிடம் தள்ளிவை' : 'Snooze 10m',
      },
    ],
  };

  try {
    if (!swRegistration) {
      await registerMedNotificationWorker();
    }
    if (swRegistration && swRegistration.showNotification) {
      await swRegistration.showNotification(title, options);
      return true;
    }
  } catch {
    // Fallback to standard Notification constructor
  }

  try {
    const notif = new Notification(title, {
      body,
      tag: `strokecare-med-${period}`,
      requireInteraction: true,
    });
    notif.onclick = () => {
      window.focus();
      if (onFallbackClick) onFallbackClick();
      notif.close();
    };
    return true;
  } catch {
    return false;
  }
}
