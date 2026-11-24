import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  Check,
  ChevronRight,
  Download,
  Droplet,
  Dumbbell,
  Flame,
  Globe,
  HeartPulse,
  Languages,
  Menu,
  MessageSquare,
  Minus,
  NotebookPen,
  PhoneCall,
  Pill,
  Trash2,
  X,
} from 'lucide-react';
import {
  checkDueMedicationPeriod,
  DEFAULT_MED_REMINDER_SETTINGS,
  dispatchSystemMedicationNotification,
  formatTimeDisplay,
  getLocalDateKey,
  getNextPendingReminder,
  getPendingMedIdsForPeriod,
  MedicationId,
  MedicationPeriod,
  MedicationReminderSettings,
  PERIOD_METADATA,
  registerMedNotificationWorker,
  requestBrowserNotificationPermission,
} from './med-reminders';
import {
  EXERCISES_LIST,
  ExerciseId,
  HistoryEntry,
  Language,
  MEDICATION_ITEMS,
  RESOURCE_ARTICLES,
  ResourceId,
  SPEECH_WORDS,
  TextSizeMode,
  ThemeMode,
} from './data/rehabContent';
import { playSoftTone, speakBilingual } from './utils/audioSpeech';
import { downloadRecoverySummaryPdf } from './utils/recoveryPdfExport';
import type { BrainModeTab } from './components/BrainExplorerSection';
const BrainExplorerSection = lazy(() =>
  import('./components/BrainExplorerSection').then((m) => ({
    default: m.BrainExplorerSection,
  }))
);
const ChatbotSection = lazy(() =>
  import('./components/ChatbotSection').then((m) => ({
    default: m.ChatbotSection,
  }))
);
const GoogleTasksSection = lazy(() =>
  import('./components/GoogleTasksSection').then((m) => ({
    default: m.GoogleTasksSection,
  }))
);
import { ExercisesSection } from './components/ExercisesSection';
import { MedicationSection } from './components/MedicationSection';
import { HydrationSection, SpeechSection } from './components/HydrationSpeechSection';
import {
  CelebrationModal,
  FloatingAccessibilityMenu,
  LegalModal,
  MedAlertModal,
  PersonalizeModal,
  ResourceModal,
  SosModal,
} from './components/ModalsAndAccessibility';
import {
  AnimatedNumber,
  AppleHeroSection,
  ClinicalInsightsSection,
  FaqSection,
  FeaturesBentoSection,
  ScrollReveal,
  StrokeRecoveryJourneySection,
  StrokeRiskAwarenessSection,
} from './components/AppleStorySections';

interface AppState {
  language: Language;
  theme: ThemeMode;
  textSize: TextSizeMode;
  highContrast: boolean;
  profileName: string;
  caregiverName: string;
  caregiverPhone: string;
  recoveryFocus: 'mobility' | 'speech' | 'medications' | 'brain';
  exercises: Record<ExerciseId, boolean>;
  medications: Record<MedicationId, boolean>;
  waterCount: number;
  practicedSpeechIds: string[];
  exerciseHistory: HistoryEntry[];
  medicationHistory: HistoryEntry[];
  waterHistory: HistoryEntry[];
  medReminders: MedicationReminderSettings;
  activeDates: string[];
  dailyProgressByDate: Record<string, number>;
  dailyNotesByDate: Record<string, { text: string; updatedAt: string }>;
}

const STORAGE_KEY = 'strokecare_pro_state_v1';

const DEFAULT_STATE: AppState = {
  language: 'ta',
  theme: 'light',
  textSize: 'normal',
  highContrast: false,
  profileName: '',
  caregiverName: '',
  caregiverPhone: '',
  recoveryFocus: 'mobility',
  exercises: { ex1: false, ex2: false, ex3: false },
  medications: { med1: false, med2: false, med3: false, med4: false },
  waterCount: 0,
  practicedSpeechIds: [],
  exerciseHistory: [],
  medicationHistory: [],
  waterHistory: [],
  medReminders: {
    ...DEFAULT_MED_REMINDER_SETTINGS,
    schedules: { ...DEFAULT_MED_REMINDER_SETTINGS.schedules },
    snoozedUntil: {},
    lastTriggeredDate: {},
  },
  activeDates: [],
  dailyProgressByDate: {},
  dailyNotesByDate: {},
};

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_STATE;

    const parsedRem = parsed.medReminders && typeof parsed.medReminders === 'object' ? parsed.medReminders : {};
    const language: Language = parsed.language === 'en' ? 'en' : 'ta';
    const theme: ThemeMode = parsed.theme === 'dark' ? 'dark' : 'light';
    const textSize: TextSizeMode =
      parsed.textSize === 'large' || parsed.textSize === 'xl' ? parsed.textSize : 'normal';
    const recoveryFocus: AppState['recoveryFocus'] =
      parsed.recoveryFocus === 'speech' ||
      parsed.recoveryFocus === 'medications' ||
      parsed.recoveryFocus === 'brain'
        ? parsed.recoveryFocus
        : 'mobility';
    const rawWater = Number(parsed.waterCount);
    const waterCount = Number.isFinite(rawWater) ? Math.max(0, Math.min(8, Math.round(rawWater))) : 0;
    const profileName = typeof parsed.profileName === 'string' ? parsed.profileName.slice(0, 40) : '';
    const caregiverName = typeof parsed.caregiverName === 'string' ? parsed.caregiverName.slice(0, 40) : '';
    const caregiverPhone = typeof parsed.caregiverPhone === 'string' ? parsed.caregiverPhone.slice(0, 24) : '';

    return {
      ...DEFAULT_STATE,
      language,
      theme,
      textSize,
      highContrast: Boolean(parsed.highContrast),
      profileName,
      caregiverName,
      caregiverPhone,
      recoveryFocus,
      waterCount,
      exercises: {
        ex1: Boolean(parsed.exercises?.ex1),
        ex2: Boolean(parsed.exercises?.ex2),
        ex3: Boolean(parsed.exercises?.ex3),
      },
      medications: {
        med1: Boolean(parsed.medications?.med1),
        med2: Boolean(parsed.medications?.med2),
        med3: Boolean(parsed.medications?.med3),
        med4: Boolean(parsed.medications?.med4),
      },
      practicedSpeechIds: Array.isArray(parsed.practicedSpeechIds)
        ? parsed.practicedSpeechIds.filter((id: unknown): id is string => typeof id === 'string')
        : [],
      exerciseHistory: Array.isArray(parsed.exerciseHistory) ? parsed.exerciseHistory.slice(0, 50) : [],
      medicationHistory: Array.isArray(parsed.medicationHistory) ? parsed.medicationHistory.slice(0, 50) : [],
      waterHistory: Array.isArray(parsed.waterHistory) ? parsed.waterHistory.slice(0, 50) : [],
      activeDates: Array.isArray(parsed.activeDates)
        ? parsed.activeDates.filter((d: unknown): d is string => typeof d === 'string').slice(-35)
        : [],
      dailyProgressByDate:
        parsed.dailyProgressByDate && typeof parsed.dailyProgressByDate === 'object'
          ? parsed.dailyProgressByDate
          : {},
      dailyNotesByDate:
        parsed.dailyNotesByDate && typeof parsed.dailyNotesByDate === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.dailyNotesByDate)
                .filter(
                  ([k, v]) =>
                    /^\d{4}-\d{2}-\d{2}$/.test(k) &&
                    v &&
                    typeof v === 'object' &&
                    typeof (v as { text?: unknown }).text === 'string' &&
                    (v as { text: string }).text.trim().length > 0
                )
                .slice(-60)
                .map(([k, v]) => [
                  k,
                  {
                    text: (v as { text: string }).text.slice(0, 240),
                    updatedAt:
                      typeof (v as { updatedAt?: unknown }).updatedAt === 'string'
                        ? (v as { updatedAt: string }).updatedAt.slice(0, 32)
                        : '',
                  },
                ])
            )
          : {},
      medReminders: {
        ...DEFAULT_MED_REMINDER_SETTINGS,
        enabled: parsedRem.enabled !== undefined ? Boolean(parsedRem.enabled) : true,
        soundEnabled: parsedRem.soundEnabled !== undefined ? Boolean(parsedRem.soundEnabled) : true,
        voiceEnabled: parsedRem.voiceEnabled !== undefined ? Boolean(parsedRem.voiceEnabled) : true,
        schedules: {
          ...DEFAULT_MED_REMINDER_SETTINGS.schedules,
          ...(parsedRem.schedules || {}),
        },
        snoozedUntil: { ...(parsedRem.snoozedUntil || {}) },
        lastTriggeredDate: { ...(parsedRem.lastTriggeredDate || {}) },
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getCurrentWeekDays(
  lang: Language
): Array<{ dateKey: string; shortLabel: string; fullLabel: string; isToday: boolean; isFuture: boolean }> {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const locale = lang === 'ta' ? 'ta-IN' : 'en-US';
  const days: Array<{
    dateKey: string;
    shortLabel: string;
    fullLabel: string;
    isToday: boolean;
    isFuture: boolean;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    days.push({
      dateKey: getLocalDateKey(d),
      shortLabel: d.toLocaleDateString(locale, { weekday: 'short' }),
      fullLabel: d.toLocaleDateString(locale, { weekday: 'long' }),
      isToday: i === mondayOffset,
      isFuture: i > mondayOffset,
    });
  }
  return days;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [brainTab, setBrainTab] = useState<BrainModeTab>('anatomy');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [sosOpen, setSosOpen] = useState(false);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [resourceModalId, setResourceModalId] = useState<ResourceId | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'disclaimer' | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const hasCelebratedRef = useRef(false);

  const [alertModalPeriod, setAlertModalPeriod] = useState<MedicationPeriod | null>(null);
  const [alertBannerPeriod, setAlertBannerPeriod] = useState<MedicationPeriod | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [toast, setToast] = useState<{ msg: string; variant: 'teal' | 'success' | 'warning' | 'danger' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const isTa = state.language === 'ta';

  const notify = (
    msgTa: string,
    msgEn: string,
    variant: 'teal' | 'success' | 'warning' | 'danger' = 'teal'
  ) => {
    setToast({ msg: isTa ? msgTa : msgEn, variant });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Close open dialogs or mobile menu on Escape key for keyboard accessibility
  useEffect(() => {
    const hasOpenOverlay =
      mobileMenuOpen ||
      sosOpen ||
      personalizeOpen ||
      resourceModalId !== null ||
      legalModalType !== null ||
      celebrationOpen ||
      alertModalPeriod !== null;
    if (!hasOpenOverlay) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sosOpen) setSosOpen(false);
      else if (alertModalPeriod !== null) setAlertModalPeriod(null);
      else if (personalizeOpen) setPersonalizeOpen(false);
      else if (resourceModalId !== null) setResourceModalId(null);
      else if (legalModalType !== null) setLegalModalType(null);
      else if (celebrationOpen) setCelebrationOpen(false);
      else if (mobileMenuOpen) setMobileMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    mobileMenuOpen,
    sosOpen,
    personalizeOpen,
    resourceModalId,
    legalModalType,
    celebrationOpen,
    alertModalPeriod,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }

    const root = document.documentElement;
    root.lang = state.language;
    root.classList.toggle('dark', state.theme === 'dark');
    root.classList.toggle('high-contrast', state.highContrast);
    root.classList.remove('text-size-normal', 'text-size-large', 'text-size-xl');
    root.classList.add(`text-size-${state.textSize}`);
  }, [state]);

  const recordActivityToday = (prevDates: string[]): string[] => {
    const todayKey = getLocalDateKey();
    if (prevDates.includes(todayKey)) return prevDates;
    return [...prevDates.slice(-29), todayKey];
  };

  // Real progress math
  const exDone = Object.values(state.exercises).filter(Boolean).length;
  const medDone = Object.values(state.medications).filter(Boolean).length;
  const waterGoalMet = state.waterCount >= 8 ? 1 : 0;
  const speechGoalMet = state.practicedSpeechIds.length >= 3 ? 1 : 0;
  const finishedMilestones = exDone + medDone + waterGoalMet + speechGoalMet;
  const totalMilestones = 9;
  const progressPct = Math.round((finishedMilestones / totalMilestones) * 100);

  const todayDateKey = getLocalDateKey();
  const [selectedNoteDateKey, setSelectedNoteDateKey] = useState<string>(() => todayDateKey);
  const [noteDraft, setNoteDraft] = useState<string>(
    () => state.dailyNotesByDate[todayDateKey]?.text ?? ''
  );

  useEffect(() => {
    setNoteDraft(state.dailyNotesByDate[selectedNoteDateKey]?.text ?? '');
  }, [selectedNoteDateKey, state.dailyNotesByDate]);

  useEffect(() => {
    setState((prev) => {
      if (prev.dailyProgressByDate[todayDateKey] === progressPct) return prev;
      const retained = Object.entries(prev.dailyProgressByDate).slice(-34);
      const nextMap = Object.fromEntries(retained);
      nextMap[todayDateKey] = progressPct;
      return { ...prev, dailyProgressByDate: nextMap };
    });
  }, [progressPct, todayDateKey]);

  useEffect(() => {
    if (progressPct === 100 && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      setCelebrationOpen(true);
      playSoftTone(523, 0.2);
      setTimeout(() => playSoftTone(659, 0.2), 160);
      setTimeout(() => playSoftTone(784, 0.32), 320);
    } else if (progressPct < 100) {
      hasCelebratedRef.current = false;
    }
  }, [progressPct]);

  // Medication scheduler
  const stateRef = useRef(state);
  stateRef.current = state;

  const triggerMedAlert = async (period: MedicationPeriod, isTest = false) => {
    const current = stateRef.current;
    const taMode = current.language === 'ta';
    const meta = PERIOD_METADATA[period];
    const scheduledStr = formatTimeDisplay(current.medReminders.schedules[period]);
    const pendingIds = getPendingMedIdsForPeriod(period, current.medications);
    const displayIds = pendingIds.length > 0 ? pendingIds : meta.medIds;
    const medNamesList = MEDICATION_ITEMS.filter((m) => displayIds.includes(m.id))
      .map((m) => (taMode ? m.name_ta : m.name_en))
      .join(', ');

    if (!isTest) {
      setState((prev) => {
        const nextSnooze = { ...prev.medReminders.snoozedUntil };
        delete nextSnooze[period];
        return {
          ...prev,
          medReminders: {
            ...prev.medReminders,
            lastTriggeredDate: {
              ...prev.medReminders.lastTriggeredDate,
              [period]: getLocalDateKey(),
            },
            snoozedUntil: nextSnooze,
          },
        };
      });
    }

    setAlertBannerPeriod(period);
    setAlertModalPeriod(period);

    if (current.medReminders.soundEnabled) {
      playSoftTone(587, 0.18);
      setTimeout(() => playSoftTone(784, 0.22), 180);
      setTimeout(() => playSoftTone(880, 0.28), 380);
      if (current.medReminders.voiceEnabled) {
        setTimeout(() => {
          speakBilingual(
            `நினைவூட்டல். இது ${meta.label_ta} உட்கொள்ளும் நேரம். ${medNamesList}.`,
            `Medication reminder. It is time for your ${meta.label_en}. ${medNamesList}.`,
            current.language,
            0.9
          );
        }, 620);
      }
    }

    const notifTitle = taMode ? `💊 ${meta.label_ta} · ${scheduledStr}` : `💊 ${meta.label_en} · ${scheduledStr}`;
    const notifBody = taMode ? `உட்கொள்ளவும்: ${medNamesList}` : `Please take: ${medNamesList}`;
    await dispatchSystemMedicationNotification(period, notifTitle, notifBody, current.language, () => {
      document.getElementById('medicine-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  useEffect(() => {
    registerMedNotificationWorker();

    const checkSchedule = () => {
      const curr = stateRef.current;
      const due = checkDueMedicationPeriod(new Date(), curr.medReminders, curr.medications);
      if (due) {
        triggerMedAlert(due, false);
      }
    };

    checkSchedule();
    const intervalId = window.setInterval(checkSchedule, 15000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkSchedule();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onSwMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || payload.type !== 'MED_ALERT_ACTION') return;
      const period = (payload.period as MedicationPeriod) || 'morning';
      if (payload.action === 'mark_taken') {
        handleMarkPeriodTaken(period);
      } else if (payload.action === 'snooze') {
        handleSnoozeMedAlert(period, 10);
      } else {
        document.getElementById('medicine-section')?.scrollIntoView({ behavior: 'smooth' });
        triggerMedAlert(period, true);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, []);

  // Handlers
  const handleToggleLanguage = () => {
    setState((prev) => ({ ...prev, language: prev.language === 'ta' ? 'en' : 'ta' }));
    notify('மொழி தமிழுக்கு மாற்றப்பட்டது', 'Switched to English', 'teal');
  };

  const handleCycleTextSize = () => {
    setState((prev) => {
      const next: TextSizeMode =
        prev.textSize === 'normal' ? 'large' : prev.textSize === 'large' ? 'xl' : 'normal';
      return { ...prev, textSize: next };
    });
    notify('எழுத்து அளவு மாற்றப்பட்டது', 'Text size adjusted', 'teal');
  };

  const handleToggleHighContrast = () => {
    setState((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const handleToggleTheme = () => {
    setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const handleToggleExerciseDone = (exId: ExerciseId) => {
    setState((prev) => {
      const nextVal = !prev.exercises[exId];
      const nextHistory = nextVal
        ? [
            {
              id: `${exId}-${Date.now()}`,
              label_ta:
                exId === 'ex1'
                  ? 'கை விரல் பயிற்சி'
                  : exId === 'ex2'
                  ? 'கால் மற்றும் நடை பயிற்சி'
                  : 'முக புன்னகை பயிற்சி',
              label_en:
                exId === 'ex1'
                  ? 'Hand & Finger Mobility'
                  : exId === 'ex2'
                  ? 'Leg & Walking Strength'
                  : 'Facial & Smile Symmetry',
              time: getCurrentTimeLabel(),
            },
            ...prev.exerciseHistory,
          ]
        : prev.exerciseHistory;
      if (nextVal) playSoftTone(880, 0.22);
      return {
        ...prev,
        exercises: { ...prev.exercises, [exId]: nextVal },
        exerciseHistory: nextHistory,
        activeDates: nextVal ? recordActivityToday(prev.activeDates) : prev.activeDates,
      };
    });
  };

  const handleToggleMedication = (medId: MedicationId, taken: boolean) => {
    const medMeta = MEDICATION_ITEMS.find((m) => m.id === medId);
    playSoftTone(taken ? 680 : 440, 0.16);
    setState((prev) => {
      const nextMeds = { ...prev.medications, [medId]: taken };
      const nextHistory =
        taken && medMeta
          ? [
              {
                id: `${medId}-${Date.now()}`,
                label_ta: medMeta.name_ta,
                label_en: medMeta.name_en,
                time: getCurrentTimeLabel(),
              },
              ...prev.medicationHistory,
            ]
          : prev.medicationHistory;

      if (alertBannerPeriod && getPendingMedIdsForPeriod(alertBannerPeriod, nextMeds).length === 0) {
        setAlertBannerPeriod(null);
      }
      if (alertModalPeriod && getPendingMedIdsForPeriod(alertModalPeriod, nextMeds).length === 0) {
        setAlertModalPeriod(null);
      }

      return {
        ...prev,
        medications: nextMeds,
        medicationHistory: nextHistory,
        activeDates: taken ? recordActivityToday(prev.activeDates) : prev.activeDates,
      };
    });
    if (medMeta) {
      notify(
        taken ? `${medMeta.name_ta} குறிக்கப்பட்டது` : 'மாற்றம் செய்யப்பட்டது (Undo)',
        taken ? `Marked ${medMeta.name_en} taken` : `Undid ${medMeta.name_en}`,
        taken ? 'success' : 'teal'
      );
    }
  };

  const handleMarkPeriodTaken = (period: MedicationPeriod) => {
    const ids = PERIOD_METADATA[period].medIds;
    playSoftTone(784, 0.24);
    setState((prev) => {
      const nextMeds = { ...prev.medications };
      const addedLogs: HistoryEntry[] = [];
      ids.forEach((id) => {
        if (!nextMeds[id]) {
          nextMeds[id] = true;
          const meta = MEDICATION_ITEMS.find((m) => m.id === id);
          if (meta) {
            addedLogs.push({
              id: `${id}-${Date.now()}-${Math.random()}`,
              label_ta: meta.name_ta,
              label_en: meta.name_en,
              time: getCurrentTimeLabel(),
            });
          }
        }
      });
      const nextSnooze = { ...prev.medReminders.snoozedUntil };
      delete nextSnooze[period];

      return {
        ...prev,
        medications: nextMeds,
        medicationHistory: [...addedLogs, ...prev.medicationHistory],
        activeDates: addedLogs.length > 0 ? recordActivityToday(prev.activeDates) : prev.activeDates,
        medReminders: {
          ...prev.medReminders,
          snoozedUntil: nextSnooze,
          lastTriggeredDate: {
            ...prev.medReminders.lastTriggeredDate,
            [period]: getLocalDateKey(),
          },
        },
      };
    });
    setAlertBannerPeriod(null);
    setAlertModalPeriod(null);
    notify('மாத்திரைகள் உட்கொண்டதாகக் குறிக்கப்பட்டது!', 'Medications marked as taken!', 'success');
  };

  const handleSnoozeMedAlert = (period: MedicationPeriod, minutes = 10) => {
    setState((prev) => ({
      ...prev,
      medReminders: {
        ...prev.medReminders,
        snoozedUntil: {
          ...prev.medReminders.snoozedUntil,
          [period]: Date.now() + minutes * 60 * 1000,
        },
      },
    }));
    setAlertModalPeriod(null);
    notify(
      `${minutes} நிமிடங்களுக்குப் பிறகு மீண்டும் நினைவூட்டப்படும்.`,
      `Snoozed — reminding again in ${minutes} minutes.`,
      'warning'
    );
  };

  const handleRequestPushPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setState((prev) => ({
      ...prev,
      medReminders: { ...prev.medReminders, enabled: true },
    }));
    if (perm === 'granted') {
      playSoftTone(784, 0.2);
      notify('உலாவி மாத்திரை நினைவூட்டல் இயக்கப்பட்டது!', 'Browser medication alerts enabled!', 'success');
    } else if (perm === 'denied') {
      notify(
        'உலாவி அறிவிப்பு தடுக்கப்பட்டது — திரை & குரல் எச்சரிக்கை தொடரும்.',
        'Browser push blocked — in-app & voice alerts stay active.',
        'warning'
      );
    }
  };

  const handleSetWater = (count: number) => {
    const clamped = Math.max(0, Math.min(8, count));
    setState((prev) => {
      const increased = clamped > prev.waterCount;
      if (increased) playSoftTone(540 + clamped * 35, 0.14);
      const nextHistory = increased
        ? [
            {
              id: `water-${Date.now()}`,
              label_ta: `தண்ணீர் அருந்தியது (${clamped} / 8 டம்ளர்)`,
              label_en: `Water intake updated (${clamped} / 8 glasses)`,
              time: getCurrentTimeLabel(),
            },
            ...prev.waterHistory,
          ]
        : prev.waterHistory;

      return {
        ...prev,
        waterCount: clamped,
        waterHistory: nextHistory,
        activeDates: increased ? recordActivityToday(prev.activeDates) : prev.activeDates,
      };
    });
  };

  const handleToggleSpeechPracticed = (cardId: string) => {
    setState((prev) => {
      const exists = prev.practicedSpeechIds.includes(cardId);
      const nextIds = exists
        ? prev.practicedSpeechIds.filter((id) => id !== cardId)
        : [...prev.practicedSpeechIds, cardId];
      if (!exists) playSoftTone(740, 0.18);
      return {
        ...prev,
        practicedSpeechIds: nextIds,
        activeDates: !exists ? recordActivityToday(prev.activeDates) : prev.activeDates,
      };
    });
  };

  const handleSaveDailyNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteDraft.trim().slice(0, 240);
    const targetKey = selectedNoteDateKey || todayDateKey;
    const savedAt = getCurrentTimeLabel();

    setState((prev) => {
      const nextNotes = { ...prev.dailyNotesByDate };
      if (!trimmed) {
        delete nextNotes[targetKey];
      } else {
        nextNotes[targetKey] = { text: trimmed, updatedAt: savedAt };
      }
      const retained = Object.fromEntries(Object.entries(nextNotes).slice(-60));
      return { ...prev, dailyNotesByDate: retained };
    });

    if (trimmed) {
      playSoftTone(660, 0.15);
      notify('இன்றைய குறிப்பு சேமிக்கப்பட்டது!', 'Personal note saved!', 'success');
    } else {
      notify('குறிப்பு அழிக்கப்பட்டது', 'Personal note cleared', 'teal');
    }
  };

  const handleClearDailyNote = () => {
    const targetKey = selectedNoteDateKey || todayDateKey;
    setNoteDraft('');
    setState((prev) => {
      if (!prev.dailyNotesByDate[targetKey]) return prev;
      const nextNotes = { ...prev.dailyNotesByDate };
      delete nextNotes[targetKey];
      return { ...prev, dailyNotesByDate: nextNotes };
    });
    notify('குறிப்பு அழிக்கப்பட்டது', 'Personal note cleared', 'teal');
  };

  const handleDownloadRecoverySummary = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const now = new Date();
      const locale = isTa ? 'ta-IN' : 'en-US';
      const formattedDate = now.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const exportedAtLabel = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });

      const weekDaysMeta = getCurrentWeekDays(state.language);
      const weekDays = weekDaysMeta.map((d) => ({
        shortLabel: d.shortLabel,
        pct: d.isFuture ? 0 : d.isToday ? progressPct : state.dailyProgressByDate[d.dateKey] ?? 0,
        isToday: d.isToday,
        isFuture: d.isFuture,
      }));

      const recentNotes = weekDaysMeta
        .filter((d) => !d.isFuture && Boolean(state.dailyNotesByDate[d.dateKey]?.text?.trim()))
        .map((d) => {
          const noteEntry = state.dailyNotesByDate[d.dateKey];
          return {
            dateKey: d.dateKey,
            label: d.fullLabel,
            text: noteEntry.text,
            updatedAt: noteEntry.updatedAt,
          };
        });

      const practicedWordLabels = SPEECH_WORDS.filter((w) =>
        state.practicedSpeechIds.includes(w.id)
      ).map((w) => (isTa ? w.word_ta : w.word_en));

      await downloadRecoverySummaryPdf({
        lang: state.language,
        dateKey: todayDateKey,
        formattedDate,
        exportedAtLabel,
        profileName: state.profileName,
        caregiverName: state.caregiverName,
        caregiverPhone: state.caregiverPhone,
        recoveryFocus: state.recoveryFocus,
        progressPct,
        finishedMilestones,
        totalMilestones,
        exercises: EXERCISES_LIST.map((ex) => ({
          title_ta: ex.title_ta,
          title_en: ex.title_en,
          reps_ta: ex.reps_ta,
          reps_en: ex.reps_en,
          done: Boolean(state.exercises[ex.id]),
        })),
        medications: MEDICATION_ITEMS.map((med) => ({
          name_ta: med.name_ta,
          name_en: med.name_en,
          periodLabel_ta:
            med.period === 'morning' ? 'காலை' : med.period === 'afternoon' ? 'மதியம்' : 'இரவு',
          periodLabel_en:
            med.period === 'morning'
              ? 'Morning'
              : med.period === 'afternoon'
              ? 'Afternoon'
              : 'Night',
          taken: Boolean(state.medications[med.id]),
        })),
        waterCount: state.waterCount,
        waterGoal: 8,
        practicedSpeechCount: state.practicedSpeechIds.length,
        totalSpeechCount: SPEECH_WORDS.length,
        practicedWordLabels,
        todayNote: state.dailyNotesByDate[todayDateKey] ?? null,
        recentNotes,
        weekDays,
      });

      playSoftTone(660, 0.14);
      notify(
        'மீட்பு சுருக்க PDF கோப்பு பதிவிறக்கம் செய்யப்பட்டது!',
        'Recovery summary downloaded as PDF!',
        'success'
      );
    } catch {
      notify(
        'PDF உருவாக்குவதில் சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
        'Could not create PDF right now. Please try again.',
        'danger'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const encouragementText = useMemo(() => {
    if (progressPct === 0) {
      return isTa
        ? 'இன்றைய முதல் சிறிய படியைத் தொடங்குங்கள் — ஒரு டம்ளர் தண்ணீர் அல்லது ஒரு மாத்திரையைக் குறிக்கலாம்.'
        : 'Ready when you are — start with one small step like logging a glass of water or checking your morning dose.';
    }
    if (progressPct < 50) {
      return isTa
        ? `நல்ல தொடக்கம்! இன்று ${finishedMilestones} இலக்குகள் முடித்துள்ளீர்கள். உங்கள் வேகத்தில் தொடருங்கள்.`
        : `Good start — you have completed ${finishedMilestones} of ${totalMilestones} goals today. Keep going at your own pace.`;
    }
    if (progressPct < 100) {
      return isTa
        ? `சிறப்பான முன்னேற்றம்! இன்றைய இலக்குகளில் ${progressPct}% நிறைவடைந்துள்ளது.`
        : `Steady progress — ${progressPct}% of today’s recovery goals are complete.`;
    }
    return isTa
      ? 'வாழ்த்துகள்! இன்றைய அனைத்து 9 மறுவாழ்வு இலக்குகளையும் முடித்துவிட்டீர்கள்.'
      : 'Well done! All 9 daily recovery goals are complete today.';
  }, [progressPct, finishedMilestones, isTa]);

  const currentWeekDays = useMemo(() => getCurrentWeekDays(state.language), [state.language]);
  const weeklyCompletedCount = currentWeekDays.filter((d) => {
    if (d.isFuture) return false;
    const pct = d.isToday ? progressPct : state.dailyProgressByDate[d.dateKey] ?? 0;
    return pct >= 100;
  }).length;

  const nextPendingMed = getNextPendingReminder(new Date(), state.medReminders, state.medications);
  const nextExerciseIdx = state.exercises.ex1 ? (state.exercises.ex2 ? (state.exercises.ex3 ? 0 : 3) : 2) : 1;

  const dashRadius = 74;
  const dashCircumference = 2 * Math.PI * dashRadius;
  const dashOffset = dashCircumference - (progressPct / 100) * dashCircumference;

  const activeResourceArticle = resourceModalId
    ? RESOURCE_ARTICLES.find((a) => a.id === resourceModalId) || null
    : null;

  const navItems = [
    { href: '#hero', ta: 'முகப்பு', en: 'Home' },
    { href: '#recovery-journey', ta: 'மீட்பு வழிகாட்டி', en: 'Stroke Recovery Guide' },
    { href: '#brain-explorer', ta: '3D உடல் வழிகாட்டி', en: '3D Body Guide' },
    { href: '#resources-section', ta: 'வளங்கள்', en: 'Patient & Caregiver Resources' },
    { href: '#faq-section', ta: 'பற்றி', en: 'About' },
  ];

  const cleanCaregiverPhone = state.caregiverPhone.trim();
  const hasCaregiverPhone = cleanCaregiverPhone.replace(/[^\d+]/g, '').length >= 7;

  return (
    <div className="min-h-screen flex flex-col pb-28 md:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-5 focus:py-3 focus:rounded-full focus:bg-[#1F6F63] focus:text-white focus:font-semibold focus:shadow-lg"
      >
        {isTa ? 'முதன்மை உள்ளடக்கத்திற்குச் செல்' : 'Skip to main content'}
      </a>
      {/* Live Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl bg-[#0F1F2E] text-white shadow-xl text-base font-medium flex items-center gap-3 max-w-[92vw]"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              toast.variant === 'success'
                ? 'bg-emerald-400'
                : toast.variant === 'warning'
                ? 'bg-amber-400'
                : toast.variant === 'danger'
                ? 'bg-red-400'
                : 'bg-[#2DD4BF]'
            }`}
          />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* =====================================================================
          APPLE-INSPIRED FROSTED GLASS NAVBAR (64px sticky, 5 essential links)
         ===================================================================== */}
      <header
        style={{ backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}
        className="sticky top-0 z-40 min-h-[64px] bg-white/72 dark:bg-[#0B1220]/78 border-b border-black/10 dark:border-white/10"
      >
        <div className="max-w-[1260px] mx-auto px-3 sm:px-6 min-h-[64px] flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Mark */}
          <a href="#hero" className="flex items-center gap-2.5 shrink-0 py-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1F6F63] text-white flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="text-[1.0625rem] font-semibold text-[#0F1F2E] dark:text-white whitespace-nowrap">
              StrokeCare <span className="text-[#1F6F63] dark:text-[#2DD4BF]">AI</span>
            </span>
          </a>

          {/* Center: 5 Essential Links aligned cleanly from lg (>=1024px) */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center justify-center gap-3.5 xl:gap-6">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[0.9375rem] xl:text-[1rem] font-medium text-[#0F1F2E] dark:text-slate-100 hover:text-[#1F6F63] dark:hover:text-[#2DD4BF] whitespace-nowrap shrink-0 py-2"
              >
                {isTa ? item.ta : item.en}
              </a>
            ))}
          </nav>

          {/* Right: Language Toggle + Red Pill Emergency SOS 108 */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label={isTa ? 'மொழி தேர்வு' : 'Language selector'}
              className="inline-flex items-center p-0.5 rounded-full bg-[#F2F7F6] dark:bg-[#111A2B] border border-[var(--border-subtle)] shrink-0"
            >
              <button
                type="button"
                onClick={() => state.language !== 'en' && handleToggleLanguage()}
                aria-pressed={!isTa}
                className={`min-h-[40px] px-3 py-1 rounded-full text-[0.9375rem] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  !isTa
                    ? 'bg-[#1F6F63] text-white hc-primary-btn'
                    : 'text-[#0F1F2E] dark:text-slate-200 hover:text-[#1F6F63]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => state.language !== 'ta' && handleToggleLanguage()}
                aria-pressed={isTa}
                className={`min-h-[40px] px-3 py-1 rounded-full text-[0.9375rem] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  isTa
                    ? 'bg-[#1F6F63] text-white hc-primary-btn'
                    : 'text-[#0F1F2E] dark:text-slate-200 hover:text-[#1F6F63]'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSosOpen(true)}
              aria-label="Open Emergency SOS 108"
              className="hidden md:inline-flex min-h-[48px] px-4 py-2 rounded-full bg-[#C81E1E] hover:bg-[#A61717] text-white text-[0.9375rem] font-semibold items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="xl:hidden">{isTa ? 'SOS 108' : 'SOS 108'}</span>
              <span className="hidden xl:inline">{isTa ? 'அவசர SOS 108' : 'Emergency SOS 108'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-label={isTa ? 'வழிசெலுத்தல் பட்டியல்' : 'Open menu'}
              className="lg:hidden w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#111A2B] flex items-center justify-center text-[#0F1F2E] dark:text-white cursor-pointer shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* CLEAN FULL-SCREEN MOBILE NAVIGATION MENU OVERLAY */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isTa ? 'முழுத் திரை வழிசெலுத்தல்' : 'Full-screen Navigation'}
          className="lg:hidden fixed inset-0 z-50 bg-[#FBFBFD]/98 dark:bg-[#0B1220]/98 backdrop-blur-xl flex flex-col justify-between p-6 overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white">
              StrokeCare <span className="text-[#1F6F63] dark:text-[#2DD4BF]">AI</span>
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label={isTa ? 'பட்டியலை மூடு' : 'Close menu'}
              className="w-14 h-14 rounded-full bg-[#F2F7F6] dark:bg-[#111A2B] flex items-center justify-center text-[#0F1F2E] dark:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav aria-label="Mobile Navigation" className="my-6 space-y-6">
            <div className="space-y-2.5">
              <p className="text-[1rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] px-1">
                {isTa ? 'முதன்மைப் பிரிவுகள்' : 'Main Sections'}
              </p>
              <div className="flex flex-col gap-2.5">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[56px] px-5 py-3 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[1.1875rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-between"
                  >
                    <span>{isTa ? item.ta : item.en}</span>
                    <ChevronRight className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[1rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] px-1">
                {isTa ? 'தினசரிப் பராமரிப்புக் கருவிகள்' : 'Daily Care Tools'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { href: '#dashboard', ta: 'தினசரி முன்னேற்றம்', en: 'Daily Progress' },
                  { href: '#physio-section', ta: 'உடற்பயிற்சி', en: 'Physiotherapy' },
                  { href: '#medicine-section', ta: 'மருந்து அட்டவணை', en: 'Medications' },
                  { href: '#hydration-section', ta: 'தண்ணீர் & உணவு', en: 'Hydration & Diet' },
                  { href: '#speech-section', ta: 'பேச்சுப் பயிற்சி', en: 'Speech Practice' },
                  { href: '#tasks-section', ta: 'Google Tasks பணிகள்', en: 'Google Tasks' },
                  { href: '#ai-companion', ta: '3D AI உதவியாளர்', en: '3D AI Care Assistant' },
                  { href: '#risk-assessment', ta: 'F.A.S.T. அறிகுறி சோதனை', en: 'F.A.S.T. Emergency Check' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[56px] px-5 py-3 rounded-2xl bg-[#F2F7F6] dark:bg-[#111A2B] text-[1.0625rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-between"
                  >
                    <span>{isTa ? item.ta : item.en}</span>
                    <ChevronRight className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </nav>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setSosOpen(true);
            }}
            className="apple-pill-btn w-full min-h-[56px] px-6 py-3.5 bg-[#C81E1E] text-white text-[1.125rem] font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <PhoneCall className="w-5 h-5" aria-hidden="true" />
            <span>{isTa ? 'அவசர SOS 108 திறக்க' : 'Open Emergency SOS 108'}</span>
          </button>
        </div>
      )}

      <main id="main-content" className="flex-1">
        {/* 01. HERO (#FBFBFD) */}
        <AppleHeroSection
          lang={state.language}
          onOpenPersonalize={() => setPersonalizeOpen(true)}
        />

        {/* 01B. 6-STEP STROKE RECOVERY LEARNING FLOW (#F2F7F6) */}
        <StrokeRecoveryJourneySection
          lang={state.language}
          onOpenStrokeSteps={() => setBrainTab('stroke_flow')}
        />

        {/* 02. FEATURES 2×3 BENTO GRID (#FBFBFD) */}
        <FeaturesBentoSection
          lang={state.language}
          surface="canvas"
          onJumpBrain={() => setBrainTab('anatomy')}
          onOpenLegal={(t) => setLegalModalType(t)}
        />

        {/* 03. TRACK PROGRESS / APPLE HEALTH SUMMARY DASHBOARD (#F2F7F6) */}
        <section
          id="dashboard"
          className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
            {/* Single Chapter Headline + 1 Supporting Sentence */}
            <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
              <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
                {isTa ? (
                  <>
                    ஒவ்வொரு சிறிய வெற்றியும்{' '}
                    <span className="apple-headline-gradient">ஒரே பார்வையில்.</span>
                  </>
                ) : (
                  <>
                    Every daily step,{' '}
                    <span className="apple-headline-gradient">clearly tracked.</span>
                  </>
                )}
              </h2>
              <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                {encouragementText}
              </p>
            </ScrollReveal>

            {/* Centered Progress Ring + Weekly Streak Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Card: Vertically Stacked Progress Ring (180px) */}
              <div className="lg:col-span-5 min-w-0 clinical-card hc-card p-8 flex flex-col items-center text-center gap-5">
                <div className="inline-flex flex-wrap items-center justify-center gap-2 text-[1rem] font-medium text-[#3A4753] dark:text-[#D3DFE9] min-w-0 max-w-full [overflow-wrap:anywhere]">
                  <CalendarCheck className="w-4 h-4 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                  <span>
                    {new Date().toLocaleDateString(isTa ? 'ta-IN' : 'en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="relative w-[11.25rem] h-[11.25rem] flex items-center justify-center shrink-0 mx-auto">
                  <svg className="w-[11.25rem] h-[11.25rem] -rotate-90" viewBox="0 0 180 180" aria-hidden="true">
                    <circle
                      cx="90"
                      cy="90"
                      r={dashRadius}
                      strokeWidth="14"
                      fill="transparent"
                      className="stroke-[#C9DDD7] dark:stroke-[#1F3B37]"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r={dashRadius}
                      strokeWidth="14"
                      strokeLinecap="round"
                      fill="transparent"
                      strokeDasharray={dashCircumference}
                      strokeDashoffset={dashOffset}
                      className="stroke-[#1F6F63] dark:stroke-[#2DD4BF] transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                    <AnimatedNumber
                      target={progressPct}
                      suffix="%"
                      className="text-[2.35rem] font-semibold text-[#0F1F2E] dark:text-white leading-none"
                    />
                    <span className="text-[1rem] font-medium text-[#3A4753] dark:text-[#D3DFE9] mt-1 max-w-[7.25rem] [overflow-wrap:anywhere]">
                      {isTa ? 'நிறைவு' : 'Complete'}
                    </span>
                  </div>
                </div>

                <p className="tabular-nums text-[1.125rem] font-medium text-[#0F1F2E] dark:text-slate-100 min-w-0 w-full [overflow-wrap:anywhere]">
                  {isTa
                    ? `${totalMilestones}-ல் ${finishedMilestones} இலக்குகள் முடிந்தன`
                    : `${finishedMilestones} of ${totalMilestones} goals completed`}
                </p>

                <button
                  type="button"
                  onClick={handleDownloadRecoverySummary}
                  disabled={isExportingPdf}
                  className="apple-pill-btn w-full min-h-[56px] px-5 py-3 border-2 border-[#1F6F63] dark:border-[#2DD4BF] bg-[#E3F1ED]/70 dark:bg-[#112A27]/80 hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] disabled:opacity-65 text-[1.0625rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] inline-flex items-center justify-center gap-2 cursor-pointer [overflow-wrap:anywhere] text-center"
                >
                  <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>
                    {isExportingPdf
                      ? isTa
                        ? 'PDF தயாராகிறது...'
                        : 'Preparing PDF...'
                      : isTa
                      ? 'மீட்பு சுருக்கத்தைப் பதிவிறக்கு (PDF)'
                      : 'Download Recovery Summary (PDF)'}
                  </span>
                </button>
              </div>

              {/* Right Column: Overview Heading + Edit Profile + Weekly Activity */}
              <div className="lg:col-span-7 min-w-0 flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
                  <h3 className="dashboard-h2 font-semibold text-[#0F1F2E] dark:text-white min-w-0 flex-1">
                    {state.profileName.trim()
                      ? isTa
                        ? `வணக்கம், ${state.profileName.trim()}`
                        : `Welcome, ${state.profileName.trim()}`
                      : isTa
                      ? 'இன்றைய மறுவாழ்வு நிலை'
                      : 'Today’s Recovery Overview'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPersonalizeOpen(true)}
                    className="apple-pill-btn min-h-[56px] px-5 py-2 border-2 border-[#1F6F63] dark:border-[#2DD4BF] bg-transparent hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] cursor-pointer shrink-0 max-w-full [overflow-wrap:anywhere] text-center"
                  >
                    {isTa ? 'பெயர் அமைக்க' : 'Edit Profile'}
                  </button>
                </div>

                {/* Weekly Activity Card */}
                <div className="clinical-card hc-card p-6 sm:p-8 space-y-5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <span className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                      <Flame className="w-5 h-5 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                      <span>{isTa ? 'இந்த வாரத் தொடர்ச்சி' : 'This Week Activity'}</span>
                    </span>
                    <span className="tabular-nums text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] shrink-0">
                      {weeklyCompletedCount} / 7 {isTa ? 'நாட்கள்' : 'days'}
                    </span>
                  </div>

                  <div className="overflow-x-auto p-1 -m-1">
                    <div className="grid grid-cols-7 gap-2 min-w-[384px]">
                      {currentWeekDays.map((day) => {
                        const dayPct = day.isFuture
                          ? 0
                          : day.isToday
                          ? progressPct
                          : state.dailyProgressByDate[day.dateKey] ?? 0;

                        const tileState: 'done' | 'partial' | 'missed' | 'future' = day.isFuture
                          ? 'future'
                          : dayPct >= 100
                          ? 'done'
                          : day.isToday
                          ? 'partial'
                          : 'missed';

                        const miniRadius = 12;
                        const miniCircumference = 2 * Math.PI * miniRadius;
                        const miniOffset = miniCircumference - (dayPct / 100) * miniCircumference;

                        const hasSavedNote = Boolean(state.dailyNotesByDate[day.dateKey]?.text);
                        const isSelectedNoteDay = selectedNoteDateKey === day.dateKey;

                        const tileAriaLabel = day.isFuture
                          ? isTa
                            ? `${day.fullLabel}, வரவிருக்கும் நாள்`
                            : `${day.fullLabel}, upcoming`
                          : isTa
                          ? `${day.fullLabel}, ${dayPct}% நிறைவு${hasSavedNote ? ', குறிப்பு உள்ளது' : ''}`
                          : `${day.fullLabel}, ${dayPct}% complete${hasSavedNote ? ', note saved' : ''}`;

                        return (
                          <button
                            key={day.dateKey}
                            type="button"
                            disabled={day.isFuture}
                            onClick={() => setSelectedNoteDateKey(day.dateKey)}
                            aria-label={tileAriaLabel}
                            aria-pressed={isSelectedNoteDay}
                            className={`relative min-w-[48px] min-h-[72px] px-1 py-2 rounded-2xl flex flex-col items-center justify-between gap-1.5 text-center transition-colors duration-200 ${
                              day.isFuture ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              tileState === 'done'
                                ? 'streak-tile-pop bg-[#E3F1ED] dark:bg-[#112A27] text-[#0F1F2E] dark:text-white'
                                : tileState === 'partial'
                                ? 'bg-[#F2F7F6] dark:bg-[#0B1220] ring-2 ring-[#1F6F63] dark:ring-[#2DD4BF] text-[#0F1F2E] dark:text-white'
                                : tileState === 'missed'
                                ? 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#3A4753] dark:text-[#D3DFE9]'
                                : 'bg-[#F2F7F6]/60 dark:bg-[#0B1220]/50 text-[#3A4753] dark:text-slate-400 opacity-55'
                            } ${
                              isSelectedNoteDay && !day.isFuture
                                ? 'outline-2 outline-offset-2 outline-[#1F6F63] dark:outline-[#2DD4BF]'
                                : ''
                            }`}
                          >
                            {hasSavedNote && (
                              <span
                                aria-hidden="true"
                                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1F6F63] dark:bg-[#2DD4BF]"
                              />
                            )}
                            <span className="text-[0.9375rem] font-medium leading-tight max-w-full [overflow-wrap:anywhere]">
                              {day.shortLabel}
                            </span>

                            {tileState === 'done' && (
                              <span className="w-8 h-8 rounded-full bg-[#1F6F63] dark:bg-[#2DD4BF] text-white dark:text-[#0B1220] flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                              </span>
                            )}

                            {tileState === 'partial' && (
                              <span className="relative w-8 h-8 flex items-center justify-center shrink-0">
                                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
                                  <circle
                                    cx="16"
                                    cy="16"
                                    r={miniRadius}
                                    strokeWidth="3.5"
                                    fill="transparent"
                                    className="stroke-[#C9DDD7] dark:stroke-[#1F3B37]"
                                  />
                                  <circle
                                    cx="16"
                                    cy="16"
                                    r={miniRadius}
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    fill="transparent"
                                    strokeDasharray={miniCircumference}
                                    strokeDashoffset={miniOffset}
                                    className="stroke-[#1F6F63] dark:stroke-[#2DD4BF]"
                                  />
                                </svg>
                              </span>
                            )}

                            {tileState === 'missed' && (
                              <span className="w-8 h-8 rounded-full border-2 border-[#94A3B8] dark:border-slate-500 text-[#3A4753] dark:text-[#D3DFE9] flex items-center justify-center shrink-0">
                                <Minus className="w-4 h-4" aria-hidden="true" />
                              </span>
                            )}

                            {tileState === 'future' && (
                              <span className="w-8 h-8 rounded-full border border-dashed border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Personal Daily Note Card ("How I Felt") */}
                {(() => {
                  const activeNoteObj = state.dailyNotesByDate[selectedNoteDateKey];
                  const isViewingToday = selectedNoteDateKey === todayDateKey;
                  const selectedDayMeta = currentWeekDays.find((d) => d.dateKey === selectedNoteDateKey);
                  const isDirty = noteDraft.trim() !== (activeNoteObj?.text ?? '').trim();

                  return (
                    <form
                      onSubmit={handleSaveDailyNote}
                      className="clinical-card hc-card p-6 sm:p-8 space-y-4 min-w-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                        <label
                          htmlFor="daily-personal-note-input"
                          className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere] cursor-pointer"
                        >
                          <NotebookPen className="w-5 h-5 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                          <span>
                            {isViewingToday
                              ? isTa
                                ? 'இன்று நான் உணர்ந்த விதம் (குறிப்பு)'
                                : 'How I Felt Today (Personal Note)'
                              : isTa
                              ? `${selectedDayMeta?.fullLabel || selectedNoteDateKey} குறிப்பு`
                              : `Personal Note · ${selectedDayMeta?.fullLabel || selectedNoteDateKey}`}
                          </span>
                        </label>

                        <div className="flex flex-wrap items-center gap-2">
                          {activeNoteObj?.updatedAt && !isDirty && (
                            <span className="tabular-nums text-[0.9375rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                              {isTa ? `சேமிக்கப்பட்டது · ${activeNoteObj.updatedAt}` : `Saved · ${activeNoteObj.updatedAt}`}
                            </span>
                          )}
                          {!isViewingToday && (
                            <button
                              type="button"
                              onClick={() => setSelectedNoteDateKey(todayDateKey)}
                              className="min-h-[40px] px-3 py-1 rounded-full bg-[#E3F1ED] dark:bg-[#112A27] text-[0.9375rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline cursor-pointer"
                            >
                              {isTa ? 'இன்றைக்குச் செல்' : 'Back to Today'}
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[1.0625rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
                        {isTa
                          ? 'இன்று உங்கள் உடல்நலம், சோர்வு அல்லது மனநிலை எப்படி இருந்தது என்பதைப் பின்னர் நினைவுகூர ஒரு சிறிய குறிப்பைச் சேர்க்கவும்.'
                          : 'Add a short personal note about how your energy, balance, or mood felt so you can look back anytime.'}
                      </p>

                      <textarea
                        id="daily-personal-note-input"
                        rows={3}
                        maxLength={240}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder={
                          isTa
                            ? 'எ.கா. காலை உணவுக்குப் பிறகு 10 நிமிடம் மெதுவாக நடந்தேன், நன்றாக உணர்ந்தேன்.'
                            : 'e.g., Walked steadily for 10 minutes after breakfast and felt calm today.'
                        }
                        className="w-full min-h-[96px] px-4 py-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white leading-relaxed"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="tabular-nums text-[0.9375rem] font-medium text-[#3A4753] dark:text-[#D3DFE9]">
                          {noteDraft.length} / 240
                        </span>

                        <div className="flex flex-wrap items-center gap-2.5">
                          {(noteDraft.length > 0 || Boolean(activeNoteObj)) && (
                            <button
                              type="button"
                              onClick={handleClearDailyNote}
                              className="apple-pill-btn min-h-[56px] px-5 py-2 border-2 border-[#0F1F2E]/15 dark:border-white/20 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white inline-flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                              <span>{isTa ? 'அழி' : 'Clear'}</span>
                            </button>
                          )}

                          <button
                            type="submit"
                            disabled={!isDirty && Boolean(activeNoteObj)}
                            className="apple-pill-btn min-h-[56px] px-6 py-2 bg-[#1F6F63] hover:bg-[#17574D] disabled:opacity-55 text-white text-[1.125rem] font-semibold inline-flex items-center gap-2 cursor-pointer hc-primary-btn"
                          >
                            <Check className="w-5 h-5" aria-hidden="true" />
                            <span>
                              {!isDirty && activeNoteObj
                                ? isTa
                                  ? 'சேமிக்கப்பட்டது'
                                  : 'Saved'
                                : isTa
                                ? 'குறிப்பைச் சேமி'
                                : 'Save Note'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                })()}
              </div>
            </div>

            {/* Apple Health Summary 4 Color-Coded Activity Cards With 48px Tabular Numerals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* 1. Exercises (Teal #1F6F63) */}
              <div className="clinical-card clinical-card-interactive hc-card p-8 flex flex-col justify-between gap-5 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                    <Dumbbell className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                    {isTa ? 'உடற்பயிற்சி' : 'Exercises'}
                  </span>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="tabular-nums text-[3rem] font-semibold text-[#0F1F2E] dark:text-white leading-none">
                    <AnimatedNumber target={exDone} />
                    <span className="text-[1.5rem] text-[#3A4753] dark:text-[#D3DFE9] font-medium"> / 3</span>
                  </div>
                  <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] min-w-0 [overflow-wrap:anywhere]">
                    {exDone === 3
                      ? isTa
                        ? 'அனைத்தும் முடிந்தது'
                        : 'All 3 done today'
                      : isTa
                      ? `அடுத்தது: பயிற்சி ${nextExerciseIdx}`
                      : `Up next: Routine ${nextExerciseIdx}`}
                  </p>
                </div>

                <a
                  href="#physio-section"
                  className="min-h-[56px] inline-flex items-center justify-between gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline"
                >
                  <span>{exDone === 3 ? (isTa ? 'மீண்டும் பார்' : 'Review') : isTa ? 'பயிற்சி செய்' : 'Start Next'}</span>
                  <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </a>
              </div>

              {/* 2. Medications (Emerald #15803D) */}
              <div className="clinical-card clinical-card-interactive hc-card p-8 flex flex-col justify-between gap-5 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Pill className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-[1rem] font-semibold text-emerald-800 dark:text-emerald-300">
                    {isTa ? 'மருந்துகள்' : 'Medications'}
                  </span>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="tabular-nums text-[3rem] font-semibold text-[#0F1F2E] dark:text-white leading-none">
                    <AnimatedNumber target={medDone} />
                    <span className="text-[1.5rem] text-[#3A4753] dark:text-[#D3DFE9] font-medium"> / 4</span>
                  </div>
                  <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] tabular-nums min-w-0 [overflow-wrap:anywhere]">
                    {nextPendingMed
                      ? `${isTa ? 'அடுத்து' : 'Next'}: ${nextPendingMed.timeDisplay}`
                      : isTa
                      ? 'இன்றைய 4 மருந்தும் எடுத்தது'
                      : 'All 4 doses taken'}
                  </p>
                </div>

                <a
                  href="#medicine-section"
                  className="min-h-[56px] inline-flex items-center justify-between gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline"
                >
                  <span>{nextPendingMed ? (isTa ? 'மருந்து குறிக்க' : 'Log Dose') : isTa ? 'பட்டியல் பார்' : 'View Log'}</span>
                  <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </a>
              </div>

              {/* 3. Water (Ocean Blue #0369A1) */}
              <div className="clinical-card clinical-card-interactive hc-card p-8 flex flex-col justify-between gap-5 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <Droplet className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-[1rem] font-semibold text-sky-800 dark:text-sky-300">
                    {isTa ? 'தண்ணீர்' : 'Water'}
                  </span>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="tabular-nums text-[3rem] font-semibold text-[#0F1F2E] dark:text-white leading-none">
                    <AnimatedNumber target={state.waterCount} />
                    <span className="text-[1.5rem] text-[#3A4753] dark:text-[#D3DFE9] font-medium"> / 8</span>
                  </div>
                  <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] tabular-nums min-w-0 [overflow-wrap:anywhere]">
                    {state.waterCount >= 8
                      ? isTa
                        ? '8 டம்ளர் இலக்கு நிறைவு'
                        : '8-glass goal met'
                      : isTa
                      ? `இன்னும் ${8 - state.waterCount} டம்ளர்`
                      : `${8 - state.waterCount} glasses left`}
                  </p>
                </div>

                <a
                  href="#hydration-section"
                  className="min-h-[56px] inline-flex items-center justify-between gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline"
                >
                  <span>{isTa ? 'தண்ணீர் பதியவும்' : 'Track Water'}</span>
                  <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </a>
              </div>

              {/* 4. Speech (Warm Amber #B45309) */}
              <div className="clinical-card clinical-card-interactive hc-card p-8 flex flex-col justify-between gap-5 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-[1rem] font-semibold text-amber-800 dark:text-amber-300">
                    {isTa ? 'பேச்சுப் பயிற்சி' : 'Speech'}
                  </span>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="tabular-nums text-[3rem] font-semibold text-[#0F1F2E] dark:text-white leading-none">
                    <AnimatedNumber target={state.practicedSpeechIds.length} />
                    <span className="text-[1.5rem] text-[#3A4753] dark:text-[#D3DFE9] font-medium">
                      {' '}
                      / {SPEECH_WORDS.length}
                    </span>
                  </div>
                  <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] min-w-0 [overflow-wrap:anywhere]">
                    {state.practicedSpeechIds.length >= 3
                      ? isTa
                        ? 'தினசரி இலக்கு முடிந்தது'
                        : 'Daily session met'
                      : isTa
                      ? 'குறைந்தது 3 சொல் பேசுக'
                      : 'Practice 3+ words today'}
                  </p>
                </div>

                <a
                  href="#speech-section"
                  className="min-h-[56px] inline-flex items-center justify-between gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline"
                >
                  <span>{isTa ? 'பயிற்சி செய்' : 'Practice'}</span>
                  <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 04. DEEP DARK 3D BRAIN SHOWCASE (#0B1220) */}
        <Suspense
          fallback={
            <section
              id="brain-explorer"
              className="w-full bg-[#0B1220] text-white apple-section-pad"
            >
              <div className="max-w-[1100px] mx-auto px-4 sm:px-6 text-center py-24">
                <p className="text-[1.125rem] text-slate-300">
                  {isTa ? '3D மூளை பகுதி தயாராகிறது...' : 'Preparing 3D Brain Explorer...'}
                </p>
              </div>
            </section>
          }
        >
          <BrainExplorerSection
            lang={state.language}
            activeTab={brainTab}
            onChangeTab={setBrainTab}
            onNotify={notify}
          />
        </Suspense>

        {/* 05. CHAPTER: GUIDED PHYSIOTHERAPY (#F2F7F6) */}
        <section
          id="physio-section"
          className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
            <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
              <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
                {isTa ? (
                  <>
                    பாதுகாப்பான உடற்பயிற்சி,{' '}
                    <span className="apple-headline-gradient">உங்கள் வேகத்தில்.</span>
                  </>
                ) : (
                  <>
                    Guided physiotherapy,{' '}
                    <span className="apple-headline-gradient">at your own pace.</span>
                  </>
                )}
              </h2>
              <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                {isTa
                  ? '5 நொடி குரல் எண்ணிக்கை டைமர் மற்றும் வீடியோ வழிகாட்டுதலுடன் கை, கால், முகப் பயிற்சிகளைச் செய்யுங்கள்.'
                  : 'Follow gentle hand, leg, and facial movements paced by a calm 5-second voice countdown timer.'}
              </p>
            </ScrollReveal>

            <ExercisesSection
              lang={state.language}
              exercises={state.exercises}
              history={state.exerciseHistory}
              onToggleDone={handleToggleExerciseDone}
              onClearHistory={() => setState((prev) => ({ ...prev, exerciseHistory: [] }))}
              onNotify={notify}
            />
          </div>
        </section>

        {/* 06. CHAPTER: MEDICATION SCHEDULE & ALERTS (#FBFBFD) */}
        <section
          id="medicine-section"
          className="w-full bg-[#FBFBFD] dark:bg-[#000000] apple-section-pad"
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
            <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
              <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
                {isTa ? (
                  <>
                    சரியான நேரத்தில்{' '}
                    <span className="apple-headline-gradient">மருந்து நினைவூட்டல்.</span>
                  </>
                ) : (
                  <>
                    Consistent doses,{' '}
                    <span className="apple-headline-gradient">right on schedule.</span>
                  </>
                )}
              </h2>
              <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                {isTa
                  ? 'காலை, மதியம் மற்றும் இரவு நேர மருந்துகளை எளிதாகக் குறித்து குரல் நினைவூட்டல்களைப் பெறுங்கள்.'
                  : 'Check off morning, afternoon, and night prescriptions with soft chime alerts and easy 10-minute snooze.'}
              </p>
            </ScrollReveal>

            <MedicationSection
              lang={state.language}
              medications={state.medications}
              medicationHistory={state.medicationHistory}
              medReminders={state.medReminders}
              activeAlertPeriod={alertBannerPeriod}
              onToggleMedication={handleToggleMedication}
              onMarkPeriodTaken={handleMarkPeriodTaken}
              onResetMeds={() => {
                setAlertBannerPeriod(null);
                setAlertModalPeriod(null);
                setState((prev) => ({
                  ...prev,
                  medications: { med1: false, med2: false, med3: false, med4: false },
                  medicationHistory: [],
                  medReminders: {
                    ...prev.medReminders,
                    lastTriggeredDate: {},
                    snoozedUntil: {},
                  },
                }));
                notify('மாத்திரை பட்டியல் மீட்டமைக்கப்பட்டது', 'Medication checklist reset', 'teal');
              }}
              onRequestPushPermission={handleRequestPushPermission}
              onToggleRemindersEnabled={() =>
                setState((prev) => ({
                  ...prev,
                  medReminders: { ...prev.medReminders, enabled: !prev.medReminders.enabled },
                }))
              }
              onToggleReminderSound={() =>
                setState((prev) => ({
                  ...prev,
                  medReminders: {
                    ...prev.medReminders,
                    soundEnabled: !prev.medReminders.soundEnabled,
                    voiceEnabled: !prev.medReminders.soundEnabled,
                  },
                }))
              }
              onUpdateScheduleTime={(period, timeValue) => {
                if (!/^\d{2}:\d{2}$/.test(timeValue)) return;
                setState((prev) => {
                  const nextLast = { ...prev.medReminders.lastTriggeredDate };
                  const nextSnooze = { ...prev.medReminders.snoozedUntil };
                  delete nextLast[period];
                  delete nextSnooze[period];
                  return {
                    ...prev,
                    medReminders: {
                      ...prev.medReminders,
                      schedules: { ...prev.medReminders.schedules, [period]: timeValue },
                      lastTriggeredDate: nextLast,
                      snoozedUntil: nextSnooze,
                    },
                  };
                });
                notify('மருந்து நேரம் மாற்றப்பட்டது', 'Medication time updated', 'teal');
              }}
              onTriggerTestAlert={() => {
                const next = getNextPendingReminder(new Date(), state.medReminders, state.medications);
                triggerMedAlert(next ? next.period : 'morning', true);
              }}
              onSnoozeAlert={(mins) => {
                if (alertBannerPeriod) handleSnoozeMedAlert(alertBannerPeriod, mins);
              }}
              onDismissBanner={() => setAlertBannerPeriod(null)}
            />
          </div>
        </section>

        {/* 07. CHAPTER: HYDRATION & NUTRITION (#F2F7F6) */}
        <section
          id="hydration-section"
          className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
            <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
              <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
                {isTa ? (
                  <>
                    தண்ணீர் & சத்தான உணவால்{' '}
                    <span className="apple-headline-gradient">மூளைக்கு வலிமை.</span>
                  </>
                ) : (
                  <>
                    Stay hydrated.{' '}
                    <span className="apple-headline-gradient">Nourish recovery.</span>
                  </>
                )}
              </h2>
              <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                {isTa
                  ? 'தினமும் 8 டம்ளர் தண்ணீர் மற்றும் குறைந்த உப்பு உணவுப் பழக்கம் ரத்த அழுத்தத்தைக் கட்டுக்குள் வைக்கும்.'
                  : 'Log 8 glasses of water daily alongside potassium-rich, low-sodium food guidance.'}
              </p>
            </ScrollReveal>

            <HydrationSection
              lang={state.language}
              waterCount={state.waterCount}
              waterHistory={state.waterHistory}
              onSetWater={handleSetWater}
              onClearWaterHistory={() => setState((prev) => ({ ...prev, waterHistory: [] }))}
            />
          </div>
        </section>

        {/* 08. CHAPTER: SPEECH & COMMUNICATION (#FBFBFD) */}
        <section
          id="speech-section"
          className="w-full bg-[#FBFBFD] dark:bg-[#000000] apple-section-pad"
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
            <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
              <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
                {isTa ? (
                  <>
                    தயக்கமின்றிப் பேச{' '}
                    <span className="apple-headline-gradient">தினசரிப் பயிற்சி.</span>
                  </>
                ) : (
                  <>
                    Rebuild speech{' '}
                    <span className="apple-headline-gradient">word by word.</span>
                  </>
                )}
              </h2>
              <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                {isTa
                  ? 'மெதுவான தமிழ்-ஆங்கில உச்சரிப்பு அட்டைகள், பட வினாடி வினா மற்றும் உடனடி வாக்கியங்கள்.'
                  : 'Hear bilingual words at a comfortable slow speed, play picture matching, or tap caregiver phrases.'}
              </p>
            </ScrollReveal>

            <SpeechSection
              lang={state.language}
              practicedSpeechIds={state.practicedSpeechIds}
              onToggleSpeechPracticed={handleToggleSpeechPracticed}
            />
          </div>
        </section>

        {/* 08B. GOOGLE TASKS RECOVERY PLANNER (#F2F7F6) */}
        <Suspense
          fallback={
            <section
              id="tasks-section"
              className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
            >
              <div className="max-w-[1100px] mx-auto px-4 sm:px-6 text-center py-16">
                <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
                  {isTa ? 'Google Tasks பகுதி தயாராகிறது...' : 'Preparing Google Tasks planner...'}
                </p>
              </div>
            </section>
          }
        >
          <GoogleTasksSection lang={state.language} onNotify={notify} />
        </Suspense>

        {/* 09. 3D AI CARE COMPANION CHATBOT (#0B1220) */}
        <Suspense
          fallback={
            <section
              id="ai-companion"
              className="w-full bg-[#0B1220] text-white apple-section-pad"
            >
              <div className="max-w-[1100px] mx-auto px-4 sm:px-6 text-center py-24">
                <p className="text-[1.125rem] text-slate-300">
                  {isTa ? '3D AI உதவியாளர் தயாராகிறது...' : 'Preparing 3D Care Assistant...'}
                </p>
              </div>
            </section>
          }
        >
          <ChatbotSection
            lang={state.language}
            patientContextSummary={`Progress ${progressPct}% (${finishedMilestones}/${totalMilestones} daily goals: exercises ${exDone}/3, medicines ${medDone}/4, water ${state.waterCount}/8 glasses, speech ${state.practicedSpeechIds.length}/${SPEECH_WORDS.length})`}
          />
        </Suspense>

        {/* 10. CLINICAL INSIGHTS & GUIDES (#F2F7F6) */}
        <ClinicalInsightsSection
          lang={state.language}
          onSelectArticle={(id) => setResourceModalId(id)}
        />

        {/* 10. F.A.S.T. RISK CHECK (#FBFBFD) */}
        <StrokeRiskAwarenessSection
          lang={state.language}
          onOpenSos={() => setSosOpen(true)}
          onOpenPersonalize={() => setPersonalizeOpen(true)}
        />

        {/* 11. FAQ (#F2F7F6) */}
        <FaqSection lang={state.language} />
      </main>

      {/* =====================================================================
          APPLE-INSPIRED LIGHT GREY FOOTER (#F5F5F7 / dark #0B1220)
         ===================================================================== */}
      <footer
        id="footer-contact"
        className="w-full bg-[#F5F5F7] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-100 py-14 sm:py-16 border-t border-[var(--border-subtle)]"
      >
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
            {/* Brand + Disclaimer */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1F6F63] text-white flex items-center justify-center shrink-0">
                  <HeartPulse className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xl font-semibold text-[#0F1F2E] dark:text-white block">
                    StrokeCare AI
                  </span>
                  <span className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                    {isTa ? 'பக்கவாத மறுவாழ்வு துணை' : 'Bilingual Recovery Companion'}
                  </span>
                </div>
              </div>
              <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
                {isTa
                  ? 'உங்கள் உடற்பயிற்சி, மருந்துகள் மற்றும் தண்ணீர் பதிவுகள் உங்கள் சாதனத்தில் மட்டுமே சேமிக்கப்படும்.'
                  : 'Your exercises, medication logs, and hydration data stay privately stored on your own device.'}
              </p>
              <nav aria-label="Footer Quick Links" className="pt-1 flex flex-wrap gap-x-4 gap-y-2 text-[1rem] font-medium text-[#1F6F63] dark:text-[#2DD4BF]">
                <a href="#hero" className="hover:underline">
                  {isTa ? 'முகப்பு' : 'Home'}
                </a>
                <a href="#recovery-journey" className="hover:underline">
                  {isTa ? 'மீட்பு வழிகாட்டி' : 'Stroke Recovery Guide'}
                </a>
                <a href="#brain-explorer" className="hover:underline">
                  {isTa ? '3D உடல் வழிகாட்டி' : '3D Body Guide'}
                </a>
                <a href="#resources-section" className="hover:underline">
                  {isTa ? 'வளங்கள்' : 'Patient & Caregiver Resources'}
                </a>
                <a href="#dashboard" className="hover:underline">
                  {isTa ? 'முன்னேற்றம்' : 'Daily Progress'}
                </a>
                <a href="#risk-assessment" className="hover:underline">
                  {isTa ? 'F.A.S.T. சோதனை' : 'F.A.S.T. Check'}
                </a>
                <a href="#faq-section" className="hover:underline">
                  {isTa ? 'பற்றி & கேள்விகள்' : 'About & FAQ'}
                </a>
              </nav>
            </div>

            {/* Emergency Numbers (108 + Configurable Caregiver) */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? 'அவசர உதவி & பராமரிப்பாளர்' : 'Emergency & Caregiver Numbers'}
              </h3>
              <div className="space-y-3 text-[1rem]">
                <a
                  href="tel:108"
                  className="apple-pill-btn min-h-[56px] flex items-center justify-between px-5 py-3 bg-[#C81E1E] hover:bg-[#A61717] text-white font-semibold"
                >
                  <span>{isTa ? 'ஆம்புலன்ஸ் அவசர எண்' : 'Emergency Ambulance'}</span>
                  <span className="tabular-nums text-lg">108</span>
                </a>
                {hasCaregiverPhone ? (
                  <a
                    href={`tel:${cleanCaregiverPhone.replace(/[^\d+]/g, '')}`}
                    className="apple-pill-btn min-h-[56px] flex items-center justify-between px-5 py-3 bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white font-semibold hover:ring-2 hover:ring-[#1F6F63]"
                  >
                    <span className="truncate pr-2">
                      {state.caregiverName.trim() || (isTa ? 'குடும்பப் பராமரிப்பாளர்' : 'Family Caregiver')}
                    </span>
                    <span className="tabular-nums shrink-0">{cleanCaregiverPhone}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPersonalizeOpen(true)}
                    className="apple-pill-btn w-full min-h-[56px] flex items-center justify-between px-5 py-3 bg-white dark:bg-[#111A2B] border border-dashed border-[#1F6F63]/45 dark:border-[#2DD4BF]/45 text-[#1F6F63] dark:text-[#2DD4BF] font-semibold cursor-pointer hover:bg-[#E3F1ED] dark:hover:bg-[#112A27]"
                  >
                    <span>{isTa ? 'குடும்பப் பராமரிப்பாளர் எண் சேர்க்க' : 'Add Family Caregiver Number'}</span>
                    <span className="text-[1rem] font-semibold">{isTa ? 'அமைக்க' : 'Set Up'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Caregiver Tips + Language Toggle */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? 'பராமரிப்பாளர் குறிப்புகள்' : 'Caregiver Guidance'}
              </h3>
              <ul className="space-y-2 text-[1rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
                <li>
                  •{' '}
                  {isTa
                    ? 'மெதுவாக, அமைதியான குரலில் உரையாடவும்; பதில் கூறப் போதிய நேரம் அளிக்கவும்.'
                    : 'Speak calmly in short sentences and allow unhurried time to reply.'}
                </li>
                <li>
                  •{' '}
                  {isTa
                    ? 'பயிற்சியின்போது தலைச்சுற்றல் இருந்தால் உடனே ஓய்வெடுக்கச் செய்யவும்.'
                    : 'Pause movements right away if dizziness or fatigue appears.'}
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleToggleLanguage}
                  className="apple-pill-btn min-h-[56px] px-5 py-2.5 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1rem] font-semibold inline-flex items-center gap-2 cursor-pointer hc-primary-btn"
                >
                  <Languages className="w-5 h-5" aria-hidden="true" />
                  <span>{isTa ? 'Switch to English' : 'தமிழுக்கு மாற்றவும்'}</span>
                </button>

                {import.meta.env.DEV && (
                  <a
                    href="/api/download-project.zip"
                    download="strokecare-ai-project.zip"
                    className="apple-pill-btn min-h-[56px] px-5 py-2.5 border-2 border-[#1F6F63] dark:border-[#2DD4BF] bg-transparent hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] text-[1rem] font-semibold inline-flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" aria-hidden="true" />
                    <span>{isTa ? 'திட்டத்தை ZIP-ஆக பதிவிறக்கு' : 'Download Project (.zip)'}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
            <span className="font-medium">
              {isTa
                ? 'கல்வி மற்றும் தினசரி மறுவாழ்வுத் துணை மட்டுமே · எப்போதும் உங்கள் மருத்துவரின் ஆலோசனையைப் பின்பற்றவும்.'
                : 'Educational recovery guide only · Always follow your doctor’s medical advice.'}
            </span>
            <div className="flex flex-wrap items-center gap-5 font-medium">
              <button
                type="button"
                onClick={() => setLegalModalType('privacy')}
                className="hover:text-[#1F6F63] dark:hover:text-[#2DD4BF] underline-offset-4 hover:underline cursor-pointer"
              >
                {isTa ? 'தனியுரிமைக் கொள்கை' : 'Privacy'}
              </button>
              <button
                type="button"
                onClick={() => setLegalModalType('terms')}
                className="hover:text-[#1F6F63] dark:hover:text-[#2DD4BF] underline-offset-4 hover:underline cursor-pointer"
              >
                {isTa ? 'விதிமுறைகள்' : 'Terms'}
              </button>
              <button
                type="button"
                onClick={() => setLegalModalType('disclaimer')}
                className="hover:text-[#1F6F63] dark:hover:text-[#2DD4BF] underline-offset-4 hover:underline cursor-pointer"
              >
                {isTa ? 'மருத்துவ மறுப்பு' : 'Disclaimer'}
              </button>
            </div>
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                Designed &amp; Developed by{' '}
                <span className="font-semibold text-[#0F1F2E] dark:text-white">Lakshmanan</span>
              </p>
              <p className="text-[1rem] font-medium text-[#1F6F63] dark:text-[#2DD4BF]">
                UI/UX Designer &amp; AI Developer
              </p>
            </div>

            <div className="flex flex-col sm:items-end items-center gap-3">
              <div className="flex items-center gap-3">
                <a
                  href="https://www.linkedin.com/in/lakshmanan-p-aba07133a/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Lakshmanan's LinkedIn profile"
                  title="Visit Lakshmanan's LinkedIn profile"
                  className="w-11 h-11 rounded-full bg-white dark:bg-[#111A2B] border border-[var(--border-subtle)] text-[#0A66C2] dark:text-[#60A5FA] hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] dark:hover:bg-[#0A66C2] dark:hover:text-white transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>

                <a
                  href="https://spectacular-lebkuchen-72e0ed.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View Lakshmanan's portfolio"
                  title="View Lakshmanan's portfolio"
                  className="w-11 h-11 rounded-full bg-white dark:bg-[#111A2B] border border-[var(--border-subtle)] text-[#1F6F63] dark:text-[#2DD4BF] hover:bg-[#1F6F63] hover:text-white hover:border-[#1F6F63] dark:hover:bg-[#2DD4BF] dark:hover:text-[#0B1220] transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <Globe className="w-5 h-5" aria-hidden="true" />
                </a>
              </div>

              <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                © 2026 StrokeCare AI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE EMERGENCY SOS 108 BAR (Clears 56x56 Accessibility FAB) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-md border-t border-[var(--border-subtle)] pl-4 pr-[5.5rem] py-2 flex items-center justify-between gap-2.5">
        <a
          href="#dashboard"
          className="min-h-[56px] px-3.5 py-2 rounded-full bg-[#E3F1ED] dark:bg-[#112A27] text-[#0F1F2E] dark:text-white text-[1rem] font-semibold flex items-center gap-1.5 shrink-0"
        >
          <Activity className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF]" />
          <span className="tabular-nums">{progressPct}%</span>
        </a>

        <button
          type="button"
          onClick={() => setSosOpen(true)}
          className="apple-pill-btn flex-1 min-w-0 min-h-[56px] px-4 py-2 bg-[#C81E1E] hover:bg-[#A61717] text-white text-[1rem] font-semibold flex items-center justify-center gap-2 cursor-pointer"
        >
          <PhoneCall className="w-5 h-5 shrink-0" />
          <span className="truncate">{isTa ? 'அவசர SOS 108' : 'Emergency SOS 108'}</span>
        </button>
      </div>

      {/* Floating Accessibility Controls */}
      <FloatingAccessibilityMenu
        lang={state.language}
        textSize={state.textSize}
        highContrast={state.highContrast}
        theme={state.theme}
        onCycleTextSize={handleCycleTextSize}
        onToggleHighContrast={handleToggleHighContrast}
        onToggleTheme={handleToggleTheme}
      />

      {/* Modals */}
      <SosModal
        open={sosOpen}
        lang={state.language}
        caregiverName={state.caregiverName}
        caregiverPhone={state.caregiverPhone}
        onConfigureCaregiver={() => setPersonalizeOpen(true)}
        onClose={() => setSosOpen(false)}
      />

      <MedAlertModal
        period={alertModalPeriod}
        lang={state.language}
        settings={state.medReminders}
        onMarkAllTaken={handleMarkPeriodTaken}
        onSnooze={handleSnoozeMedAlert}
        onClose={() => setAlertModalPeriod(null)}
      />

      <PersonalizeModal
        open={personalizeOpen}
        lang={state.language}
        initialName={state.profileName}
        initialFocus={state.recoveryFocus}
        initialCaregiverName={state.caregiverName}
        initialCaregiverPhone={state.caregiverPhone}
        onSave={(name, focus, caregiverName, caregiverPhone) => {
          setState((prev) => ({
            ...prev,
            profileName: name,
            recoveryFocus: focus,
            caregiverName,
            caregiverPhone,
          }));
          setPersonalizeOpen(false);
          const targetMap = {
            mobility: 'physio-section',
            speech: 'speech-section',
            medications: 'medicine-section',
            brain: 'brain-explorer',
          };
          document.getElementById(targetMap[focus])?.scrollIntoView({ behavior: 'smooth' });
          notify('மறுவாழ்வுத் திட்டம் சேமிக்கப்பட்டது!', 'Recovery plan saved!', 'success');
        }}
        onClose={() => setPersonalizeOpen(false)}
      />

      <ResourceModal
        article={activeResourceArticle}
        lang={state.language}
        onClose={() => setResourceModalId(null)}
      />

      <CelebrationModal
        open={celebrationOpen}
        lang={state.language}
        onClose={() => setCelebrationOpen(false)}
      />

      <LegalModal
        type={legalModalType}
        lang={state.language}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
}
