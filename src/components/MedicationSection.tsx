import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  MoonStar,
  Pill,
  PlayCircle,
  RotateCcw,
  Settings,
  Sun,
  Sunrise,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  formatTimeDisplay,
  getBrowserNotificationPermission,
  getNextPendingReminder,
  MedicationId,
  MedicationPeriod,
  MedicationReminderSettings,
  PERIOD_METADATA,
} from '../med-reminders';
import { HistoryEntry, Language, MEDICATION_ITEMS } from '../data/rehabContent';

interface MedicationSectionProps {
  lang: Language;
  medications: Record<MedicationId, boolean>;
  medicationHistory: HistoryEntry[];
  medReminders: MedicationReminderSettings;
  activeAlertPeriod: MedicationPeriod | null;
  onToggleMedication: (medId: MedicationId, taken: boolean) => void;
  onMarkPeriodTaken: (period: MedicationPeriod) => void;
  onResetMeds: () => void;
  onRequestPushPermission: () => void;
  onToggleRemindersEnabled: () => void;
  onToggleReminderSound: () => void;
  onUpdateScheduleTime: (period: MedicationPeriod, hhmm: string) => void;
  onTriggerTestAlert: () => void;
  onSnoozeAlert: (minutes: number) => void;
  onDismissBanner: () => void;
}

export const MedicationSection: React.FC<MedicationSectionProps> = ({
  lang,
  medications,
  medicationHistory,
  medReminders,
  activeAlertPeriod,
  onToggleMedication,
  onMarkPeriodTaken,
  onResetMeds,
  onRequestPushPermission,
  onToggleRemindersEnabled,
  onToggleReminderSound,
  onUpdateScheduleTime,
  onTriggerTestAlert,
  onSnoozeAlert,
  onDismissBanner,
}) => {
  const isTa = lang === 'ta';
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [showHowToEnable, setShowHowToEnable] = useState<boolean>(false);
  const [filterPeriod, setFilterPeriod] = useState<'all' | MedicationPeriod>('all');

  const perm = getBrowserNotificationPermission();
  const takenCount = Object.values(medications).filter(Boolean).length;
  const totalCount = 4;
  const allDone = takenCount === totalCount;
  const nextPending = getNextPendingReminder(new Date(), medReminders, medications);

  const periodIcons: Record<MedicationPeriod, React.ReactNode> = {
    morning: <Sunrise className="w-6 h-6 text-amber-700 dark:text-amber-300" aria-hidden="true" />,
    afternoon: <Sun className="w-6 h-6 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />,
    night: <MoonStar className="w-6 h-6 text-indigo-700 dark:text-indigo-300" aria-hidden="true" />,
  };

  const periodsToRender: MedicationPeriod[] = (['morning', 'afternoon', 'night'] as MedicationPeriod[]).filter(
    (p) => filterPeriod === 'all' || filterPeriod === p
  );

  return (
    <div className="clinical-card hc-card p-6 sm:p-8 space-y-7">
      {/* Header + Reminder Settings Trigger */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
            <Pill className="w-6 h-6 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              {takenCount} / {totalCount} {isTa ? 'மருந்துகள் உட்கொண்டது' : 'Medications Taken'}
            </span>
          </div>
          <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
            {isTa
              ? 'மாதிரி மறுவாழ்வு அட்டவணை: உங்கள் மருத்துவர் எழுதிய மருந்து மற்றும் அளவை மட்டுமே பின்பற்றவும்.'
              : 'Sample recovery checklist: verify exact tablets and dosages with your doctor’s actual prescription.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-expanded={settingsOpen}
            className={`apple-pill-btn min-h-[56px] px-5 py-2.5 font-semibold text-[1.125rem] flex items-center gap-2 cursor-pointer ${
              settingsOpen
                ? 'bg-[#1F6F63] text-white hc-primary-btn'
                : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white'
            }`}
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            <span>{isTa ? 'நினைவூட்டல் அமைப்புகள்' : 'Reminder settings'}</span>
          </button>

          <button
            type="button"
            onClick={onResetMeds}
            className="apple-pill-btn min-h-[56px] px-5 py-2.5 bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
            <span>{isTa ? 'மீட்டமை' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Reminder Settings Drawer */}
      {settingsOpen && (
        <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? 'மருந்து நினைவூட்டல் அமைப்புகள்' : 'Medication Reminder Preferences'}
              </h3>
              <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                {perm === 'granted'
                  ? isTa
                    ? 'உலாவி அறிவிப்பு + ஒலி & குரல் நினைவூட்டல் செயல்பாட்டில் உள்ளது.'
                    : 'Browser push notifications, chimes, and voice alerts are active.'
                  : isTa
                  ? 'திரை மற்றும் குரல் நினைவூட்டல் தயாராக உள்ளது.'
                  : 'In-app visual, chime, and spoken voice reminders are ready.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onTriggerTestAlert}
              className="apple-pill-btn min-h-[56px] px-5 py-2.5 bg-[#0F1F2E] dark:bg-[#1F6F63] text-white text-[1.125rem] font-semibold flex items-center gap-2 cursor-pointer hc-primary-btn"
            >
              <PlayCircle className="w-5 h-5" aria-hidden="true" />
              <span>{isTa ? 'மாதிரி எச்சரிக்கை' : 'Test Alert'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={onRequestPushPermission}
              className={`apple-pill-btn min-h-[56px] px-4 py-3 font-semibold text-[1.125rem] flex items-center justify-center gap-2 cursor-pointer ${
                perm === 'granted'
                  ? 'bg-[#15803D] text-white'
                  : 'bg-[#1F6F63] hover:bg-[#17574D] text-white hc-primary-btn'
              }`}
            >
              <Bell className="w-5 h-5 shrink-0" />
              <span>
                {perm === 'granted'
                  ? isTa
                    ? 'உலாவி அறிவிப்பு: ஆன் ✓'
                    : 'Browser Push: On ✓'
                  : isTa
                  ? 'உலாவி அறிவிப்பு இயக்கு'
                  : 'Enable Browser Push'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleRemindersEnabled}
              aria-pressed={medReminders.enabled}
              className="apple-pill-btn min-h-[56px] px-4 py-3 bg-white dark:bg-[#111A2B] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              {medReminders.enabled ? (
                <Clock className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF]" />
              ) : (
                <BellOff className="w-5 h-5 text-[#3A4753]" />
              )}
              <span>
                {isTa
                  ? medReminders.enabled
                    ? 'அட்டவணை: ஆன்'
                    : 'அட்டவணை: நிறுத்தம்'
                  : medReminders.enabled
                  ? 'Schedule: On'
                  : 'Schedule: Paused'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleReminderSound}
              aria-pressed={medReminders.soundEnabled}
              className="apple-pill-btn min-h-[56px] px-4 py-3 bg-white dark:bg-[#111A2B] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              {medReminders.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF]" />
              ) : (
                <VolumeX className="w-5 h-5 text-[#3A4753]" />
              )}
              <span>
                {isTa
                  ? medReminders.soundEnabled
                    ? 'ஒலி & குரல்: ஆன்'
                    : 'ஒலி: அமைதி'
                  : medReminders.soundEnabled
                  ? 'Sound & Voice: On'
                  : 'Sound: Off'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            {(['morning', 'afternoon', 'night'] as MedicationPeriod[]).map((p) => (
              <label
                key={p}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#111A2B]"
              >
                <span className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                  {isTa
                    ? p === 'morning'
                      ? 'காலை'
                      : p === 'afternoon'
                      ? 'மதியம்'
                      : 'இரவு'
                    : p === 'morning'
                    ? 'Morning'
                    : p === 'afternoon'
                    ? 'Afternoon'
                    : 'Night'}
                </span>
                <input
                  type="time"
                  value={medReminders.schedules[p]}
                  onChange={(e) => onUpdateScheduleTime(p, e.target.value)}
                  className="tabular-nums text-[1.125rem] font-semibold bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white rounded-xl px-3 py-1.5 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Calm Neutral Banner When Browser Push Is Blocked */}
      {(perm === 'denied' || perm === 'unsupported') && (
        <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[1.125rem] text-[#0F1F2E] dark:text-slate-100">
              <Bell className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
              <span>
                {isTa
                  ? 'உலாவி அறிவிப்பு தடுக்கப்பட்டுள்ளது — திரை மற்றும் குரல் நினைவூட்டல் தொடர்ந்து இயங்கும்.'
                  : 'Browser push alerts are off — in-app banner and spoken reminders remain active.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowHowToEnable((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline cursor-pointer shrink-0"
            >
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
              <span>{isTa ? 'இயக்குவது எப்படி?' : 'How to enable'}</span>
            </button>
          </div>
          {showHowToEnable && (
            <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9] pl-8 leading-relaxed">
              {isTa
                ? 'உங்கள் உலாவியின் முகவரிப் பட்டியில் உள்ள பூட்டு ஐகானைத் தொட்டு, “Notifications” என்பதை “Allow” என மாற்றவும்.'
                : 'Click the lock or site-settings icon beside the address bar, set Notifications to Allow, and reload.'}
            </p>
          )}
        </div>
      )}

      {/* Active Due Alert Banner */}
      {activeAlertPeriod && (
        <div
          role="alert"
          className="rounded-[24px] bg-[#E3F1ED] dark:bg-[#112A27] ring-2 ring-[#1F6F63] dark:ring-[#2DD4BF] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <h4 className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white">
              {isTa
                ? `மருந்து நேரம்: ${PERIOD_METADATA[activeAlertPeriod].label_ta}`
                : `Due Now: ${PERIOD_METADATA[activeAlertPeriod].label_en}`}
            </h4>
            <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
              {MEDICATION_ITEMS.filter((m) => m.period === activeAlertPeriod)
                .map((m) => (isTa ? m.name_ta : m.name_en))
                .join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onMarkPeriodTaken(activeAlertPeriod)}
              className="apple-pill-btn min-h-[56px] px-5 py-2.5 bg-[#1F6F63] text-white text-[1.125rem] font-semibold cursor-pointer hc-primary-btn"
            >
              {isTa ? 'உட்கொண்டேன் ✓' : 'Mark Taken ✓'}
            </button>
            <button
              type="button"
              onClick={() => onSnoozeAlert(10)}
              className="apple-pill-btn min-h-[56px] px-5 py-2.5 bg-white dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white cursor-pointer"
            >
              {isTa ? '10 நிமிடம் தள்ளிவை' : 'Snooze 10m'}
            </button>
            <button
              type="button"
              onClick={onDismissBanner}
              className="min-h-[56px] px-3 py-2 text-[1.125rem] font-medium text-[#3A4753] dark:text-[#D3DFE9] hover:underline cursor-pointer"
            >
              {isTa ? 'மறை' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}

      {/* TOP SPOTLIGHT: NEXT DUE DOSE OR CALM ALL-DONE CELEBRATION */}
      {allDone ? (
        <div className="rounded-[24px] bg-[#E3F1ED] dark:bg-[#112A27] p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-16 h-16 rounded-2xl bg-[#1F6F63] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa
                  ? 'அருமை! இன்றைய அனைத்து 4 மருந்துகளும் எடுத்துக்கொண்டீர்கள்.'
                  : 'All 4 scheduled medications taken for today!'}
              </h4>
              <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
                {isTa
                  ? 'நேரப்படி மருந்துகளை உட்கொண்டது உங்கள் நரம்பு மற்றும் இதய ஆரோக்கியத்தைக் காக்கும்.'
                  : 'Consistent daily timing keeps blood pressure and recovery steady.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResetMeds}
            className="apple-pill-btn min-h-[56px] px-6 py-3 bg-white dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white cursor-pointer shrink-0"
          >
            {isTa ? 'மீண்டும் தொடங்கு' : 'Reset for New Day'}
          </button>
        </div>
      ) : nextPending ? (
        <div className="rounded-[24px] bg-[#E3F1ED] dark:bg-[#112A27] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#0B1220] flex items-center justify-center shrink-0">
              {periodIcons[nextPending.period]}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <span>
                  {nextPending.isOverdueToday
                    ? isTa
                      ? 'இப்போது எடுக்க வேண்டிய மருந்து'
                      : 'NEXT DUE DOSE · DUE NOW'
                    : isTa
                    ? 'அடுத்த மருந்து நேரம்'
                    : 'NEXT SCHEDULED DOSE'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{nextPending.timeDisplay}</span>
              </div>
              <h4 className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa
                  ? PERIOD_METADATA[nextPending.period].label_ta
                  : PERIOD_METADATA[nextPending.period].label_en}{' '}
                —{' '}
                {MEDICATION_ITEMS.filter(
                  (m) => m.period === nextPending.period && !medications[m.id]
                )
                  .map((m) => (isTa ? m.name_ta : m.name_en))
                  .join(' + ')}
              </h4>
              <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
                {isTa
                  ? PERIOD_METADATA[nextPending.period].context_ta
                  : PERIOD_METADATA[nextPending.period].context_en}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onMarkPeriodTaken(nextPending.period)}
            className="apple-pill-btn min-h-[56px] px-7 py-3.5 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0 hc-primary-btn"
          >
            <Check className="w-5 h-5" />
            <span>{isTa ? 'இப்போது உட்கொண்டேன் ✓' : 'Mark Dose Taken ✓'}</span>
          </button>
        </div>
      ) : null}

      {/* Timeline Period Filter */}
      <div className="flex flex-wrap items-center gap-2.5">
        {(
          [
            { id: 'all', ta: 'அனைத்து வேளைகள்', en: 'All Times' },
            { id: 'morning', ta: 'காலை', en: 'Morning' },
            { id: 'afternoon', ta: 'மதியம்', en: 'Afternoon' },
            { id: 'night', ta: 'இரவு', en: 'Night' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={filterPeriod === tab.id}
            onClick={() => setFilterPeriod(tab.id)}
            className={`apple-pill-btn min-h-[56px] px-5 py-2 text-[1.125rem] font-semibold cursor-pointer ${
              filterPeriod === tab.id
                ? 'bg-[#1F6F63] text-white hc-primary-btn'
                : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-100'
            }`}
          >
            {isTa ? tab.ta : tab.en}
          </button>
        ))}
      </div>

      {/* Equal 3-Column Morning / Afternoon / Night Timeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-5">
        {periodsToRender.map((period) => {
          const meta = PERIOD_METADATA[period];
          const formattedTime = formatTimeDisplay(medReminders.schedules[period]);
          const medsForPeriod = MEDICATION_ITEMS.filter((m) => m.period === period);
          const isNextSlot = !allDone && nextPending?.period === period;

          return (
            <div
              key={period}
              className={`rounded-[24px] p-5 flex flex-col gap-4 min-w-0 ${
                isNextSlot
                  ? 'bg-[#E3F1ED] dark:bg-[#112A27] ring-2 ring-[#1F6F63] dark:ring-[#2DD4BF]'
                  : 'bg-[#F2F7F6] dark:bg-[#0B1220]'
              }`}
            >
              <div className="flex items-start gap-3 pb-3.5 border-b border-[var(--border-subtle)] min-w-0 md:min-h-[4.25rem]">
                <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#111A2B] flex items-center justify-center shrink-0">
                  {periodIcons[period]}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white leading-snug min-w-0 [overflow-wrap:anywhere]">
                    {isTa
                      ? period === 'morning'
                        ? 'காலை'
                        : period === 'afternoon'
                        ? 'மதியம்'
                        : 'இரவு'
                      : period === 'morning'
                      ? 'Morning'
                      : period === 'afternoon'
                      ? 'Afternoon'
                      : 'Night'}
                  </h4>
                  <p className="text-[1rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] tabular-nums leading-snug min-w-0 [overflow-wrap:anywhere]">
                    {formattedTime} · {isTa ? meta.context_ta : meta.context_en}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-0">
                {medsForPeriod.map((med) => {
                  const taken = medications[med.id];
                  return (
                    <label
                      key={med.id}
                      className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5 p-4 rounded-2xl cursor-pointer transition-colors min-w-0 ${
                        taken
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/35 ring-1 ring-emerald-500/60'
                          : 'bg-white dark:bg-[#111A2B] hover:ring-1 hover:ring-[#1F6F63]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={taken}
                        onChange={(e) => onToggleMedication(med.id, e.target.checked)}
                        className="mt-1 w-6 h-6 rounded accent-[#1F6F63] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex flex-col gap-1.5">
                        <span className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white leading-[1.35] min-w-0 [overflow-wrap:anywhere]">
                          {isTa ? med.name_ta : med.name_en}
                        </span>
                        <span className="text-[1rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.45] min-w-0 [overflow-wrap:anywhere]">
                          {isTa ? med.purpose_ta : med.purpose_en}
                        </span>
                        <div className="pt-0.5 flex items-center min-w-0">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[1rem] font-semibold leading-snug [overflow-wrap:anywhere] ${
                              taken
                                ? 'text-emerald-800 dark:text-emerald-300'
                                : 'text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {taken ? (isTa ? '✓ எடுத்தது (Undo)' : '✓ Taken (Undo)') : isTa ? 'நிலுவை' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gentle Prescription Disclaimer + Compact History */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-[var(--border-subtle)] text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
        <p className="font-medium">
          {isTa
            ? 'கல்வி வழிகாட்டி மட்டுமே: எப்போதும் உங்கள் மருத்துவரின் பரிந்துரைப்படி மட்டுமே மாத்திரைகளை உட்கொள்ளவும்.'
            : 'Educational checklist template only — always follow your doctor’s prescribed medications and dosages.'}
        </p>
        {medicationHistory.length > 0 && (
          <span className="tabular-nums font-medium">
            {isTa ? 'கடைசிப் பதிவு: ' : 'Last logged: '}
            {isTa ? medicationHistory[0].label_ta : medicationHistory[0].label_en} ({medicationHistory[0].time})
          </span>
        )}
      </div>
    </div>
  );
};
