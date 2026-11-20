import React, { useEffect, useRef, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock,
  Contrast,
  Moon,
  PhoneCall,
  SlidersHorizontal,
  Square,
  Sun,
  Type,
  Volume2,
  X,
} from 'lucide-react';
import {
  formatTimeDisplay,
  MedicationPeriod,
  MedicationReminderSettings,
  PERIOD_METADATA,
} from '../med-reminders';
import {
  Language,
  MEDICATION_ITEMS,
  ResourceArticle,
  TextSizeMode,
  ThemeMode,
} from '../data/rehabContent';
import {
  AudioVoiceMode,
  getAudioVoiceMode,
  getSpeechState,
  playSoftTone,
  setAudioVoiceMode,
  speakBilingual,
  SpeechPlaybackState,
  subscribeAudioVoiceMode,
  subscribeSpeechState,
} from '../utils/audioSpeech';

/* ============================================================================
 * FLOATING ACCESSIBILITY MENU (56px Round Button, Bottom-Right)
 * ========================================================================= */
interface FloatingAccessibilityMenuProps {
  lang: Language;
  textSize: TextSizeMode;
  highContrast: boolean;
  theme: ThemeMode;
  onCycleTextSize: () => void;
  onToggleHighContrast: () => void;
  onToggleTheme: () => void;
}

export const FloatingAccessibilityMenu: React.FC<FloatingAccessibilityMenuProps> = ({
  lang,
  textSize,
  highContrast,
  theme,
  onCycleTextSize,
  onToggleHighContrast,
  onToggleTheme,
}) => {
  const isTa = lang === 'ta';
  const [open, setOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState<AudioVoiceMode>(() => getAudioVoiceMode());

  useEffect(() => {
    return subscribeAudioVoiceMode(setVoiceMode);
  }, []);

  const sizeBadge = textSize === 'normal' ? 'A' : textSize === 'large' ? 'A+' : 'A++';

  return (
    <div
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(1rem + env(safe-area-inset-right, 0px))',
      }}
      className="fixed z-50 flex flex-col items-end"
    >
      {open && (
        <div
          role="region"
          aria-label={isTa ? 'அணுகல் அமைப்புகள்' : 'Accessibility Controls'}
          className="clinical-card hc-card p-5 mb-3 w-[min(19rem,calc(100vw-2rem))] max-h-[75vh] overflow-y-auto shadow-2xl space-y-3 bg-white dark:bg-[#111A2B]"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
              {isTa ? 'எளிய வாசிப்பு வசதிகள்' : 'Display & Comfort'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={isTa ? 'மூடு' : 'Close menu'}
              className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-[#3A4753] dark:text-[#D3DFE9] hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onCycleTextSize}
            className="w-full min-h-[56px] px-4 py-2.5 rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex flex-wrap items-center justify-between gap-2 cursor-pointer text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Type className="w-5 h-5 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF]" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{isTa ? 'எழுத்து அளவு' : 'Text Size'}</span>
            </span>
            <span className="tabular-nums font-semibold text-[#1F6F63] dark:text-[#2DD4BF] shrink-0">
              {sizeBadge}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleHighContrast}
            aria-pressed={highContrast}
            className={`w-full min-h-[56px] px-4 py-2.5 rounded-2xl text-[1.125rem] font-semibold flex flex-wrap items-center justify-between gap-2 cursor-pointer text-left ${
              highContrast
                ? 'bg-[#1F6F63] text-white hc-primary-btn'
                : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Contrast className="w-5 h-5 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{isTa ? 'உயர் மாறுபாடு' : 'High Contrast'}</span>
            </span>
            <span className="shrink-0">{highContrast ? (isTa ? 'ஆன்' : 'On') : isTa ? 'ஆஃப்' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full min-h-[56px] px-4 py-2.5 rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex flex-wrap items-center justify-between gap-2 cursor-pointer text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 shrink-0 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 shrink-0 text-[#1F6F63]" />
              )}
              <span className="min-w-0 [overflow-wrap:anywhere]">{isTa ? 'திரை நிறம்' : 'Theme'}</span>
            </span>
            <span className="shrink-0">
              {theme === 'dark' ? (isTa ? 'இருள்' : 'Dark') : isTa ? 'வெளிச்சம்' : 'Light'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAudioVoiceMode(voiceMode === 'en' ? 'auto' : 'en')}
            aria-pressed={voiceMode === 'en'}
            className={`w-full min-h-[56px] px-4 py-2.5 rounded-2xl text-[1.125rem] font-semibold flex flex-wrap items-center justify-between gap-2 cursor-pointer text-left ${
              voiceMode === 'en'
                ? 'bg-[#1F6F63] text-white hc-primary-btn'
                : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Volume2 className="w-5 h-5 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{isTa ? 'குரல் மொழி' : 'Spoken Voice'}</span>
            </span>
            <span className="shrink-0">
              {voiceMode === 'en' ? 'English' : isTa ? 'தமிழ் / Auto' : 'English'}
            </span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={
          isTa
            ? `எளிய வாசிப்பு மற்றும் திரை அமைப்புகள் (${sizeBadge})`
            : `Open Accessibility Controls (${sizeBadge})`
        }
        title={isTa ? `வாசிப்பு வசதி (${sizeBadge})` : `Accessibility (${sizeBadge})`}
        className="w-14 h-14 rounded-full bg-white dark:bg-[#111A2B] border-2 border-[#1F6F63] dark:border-[#2DD4BF] text-[#0F1F2E] dark:text-white shadow-lg flex items-center justify-center cursor-pointer hc-card hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] shrink-0"
      >
        <SlidersHorizontal className="w-6 h-6 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
      </button>
    </div>
  );
};

/* ============================================================================
 * EMERGENCY SOS MODAL
 * ========================================================================= */
export const SosModal: React.FC<{
  open: boolean;
  lang: Language;
  onClose: () => void;
}> = ({ open, lang, onClose }) => {
  const isTa = lang === 'ta';
  const [sirenOn, setSirenOn] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open && sirenOn) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setSirenOn(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  if (!open) return null;

  const toggleSiren = () => {
    if (!sirenOn) {
      setSirenOn(true);
      playSoftTone(880, 0.25, 0.25);
      timerRef.current = window.setInterval(() => {
        playSoftTone(880, 0.22, 0.25);
        window.setTimeout(() => playSoftTone(587, 0.22, 0.25), 250);
      }, 550);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setSirenOn(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sosModalTitle"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-[#111A2B] rounded-[28px] border-2 border-[#C81E1E] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/70 text-[#C81E1E] dark:text-red-300 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 id="sosModalTitle" className="text-2xl font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? 'அவசர உதவி SOS' : 'Emergency SOS'}
              </h3>
              <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                {isTa ? 'உடனடி மருத்துவ உதவிக்கு அழைக்கவும்' : 'Tap below to call immediately'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTa ? 'மூடு' : 'Close'}
            className="w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] flex items-center justify-center text-[#3A4753] dark:text-[#D3DFE9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <a
            href="tel:108"
            className="flex items-center justify-between p-4 min-h-[64px] rounded-2xl bg-red-50 dark:bg-red-950/50 border-2 border-[#C81E1E] hover:bg-red-100 dark:hover:bg-red-900/60"
          >
            <div>
              <span className="text-lg font-semibold text-red-950 dark:text-red-100 block">
                {isTa ? 'ஆம்புலன்ஸ் · 108' : 'Ambulance · 108'}
              </span>
              <span className="text-[1rem] text-red-800 dark:text-red-200">
                {isTa ? 'அவசர மருத்துவ வாகனம்' : 'Free Emergency Medical Response'}
              </span>
            </div>
            <span className="px-4 py-2 rounded-full bg-[#C81E1E] text-white font-semibold text-base">
              {isTa ? 'அழைக்க' : 'Call 108'}
            </span>
          </a>

          <a
            href="tel:+919876543210"
            className="flex items-center justify-between p-4 min-h-[64px] rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220]"
          >
            <div>
              <span className="text-lg font-semibold text-[#0F1F2E] dark:text-white block">
                {isTa ? 'குடும்பப் பராமரிப்பாளர்' : 'Family Caregiver'}
              </span>
              <span className="tabular-nums text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                +91 98765 43210
              </span>
            </div>
            <span className="px-4 py-2 rounded-full bg-[#1F6F63] text-white font-semibold text-base hc-primary-btn">
              {isTa ? 'அழைக்க' : 'Call'}
            </span>
          </a>
        </div>

        <button
          type="button"
          onClick={toggleSiren}
          className={`apple-pill-btn w-full min-h-[56px] px-4 py-3 border-2 font-semibold text-[1.125rem] flex items-center justify-center gap-2 cursor-pointer ${
            sirenOn
              ? 'bg-[#C81E1E] text-white border-[#C81E1E]'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border-amber-500'
          }`}
        >
          <BellRing className="w-5 h-5" />
          <span>
            {sirenOn
              ? isTa
                ? 'அலார ஒலியை நிறுத்து'
                : 'Stop Home Alert Siren'
              : isTa
              ? 'வீட்டில் உள்ளவர்களை அழைக்க அலாரம்'
              : 'Sound Home Alert Siren'}
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="apple-pill-btn w-full min-h-[56px] bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white cursor-pointer"
        >
          {isTa ? 'மூடு' : 'Close'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * MEDICATION DUE MODAL
 * ========================================================================= */
export const MedAlertModal: React.FC<{
  period: MedicationPeriod | null;
  lang: Language;
  settings: MedicationReminderSettings;
  onMarkAllTaken: (period: MedicationPeriod) => void;
  onSnooze: (period: MedicationPeriod, minutes: number) => void;
  onClose: () => void;
}> = ({ period, lang, settings, onMarkAllTaken, onSnooze, onClose }) => {
  if (!period) return null;
  const isTa = lang === 'ta';
  const meta = PERIOD_METADATA[period];
  const scheduledDisplay = formatTimeDisplay(settings.schedules[period]);
  const meds = MEDICATION_ITEMS.filter((m) => m.period === period);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="medAlertModalTitle"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-[#111A2B] rounded-[28px] border-2 border-[#1F6F63] dark:border-[#2DD4BF] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] block tabular-nums">
                {isTa ? meta.label_ta : meta.label_en} · {scheduledDisplay}
              </span>
              <h3 id="medAlertModalTitle" className="text-xl font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? 'மாத்திரை உட்கொள்ளும் நேரம்!' : 'Time for Your Medication'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTa ? 'மூடு' : 'Close'}
            className="w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] flex items-center justify-center text-[#3A4753] dark:text-[#D3DFE9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-2.5">
          {meds.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220]"
            >
              <span className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? m.name_ta : m.name_en}
              </span>
              <span className="tabular-nums text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] shrink-0">
                {scheduledDisplay}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onMarkAllTaken(period)}
            className="apple-pill-btn w-full min-h-[56px] px-4 py-3 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold flex items-center justify-center gap-2 cursor-pointer hc-primary-btn"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isTa ? 'அனைத்தையும் உட்கொண்டேன் ✓' : 'Mark All Taken ✓'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSnooze(period, 10)}
              className="apple-pill-btn min-h-[56px] px-3 py-2 bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>{isTa ? '10 நிமிடம்' : 'Snooze 10m'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="apple-pill-btn min-h-[56px] px-3 py-2 bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] cursor-pointer"
            >
              {isTa ? 'மூடு' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * PERSONALIZE RECOVERY FOCUS MODAL
 * ========================================================================= */
export const PersonalizeModal: React.FC<{
  open: boolean;
  lang: Language;
  initialName: string;
  initialFocus: 'mobility' | 'speech' | 'medications' | 'brain';
  onSave: (name: string, focus: 'mobility' | 'speech' | 'medications' | 'brain') => void;
  onClose: () => void;
}> = ({ open, lang, initialName, initialFocus, onSave, onClose }) => {
  const [name, setName] = useState(initialName);
  const [focus, setFocus] = useState(initialFocus);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setFocus(initialFocus);
    }
  }, [open, initialName, initialFocus]);

  if (!open) return null;
  const isTa = lang === 'ta';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="personalizeTitle"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-[#111A2B] rounded-[28px] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
              {isTa ? 'தனிப்பயன் அமைப்பு' : 'Personalized Setup'}
            </span>
            <h3 id="personalizeTitle" className="text-2xl font-semibold text-[#0F1F2E] dark:text-white mt-0.5">
              {isTa ? 'உங்கள் மறுவாழ்வுத் திட்டம்' : 'Personalize Your Daily Plan'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTa ? 'மூடு' : 'Close'}
            className="w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] flex items-center justify-center text-[#3A4753] dark:text-[#D3DFE9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(name.trim().slice(0, 40), focus);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="patientNameField" className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-slate-200">
              {isTa ? 'உங்கள் பெயர் (விருப்பமானது)' : 'Your Name (Optional)'}
            </label>
            <input
              id="patientNameField"
              type="text"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isTa ? 'எ.கா. கார்த்திக்' : 'e.g. Karthik'}
              className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="patientFocusField" className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-slate-200">
              {isTa ? 'இன்றைய முதன்மை இலக்கு' : 'Today’s Primary Focus'}
            </label>
            <select
              id="patientFocusField"
              value={focus}
              onChange={(e) => setFocus(e.target.value as 'mobility' | 'speech' | 'medications' | 'brain')}
              className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
            >
              <option value="mobility">{isTa ? 'உடற்பயிற்சி & நடை' : 'Physiotherapy & Mobility'}</option>
              <option value="speech">{isTa ? 'பேச்சுப் பயிற்சி' : 'Speech & Communication'}</option>
              <option value="medications">{isTa ? 'மாத்திரைகள் & தண்ணீர்' : 'Medications & Hydration'}</option>
              <option value="brain">{isTa ? '3D மூளை கல்வி' : '3D Brain & Stroke Education'}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="apple-pill-btn min-h-[56px] bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] cursor-pointer"
            >
              {isTa ? 'ரத்து' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="apple-pill-btn min-h-[56px] bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold cursor-pointer hc-primary-btn"
            >
              {isTa ? 'சேமித்துத் தொடங்கு' : 'Save & Start'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================================
 * RESOURCE ARTICLE READER MODAL
 * ========================================================================= */
const ResourceListenButton: React.FC<{
  article: ResourceArticle;
  lang: Language;
}> = ({ article, lang }) => {
  const isTa = lang === 'ta';
  const [speechState, setSpeechState] = useState<SpeechPlaybackState>(() => getSpeechState());
  const buttonId = `resource-${article.id}`;

  useEffect(() => {
    return subscribeSpeechState(setSpeechState);
  }, []);

  const isActive =
    speechState.activeId === buttonId && (speechState.isSpeaking || speechState.loading);

  return (
    <button
      type="button"
      onClick={() =>
        speakBilingual(
          `${article.title_ta}. ${article.summary_ta}. ${article.points_ta.join('. ')}`,
          `${article.title_en}. ${article.summary_en}. ${article.points_en.join('. ')}`,
          lang,
          0.95,
          { id: buttonId }
        )
      }
      aria-pressed={isActive}
      className={`apple-pill-btn min-h-[56px] px-5 py-3 font-semibold text-[1.125rem] flex items-center gap-2 cursor-pointer ${
        isActive
          ? 'bg-[#1F6F63] text-white hc-primary-btn'
          : 'border-2 border-[#1F6F63] dark:border-[#2DD4BF] text-[#1F6F63] dark:text-[#2DD4BF]'
      }`}
    >
      {isActive ? (
        <Square className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
      ) : (
        <Volume2 className="w-5 h-5 shrink-0" aria-hidden="true" />
      )}
      <span>
        {speechState.activeId === buttonId && speechState.loading
          ? isTa
            ? 'தயாராகிறது...'
            : 'Loading Voice...'
          : isActive
          ? isTa
            ? 'நிறுத்து (Stop)'
            : 'Stop Voice'
          : isTa
          ? 'குரலில் கேட்க'
          : 'Listen Aloud'}
      </span>
    </button>
  );
};

export const ResourceModal: React.FC<{
  article: ResourceArticle | null;
  lang: Language;
  onClose: () => void;
}> = ({ article, lang, onClose }) => {
  if (!article) return null;
  const isTa = lang === 'ta';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resReaderTitle"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-[#111A2B] rounded-[28px] max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
              {isTa ? article.category_ta : article.category_en}
            </span>
            <h3 id="resReaderTitle" className="text-2xl font-semibold text-[#0F1F2E] dark:text-white mt-1 leading-snug">
              {isTa ? article.title_ta : article.title_en}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTa ? 'மூடு' : 'Close'}
            className="w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] flex items-center justify-center text-[#3A4753] dark:text-[#D3DFE9] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6]">
          {isTa ? article.summary_ta : article.summary_en}
        </p>

        <ul className="space-y-3 bg-[#F2F7F6] dark:bg-[#0B1220] p-5 rounded-2xl">
          {(isTa ? article.points_ta : article.points_en).map((pt, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-[1.125rem] text-[#0F1F2E] dark:text-slate-100 leading-[1.55]">
              <span className="text-[#1F6F63] dark:text-[#2DD4BF] font-semibold mt-0.5 shrink-0">✓</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <ResourceListenButton article={article} lang={lang} />

          <a
            href={article.ctaHref}
            onClick={onClose}
            className="apple-pill-btn min-h-[56px] px-7 py-3 bg-[#1F6F63] hover:bg-[#17574D] text-white font-semibold text-[1.125rem] inline-flex items-center justify-center hc-primary-btn"
          >
            {isTa ? article.ctaLabel_ta : article.ctaLabel_en}
          </a>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 100% DAILY MILESTONES CELEBRATION MODAL
 * ========================================================================= */
export const CelebrationModal: React.FC<{
  open: boolean;
  lang: Language;
  onClose: () => void;
}> = ({ open, lang, onClose }) => {
  if (!open) return null;
  const isTa = lang === 'ta';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebrateTitle"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-[#111A2B] rounded-[28px] border-2 border-[#1F6F63] dark:border-[#2DD4BF] max-w-md w-full p-7 text-center shadow-2xl space-y-5">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#E3F1ED] dark:bg-[#112A27] flex items-center justify-center text-4xl">
          🏆
        </div>
        <div className="space-y-2">
          <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
            {isTa ? '100% தினசரி சாதனை' : '100% Daily Goals Achieved'}
          </span>
          <h3 id="celebrateTitle" className="text-2xl font-semibold text-[#0F1F2E] dark:text-white">
            {isTa ? 'அற்புதம்! இன்றைய அனைத்து இலக்குகளும் முடிந்தன!' : 'Wonderful! All Daily Goals Completed!'}
          </h3>
          <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
            {isTa
              ? 'உடற்பயிற்சி, மருந்துகள், தண்ணீர் மற்றும் பேச்சுப் பயிற்சிகளை முழுமையாக முடித்துவிட்டீர்கள்.'
              : 'You completed today’s physiotherapy, medications, hydration, and speech sessions.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="apple-pill-btn w-full min-h-[56px] bg-[#1F6F63] hover:bg-[#17574D] text-white font-semibold text-[1.125rem] cursor-pointer hc-primary-btn"
        >
          {isTa ? 'நன்றி (Close)' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * LEGAL & MEDICAL DISCLAIMER MODAL
 * ========================================================================= */
export const LegalModal: React.FC<{
  type: 'privacy' | 'terms' | 'disclaimer' | null;
  lang: Language;
  onClose: () => void;
}> = ({ type, lang, onClose }) => {
  if (!type) return null;
  const isTa = lang === 'ta';

  const content = {
    privacy: {
      title_ta: 'தனியுரிமைக் கொள்கை (Privacy Policy)',
      title_en: 'Privacy Policy',
      body_ta:
        'StrokeCare AI உங்கள் தனியுரிமையை முழுமையாக மதிக்கிறது. உங்களுடைய தினசரி உடற்பயிற்சி, மருந்துகள், தண்ணீர் மற்றும் பேச்சுப் பயிற்சி பதிவுகள் உங்கள் சாதனத்தின் உலாவியில் (Local Storage) மட்டுமே சேமிக்கப்படுகின்றன. எந்தவொரு தனிப்பட்ட மருத்துவத் தகவலும் வெளிப்புற சேவையகங்களுக்கு அனுப்பப்படுவதில்லை.',
      body_en:
        'StrokeCare AI stores your daily exercises, medication check-offs, water intake, speech progress, and optional display name locally on your own device (localStorage). Personal health logs never leave your browser.',
    },
    terms: {
      title_ta: 'பயன்பாட்டு விதிமுறைகள் (Terms & Conditions)',
      title_en: 'Terms & Conditions',
      body_ta:
        'இந்த தளம் பக்கவாத மறுவாழ்வு பயணத்தில் நோயாளிகள் மற்றும் குடும்பப் பராமரிப்பாளர்களுக்கு தினசரி பயிற்சி மற்றும் கல்வி வழிகாட்டுதலை வழங்க வடிவமைக்கப்பட்டுள்ளது. உடற்பயிற்சிகளை செய்யும்போது உடல் வலி அல்லது தலைச்சுற்றல் ஏற்பட்டால் உடனே நிறுத்தி உங்கள் மருத்துவரை அணுகவும்.',
      body_en:
        'StrokeCare AI offers educational 3D anatomy visualizations, physiotherapy timers, hydration tracking, and speech practice. Stop any activity immediately if dizziness or discomfort occurs and consult your care team.',
    },
    disclaimer: {
      title_ta: 'மருத்துவ மறுப்பு (Medical Disclaimer)',
      title_en: 'Medical Disclaimer',
      body_ta:
        'StrokeCare AI ஒரு கல்வி மற்றும் தினசரி மறுவாழ்வு துணைத் தளமாகும். இது மருத்துவரின் நேரடி ஆலோசனை, நோயறிதல் அல்லது அவசர சிகிச்சைக்கு மாற்றாகாது. பக்கவாத அறிகுறிகள் தென்பட்டால் உடனடியாக 108 அழைக்கவும்.',
      body_en:
        'StrokeCare AI is intended for educational and daily rehabilitation support only. It does not replace licensed medical diagnosis, prescriptions, or emergency care. Call 108 immediately for stroke emergencies.',
    },
  }[type];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legalDialogTitle"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-[#111A2B] rounded-[28px] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <h3 id="legalDialogTitle" className="text-xl font-semibold text-[#0F1F2E] dark:text-white">
            {isTa ? content.title_ta : content.title_en}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTa ? 'மூடு' : 'Close'}
            className="w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] flex items-center justify-center text-[#3A4753] dark:text-[#D3DFE9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6]">
          {isTa ? content.body_ta : content.body_en}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="apple-pill-btn w-full min-h-[56px] bg-[#1F6F63] hover:bg-[#17574D] text-white font-semibold text-[1.125rem] cursor-pointer hc-primary-btn"
        >
          {isTa ? 'புரிந்தது (Close)' : 'Got It'}
        </button>
      </div>
    </div>
  );
};
