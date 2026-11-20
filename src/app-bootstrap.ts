import { initStroke3D, Stroke3DController, BRAIN_STRUCTURES, BrainStructureInfo } from './stroke3d';
import {
  MedicationPeriod,
  MedicationId,
  MedicationReminderSettings,
  DEFAULT_MED_REMINDER_SETTINGS,
  PERIOD_METADATA,
  registerMedNotificationWorker,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  formatTimeDisplay,
  getLocalDateKey,
  getPendingMedIdsForPeriod,
  getNextPendingReminder,
  checkDueMedicationPeriod,
  dispatchSystemMedicationNotification,
} from './med-reminders';

declare global {
  interface Window {
    lucide?: { createIcons: () => void };
    // Header & Global Controls
    toggleLanguage: () => void;
    toggleTheme: () => void;
    cycleTextSize: () => void;
    toggleHighContrast: () => void;
    openSosModal: () => void;
    closeSosModal: () => void;
    toggleSirenTone: () => void;
    closeCelebrationModal: () => void;
    scrollToSection: (sectionId: string) => void;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
    openGetStartedModal: () => void;
    closeGetStartedModal: () => void;
    saveRecoveryProfile: (e: Event) => void;
    openResourceModal: (resourceId: 'fast' | 'home_rehab' | 'brain_nutrition' | 'speech_tips') => void;
    closeResourceModal: () => void;
    speakResourceGuide: () => void;
    openLegalModal: (type: 'privacy' | 'terms' | 'disclaimer') => void;
    closeLegalModal: () => void;

    // 3D Brain & Stroke Section
    setBrainModeTab: (tab: 'anatomy' | 'stroke_flow' | 'diagram_2d') => void;
    focusBrainStructure: (structureId: string) => void;
    setBrainPresetView: (viewName: 'left_lateral' | 'right_lateral' | 'anterior' | 'superior' | 'sagittal' | 'full') => void;
    toggleBrainGhostMode: () => void;
    setBrainHemisphereSplit: (amount: number) => void;
    speakBrainFactText: () => void;
    toggle3DRotate: () => void;
    zoomIn3D: () => void;
    zoomOut3D: () => void;
    reset3DView: () => void;
    toggleHudCollapse: () => void;
    setStrokeType: (type: 'ischemic' | 'hemorrhagic') => void;
    updateAnimationStep: (index: number) => void;
    nextAnimationStep: () => void;
    prevAnimationStep: () => void;
    goToAnimationStep: (index: number) => void;
    toggleAnimationAutoPlay: () => void;
    toggleSpeechForStep: () => void;

    // Exercise & Rehab
    filterExercises: (category: 'all' | 'hand' | 'leg' | 'facial') => void;
    startFiveSecondHold: () => void;
    resetFiveSecondHold: () => void;
    toggleExerciseDone: (exId: 'ex1' | 'ex2' | 'ex3') => void;
    clearExerciseHistory: () => void;

    // Medication Management & Alert Service
    filterMedications: (period: 'all' | 'morning' | 'afternoon' | 'night') => void;
    handleMedCheckboxToggle: (medId: 'med1' | 'med2' | 'med3' | 'med4', checkbox: HTMLInputElement) => void;
    resetMedsChecklist: () => void;
    requestMedAlertsPermission: () => Promise<void>;
    toggleMedRemindersEnabled: () => void;
    toggleMedReminderSound: () => void;
    updateMedScheduleTime: (period: MedicationPeriod, timeValue: string) => void;
    triggerTestMedAlert: () => Promise<void>;
    triggerMedAlertForPeriod: (period: MedicationPeriod, isTest?: boolean) => Promise<void>;
    confirmMedAlertTaken: () => void;
    snoozeMedAlert: (minutes: number) => void;
    closeMedAlertModal: () => void;
    dismissMedAlertBanner: () => void;

    // Water Tracking
    addOneGlassWater: () => void;
    removeOneGlassWater: () => void;
    setWaterGlasses: (count: number) => void;
    clearWaterHistory: () => void;

    // Speech & Communication
    setSpeechSubTab: (tab: 'cards' | 'match' | 'phrases') => void;
    setSpeechRateMode: (mode: 'slow' | 'normal') => void;
    speakSpeechCard: (cardId: string) => void;
    toggleSpeechCardPracticed: (cardId: string) => void;
    answerMatchQuiz: (optionIdx: number) => void;
    nextMatchQuizQuestion: () => void;
    resetMatchQuiz: () => void;
    speakCaregiverPhrase: (phraseTa: string, phraseEn: string) => void;
  }
}

interface HistoryEntry {
  id: string;
  label_ta: string;
  label_en: string;
  time: string;
}

interface AppState {
  language: 'ta' | 'en';
  theme: 'light' | 'dark';
  textSize: 'normal' | 'large' | 'xl';
  highContrast: boolean;
  profileName: string;
  recoveryFocus: 'mobility' | 'speech' | 'medications' | 'brain';
  exercises: { ex1: boolean; ex2: boolean; ex3: boolean };
  medications: { med1: boolean; med2: boolean; med3: boolean; med4: boolean };
  waterCount: number;
  practicedSpeechIds: string[];
  exerciseHistory: HistoryEntry[];
  medicationHistory: HistoryEntry[];
  waterHistory: HistoryEntry[];
  medReminders: MedicationReminderSettings;
}

const STORAGE_KEY = 'strokecare_pro_state_v1';

const DEFAULT_STATE: AppState = {
  language: 'ta',
  theme: 'light',
  textSize: 'large',
  highContrast: false,
  profileName: '',
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
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    const parsedRem = parsed.medReminders || {};
    return {
      ...DEFAULT_STATE,
      ...parsed,
      exercises: { ...DEFAULT_STATE.exercises, ...(parsed.exercises || {}) },
      medications: { ...DEFAULT_STATE.medications, ...(parsed.medications || {}) },
      practicedSpeechIds: Array.isArray(parsed.practicedSpeechIds) ? parsed.practicedSpeechIds : [],
      exerciseHistory: Array.isArray(parsed.exerciseHistory) ? parsed.exerciseHistory : [],
      medicationHistory: Array.isArray(parsed.medicationHistory) ? parsed.medicationHistory : [],
      waterHistory: Array.isArray(parsed.waterHistory) ? parsed.waterHistory : [],
      medReminders: {
        ...DEFAULT_MED_REMINDER_SETTINGS,
        ...parsedRem,
        schedules: {
          ...DEFAULT_MED_REMINDER_SETTINGS.schedules,
          ...(parsedRem.schedules || {}),
        },
        snoozedUntil: { ...(parsedRem.snoozedUntil || {}) },
        lastTriggeredDate: { ...(parsedRem.lastTriggeredDate || {}) },
      },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

let appState: AppState = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch {
    // Ignore storage quota errors
  }
}

function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Three.js & Interactive Variables
let stroke3DInstance: Stroke3DController | null = null;
let currentBrainTab: 'anatomy' | 'stroke_flow' | 'diagram_2d' = 'anatomy';
let currentBrainStructureId = 'Brain-cerebral_hemisphere-left';
let isGhostModeActive = true;
let isHudCollapsed = false;
let currentStrokeType: 'ischemic' | 'hemorrhagic' = 'ischemic';
let currentAnimationStep = 3;
let autoPlayInterval: number | null = null;
let isAutoPlaying = false;
let hasCelebrated = false;
let speechRate: 'slow' | 'normal' = 'slow';

// =========================================================================
// TOAST NOTIFICATION HELPER
// =========================================================================
let toastTimeout: number | null = null;
function showToast(msgTa: string, msgEn: string, variant: 'teal' | 'success' | 'warning' | 'danger' = 'teal') {
  const toastEl = document.getElementById('appToast');
  const toastText = document.getElementById('appToastText');
  const toastDot = document.getElementById('appToastDot');
  if (!toastEl || !toastText) return;

  toastText.innerText = appState.language === 'ta' ? msgTa : msgEn;

  if (toastDot) {
    toastDot.className = 'w-2.5 h-2.5 rounded-full shrink-0 ' +
      (variant === 'success'
        ? 'bg-emerald-500'
        : variant === 'warning'
        ? 'bg-amber-500'
        : variant === 'danger'
        ? 'bg-red-500'
        : 'bg-[#2DD4BF]');
  }

  toastEl.classList.remove('hidden');
  toastEl.classList.add('flex', 'toast-enter');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toastEl.classList.add('hidden');
    toastEl.classList.remove('flex', 'toast-enter');
  }, 3200);
}

// =========================================================================
// WEB AUDIO & SPEECH SYNTHESIS HELPERS
// =========================================================================
let audioCtx: AudioContext | null = null;
let alarmTimer: number | null = null;
let isAlarmActive = false;

function getAudioCtx(): AudioContext | null {
  if (!audioCtx) {
    const AudioClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioClass) audioCtx = new AudioClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, dur: number) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.16, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function speakTextBilingual(textTa: string, textEn: string, rateOverride?: number) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const isTa = appState.language === 'ta';
  const utter = new SpeechSynthesisUtterance(isTa ? textTa : textEn);
  utter.rate = rateOverride ?? (speechRate === 'slow' ? 0.78 : 0.96);
  utter.pitch = 1.0;

  if (isTa) {
    const voices = window.speechSynthesis.getVoices();
    const taVoice = voices.find((v) => v.lang.startsWith('ta'));
    if (taVoice) utter.voice = taVoice;
    else utter.lang = 'ta-IN';
  } else {
    utter.lang = 'en-US';
  }
  window.speechSynthesis.speak(utter);
}

// =========================================================================
// STATIC STROKE ANIMATION DATA
// =========================================================================
const ischemicAnimationSteps = [
  {
    tag_ta: 'படி 1: ஆரோக்கியமான கரோடிட் தமனி (Typical Carotid Artery)',
    tag_en: 'Step 1: Typical Healthy Carotid Artery',
    heading_ta: 'கழுத்து ரத்தக்குழாய் சுத்தமாகவும் தடையின்றியும் உள்ளது.',
    heading_en: 'Healthy arterial vessel allows smooth, unhindered blood flow.',
    description_ta:
      'இதயத்தில் இருந்து கழுத்து வழியாக மூளைக்கு செல்லும் கரோடிட் தமனி (Carotid Artery) ஆரோக்கியமாக இருப்பதால் ஆக்சிஜன் நிறைந்த ரத்தம் சீராக மூளையை சென்றடைகிறது.',
    description_en:
      'The carotid artery runs up the neck carrying oxygen-rich blood smoothly from the heart directly into the brain hemispheres without obstructions.',
  },
  {
    tag_ta: 'படி 2: கொழுப்பு படிந்த தமனி (Diseased Carotid Artery)',
    tag_en: 'Step 2: Diseased Carotid Artery & Plaque Buildup',
    heading_ta: 'ரத்தக்குழாயில் கொழுப்பு (Plaque) படிந்து ரத்த உறைவு கட்டி உருவாகிறது.',
    heading_en: 'Cholesterol plaque builds up on the arterial wall, narrowing the passage.',
    description_ta:
      'அதிக கொலஸ்ட்ரால் மற்றும் ரத்த அழுத்தத்தால் கழுத்து ரத்தக்குழாய் சுவரில் கொழுப்பு படிந்து (Atherosclerosis), ரத்தப்பாதை குறுகி ரத்த உறைவு கட்டி உருவாகிறது.',
    description_en:
      'High cholesterol and hypertension lead to fatty plaque (atherosclerosis) depositing along the arterial bifurcation, narrowing the lumen and forming a thrombus clot.',
  },
  {
    tag_ta: 'படி 3: ரத்த உறைவு உடைந்து பயணம் (Blood Clot Breaks Off & Travels)',
    tag_en: 'Step 3: Blood Clot Breaks Off and Travels',
    heading_ta: 'ரத்த உறைவு கட்டி உடைந்து ரத்த ஓட்டத்தில் மூளையை நோக்கி பயணிக்கிறது!',
    heading_en: 'A thrombus fragment breaks free and travels rapidly toward the brain.',
    description_ta:
      'கழுத்தில் உள்ள கொழுப்பு பகுதியில் இருந்து ஒரு ரத்த உறைவு துண்டு உடைந்து, ரத்தத்தின் வேகத்தோடு கழுத்திலிருந்து தலைக்குள்ளே மூளையை நோக்கி வேகமாக பயணிக்கிறது.',
    description_en:
      'Shearing arterial pressure dislodges a clot fragment, which is swept rapidly upward through the internal carotid artery directly into cerebral circulation.',
  },
  {
    tag_ta: 'படி 4: மூளையில் அடைப்பு - பக்கவாதம் (Blood Clot Lodges in Cerebral Artery)',
    tag_en: 'Step 4: Blood Clot Lodges in Cerebral Artery (Ischemic Stroke)',
    heading_ta: 'கட்டி இடது பெருமூளை தமனியில் (Left MCA) சிக்கி பக்கவாதம் ஏற்படுகிறது!',
    heading_en: 'Clot lodges in Left Middle Cerebral Artery, inducing acute left hemisphere ischemia.',
    description_ta:
      'மூளையின் இடது அரைக்கோள ரத்தக்குழாயில் அந்த கட்டி இறுக்கமாக சிக்கிக் கொள்வதால் (Lodges), பேச்சு மற்றும் வலது கை-கால் இயக்க செல்கள் ஆக்சிஜன் இன்றி பாதிக்கப்படுகின்றன.',
    description_en:
      'The clot wedges firmly inside the left middle cerebral artery. The left hemisphere motor strip and language zones are starved of oxygen, causing right-side hemiplegia and aphasia.',
  },
  {
    tag_ta: 'படி 5: அவசர சிகிச்சை & நலம் பெறுதல் (Emergency Treatment & Recovery)',
    tag_en: 'Step 5: Emergency Medical Treatment & Recovery',
    heading_ta: 'உடனடி மருத்துவ சிகிச்சையால் அடைப்பு கரைக்கப்பட்டு மூளை செல்கள் காப்பாற்றப்படுகின்றன!',
    heading_en: 'Rapid emergency medical intervention dissolves the clot and restores flow.',
    description_ta:
      'பக்கவாத அறிகுறிகள் தெரிந்த உடனே மருத்துவமனைக்கு சென்றால், clot buster மருந்து (tPA) மூலம் அடைப்பை கரைத்து ரத்த ஓட்டத்தை மீட்டு பக்கவாதத்திலிருந்து மீளலாம்!',
    description_en:
      'When emergency care is reached promptly within the golden window, thrombolytic medication clears the obstruction, restoring neural blood flow.',
  },
];

const hemorrhagicAnimationSteps = [
  {
    tag_ta: 'படி 1: ஆரோக்கியமான ரத்த ஓட்டம் (Normal Arterial Flow)',
    tag_en: 'Step 1: Normal Arterial Blood Supply',
    heading_ta: 'ரத்தம் மூளைக்கு தடையின்றி சீராக செல்கிறது.',
    heading_en: 'Oxygen-rich blood flows evenly to brain parenchyma.',
    description_ta:
      'இதயத்தில் இருந்து ரத்தக் குழாய் வழியாக மூளைக்கு ஆக்ஸிஜனும் சத்துக்களும் சீராக செல்கின்றன.',
    description_en: 'Arteries maintain normal vascular tone and deliver vital glucose and oxygen.',
  },
  {
    tag_ta: 'படி 2: பலவீனமான ரத்தக் குழாய் (Weakened Blood Vessel)',
    tag_en: 'Step 2: Vessel Wall Weakening',
    heading_ta: 'அதிக ரத்த அழுத்தம் காரணமாக ரத்தக்குழாய் சுவர் பலவீனமடைகிறது.',
    heading_en: 'Uncontrolled blood pressure exerts stress on delicate vessel walls.',
    description_ta:
      'கட்டுப்படுத்தப்படாத உயர் ரத்த அழுத்தம் மூளையில் உள்ள நுண்ணிய ரத்தக்குழாய்களின் சுவர்களை பலவீனப்படுத்தி பலூன் போல உப்ப வைக்கிறது.',
    description_en:
      'Chronic hypertension thins arterial walls, creating micro-aneurysms that balloon under high pressure.',
  },
  {
    tag_ta: 'படி 3: ரத்தக் குழாய் வெடித்தல் (Artery Wall Ruptures)',
    tag_en: 'Step 3: Artery Wall Ruptures',
    heading_ta: 'அதிக அழுத்தத்தால் பலவீனமான ரத்தக் குழாய் வெடித்து ரத்தம் கசிகிறது!',
    heading_en: 'The weakened wall bursts, causing bleeding directly into brain tissue.',
    description_ta:
      'மூளையின் ரத்தக்குழாய் வெடித்து (Aneurysm/Rupture), ரத்தம் மூளை திசுக்களுக்குள் வேகமாக பரவி அழுத்தத்தை உண்டாக்குகிறது.',
    description_en:
      'The vascular wall ruptures, hemorrhaging blood into the intracranial space and disrupting neuronal communication.',
  },
  {
    tag_ta: 'படி 4: மூளை திசுக்களுக்கு கடுமையான அழுத்தம் (Brain Pressure & Stroke)',
    tag_en: 'Step 4: Intracranial Pressure & Hemorrhagic Stroke',
    heading_ta: 'கசியும் ரத்தத்தின் அழுத்தத்தால் மூளை செல்கள் சேதமடைந்து பக்கவாதம் ஏற்படுகிறது!',
    heading_en: 'Accumulated blood exerts severe mechanical pressure on surrounding brain tissue.',
    description_ta:
      'வெளியேறும் ரத்தம் மூளை செல்களை அழுத்தி நசுக்குவதால் ஆக்சிஜன் கிடைக்காமல் பக்கவாதம் மற்றும் கடுமையான தலைவலி உண்டாகிறது.',
    description_en:
      'Hematoma accumulation compresses surrounding tissue and restricts local perfusion, triggering neurological deficits.',
  },
  {
    tag_ta: 'படி 5: அவசர மருத்துவ சிகிச்சை & உயிர் காப்பு (Emergency Care & Stabilization)',
    tag_en: 'Step 5: Emergency Stabilization & Recovery',
    heading_ta: 'உடனடி சிகிச்சையால் ரத்தக் கசிவு நிறுத்தப்பட்டு ரத்த அழுத்தம் கட்டுப்படுத்தப்படுகிறது!',
    heading_en: 'Specialized neurosurgical care stops the bleeding and stabilizes the survivor.',
    description_ta:
      'உடனே மருத்துவமனைக்கு சென்றால், ரத்தக் கசிவை நிறுத்தி, அழுத்தத்தை குறைத்து மூளை செல்களை முழுமையாக காப்பாற்ற முடியும்!',
    description_en:
      'Immediate emergency management controls blood pressure, relieves intracranial pressure, and preserves brain cells.',
  },
];

function getActiveAnimationSteps() {
  return currentStrokeType === 'ischemic' ? ischemicAnimationSteps : hemorrhagicAnimationSteps;
}

// =========================================================================
// SPEECH THERAPY DATA (BILINGUAL TAMIL + ENGLISH)
// =========================================================================
interface SpeechWordCard {
  id: string;
  word_ta: string;
  word_en: string;
  phonetic: string;
  tip_ta: string;
  tip_en: string;
  category_ta: string;
  category_en: string;
}

const SPEECH_WORDS: SpeechWordCard[] = [
  {
    id: 'sp-water',
    word_ta: 'தண்ணீர்',
    word_en: 'Water',
    phonetic: 'Thann-neer · WAH-ter',
    tip_ta: 'நாவை மேல் பல்லின் பின்புறம் வைத்து மெதுவாக "தண்-ணீர்" என உச்சரிக்கவும்.',
    tip_en: 'Round lips softly for "W", or place tongue behind upper teeth for "Th".',
    category_ta: 'அடிப்படைத் தேவை',
    category_en: 'Essentials',
  },
  {
    id: 'sp-hello',
    word_ta: 'வணக்கம்',
    word_en: 'Hello',
    phonetic: 'Va-nak-kam · heh-LOH',
    tip_ta: 'கீழ் உதட்டை லேசாக தொட்டு "வ", பின் "ணக்-கம்" என தெளிவாகக் கூறவும்.',
    tip_en: 'Gentle breath for "H", then press tongue tip to roof of mouth for "L".',
    category_ta: 'அன்றாட வாழ்த்து',
    category_en: 'Greeting',
  },
  {
    id: 'sp-medicine',
    word_ta: 'மருந்து',
    word_en: 'Medicine',
    phonetic: 'Ma-run-thu · MED-ih-sin',
    tip_ta: 'இரு உதடுகளையும் இணைத்து "ம" எனத் தொடங்கி மூச்சு விட்டு முடிக்கவும்.',
    tip_en: 'Press lips gently together for "M", and release softly on "sin".',
    category_ta: 'மருத்துவம்',
    category_en: 'Medical',
  },
  {
    id: 'sp-family',
    word_ta: 'குடும்பம்',
    word_en: 'Family',
    phonetic: 'Ku-dum-bam · FAM-ih-lee',
    tip_ta: 'சிறிய இடைவெளி விட்டு "கு-டும்-பம்" என மூன்று அசைகளாக உச்சரிக்கவும்.',
    tip_en: 'Break into 3 gentle beats: FAM - ih - lee, with a relaxed smile.',
    category_ta: 'குடும்பம்',
    category_en: 'Family',
  },
  {
    id: 'sp-doctor',
    word_ta: 'மருத்துவர்',
    word_en: 'Doctor',
    phonetic: 'Ma-ruth-thu-var · DOCK-ter',
    tip_ta: 'ஆழ்ந்த மூச்சு எடுத்து, மெதுவாக எழுத்துக்களைப் பிரித்துச் சொல்லவும்.',
    tip_en: 'Touch tongue tip firmly behind upper teeth for clear "D".',
    category_ta: 'மருத்துவம்',
    category_en: 'Medical',
  },
  {
    id: 'sp-thanks',
    word_ta: 'நன்றி',
    word_en: 'Thank You',
    phonetic: 'Nan-dri · THANK-yoo',
    tip_ta: 'நாக்கின் நுனியை மேல் பகுதியில் வைத்து "நன்-றி" என மென்மையாகச் சொல்லவும்.',
    tip_en: 'Place tongue lightly between teeth for "TH" and glide into "you".',
    category_ta: 'அன்றாட வாழ்த்து',
    category_en: 'Courtesy',
  },
];

interface MatchQuestion {
  prompt_ta: string;
  prompt_en: string;
  target_ta: string;
  target_en: string;
  emoji: string;
  options: Array<{ label_ta: string; label_en: string; emoji: string; isCorrect: boolean }>;
}

const MATCH_QUESTIONS: MatchQuestion[] = [
  {
    prompt_ta: 'இந்தப் படத்திற்குரிய சரியான சொல் எது?',
    prompt_en: 'Select the word that matches this picture:',
    target_ta: '"தண்ணீர்"',
    target_en: '"Water"',
    emoji: '🥛',
    options: [
      { label_ta: 'ஆப்பிள்', label_en: 'Apple', emoji: '🍎', isCorrect: false },
      { label_ta: 'தண்ணீர்', label_en: 'Water', emoji: '🥛', isCorrect: true },
      { label_ta: 'மாத்திரை', label_en: 'Medicine', emoji: '💊', isCorrect: false },
    ],
  },
  {
    prompt_ta: 'மருத்துவர் பரிந்துரைத்ததற்குரிய படம் எது?',
    prompt_en: 'Select the matching item for health care:',
    target_ta: '"மாத்திரை"',
    target_en: '"Medicine"',
    emoji: '💊',
    options: [
      { label_ta: 'மாத்திரை', label_en: 'Medicine', emoji: '💊', isCorrect: true },
      { label_ta: 'கடிகாரம்', label_en: 'Clock', emoji: '⏰', isCorrect: false },
      { label_ta: 'புத்தகம்', label_en: 'Book', emoji: '📖', isCorrect: false },
    ],
  },
  {
    prompt_ta: 'சத்தான பழத்தைத் தேர்ந்தெடுக்கவும்:',
    prompt_en: 'Choose the heart-healthy fruit:',
    target_ta: '"ஆப்பிள்"',
    target_en: '"Apple"',
    emoji: '🍎',
    options: [
      { label_ta: 'தண்ணீர்', label_en: 'Water', emoji: '🥛', isCorrect: false },
      { label_ta: 'நாற்காலி', label_en: 'Chair', emoji: '🪑', isCorrect: false },
      { label_ta: 'ஆப்பிள்', label_en: 'Apple', emoji: '🍎', isCorrect: true },
    ],
  },
];

let currentQuizIdx = 0;
let quizScore = 0;

// =========================================================================
// I18N BILINGUAL SYNC ACROSS ENTIRE DOCUMENT
// =========================================================================
function applyLanguageToDOM() {
  const isTa = appState.language === 'ta';
  document.documentElement.lang = isTa ? 'ta' : 'en';

  const elements = document.querySelectorAll<HTMLElement>('[data-ta][data-en]');
  elements.forEach((el) => {
    const val = isTa ? el.getAttribute('data-ta') : el.getAttribute('data-en');
    if (val !== null) {
      el.innerText = val;
    }
  });

  const langLabel = document.getElementById('langLabel');
  if (langLabel) {
    langLabel.innerText = isTa ? 'English' : 'தமிழ்';
  }

  // Update dynamic sections
  const struct = BRAIN_STRUCTURES[currentBrainStructureId];
  if (struct) updateBrainFactsPanel(struct);

  updateAnimationStep(currentAnimationStep);
  renderWaterRack();
  renderWaterHistory();
  renderExerciseCardsState();
  renderExerciseHistory();
  renderMedicationsState();
  renderMedicationHistory();
  const dateBadge = document.getElementById('dashTodayDate');
  if (dateBadge) {
    dateBadge.innerText = new Date().toLocaleDateString(isTa ? 'ta-IN' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  updateWelcomeHeadingDOM();
  renderSpeechCards();
  renderMatchQuiz();
  updateDashboardCounts();
}

function updateWelcomeHeadingDOM() {
  const isTa = appState.language === 'ta';
  const heading = document.getElementById('dashWelcomeHeading');
  if (!heading) return;

  const trimmedName = (appState.profileName || '').trim();
  if (trimmedName) {
    heading.innerText = isTa
      ? `வணக்கம், ${trimmedName}! இன்றைய மறுவாழ்வு இலக்குகள்`
      : `Welcome, ${trimmedName} — Today’s Recovery Goals`;
  } else {
    heading.innerText = isTa
      ? 'வணக்கம்! இன்றைய மறுவாழ்வு இலக்குகள்'
      : 'Welcome! Today’s Recovery Goals';
  }
}

function applyThemeAndAccessibilityToDOM() {
  const root = document.documentElement;
  root.classList.toggle('dark', appState.theme === 'dark');
  root.classList.toggle('high-contrast', appState.highContrast);

  root.classList.remove('text-size-normal', 'text-size-large', 'text-size-xl');
  root.classList.add(`text-size-${appState.textSize}`);

  const textSizeLabel = document.getElementById('textSizeLabel');
  if (textSizeLabel) {
    textSizeLabel.innerText = appState.textSize === 'normal' ? 'A' : appState.textSize === 'large' ? 'A+' : 'A++';
  }

  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  if (themeIconSun && themeIconMoon) {
    if (appState.theme === 'dark') {
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    } else {
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    }
  }
}

function toggleLanguage() {
  appState.language = appState.language === 'ta' ? 'en' : 'ta';
  saveState();
  applyLanguageToDOM();
  showToast('மொழி தமிழுக்கு மாற்றப்பட்டது', 'Language switched to English', 'teal');
  if (window.lucide) window.lucide.createIcons();
}

function toggleTheme() {
  appState.theme = appState.theme === 'light' ? 'dark' : 'light';
  saveState();
  applyThemeAndAccessibilityToDOM();
  showToast(
    appState.theme === 'dark' ? 'இருள் திரை (Dark Mode) இயக்கப்பட்டது' : 'வெளிச்ச திரை (Light Mode) இயக்கப்பட்டது',
    appState.theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled',
    'teal'
  );
}

function cycleTextSize() {
  if (appState.textSize === 'normal') appState.textSize = 'large';
  else if (appState.textSize === 'large') appState.textSize = 'xl';
  else appState.textSize = 'normal';

  saveState();
  applyThemeAndAccessibilityToDOM();
  showToast('எழுத்து அளவு மாற்றப்பட்டது', `Text size adjusted (${appState.textSize.toUpperCase()})`, 'teal');
}

function toggleHighContrast() {
  appState.highContrast = !appState.highContrast;
  saveState();
  applyThemeAndAccessibilityToDOM();
  showToast(
    appState.highContrast ? 'உயர் மாறுபாடு (High Contrast) இயக்கப்பட்டது' : 'சாதாரண தோற்றம் மீட்கப்பட்டது',
    appState.highContrast ? 'High contrast mode enabled' : 'Standard contrast restored',
    'teal'
  );
}

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// =========================================================================
// 3D BRAIN EXPLORER & STROKE MECHANISM CONTROLLERS
// =========================================================================
function updateBrainFactsPanel(info: BrainStructureInfo) {
  currentBrainStructureId = info.id;
  const isTa = appState.language === 'ta';

  const nameEl = document.getElementById('bfStructureName');
  if (nameEl) nameEl.innerText = isTa ? info.name_ta : info.name_en;

  const catEl = document.getElementById('bfStructureCategory');
  if (catEl) catEl.innerText = isTa ? info.category_ta : info.category_en;

  const fnListEl = document.getElementById('bfFunctionList');
  if (fnListEl) {
    const list = isTa ? info.functions_ta : info.functions_en;
    fnListEl.innerHTML = list
      .map(
        (fn) =>
          `<li class="flex items-start gap-2.5"><span class="text-[#00766C] dark:text-[#2DD4BF] font-bold mt-0.5 shrink-0">✓</span><span class="text-xs sm:text-sm text-[#172033] dark:text-slate-100 leading-relaxed">${fn}</span></li>`
      )
      .join('');
  }

  const strokeEl = document.getElementById('bfStrokeRelevance');
  if (strokeEl) strokeEl.innerText = isTa ? info.strokeRelevance_ta : info.strokeRelevance_en;

  const rehabEl = document.getElementById('bfRehabTips');
  if (rehabEl) rehabEl.innerText = isTa ? info.rehabTips_ta : info.rehabTips_en;

  // Sync active structure buttons
  document.querySelectorAll('.bf-structure-btn').forEach((btn) => {
    const target = btn.getAttribute('data-structure-id');
    if (target === info.id) {
      btn.className =
        'bf-structure-btn px-3 py-2 rounded-lg text-xs font-bold bg-[#00766C] text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0';
    } else {
      btn.className =
        'bf-structure-btn px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-[#172033] dark:text-slate-100 hover:border-[#00766C] border border-slate-400 dark:border-slate-500 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0';
    }
  });
}

function focusBrainStructure(structureId: string) {
  if (currentBrainTab === 'diagram_2d') {
    setBrainModeTab('anatomy');
  }
  if (stroke3DInstance) {
    stroke3DInstance.focusStructure(structureId);
  }
  const struct = BRAIN_STRUCTURES[structureId];
  if (struct) {
    updateBrainFactsPanel(struct);
  }
}

function setBrainPresetView(
  viewName: 'left_lateral' | 'right_lateral' | 'anterior' | 'superior' | 'sagittal' | 'full'
) {
  if (stroke3DInstance) {
    stroke3DInstance.setPresetView(viewName);
  }

  document.querySelectorAll('.bf-preset-btn').forEach((btn) => {
    const v = btn.getAttribute('data-view');
    if (v === viewName) {
      btn.className =
        'bf-preset-btn px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#00766C] text-white cursor-pointer transition-all whitespace-nowrap shrink-0';
    } else {
      btn.className =
        'bf-preset-btn px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-100 border border-slate-600 hover:bg-slate-700 cursor-pointer transition-all whitespace-nowrap shrink-0';
    }
  });
}

function toggleBrainGhostMode() {
  isGhostModeActive = !isGhostModeActive;
  if (stroke3DInstance) {
    stroke3DInstance.setGhostMode(isGhostModeActive);
  }
  const btn = document.getElementById('btnGhostMode');
  if (btn) {
    const isTa = appState.language === 'ta';
    btn.innerText = isTa
      ? isGhostModeActive
        ? 'X-Ray: ஆன்'
        : 'X-Ray: ஆஃப்'
      : isGhostModeActive
      ? 'X-Ray: On'
      : 'X-Ray: Off';
  }
}

function setBrainHemisphereSplit(amount: number) {
  if (stroke3DInstance) {
    stroke3DInstance.setSplitHemispheres(amount);
  }
}

function speakBrainFactText() {
  const struct = BRAIN_STRUCTURES[currentBrainStructureId];
  if (!struct) return;
  const textTa = `${struct.name_ta}. இதன் முக்கிய பணி: ${struct.functions_ta.join('. ')}. பக்கவாத தாக்கம்: ${struct.strokeRelevance_ta}. மறுவாழ்வு: ${struct.rehabTips_ta}`;
  const textEn = `${struct.name_en}. Key functions: ${struct.functions_en.join('. ')}. Stroke relevance: ${struct.strokeRelevance_en}. Recommended recovery: ${struct.rehabTips_en}`;
  speakTextBilingual(textTa, textEn, 0.88);
  showToast('மூளைப் பகுதி விளக்கம் ஒலிக்கிறது...', 'Reading brain region overview...', 'teal');
}

function setBrainModeTab(tab: 'anatomy' | 'stroke_flow' | 'diagram_2d') {
  currentBrainTab = tab;
  const tabAnatomy = document.getElementById('tabAnatomyExplorer');
  const tabStroke = document.getElementById('tabStrokeMechanism');
  const tab2D = document.getElementById('btnMode2D');

  const panelAnatomy = document.getElementById('panelBrainFactsExplorer');
  const panelStroke = document.getElementById('panelStrokeTimeline');
  const threeWrapper = document.getElementById('threeWrapper');
  const svgWrapper = document.getElementById('svgWrapper');

  const activeCls =
    'py-2 px-3 rounded-lg font-bold text-xs bg-[#00766C] text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0';
  const inactiveCls =
    'py-2 px-3 rounded-lg font-semibold text-xs text-[#334155] dark:text-slate-200 hover:text-[#172033] dark:hover:text-white bg-transparent flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0';

  if (tabAnatomy) tabAnatomy.className = tab === 'anatomy' ? activeCls : inactiveCls;
  if (tabStroke) tabStroke.className = tab === 'stroke_flow' ? activeCls : inactiveCls;
  if (tab2D) tab2D.className = tab === 'diagram_2d' ? activeCls : inactiveCls;

  if (tab === 'anatomy') {
    threeWrapper?.classList.remove('hidden');
    svgWrapper?.classList.add('hidden');
    panelAnatomy?.classList.remove('hidden');
    panelStroke?.classList.add('hidden');
    focusBrainStructure(currentBrainStructureId);
  } else if (tab === 'stroke_flow') {
    threeWrapper?.classList.remove('hidden');
    svgWrapper?.classList.add('hidden');
    panelAnatomy?.classList.add('hidden');
    panelStroke?.classList.remove('hidden');
    updateAnimationStep(currentAnimationStep);
  } else {
    // 2D Mayo Clinic Diagram alongside Stroke Step Controls
    threeWrapper?.classList.add('hidden');
    svgWrapper?.classList.remove('hidden');
    panelAnatomy?.classList.add('hidden');
    panelStroke?.classList.remove('hidden');
    updateAnimationStep(currentAnimationStep);
  }
  if (window.lucide) window.lucide.createIcons();
}

function setStrokeType(type: 'ischemic' | 'hemorrhagic') {
  currentStrokeType = type;
  const btnIschemic = document.getElementById('btnTypeIschemic');
  const btnHemorrhagic = document.getElementById('btnTypeHemorrhagic');

  const activeCls =
    'flex-1 py-2 px-3 rounded-lg font-bold text-xs bg-[#00766C] text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all';
  const inactiveCls =
    'flex-1 py-2 px-3 rounded-lg font-semibold text-xs text-[#334155] dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-500 flex items-center justify-center gap-1.5 cursor-pointer transition-all';

  if (btnIschemic) btnIschemic.className = type === 'ischemic' ? activeCls : inactiveCls;
  if (btnHemorrhagic) btnHemorrhagic.className = type === 'hemorrhagic' ? activeCls : inactiveCls;

  if (stroke3DInstance) stroke3DInstance.setStrokeType(type);
  updateAnimationStep(0);
}

function updateAnimationStep(index: number) {
  currentAnimationStep = index;
  const steps = getActiveAnimationSteps();
  const step = steps[index];
  const isTa = appState.language === 'ta';

  const ind = document.getElementById('slideIndicatorText');
  if (ind) ind.innerText = `${index + 1} / ${steps.length}`;

  const tag = document.getElementById('slideTitleTag');
  if (tag) tag.innerText = isTa ? step.tag_ta : step.tag_en;

  const heading = document.getElementById('slideMainHeading');
  if (heading) heading.innerText = isTa ? step.heading_ta : step.heading_en;

  const desc = document.getElementById('slideDescription');
  if (desc) desc.innerText = isTa ? step.description_ta : step.description_en;

  if (stroke3DInstance && currentBrainTab === 'stroke_flow') {
    stroke3DInstance.setStep(index);
  }

  for (let i = 0; i < 5; i++) {
    const pill = document.getElementById('pillStep' + i);
    if (pill) {
      pill.className =
        i === index
          ? 'py-2 px-1 rounded-lg bg-[#00766C] text-white font-bold text-xs text-center shadow-sm cursor-pointer transition-all'
          : 'py-2 px-1 rounded-lg bg-white dark:bg-slate-800 text-[#334155] dark:text-slate-200 border border-slate-400 dark:border-slate-500 hover:border-[#00766C] font-semibold text-xs text-center cursor-pointer transition-all';
    }
    const dot = document.getElementById('dotStep' + i);
    if (dot) {
      dot.className =
        i === index
          ? 'w-2.5 h-2.5 rounded-full bg-[#00766C] dark:bg-[#2DD4BF] ring-2 ring-[#00766C]/30 scale-125 transition-all'
          : 'w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 transition-all';
    }
  }

  // Sync 2D SVG callouts
  const ring1 = document.getElementById('calloutRing1');
  const ring2 = document.getElementById('calloutRing2');
  const ring3 = document.getElementById('calloutRing3');
  const conn1 = document.getElementById('connLine1');
  const conn2 = document.getElementById('connLine2');
  const conn3 = document.getElementById('connLine3');
  const cyanZone = document.getElementById('cyanStrokeZone');
  const travelingClot = document.getElementById('travelingClotElement');

  if (index === 0) {
    ring1?.setAttribute('stroke-width', '5');
    ring2?.setAttribute('stroke-width', '2');
    ring3?.setAttribute('stroke-width', '2');
    conn1?.setAttribute('stroke-width', '3');
    conn2?.setAttribute('stroke-width', '1.5');
    conn3?.setAttribute('stroke-width', '1.5');
    travelingClot?.classList.add('opacity-0');
    cyanZone?.classList.replace('opacity-80', 'opacity-20');
  } else if (index === 1 || index === 2) {
    ring1?.setAttribute('stroke-width', '2');
    ring2?.setAttribute('stroke-width', '5');
    ring3?.setAttribute('stroke-width', '2');
    conn1?.setAttribute('stroke-width', '1.5');
    conn2?.setAttribute('stroke-width', '3');
    conn3?.setAttribute('stroke-width', '1.5');
    if (travelingClot) {
      travelingClot.classList.remove('opacity-0');
      travelingClot.setAttribute('transform', index === 1 ? 'translate(620, 335)' : 'translate(645, 240)');
    }
  } else {
    ring1?.setAttribute('stroke-width', '2');
    ring2?.setAttribute('stroke-width', '2');
    ring3?.setAttribute('stroke-width', '5');
    conn1?.setAttribute('stroke-width', '1.5');
    conn2?.setAttribute('stroke-width', '1.5');
    conn3?.setAttribute('stroke-width', '3');
    if (travelingClot) {
      travelingClot.classList.remove('opacity-0');
      travelingClot.setAttribute('transform', 'translate(670, 160)');
    }
    cyanZone?.classList.replace('opacity-20', 'opacity-80');
  }
}

function nextAnimationStep() {
  const steps = getActiveAnimationSteps();
  updateAnimationStep((currentAnimationStep + 1) % steps.length);
}

function prevAnimationStep() {
  const steps = getActiveAnimationSteps();
  updateAnimationStep((currentAnimationStep - 1 + steps.length) % steps.length);
}

function goToAnimationStep(index: number) {
  if (currentBrainTab === 'anatomy') {
    setBrainModeTab('stroke_flow');
  }
  updateAnimationStep(index);
}

function toggleAnimationAutoPlay() {
  const btn = document.getElementById('btnAutoPlayToggle');
  const text = document.getElementById('btnAutoPlayText');
  const isTa = appState.language === 'ta';

  if (isAutoPlaying) {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    autoPlayInterval = null;
    isAutoPlaying = false;
    btn?.classList.remove('bg-[#D5EFEA]', 'text-[#00574F]', 'border-[#00766C]');
    if (text) text.innerText = isTa ? 'தானாக ஓடவிடு' : 'Auto Play';
  } else {
    isAutoPlaying = true;
    btn?.classList.add('bg-[#D5EFEA]', 'text-[#00574F]', 'border-[#00766C]');
    if (text) text.innerText = isTa ? 'நிறுத்து' : 'Pause';
    autoPlayInterval = window.setInterval(() => {
      nextAnimationStep();
    }, 4500);
  }
}

function toggleSpeechForStep() {
  const steps = getActiveAnimationSteps();
  const step = steps[currentAnimationStep];
  if (!step) return;
  speakTextBilingual(`${step.heading_ta}. ${step.description_ta}`, `${step.heading_en}. ${step.description_en}`, 0.88);
}

function toggle3DRotate() {
  if (!stroke3DInstance) return;
  const isRotating = stroke3DInstance.toggleAutoRotate();
  const btn = document.getElementById('btn3DRotate');
  if (btn) {
    const isTa = appState.language === 'ta';
    btn.innerText = isTa
      ? isRotating
        ? 'சுழற்சி: ஆன்'
        : 'சுழற்சி: ஆஃப்'
      : isRotating
      ? 'Rotate: On'
      : 'Rotate: Off';
  }
}

function zoomIn3D() {
  stroke3DInstance?.zoomIn();
}

function zoomOut3D() {
  stroke3DInstance?.zoomOut();
}

function reset3DView() {
  stroke3DInstance?.resetView();
  focusBrainStructure('Brain-cerebral_hemisphere-left');
  showToast('தொடக்க 3D பார்வை மீட்கப்பட்டது', 'Reset 3D camera to Left Hemisphere', 'teal');
}

function toggleHudCollapse() {
  isHudCollapsed = !isHudCollapsed;
  const dock = document.getElementById('hudBottomControls');
  const btnLabel = document.getElementById('hudCollapseText');
  const isTa = appState.language === 'ta';
  if (dock) {
    dock.classList.toggle('hidden', isHudCollapsed);
  }
  if (btnLabel) {
    btnLabel.innerText = isTa
      ? isHudCollapsed
        ? 'கட்டுப்பாடுகள் காட்டு'
        : 'கட்டுப்பாடுகள் மறை'
      : isHudCollapsed
      ? 'Show Controls'
      : 'Hide Controls';
  }
}

// =========================================================================
// EXERCISE & REHABILITATION MODULE
// =========================================================================
let exerciseTimer: number | null = null;
let holdRemaining = 5;

function startFiveSecondHold() {
  const countEl = document.getElementById('physioHoldText');
  const btn = document.getElementById('btnHoldStart');
  const isTa = appState.language === 'ta';

  if (exerciseTimer) {
    clearInterval(exerciseTimer);
    exerciseTimer = null;
  }

  holdRemaining = 5;
  if (countEl) countEl.innerText = isTa ? '05 நொடி' : '05 sec';
  if (btn) {
    btn.setAttribute('disabled', 'true');
    btn.classList.add('opacity-60');
  }

  playTone(440, 0.1);
  exerciseTimer = window.setInterval(() => {
    holdRemaining--;
    const padded = String(Math.max(0, holdRemaining)).padStart(2, '0');
    if (countEl) countEl.innerText = isTa ? `${padded} நொடி` : `${padded} sec`;
    playTone(540, 0.12);

    if (holdRemaining <= 0) {
      if (exerciseTimer) clearInterval(exerciseTimer);
      exerciseTimer = null;
      if (countEl) countEl.innerText = isTa ? 'அருமை!' : 'Done!';
      if (btn) {
        btn.removeAttribute('disabled');
        btn.classList.remove('opacity-60');
      }
      playTone(784, 0.3);
      showToast('5 நொடி பயிற்சி முடிந்தது!', '5-second hold completed!', 'success');
    }
  }, 1000);
}

function resetFiveSecondHold() {
  if (exerciseTimer) {
    clearInterval(exerciseTimer);
    exerciseTimer = null;
  }
  const countEl = document.getElementById('physioHoldText');
  const btn = document.getElementById('btnHoldStart');
  const isTa = appState.language === 'ta';
  if (countEl) countEl.innerText = isTa ? '05 நொடி' : '05 sec';
  if (btn) {
    btn.removeAttribute('disabled');
    btn.classList.remove('opacity-60');
  }
}

function filterExercises(category: 'all' | 'hand' | 'leg' | 'facial') {
  document.querySelectorAll<HTMLElement>('.ex-filter-btn').forEach((btn) => {
    const c = btn.getAttribute('data-cat');
    btn.className =
      c === category
        ? 'ex-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00766C] text-white shadow-sm cursor-pointer transition-all whitespace-nowrap shrink-0'
        : 'ex-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-[#334155] dark:text-slate-200 border border-slate-400 dark:border-slate-500 hover:border-[#00766C] cursor-pointer transition-all whitespace-nowrap shrink-0';
  });

  document.querySelectorAll<HTMLElement>('.exercise-card').forEach((card) => {
    const cardCat = card.getAttribute('data-category');
    if (category === 'all' || cardCat === category) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

const EXERCISE_NAMES: Record<'ex1' | 'ex2' | 'ex3', { ta: string; en: string }> = {
  ex1: { ta: 'கை விரல் பயிற்சி', en: 'Hand & Finger Mobility' },
  ex2: { ta: 'கால் மற்றும் நடை பயிற்சி', en: 'Leg & Walking Strength' },
  ex3: { ta: 'முக புன்னகை பயிற்சி', en: 'Facial & Smile Symmetry' },
};

function renderExerciseCardsState() {
  const isTa = appState.language === 'ta';
  (['ex1', 'ex2', 'ex3'] as const).forEach((id) => {
    const btn = document.getElementById(`btnDone_${id}`);
    const statusBadge = document.getElementById(`statusBadge_${id}`);
    const done = appState.exercises[id];

    if (btn) {
      if (done) {
        btn.className =
          'w-full py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors';
        btn.innerHTML = `<span>✓</span><span>${isTa ? 'முடிந்தது (மீண்டும் தொட)' : 'Completed ✓'}</span>`;
      } else {
        btn.className =
          'w-full py-2.5 min-h-[44px] bg-[#00766C] hover:bg-[#006058] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors';
        btn.innerHTML = `<span>${isTa ? 'முடித்தேன் (Mark Done)' : 'Mark Completed'}</span>`;
      }
    }

    if (statusBadge) {
      if (done) {
        statusBadge.className =
          'text-[11px] font-bold text-emerald-800 dark:text-emerald-300';
        statusBadge.innerText = isTa ? '✓ முடிந்தது' : '✓ Done';
      } else {
        statusBadge.className = 'text-[11px] font-semibold text-[#475569] dark:text-slate-300';
        statusBadge.innerText = isTa ? 'நிலுவையில்' : 'Pending';
      }
    }
  });

  const doneCount = Object.values(appState.exercises).filter(Boolean).length;
  const exProgressCount = document.getElementById('exSectionProgressCount');
  const exProgressBar = document.getElementById('exSectionProgressBar');
  if (exProgressCount) exProgressCount.innerText = `${doneCount} / 3`;
  if (exProgressBar) exProgressBar.style.width = `${Math.round((doneCount / 3) * 100)}%`;
}

function renderExerciseHistory() {
  const listEl = document.getElementById('exerciseHistoryList');
  if (!listEl) return;
  const isTa = appState.language === 'ta';

  if (appState.exerciseHistory.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-[#475569] dark:text-slate-300 py-2">${
      isTa ? 'இன்று இன்னும் பயிற்சிகள் எதுவும் பதிவு செய்யப்படவில்லை.' : 'No exercises logged yet today.'
    }</p>`;
    return;
  }

  listEl.innerHTML = appState.exerciseHistory
    .slice(0, 6)
    .map(
      (item) => `
      <div class="flex items-center justify-between py-2 border-b border-slate-300/70 dark:border-slate-700/70 last:border-0 text-xs">
        <span class="font-semibold text-[#172033] dark:text-slate-100 flex items-center gap-2">
          <span class="text-emerald-700 dark:text-emerald-300 font-bold">✓</span>
          <span>${isTa ? item.label_ta : item.label_en}</span>
        </span>
        <span class="font-mono-tabular text-[11px] text-[#475569] dark:text-slate-300">${item.time}</span>
      </div>`
    )
    .join('');
}

function toggleExerciseDone(exId: 'ex1' | 'ex2' | 'ex3') {
  const newVal = !appState.exercises[exId];
  appState.exercises[exId] = newVal;

  if (newVal) {
    playTone(880, 0.22);
    const meta = EXERCISE_NAMES[exId];
    appState.exerciseHistory.unshift({
      id: `${exId}-${Date.now()}`,
      label_ta: meta.ta,
      label_en: meta.en,
      time: getCurrentTimeLabel(),
    });
    showToast(`${meta.ta} முடிந்தது!`, `Completed ${meta.en}`, 'success');
  } else {
    playTone(440, 0.12);
  }

  saveState();
  renderExerciseCardsState();
  renderExerciseHistory();
  updateDashboardCounts();
}

function clearExerciseHistory() {
  appState.exerciseHistory = [];
  saveState();
  renderExerciseHistory();
}

// =========================================================================
// MEDICATION MANAGEMENT MODULE (PRESERVING EXACT EXISTING MEDICINES)
// =========================================================================
const MED_NAMES: Record<'med1' | 'med2' | 'med3' | 'med4', { ta: string; en: string; slot: string }> = {
  med1: { ta: 'ரத்த அழுத்த மாத்திரை (Amlodipine)', en: 'Amlodipine (Blood Pressure)', slot: '8:00 AM' },
  med2: { ta: 'ரத்தம் மெலிதாக்கும் ஆஸ்பிரின் (Ecosprin)', en: 'Ecosprin / Aspirin (Clot Prevention)', slot: '8:00 AM' },
  med3: { ta: 'நரம்பு விட்டமின் (Neurobion B-Complex)', en: 'Neurobion B-Complex (Nerve Support)', slot: '1:30 PM' },
  med4: { ta: 'கொலஸ்ட்ரால் மாத்திரை (Atorvastatin)', en: 'Atorvastatin (Cholesterol Control)', slot: '9:00 PM' },
};

function filterMedications(period: 'all' | 'morning' | 'afternoon' | 'night') {
  document.querySelectorAll<HTMLElement>('.med-filter-btn').forEach((btn) => {
    const p = btn.getAttribute('data-period');
    btn.className =
      p === period
        ? 'med-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00766C] text-white shadow-sm cursor-pointer transition-all whitespace-nowrap shrink-0'
        : 'med-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-[#334155] dark:text-slate-200 border border-slate-400 dark:border-slate-500 hover:border-[#00766C] cursor-pointer transition-all whitespace-nowrap shrink-0';
  });

  document.querySelectorAll<HTMLElement>('.med-period-card').forEach((card) => {
    const p = card.getAttribute('data-period');
    if (period === 'all' || p === period) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

function renderMedicationsState() {
  const isTa = appState.language === 'ta';
  (['med1', 'med2', 'med3', 'med4'] as const).forEach((id) => {
    const checkbox = document.getElementById(`checkbox_${id}`) as HTMLInputElement | null;
    const statusEl = document.getElementById(`status_${id}`);
    const taken = appState.medications[id];

    if (checkbox) checkbox.checked = taken;
    if (statusEl) {
      if (taken) {
        statusEl.className = 'text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0';
        statusEl.innerText = isTa ? '✓ உட்கொண்டது' : '✓ Taken';
      } else {
        statusEl.className = 'text-[11px] font-semibold text-amber-800 dark:text-amber-300 shrink-0';
        statusEl.innerText = isTa ? 'நிலுவையில்' : 'Pending';
      }
    }
  });

  const takenCount = Object.values(appState.medications).filter(Boolean).length;
  const medProgressCount = document.getElementById('medSectionProgressCount');
  const medProgressBar = document.getElementById('medSectionProgressBar');
  if (medProgressCount) medProgressCount.innerText = `${takenCount} / 4`;
  if (medProgressBar) medProgressBar.style.width = `${Math.round((takenCount / 4) * 100)}%`;

  renderMedicationRemindersUI();
}

function renderMedicationHistory() {
  const listEl = document.getElementById('medicationHistoryList');
  if (!listEl) return;
  const isTa = appState.language === 'ta';

  if (appState.medicationHistory.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-[#475569] dark:text-slate-300 py-2">${
      isTa ? 'இன்று இன்னும் மருந்துகள் உட்கொண்ட பதிவு இல்லை.' : 'No medication doses logged yet today.'
    }</p>`;
    return;
  }

  listEl.innerHTML = appState.medicationHistory
    .slice(0, 6)
    .map(
      (item) => `
      <div class="flex items-center justify-between py-2 border-b border-slate-300/70 dark:border-slate-700/70 last:border-0 text-xs">
        <span class="font-semibold text-[#172033] dark:text-slate-100 flex items-center gap-2">
          <span class="text-emerald-700 dark:text-emerald-300 font-bold">✓</span>
          <span>${isTa ? item.label_ta : item.label_en}</span>
        </span>
        <span class="font-mono-tabular text-[11px] text-[#475569] dark:text-slate-300">${item.time}</span>
      </div>`
    )
    .join('');
}

function handleMedCheckboxToggle(medId: 'med1' | 'med2' | 'med3' | 'med4', checkbox: HTMLInputElement) {
  const taken = checkbox.checked;
  appState.medications[medId] = taken;
  playTone(taken ? 680 : 440, 0.16);

  if (taken) {
    const meta = MED_NAMES[medId];
    appState.medicationHistory.unshift({
      id: `${medId}-${Date.now()}`,
      label_ta: meta.ta,
      label_en: meta.en,
      time: getCurrentTimeLabel(),
    });
    showToast(`${meta.ta} குறிக்கப்பட்டது`, `Marked ${meta.en} as taken`, 'success');
  }

  // If all meds in an active alerted period are now taken, close the alert cleanly
  if (activeAlertPeriod && getPendingMedIdsForPeriod(activeAlertPeriod, appState.medications).length === 0) {
    dismissMedAlertBanner();
    closeMedAlertModal();
  }

  saveState();
  renderMedicationsState();
  renderMedicationHistory();
  updateDashboardCounts();
}

function resetMedsChecklist() {
  appState.medications = { med1: false, med2: false, med3: false, med4: false };
  appState.medicationHistory = [];
  appState.medReminders.lastTriggeredDate = {};
  appState.medReminders.snoozedUntil = {};
  dismissMedAlertBanner();
  closeMedAlertModal();
  saveState();
  renderMedicationsState();
  renderMedicationHistory();
  updateDashboardCounts();
  showToast('மாத்திரை பட்டியல் மீட்டமைக்கப்பட்டது', 'Medication checklist reset', 'teal');
}

// =========================================================================
// MEDICATION PUSH NOTIFICATION & BROWSER ALERT SCHEDULER SERVICE
// =========================================================================
let activeAlertPeriod: MedicationPeriod | null = null;
let medReminderIntervalId: number | null = null;

function renderMedicationRemindersUI() {
  const isTa = appState.language === 'ta';
  const perm = getBrowserNotificationPermission();
  const rem = appState.medReminders;

  // Sync card time headers & schedule time inputs
  (['morning', 'afternoon', 'night'] as MedicationPeriod[]).forEach((period) => {
    const hhmm = rem.schedules[period] || DEFAULT_MED_REMINDER_SETTINGS.schedules[period];
    const formatted = formatTimeDisplay(hhmm);
    const meta = PERIOD_METADATA[period];

    const timeInput = document.getElementById(`schedTime_${period}`) as HTMLInputElement | null;
    if (timeInput && timeInput.value !== hhmm) {
      timeInput.value = hhmm;
    }

    const displayEl = document.getElementById(`periodTimeDisplay_${period}`);
    if (displayEl) {
      displayEl.innerText = isTa ? `${formatted} · ${meta.context_ta}` : `${formatted} · ${meta.context_en}`;
    }
  });

  // Update alert status badge
  const statusEl = document.getElementById('medAlertStatusBadge');
  if (statusEl) {
    if (!rem.enabled) {
      statusEl.innerText = isTa ? 'நினைவூட்டல் நிறுத்தப்பட்டது' : 'Alerts Paused';
      statusEl.className = 'text-xs font-bold text-[#475569] dark:text-slate-300';
    } else if (perm === 'granted') {
      statusEl.innerText = isTa
        ? 'செயல்பாட்டில் · உலாவி & ஒலி அறிவிப்பு'
        : 'Active · Browser Push + Sound Alerts';
      statusEl.className = 'text-xs font-bold text-[#00766C] dark:text-[#2DD4BF]';
    } else if (perm === 'denied') {
      statusEl.innerText = isTa
        ? 'செயல்பாட்டில் · திரை & ஒலி எச்சரிக்கை (உலாவி அனுமதி தடுக்கப்பட்டது)'
        : 'Active · In-App & Voice Alerts (Browser Push Blocked)';
      statusEl.className = 'text-xs font-bold text-amber-800 dark:text-amber-300';
    } else {
      statusEl.innerText = isTa
        ? 'திரை & ஒலி எச்சரிக்கை தயார்'
        : 'In-App & Voice Alerts Ready';
      statusEl.className = 'text-xs font-bold text-[#00766C] dark:text-[#2DD4BF]';
    }
  }

  // Enable browser alerts button label
  const enableBtnText = document.getElementById('btnEnableMedAlertsText');
  const enableBtn = document.getElementById('btnEnableMedAlerts');
  if (enableBtnText && enableBtn) {
    if (perm === 'granted') {
      enableBtnText.innerText = isTa ? 'உலாவி அறிவிப்பு: ஆன் ✓' : 'Browser Push: On ✓';
      enableBtn.className =
        'inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0';
    } else {
      enableBtnText.innerText = isTa ? 'உலாவி அறிவிப்பு இயக்கு' : 'Enable Browser Alerts';
      enableBtn.className =
        'inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl bg-[#00766C] hover:bg-[#006058] text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0';
    }
  }

  // Toggle scheduler pause/resume button
  const toggleBtnText = document.getElementById('btnToggleMedSchedText');
  if (toggleBtnText) {
    toggleBtnText.innerText = rem.enabled
      ? isTa
        ? 'அட்டவணை: ஆன்'
        : 'Schedule: On'
      : isTa
      ? 'அட்டவணை: ஆஃப்'
      : 'Schedule: Off';
  }

  // Sound / voice toggle button
  const soundBtnText = document.getElementById('btnToggleMedSoundText');
  if (soundBtnText) {
    soundBtnText.innerText = rem.soundEnabled
      ? isTa
        ? 'ஒலி & குரல்: ஆன்'
        : 'Sound & Voice: On'
      : isTa
      ? 'ஒலி: ஆஃப்'
      : 'Sound: Off';
  }

  // Next reminder status readout
  const nextEl = document.getElementById('nextMedReminderStatus');
  if (nextEl) {
    if (!rem.enabled) {
      nextEl.innerText = isTa ? 'தானியங்கி நினைவூட்டல் தற்காலிகமாக நிறுத்தப்பட்டுள்ளது.' : 'Scheduled alerts are currently paused.';
      return;
    }

    const next = getNextPendingReminder(new Date(), rem, appState.medications);
    if (!next) {
      nextEl.innerText = isTa
        ? '✓ இன்றைய அனைத்து 4 மாத்திரைகளும் உட்கொள்ளப்பட்டுவிட்டன!'
        : '✓ All 4 scheduled medications for today have been taken.';
    } else {
      const pMeta = PERIOD_METADATA[next.period];
      const snoozeTarget = rem.snoozedUntil[next.period];
      if (typeof snoozeTarget === 'number' && snoozeTarget > Date.now()) {
        const minsLeft = Math.max(1, Math.ceil((snoozeTarget - Date.now()) / 60000));
        nextEl.innerText = isTa
          ? `தள்ளிவைக்கப்பட்டது: ${pMeta.label_ta} (${minsLeft} நிமிடத்தில் மீண்டும் நினைவூட்டும்)`
          : `Snoozed: ${pMeta.label_en} (re-alerting in ${minsLeft} min)`;
      } else if (next.isOverdueToday) {
        nextEl.innerText = isTa
          ? `நிலுவை நேரம்: ${pMeta.label_ta} · ${next.timeDisplay} (உட்கொள்ள வேண்டிய நேரம் கடந்தது)`
          : `Due Now: ${pMeta.label_en} · Scheduled at ${next.timeDisplay}`;
      } else if (next.minutesDelta === 0) {
        nextEl.innerText = isTa
          ? `இப்போது நேரம்: ${pMeta.label_ta} · ${next.timeDisplay}`
          : `Due Right Now: ${pMeta.label_en} · ${next.timeDisplay}`;
      } else {
        const hrs = Math.floor(next.minutesDelta / 60);
        const mins = next.minutesDelta % 60;
        const rel =
          hrs > 0
            ? isTa
              ? `${hrs} மணி ${mins} நிமிடத்தில்`
              : `in ${hrs}h ${mins}m`
            : isTa
            ? `${mins} நிமிடத்தில்`
            : `in ${mins}m`;
        nextEl.innerText = isTa
          ? `அடுத்த நினைவூட்டல்: ${pMeta.label_ta} · ${next.timeDisplay} (${rel})`
          : `Next Reminder: ${pMeta.label_en} · ${next.timeDisplay} (${rel})`;
      }
    }
  }
}

async function requestMedAlertsPermission() {
  const perm = await requestBrowserNotificationPermission();
  appState.medReminders.enabled = true;
  saveState();
  renderMedicationRemindersUI();

  if (perm === 'granted') {
    playTone(784, 0.2);
    showToast(
      'உலாவி மாத்திரை நினைவூட்டல் இயக்கப்பட்டது!',
      'Browser medication push alerts enabled!',
      'success'
    );
    await dispatchSystemMedicationNotification(
      'morning',
      appState.language === 'ta' ? 'StrokeCare AI · மாத்திரை நினைவூட்டல் தயார்' : 'StrokeCare AI · Alerts Active',
      appState.language === 'ta'
        ? 'தினசரி மாத்திரை நேரங்களில் உங்களுக்கு உடனடி அறிவிப்பு அனுப்பப்படும்.'
        : 'You will receive timely notifications at your scheduled medication times.',
      appState.language
    );
  } else if (perm === 'denied') {
    showToast(
      'உலாவி அறிவிப்பு தடுக்கப்பட்டுள்ளது; திரை & குரல் எச்சரிக்கை தொடர்ந்து இயங்கும்.',
      'Browser push is blocked; in-app & voice alerts remain active.',
      'warning'
    );
  } else {
    showToast(
      'திரை & ஒலி மாத்திரை நினைவூட்டல் தயாராக உள்ளது.',
      'In-app & audio medication reminders are active.',
      'teal'
    );
  }
}

function toggleMedRemindersEnabled() {
  appState.medReminders.enabled = !appState.medReminders.enabled;
  saveState();
  renderMedicationRemindersUI();
  showToast(
    appState.medReminders.enabled ? 'மாத்திரை அட்டவணை இயக்கப்பட்டது' : 'மாத்திரை அட்டவணை நிறுத்தப்பட்டது',
    appState.medReminders.enabled ? 'Medication schedule alerts enabled' : 'Medication schedule alerts paused',
    'teal'
  );
}

function toggleMedReminderSound() {
  appState.medReminders.soundEnabled = !appState.medReminders.soundEnabled;
  appState.medReminders.voiceEnabled = appState.medReminders.soundEnabled;
  saveState();
  renderMedicationRemindersUI();
  if (appState.medReminders.soundEnabled) playTone(660, 0.16);
}

function updateMedScheduleTime(period: MedicationPeriod, timeValue: string) {
  if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) return;
  appState.medReminders.schedules[period] = timeValue;
  // Reset today's trigger lock & snooze for this edited period so the new time works today
  delete appState.medReminders.lastTriggeredDate[period];
  delete appState.medReminders.snoozedUntil[period];
  saveState();
  renderMedicationRemindersUI();

  const formatted = formatTimeDisplay(timeValue);
  showToast(
    `${PERIOD_METADATA[period].label_ta} நேரம் ${formatted} என மாற்றப்பட்டது`,
    `${PERIOD_METADATA[period].label_en} rescheduled to ${formatted}`,
    'teal'
  );
}

async function triggerTestMedAlert() {
  const next = getNextPendingReminder(new Date(), appState.medReminders, appState.medications);
  const periodToTest: MedicationPeriod = next ? next.period : 'morning';
  await triggerMedAlertForPeriod(periodToTest, true);
}

async function triggerMedAlertForPeriod(period: MedicationPeriod, isTest = false) {
  const isTa = appState.language === 'ta';
  const meta = PERIOD_METADATA[period];
  const scheduledStr = formatTimeDisplay(
    appState.medReminders.schedules[period] || DEFAULT_MED_REMINDER_SETTINGS.schedules[period]
  );

  // Determine pending doses (for a test alert when all are checked, preview all doses in that period)
  const pendingIds = getPendingMedIdsForPeriod(period, appState.medications);
  const displayIds: MedicationId[] = pendingIds.length > 0 ? pendingIds : meta.medIds;

  if (!isTest) {
    appState.medReminders.lastTriggeredDate[period] = getLocalDateKey();
    delete appState.medReminders.snoozedUntil[period];
    saveState();
    renderMedicationRemindersUI();
  }

  activeAlertPeriod = period;

  // 1. Update & show In-App Alert Banner inside #medicine-section
  const banner = document.getElementById('medAlertBanner');
  const bannerTitle = document.getElementById('medAlertBannerTitle');
  const bannerBody = document.getElementById('medAlertBannerBody');
  const medNamesList = displayIds.map((id) => (isTa ? MED_NAMES[id].ta : MED_NAMES[id].en)).join(', ');

  if (banner && bannerTitle && bannerBody) {
    bannerTitle.innerText = isTa
      ? `${isTest ? 'மாதிரி எச்சரிக்கை: ' : ''}${meta.label_ta} (${scheduledStr})`
      : `${isTest ? 'Test Alert: ' : ''}${meta.label_en} (${scheduledStr})`;
    bannerBody.innerText = isTa
      ? `உட்கொள்ள வேண்டிய மாத்திரைகள்: ${medNamesList}`
      : `Due doses: ${medNamesList}`;
    banner.classList.remove('hidden');
  }

  // 2. Populate & open accessible Medication Reminder Modal
  const modalTitle = document.getElementById('medAlertModalTitle');
  const modalTime = document.getElementById('medAlertModalTime');
  const modalList = document.getElementById('medAlertModalList');

  if (modalTime) {
    modalTime.innerText = isTa
      ? `${meta.label_ta} · ${scheduledStr}`
      : `${meta.label_en} · Scheduled ${scheduledStr}`;
  }
  if (modalTitle) {
    modalTitle.innerText = isTa ? 'மாத்திரை உட்கொள்ளும் நேரம்!' : 'Time to Take Your Medication';
  }
  if (modalList) {
    modalList.innerHTML = displayIds
      .map(
        (id) => `
        <li class="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-600">
          <span class="text-sm font-bold text-[#172033] dark:text-white">${isTa ? MED_NAMES[id].ta : MED_NAMES[id].en}</span>
          <span class="font-mono-tabular text-xs font-semibold text-[#00766C] dark:text-[#2DD4BF] shrink-0">${scheduledStr}</span>
        </li>`
      )
      .join('');
  }

  document.getElementById('medAlertModal')?.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();

  // 3. Audible medical chime + bilingual spoken voice alert
  if (appState.medReminders.soundEnabled) {
    playTone(587, 0.18);
    setTimeout(() => playTone(784, 0.24), 190);
    setTimeout(() => playTone(880, 0.3), 400);

    if (appState.medReminders.voiceEnabled) {
      setTimeout(() => {
        speakTextBilingual(
          `நினைவூட்டல். இது ${meta.label_ta} உட்கொள்ளும் நேரம். ${medNamesList}.`,
          `Medication reminder. It is time for your ${meta.label_en}. ${medNamesList}.`,
          0.9
        );
      }, 650);
    }
  }

  // 4. Native Browser Push Notification (when granted)
  const notifTitle = isTa ? `💊 ${meta.label_ta} · ${scheduledStr}` : `💊 ${meta.label_en} · ${scheduledStr}`;
  const notifBody = isTa ? `உட்கொள்ளவும்: ${medNamesList}` : `Please take: ${medNamesList}`;
  await dispatchSystemMedicationNotification(period, notifTitle, notifBody, appState.language, () => {
    scrollToSection('medicine-section');
  });
}

function confirmMedAlertTaken() {
  const period = activeAlertPeriod;
  if (!period) {
    closeMedAlertModal();
    return;
  }

  const ids = PERIOD_METADATA[period].medIds;
  let markedAny = false;
  ids.forEach((id) => {
    if (!appState.medications[id]) {
      appState.medications[id] = true;
      markedAny = true;
      const meta = MED_NAMES[id];
      appState.medicationHistory.unshift({
        id: `${id}-${Date.now()}`,
        label_ta: meta.ta,
        label_en: meta.en,
        time: getCurrentTimeLabel(),
      });
    }
  });

  delete appState.medReminders.snoozedUntil[period];
  appState.medReminders.lastTriggeredDate[period] = getLocalDateKey();

  if (markedAny) {
    playTone(784, 0.25);
    showToast('மாத்திரைகள் உட்கொண்டதாகக் குறிக்கப்பட்டது!', 'Medications marked as taken!', 'success');
  }

  activeAlertPeriod = null;
  saveState();
  dismissMedAlertBanner();
  closeMedAlertModal();
  renderMedicationsState();
  renderMedicationHistory();
  updateDashboardCounts();
}

function snoozeMedAlert(minutes = 10) {
  const period = activeAlertPeriod;
  if (period) {
    appState.medReminders.snoozedUntil[period] = Date.now() + minutes * 60 * 1000;
    saveState();
    renderMedicationRemindersUI();
  }
  closeMedAlertModal();
  showToast(
    `${minutes} நிமிடங்களுக்குப் பிறகு மீண்டும் நினைவூட்டப்படும்.`,
    `Snoozed — we will remind you again in ${minutes} minutes.`,
    'warning'
  );
}

function closeMedAlertModal() {
  document.getElementById('medAlertModal')?.classList.add('hidden');
}

function dismissMedAlertBanner() {
  document.getElementById('medAlertBanner')?.classList.add('hidden');
}

function checkAndFireMedicationAlerts() {
  const duePeriod = checkDueMedicationPeriod(new Date(), appState.medReminders, appState.medications);
  if (duePeriod) {
    triggerMedAlertForPeriod(duePeriod, false);
  } else {
    renderMedicationRemindersUI();
  }
}

function startMedicationReminderLoop() {
  if (medReminderIntervalId) {
    clearInterval(medReminderIntervalId);
  }
  registerMedNotificationWorker();

  // Check immediately and then every 15 seconds for accurate minute-level reminders
  checkAndFireMedicationAlerts();
  medReminderIntervalId = window.setInterval(checkAndFireMedicationAlerts, 15000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAndFireMedicationAlerts();
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const payload = event.data;
      if (!payload || payload.type !== 'MED_ALERT_ACTION') return;
      const period = (payload.period as MedicationPeriod) || 'morning';
      activeAlertPeriod = period;
      if (payload.action === 'mark_taken') {
        confirmMedAlertTaken();
      } else if (payload.action === 'snooze') {
        snoozeMedAlert(10);
      } else {
        scrollToSection('medicine-section');
        triggerMedAlertForPeriod(period, true);
      }
    });
  }
}

// =========================================================================
// HYDRATION & WATER TRACKER MODULE (PRESERVING 8-GLASS RECOMMENDATION)
// =========================================================================
const TARGET_WATER = 8;

function renderWaterRack() {
  const container = document.getElementById('visualGlassRack');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 1; i <= TARGET_WATER; i++) {
    const isDrank = i <= appState.waterCount;
    const glassBtn = document.createElement('button');
    glassBtn.type = 'button';
    glassBtn.setAttribute('aria-label', `Glass ${i}`);
    glassBtn.className = `flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer min-h-[58px] ${
      isDrank
        ? 'bg-[#D5EFEA] dark:bg-[#00766C]/35 border-[#00766C] dark:border-[#2DD4BF] text-[#00574F] dark:text-teal-200 shadow-sm'
        : 'bg-[#F7F9FC] dark:bg-slate-800 border-slate-400 dark:border-slate-600 text-[#334155] dark:text-slate-200 hover:border-[#00766C]'
    }`;
    glassBtn.onclick = () => setWaterGlasses(i);

    glassBtn.innerHTML = `
      <svg class="w-5 h-5 ${isDrank ? 'fill-[#00766C] text-[#00766C] dark:fill-teal-300 dark:text-teal-300' : 'fill-none text-[#475569] dark:text-slate-300'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
      <span class="font-mono-tabular text-[11px] font-bold mt-1">${i}</span>
    `;
    container.appendChild(glassBtn);
  }

  const bigNum = document.getElementById('bigWaterNumber');
  if (bigNum) bigNum.innerText = String(appState.waterCount);

  const waterBar = document.getElementById('waterProgressBar');
  if (waterBar) {
    const pct = Math.min(100, Math.round((appState.waterCount / TARGET_WATER) * 100));
    waterBar.style.width = `${pct}%`;
  }
}

function renderWaterHistory() {
  const listEl = document.getElementById('waterHistoryList');
  if (!listEl) return;
  const isTa = appState.language === 'ta';

  if (appState.waterHistory.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-[#475569] dark:text-slate-300 py-1.5">${
      isTa ? 'இன்னும் தண்ணீர் அளவு பதிவு செய்யப்படவில்லை.' : 'No water intake logged yet today.'
    }</p>`;
    return;
  }

  listEl.innerHTML = appState.waterHistory
    .slice(0, 5)
    .map(
      (item) => `
      <div class="flex items-center justify-between py-1.5 border-b border-slate-300/70 dark:border-slate-700/70 last:border-0 text-xs">
        <span class="font-medium text-[#172033] dark:text-slate-100">${isTa ? item.label_ta : item.label_en}</span>
        <span class="font-mono-tabular text-[11px] text-[#475569] dark:text-slate-300">${item.time}</span>
      </div>`
    )
    .join('');
}

function setWaterGlasses(count: number) {
  const prev = appState.waterCount;
  appState.waterCount = Math.max(0, Math.min(TARGET_WATER, count));
  if (appState.waterCount > prev) {
    appState.waterHistory.unshift({
      id: `water-${Date.now()}`,
      label_ta: `தண்ணீர் அருந்தியது (${appState.waterCount} / 8 டம்ளர்)`,
      label_en: `Water intake updated (${appState.waterCount} / 8 glasses)`,
      time: getCurrentTimeLabel(),
    });
    playTone(540 + appState.waterCount * 35, 0.15);
    showToast(`தண்ணீர்: ${appState.waterCount} / 8 டம்ளர்`, `Hydration: ${appState.waterCount} / 8 glasses`, 'teal');
  }
  saveState();
  renderWaterRack();
  renderWaterHistory();
  updateDashboardCounts();
}

function addOneGlassWater() {
  if (appState.waterCount < TARGET_WATER) {
    setWaterGlasses(appState.waterCount + 1);
  } else {
    showToast('தினசரி 8 டம்ளர் இலக்கு முடிந்துவிட்டது!', 'Daily 8-glass goal reached!', 'success');
  }
}

function removeOneGlassWater() {
  if (appState.waterCount > 0) {
    setWaterGlasses(appState.waterCount - 1);
  }
}

function clearWaterHistory() {
  appState.waterHistory = [];
  saveState();
  renderWaterHistory();
}

// =========================================================================
// SPEECH & COMMUNICATION TRAINING MODULE
// =========================================================================
function setSpeechSubTab(tab: 'cards' | 'match' | 'phrases') {
  const btnCards = document.getElementById('spTabCards');
  const btnMatch = document.getElementById('spTabMatch');
  const btnPhrases = document.getElementById('spTabPhrases');

  const panelCards = document.getElementById('spPanelCards');
  const panelMatch = document.getElementById('spPanelMatch');
  const panelPhrases = document.getElementById('spPanelPhrases');

  const activeCls =
    'py-2 px-3.5 rounded-lg font-bold text-xs bg-[#00766C] text-white shadow-sm cursor-pointer transition-all whitespace-nowrap shrink-0';
  const inactiveCls =
    'py-2 px-3.5 rounded-lg font-semibold text-xs text-[#334155] dark:text-slate-200 bg-transparent hover:text-[#172033] dark:hover:text-white cursor-pointer transition-all whitespace-nowrap shrink-0';

  if (btnCards) btnCards.className = tab === 'cards' ? activeCls : inactiveCls;
  if (btnMatch) btnMatch.className = tab === 'match' ? activeCls : inactiveCls;
  if (btnPhrases) btnPhrases.className = tab === 'phrases' ? activeCls : inactiveCls;

  panelCards?.classList.toggle('hidden', tab !== 'cards');
  panelMatch?.classList.toggle('hidden', tab !== 'match');
  panelPhrases?.classList.toggle('hidden', tab !== 'phrases');
}

function setSpeechRateMode(mode: 'slow' | 'normal') {
  speechRate = mode;
  const btnSlow = document.getElementById('spRateSlow');
  const btnNormal = document.getElementById('spRateNormal');

  const activeCls = 'px-3 py-1 rounded-md text-xs font-bold bg-[#00766C] text-white cursor-pointer';
  const inactiveCls =
    'px-3 py-1 rounded-md text-xs font-semibold text-[#334155] dark:text-slate-200 cursor-pointer';

  if (btnSlow) btnSlow.className = mode === 'slow' ? activeCls : inactiveCls;
  if (btnNormal) btnNormal.className = mode === 'normal' ? activeCls : inactiveCls;
}

function renderSpeechCards() {
  const grid = document.getElementById('speechCardsGrid');
  if (!grid) return;
  const isTa = appState.language === 'ta';

  grid.innerHTML = SPEECH_WORDS.map((card) => {
    const practiced = appState.practicedSpeechIds.includes(card.id);
    return `
      <div class="rounded-xl border ${
        practiced
          ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
          : 'border-slate-300 dark:border-slate-600 bg-[#F7F9FC] dark:bg-slate-800/70'
      } p-4 flex flex-col justify-between space-y-3 transition-all">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px] text-[#475569] dark:text-slate-300">
            <span class="font-semibold">${isTa ? card.category_ta : card.category_en}</span>
            <span class="${practiced ? 'font-bold text-emerald-800 dark:text-emerald-300' : ''}">${practiced ? (isTa ? '✓ பயிற்சி முடிந்தது' : '✓ Practiced') : card.phonetic}</span>
          </div>
          <h3 class="text-xl font-extrabold text-[#172033] dark:text-white tracking-tight">
            ${isTa ? card.word_ta : card.word_en}
          </h3>
          <p class="text-xs font-medium text-[#475569] dark:text-slate-300">
            ${isTa ? card.word_en : card.word_ta}
          </p>
          <p class="text-xs text-[#334155] dark:text-slate-200 leading-relaxed pt-1">
            ${isTa ? card.tip_ta : card.tip_en}
          </p>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <button
            type="button"
            onclick="speakSpeechCard('${card.id}')"
            class="flex-1 min-h-[44px] py-2 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-500 hover:border-[#00766C] text-xs font-bold text-[#172033] dark:text-slate-100 cursor-pointer transition-colors">
            🔊 ${isTa ? 'கேட்க' : 'Listen'}
          </button>
          <button
            type="button"
            onclick="toggleSpeechCardPracticed('${card.id}')"
            class="flex-1 min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              practiced
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-[#00766C] text-white hover:bg-[#006058]'
            }">
            ${practiced ? (isTa ? '✓ முடிந்தது' : '✓ Practiced') : isTa ? 'பேசினேன்' : 'Practiced'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  const spProgressCount = document.getElementById('speechSectionProgressCount');
  const spProgressBar = document.getElementById('speechSectionProgressBar');
  const count = appState.practicedSpeechIds.length;
  if (spProgressCount) spProgressCount.innerText = `${count} / ${SPEECH_WORDS.length}`;
  if (spProgressBar) spProgressBar.style.width = `${Math.round((count / SPEECH_WORDS.length) * 100)}%`;
}

function speakSpeechCard(cardId: string) {
  const card = SPEECH_WORDS.find((c) => c.id === cardId);
  if (!card) return;
  speakTextBilingual(card.word_ta, card.word_en);
}

function toggleSpeechCardPracticed(cardId: string) {
  const idx = appState.practicedSpeechIds.indexOf(cardId);
  if (idx >= 0) {
    appState.practicedSpeechIds.splice(idx, 1);
  } else {
    appState.practicedSpeechIds.push(cardId);
    playTone(740, 0.2);
    showToast('சொல் பயிற்சி பதியப்பட்டது!', 'Speech practice logged!', 'success');
  }
  saveState();
  renderSpeechCards();
  updateDashboardCounts();
}

function renderMatchQuiz() {
  const q = MATCH_QUESTIONS[currentQuizIdx];
  const isTa = appState.language === 'ta';

  const promptEl = document.getElementById('quizPromptText');
  const emojiEl = document.getElementById('quizEmojiDisplay');
  const targetEl = document.getElementById('quizTargetWord');
  const optionsGrid = document.getElementById('quizOptionsGrid');
  const scoreEl = document.getElementById('quizScoreText');
  const feedbackEl = document.getElementById('matchGameFeedback');

  if (promptEl) promptEl.innerText = isTa ? q.prompt_ta : q.prompt_en;
  if (emojiEl) emojiEl.innerText = q.emoji;
  if (targetEl) targetEl.innerText = isTa ? `${q.target_ta} (${q.target_en})` : `${q.target_en} (${q.target_ta})`;
  if (scoreEl) scoreEl.innerText = `${quizScore} / ${MATCH_QUESTIONS.length}`;
  if (feedbackEl) feedbackEl.classList.add('hidden');

  if (optionsGrid) {
    optionsGrid.innerHTML = q.options
      .map(
        (opt, i) => `
        <button
          type="button"
          onclick="answerMatchQuiz(${i})"
          class="quiz-option-btn p-4 rounded-xl border border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 hover:border-[#00766C] text-sm font-bold text-[#172033] dark:text-slate-100 flex items-center justify-center gap-2 cursor-pointer transition-all min-h-[52px]">
          <span class="text-xl">${opt.emoji}</span>
          <span>${isTa ? `${opt.label_ta} (${opt.label_en})` : `${opt.label_en} (${opt.label_ta})`}</span>
        </button>`
      )
      .join('');
  }
}

function answerMatchQuiz(optionIdx: number) {
  const q = MATCH_QUESTIONS[currentQuizIdx];
  const opt = q.options[optionIdx];
  const feedbackEl = document.getElementById('matchGameFeedback');
  const buttons = document.querySelectorAll('.quiz-option-btn');
  const isTa = appState.language === 'ta';

  if (!opt || !feedbackEl) return;
  feedbackEl.classList.remove(
    'hidden',
    'bg-emerald-50',
    'dark:bg-emerald-950/50',
    'text-emerald-900',
    'dark:text-emerald-200',
    'border-emerald-400',
    'bg-rose-50',
    'dark:bg-rose-950/50',
    'text-rose-900',
    'dark:text-rose-200',
    'border-rose-400'
  );

  if (opt.isCorrect) {
    playTone(880, 0.25);
    quizScore = Math.min(MATCH_QUESTIONS.length, quizScore + 1);
    const scoreEl = document.getElementById('quizScoreText');
    if (scoreEl) scoreEl.innerText = `${quizScore} / ${MATCH_QUESTIONS.length}`;

    feedbackEl.classList.add('bg-emerald-50', 'dark:bg-emerald-950/50', 'text-emerald-900', 'dark:text-emerald-200', 'border', 'border-emerald-400');
    feedbackEl.innerText = isTa
      ? `🎉 மிகச் சரி! "${opt.label_ta}" — அருமையாக அடையாளம் கண்டீர்கள்!`
      : `🎉 Correct! "${opt.label_en}" matched cleanly!`;
    buttons[optionIdx]?.classList.add('ring-2', 'ring-emerald-600');
  } else {
    playTone(330, 0.22);
    feedbackEl.classList.add('bg-rose-50', 'dark:bg-rose-950/50', 'text-rose-900', 'dark:text-rose-200', 'border', 'border-rose-400');
    feedbackEl.innerText = isTa
      ? `மீண்டும் முயற்சிக்கவும்! சரியான சொல் ${q.target_ta}.`
      : `Try again — look for ${q.target_en}.`;
  }
}

function nextMatchQuizQuestion() {
  currentQuizIdx = (currentQuizIdx + 1) % MATCH_QUESTIONS.length;
  renderMatchQuiz();
}

function resetMatchQuiz() {
  currentQuizIdx = 0;
  quizScore = 0;
  renderMatchQuiz();
}

function speakCaregiverPhrase(phraseTa: string, phraseEn: string) {
  playTone(620, 0.12);
  speakTextBilingual(phraseTa, phraseEn, 0.85);
}

// =========================================================================
// DAILY RECOVERY DASHBOARD COUNTERS & PROGRESS RING
// =========================================================================
function updateDashboardCounts() {
  const isTa = appState.language === 'ta';
  const exDone = Object.values(appState.exercises).filter(Boolean).length; // 0..3
  const medDone = Object.values(appState.medications).filter(Boolean).length; // 0..4
  const waterDone = appState.waterCount >= TARGET_WATER ? 1 : 0; // daily goal milestone
  const speechDone = appState.practicedSpeechIds.length >= 3 ? 1 : 0; // speech session goal (3+ words)

  // Total 9 core milestones: 3 Exercises + 4 Meds + 1 Hydration Goal + 1 Speech Goal
  const totalMilestones = 9;
  const finishedMilestones = exDone + medDone + waterDone + speechDone;
  const pct = Math.round((finishedMilestones / totalMilestones) * 100);

  const bigCount = document.getElementById('dashCompletedBig');
  if (bigCount) bigCount.innerText = `${finishedMilestones} / ${totalMilestones}`;

  const ringPercentText = document.getElementById('ringPercentText');
  if (ringPercentText) ringPercentText.innerText = `${pct}%`;

  const svgCircle = document.getElementById('svgProgressCircle');
  if (svgCircle) {
    const circumference = 2 * Math.PI * 48; // 301.59
    const offset = circumference - (pct / 100) * circumference;
    svgCircle.style.strokeDashoffset = offset.toString();
  }

  // Update the 4 Pillar Breakdown metrics inside Dashboard
  const dashExCount = document.getElementById('dashExCount');
  const dashExBar = document.getElementById('dashExBar');
  if (dashExCount) dashExCount.innerText = `${exDone} / 3`;
  if (dashExBar) dashExBar.style.width = `${Math.round((exDone / 3) * 100)}%`;

  const dashMedCount = document.getElementById('dashMedCount');
  const dashMedBar = document.getElementById('dashMedBar');
  if (dashMedCount) dashMedCount.innerText = `${medDone} / 4`;
  if (dashMedBar) dashMedBar.style.width = `${Math.round((medDone / 4) * 100)}%`;

  const dashWaterCount = document.getElementById('dashWaterCount');
  const dashWaterBar = document.getElementById('dashWaterBar');
  if (dashWaterCount) dashWaterCount.innerText = `${appState.waterCount} / 8`;
  if (dashWaterBar) dashWaterBar.style.width = `${Math.round((appState.waterCount / 8) * 100)}%`;

  const dashSpeechCount = document.getElementById('dashSpeechCount');
  const dashSpeechBar = document.getElementById('dashSpeechBar');
  if (dashSpeechCount) dashSpeechCount.innerText = `${appState.practicedSpeechIds.length} / ${SPEECH_WORDS.length}`;
  if (dashSpeechBar)
    dashSpeechBar.style.width = `${Math.round((appState.practicedSpeechIds.length / SPEECH_WORDS.length) * 100)}%`;

  const msg = document.getElementById('ringStatusMessage');
  if (msg) {
    if (pct === 0) {
      msg.innerText = isTa
        ? 'இன்றைய மறுவாழ்வு இலக்குகளைத் தொடங்குங்கள். ஒவ்வொரு சிறிய முயற்சியும் முன்னேற்றம் தரும்.'
        : 'Begin today’s recovery goals at your own comfortable pace.';
    } else if (pct < 50) {
      msg.innerText = isTa
        ? `நன்றாக தொடர்கிறீர்கள்! இன்று ${finishedMilestones} பணிகள் நிறைவடைந்துள்ளன.`
        : `Great start! ${finishedMilestones} of ${totalMilestones} recovery goals completed today.`;
    } else if (pct < 100) {
      msg.innerText = isTa
        ? `மிக நன்று! இன்றைய இலக்குகளில் ${pct}% நிறைவடைந்துள்ளது.`
        : `Excellent consistency — ${pct}% of today’s recovery targets achieved.`;
    } else {
      msg.innerText = isTa
        ? 'வாழ்த்துகள்! இன்றைய அனைத்து மறுவாழ்வு இலக்குகளையும் 100% நிறைவு செய்துவிட்டீர்கள்!'
        : 'Congratulations! You have completed 100% of today’s recovery goals!';
      if (!hasCelebrated) {
        hasCelebrated = true;
        triggerCelebrationModal();
      }
    }
  }
}

// =========================================================================
// CELEBRATION CONFETTI & SOS SIREN MODALS
// =========================================================================
let confettiAnimationId: number | null = null;

function triggerCelebrationModal() {
  const modal = document.getElementById('celebrationModal');
  modal?.classList.remove('hidden');
  playTone(523, 0.2);
  setTimeout(() => playTone(659, 0.2), 150);
  setTimeout(() => playTone(784, 0.35), 300);
  startConfetti();
}

function closeCelebrationModal() {
  document.getElementById('celebrationModal')?.classList.add('hidden');
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
}

function startConfetti() {
  const canvas = document.getElementById('confettiCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#008F83', '#0D9488', '#16A34A', '#38BDF8', '#F59E0B'];
  const particles = Array.from({ length: 85 }, () => ({
    x: canvas.width * 0.5 + (Math.random() - 0.5) * 320,
    y: canvas.height * 0.4,
    w: 8 + Math.random() * 6,
    h: 10 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 11,
    vy: -6 - Math.random() * 9,
    rot: Math.random() * 360,
    vrot: (Math.random() - 0.5) * 10,
    opacity: 1,
  }));

  function render() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32;
      p.rot += p.vrot;
      p.opacity -= 0.006;

      if (p.opacity > 0 && p.y < canvas.height) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (activeCount > 0) {
      confettiAnimationId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  confettiAnimationId = requestAnimationFrame(render);
}

function toggleSirenTone() {
  const btn = document.getElementById('btnAlarmTrigger');
  const text = document.getElementById('alarmBtnText');
  const isTa = appState.language === 'ta';

  if (!isAlarmActive) {
    isAlarmActive = true;
    btn?.classList.replace('bg-amber-50', 'bg-red-600');
    btn?.classList.replace('text-amber-900', 'text-white');
    btn?.classList.replace('border-amber-300', 'border-red-700');
    if (text) text.innerText = isTa ? 'சத்தம் நிறுத்த (Stop Siren)' : 'Stop Alert Siren';

    alarmTimer = window.setInterval(() => {
      playTone(880, 0.25);
      setTimeout(() => playTone(587, 0.25), 250);
    }, 550);
  } else {
    isAlarmActive = false;
    if (alarmTimer) clearInterval(alarmTimer);
    btn?.classList.replace('bg-red-600', 'bg-amber-50');
    btn?.classList.replace('text-white', 'text-amber-900');
    btn?.classList.replace('border-red-700', 'border-amber-300');
    if (text) text.innerText = isTa ? 'வீட்டில் சத்தம் போட (Sound Alert Siren)' : 'Sound Home Alert Siren';
  }
}

function openSosModal() {
  document.getElementById('sosModal')?.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeSosModal() {
  if (isAlarmActive) toggleSirenTone();
  document.getElementById('sosModal')?.classList.add('hidden');
}

// =========================================================================
// WEBSITE NAVIGATION DRAWER, GET STARTED, RESOURCE READER & LEGAL MODALS
// =========================================================================
interface ResourceArticle {
  id: 'fast' | 'home_rehab' | 'brain_nutrition' | 'speech_tips';
  category_ta: string;
  category_en: string;
  title_ta: string;
  title_en: string;
  summary_ta: string;
  summary_en: string;
  points_ta: string[];
  points_en: string[];
  ctaHref: string;
  ctaLabel_ta: string;
  ctaLabel_en: string;
}

const RESOURCE_ARTICLES: Record<'fast' | 'home_rehab' | 'brain_nutrition' | 'speech_tips', ResourceArticle> = {
  fast: {
    id: 'fast',
    category_ta: 'அவசர விழிப்புணர்வு · F.A.S.T.',
    category_en: 'Clinical Awareness · F.A.S.T.',
    title_ta: 'பக்கவாத அறிகுறிகளை உடனடியாக கண்டறியும் F.A.S.T. முறை',
    title_en: 'Recognizing Stroke Warning Signs With F.A.S.T.',
    summary_ta:
      'பக்கவாதம் ஏற்படும் போது முதல் 4.5 மணி நேரம் (Golden Window) மிக முக்கியமானது. கீழ்க்காணும் 4 அறிகுறிகளைக் கண்டால் உடனே 108 ஆம்புலன்ஸ் அழைக்கவும்.',
    summary_en:
      'Prompt medical care during the initial golden window preserves vital brain tissue. Check these four immediate clinical signs and call 108 without delay.',
    points_ta: [
      'F — Face (முகம்): சிரிக்கும்போது முகத்தின் ஒரு பக்கம் சாய்கிறதா எனப் பார்க்கவும்.',
      'A — Arms (கைகள்): இரு கைகளையும் உயர்த்தும்போது ஒரு கை கீழே விழுகிறதா?',
      'S — Speech (பேச்சு): சாதாரண வாக்கியத்தை தெளிவாகப் பேச முடியாமல் குழறுகிறதா?',
      'T — Time (நேரம்): இவற்றில் ஏதேனும் ஒன்று தெரிந்தால் உடனடியாக 108 அழைக்கவும்.',
    ],
    points_en: [
      'F — Face Drooping: Ask the person to smile and check if one side droops asymmetrically.',
      'A — Arm Weakness: Ask them to raise both arms; watch if one arm drifts downward.',
      'S — Speech Difficulty: Listen for slurred words, word-finding difficulty, or confusion.',
      'T — Time to Call 108: Record the time symptoms began and seek emergency hospital care immediately.',
    ],
    ctaHref: '#animation-section',
    ctaLabel_ta: '3D மூளை விளக்கத்தை பார்க்க',
    ctaLabel_en: 'Explore Interactive 3D Brain',
  },
  home_rehab: {
    id: 'home_rehab',
    category_ta: 'தினசரி உடற்பயிற்சி · Home Physiotherapy',
    category_en: 'Rehabilitation Guide · Neuroplasticity',
    title_ta: 'வீட்டிலேயே பாதுகாப்பான பக்கவாத உடற்பயிற்சி வழிகாட்டி',
    title_en: 'Safe Daily Home Physiotherapy & Movement Routine',
    summary_ta:
      'தினமும் சிறிய ஆனால் தொடர்ச்சியான பயிற்சிகள் மூளையின் நரம்பு இணைப்புகளை (Neuroplasticity) மீண்டும் கட்டமைக்க உதவுகின்றன.',
    summary_en:
      'Consistent, gentle repetition helps rewire motor pathways through neuroplasticity without over-fatiguing recovering muscles.',
    points_ta: [
      'பயிற்சிக்கு முன் நிலையான நாற்காலி மற்றும் தட்டையான மேசையைத் தயாராக வைக்கவும்.',
      '5 நொடி பிடிப்பு டைமரைப் பயன்படுத்தி கை விரல் மற்றும் கால் நீட்டிப்பு பயிற்சிகளை மெதுவாக செய்யவும்.',
      'வலி அல்லது தலைச்சுற்றல் ஏற்பட்டால் உடனே ஓய்வெடுத்து தண்ணீர் அருந்தவும்.',
      'குடும்ப உதவியாளர் அருகில் இருக்கும்போது நடைப் பயிற்சியை மேற்கொள்ளவும்.',
    ],
    points_en: [
      'Prepare a sturdy chair with back support and a clear table before beginning.',
      'Use the built-in 5-second hold timer to pace hand grasp and leg extension repetitions.',
      'Pause immediately if you experience dizziness, sharpness, or shortness of breath.',
      'Practice standing and balance progressions alongside a family caregiver whenever possible.',
    ],
    ctaHref: '#physio-section',
    ctaLabel_ta: 'உடற்பயிற்சி பகுதிக்கு செல்ல',
    ctaLabel_en: 'Open Rehabilitation Exercises',
  },
  brain_nutrition: {
    id: 'brain_nutrition',
    category_ta: 'உணவு & நீர் · Vascular Nutrition',
    category_en: 'Nutrition & Hydration · Prevention',
    title_ta: 'ரத்த அழுத்தம் மற்றும் மூளை ஆரோக்கியத்திற்கான உணவு முறை',
    title_en: 'Hydration & Heart-Healthy Nutrition After Stroke',
    summary_ta:
      'சரியான நீர்ச்சத்து மற்றும் குறைந்த உப்பு கொண்ட சத்தான உணவு மீண்டும் பக்கவாதம் வராமல் தடுக்க உதவும்.',
    summary_en:
      'Maintaining steady hydration and balanced potassium-rich foods supports healthy blood pressure and secondary stroke prevention.',
    points_ta: [
      'தினமும் 8 டம்ளர் சுத்தமான தண்ணீர் அருந்துவது ரத்த ஓட்டத்தை சீராக வைத்திருக்கும்.',
      'கீரை, ஆப்பிள், கொய்யா மற்றும் வால்நட் போன்ற நார்ச்சத்து மற்றும் ஒமேகா-3 உணவுகளைச் சேர்க்கவும்.',
      'உணவில் கூடுதல் உப்பு (Sodium) மற்றும் எண்ணெயில் பொரித்த உணவுகளைத் தவிர்க்கவும்.',
      'மருத்துவர் பரிந்துரைத்த BP மற்றும் கொலஸ்ட்ரால் மருந்துகளை தவறாமல் எடுத்துக்கொள்ளவும்.',
    ],
    points_en: [
      'Aim for 8 glasses of water spread evenly across the day to support blood viscosity and focus.',
      'Include leafy spinach, apples, guava, and walnuts for potassium, fiber, and omega-3 support.',
      'Minimize added table salt and deep-fried snacks to keep arterial pressure and lipids stable.',
      'Always take prescribed blood pressure and cholesterol medications on schedule.',
    ],
    ctaHref: '#nutrition-section',
    ctaLabel_ta: 'நீர் & உணவு பகுதிக்கு செல்ல',
    ctaLabel_en: 'Open Hydration & Diet Tracker',
  },
  speech_tips: {
    id: 'speech_tips',
    category_ta: 'பேச்சுப் பயிற்சி · Aphasia Communication',
    category_en: 'Speech Therapy · Daily Habits',
    title_ta: 'பக்கவாதத்திற்குப் பிந்தைய பேச்சுப் பயிற்சி ஆலோசனைகள்',
    title_en: 'Practical Speech & Communication Recovery Tips',
    summary_ta:
      'மூளையின் பேச்சுப் பகுதிகள் (Broca / Wernicke) மீளும்போது தினமும் மெதுவான, அமைதியான சொல் பயிற்சி நம்பிக்கையை வளர்க்கும்.',
    summary_en:
      'Consistent, calm daily speech practice helps rebuild word retrieval and articulation after stroke without frustration.',
    points_ta: [
      'அமைதியான அறையில் தொலைக்காட்சி சத்தம் இல்லாமல் மெதுவாகப் பேசப் பழகுங்கள்.',
      'நீண்ட வாக்கியங்களுக்குப் பதிலாக சிறிய அன்றாடச் சொற்களை (தண்ணீர், வணக்கம், மருந்து) மீண்டும் உச்சரிக்கவும்.',
      'StrokeCare AI பேச்சுப் பயிற்சி பகுதியில் உள்ள "மெதுவாக (Slow)" குரல் வசதியைப் பயன்படுத்தவும்.',
      'பேச சிரமமாக இருக்கும்போது "உடனடி வாக்கியங்கள் (Phrases)" பொத்தான்களைத் தொட்டுத் தேவைகளைத் தெரிவிக்கவும்.',
    ],
    points_en: [
      'Practice in a quiet space without background television or competing noise.',
      'Start with short, familiar daily words and break longer phrases into gentle syllables.',
      'Use the Slow Speech playback toggle inside the Speech Training cards to hear clear pronunciation.',
      'Keep quick caregiver phrase cards handy whenever immediate needs must be shared clearly.',
    ],
    ctaHref: '#speech-section',
    ctaLabel_ta: 'பேச்சுப் பயிற்சிக்குச் செல்ல',
    ctaLabel_en: 'Open Speech Training',
  },
};

let activeResourceArticleId: 'fast' | 'home_rehab' | 'brain_nutrition' | 'speech_tips' = 'fast';

function toggleMobileMenu() {
  const drawer = document.getElementById('mobileNavDrawer');
  if (!drawer) return;
  const isHidden = drawer.classList.contains('hidden');
  drawer.classList.toggle('hidden', !isHidden);
}

function closeMobileMenu() {
  document.getElementById('mobileNavDrawer')?.classList.add('hidden');
}

function openGetStartedModal() {
  closeMobileMenu();
  const modal = document.getElementById('getStartedModal');
  const nameInput = document.getElementById('profileNameInput') as HTMLInputElement | null;
  const focusSelect = document.getElementById('profileFocusSelect') as HTMLSelectElement | null;
  if (nameInput) nameInput.value = appState.profileName || '';
  if (focusSelect) focusSelect.value = appState.recoveryFocus || 'mobility';
  modal?.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeGetStartedModal() {
  document.getElementById('getStartedModal')?.classList.add('hidden');
}

function saveRecoveryProfile(e: Event) {
  e.preventDefault();
  const nameInput = document.getElementById('profileNameInput') as HTMLInputElement | null;
  const focusSelect = document.getElementById('profileFocusSelect') as HTMLSelectElement | null;

  appState.profileName = (nameInput?.value || '').trim().slice(0, 40);
  const selectedFocus = (focusSelect?.value as AppState['recoveryFocus']) || 'mobility';
  appState.recoveryFocus = selectedFocus;
  saveState();
  updateWelcomeHeadingDOM();
  closeGetStartedModal();

  const targetSectionMap: Record<AppState['recoveryFocus'], string> = {
    mobility: 'physio-section',
    speech: 'speech-section',
    medications: 'medicine-section',
    brain: 'animation-section',
  };
  scrollToSection(targetSectionMap[selectedFocus] || 'recovery-experience');
  showToast('உங்கள் மறுவாழ்வுத் திட்டம் சேமிக்கப்பட்டது!', 'Personal recovery focus saved!', 'success');
}

function openResourceModal(resourceId: 'fast' | 'home_rehab' | 'brain_nutrition' | 'speech_tips') {
  activeResourceArticleId = resourceId;
  const article = RESOURCE_ARTICLES[resourceId];
  if (!article) return;

  const isTa = appState.language === 'ta';
  const catEl = document.getElementById('resModalCategory');
  const titleEl = document.getElementById('resModalTitle');
  const sumEl = document.getElementById('resModalSummary');
  const pointsEl = document.getElementById('resModalPoints');
  const ctaEl = document.getElementById('resModalCta') as HTMLAnchorElement | null;

  if (catEl) catEl.innerText = isTa ? article.category_ta : article.category_en;
  if (titleEl) titleEl.innerText = isTa ? article.title_ta : article.title_en;
  if (sumEl) sumEl.innerText = isTa ? article.summary_ta : article.summary_en;

  if (pointsEl) {
    const pts = isTa ? article.points_ta : article.points_en;
    pointsEl.innerHTML = pts
      .map(
        (pt) =>
          `<li class="flex items-start gap-2.5"><span class="text-[#00766C] dark:text-[#2DD4BF] font-bold mt-0.5 shrink-0">✓</span><span class="text-sm text-[#172033] dark:text-slate-100 leading-relaxed">${pt}</span></li>`
      )
      .join('');
  }

  if (ctaEl) {
    ctaEl.setAttribute('href', article.ctaHref);
    ctaEl.innerText = isTa ? article.ctaLabel_ta : article.ctaLabel_en;
  }

  document.getElementById('resourceModal')?.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeResourceModal() {
  document.getElementById('resourceModal')?.classList.add('hidden');
}

function speakResourceGuide() {
  const article = RESOURCE_ARTICLES[activeResourceArticleId];
  if (!article) return;
  const textTa = `${article.title_ta}. ${article.summary_ta}. ${article.points_ta.join('. ')}`;
  const textEn = `${article.title_en}. ${article.summary_en}. ${article.points_en.join('. ')}`;
  speakTextBilingual(textTa, textEn, 0.88);
  showToast('கல்வி வழிகாட்டி ஒலிக்கிறது...', 'Reading clinical guide aloud...', 'teal');
}

function openLegalModal(type: 'privacy' | 'terms' | 'disclaimer') {
  const isTa = appState.language === 'ta';
  const titleEl = document.getElementById('legalModalTitle');
  const bodyEl = document.getElementById('legalModalBody');

  const contentMap = {
    privacy: {
      title_ta: 'தனியுரிமைக் கொள்கை (Privacy Policy)',
      title_en: 'Privacy Policy',
      body_ta:
        'StrokeCare AI உங்கள் தனியுரிமையை முழுமையாக மதிக்கிறது. உங்களுடைய தினசரி உடற்பயிற்சி, மருந்துகள், தண்ணீர் மற்றும் பேச்சுப் பயிற்சி முன்னேற்றத் தரவுகள் உங்கள் சாதனத்தின் உலாவியில் (Local Storage) மட்டுமே பாதுகாப்பாகச் சேமிக்கப்படுகின்றன. எந்தவொரு தனிப்பட்ட மருத்துவ தகவலும் வெளிப்புற சேவையகங்களுக்கு அனுப்பப்படுவதில்லை.',
      body_en:
        'StrokeCare AI stores your daily exercises, medication check-offs, water intake, speech progress, and optional display name locally in your browser storage (localStorage). Personal recovery logs stay on your own device and are never sold or shared with third-party advertisers.',
    },
    terms: {
      title_ta: 'பயன்பாட்டு விதிமுறைகள் (Terms & Conditions)',
      title_en: 'Terms & Conditions',
      body_ta:
        'இந்த தளம் பக்கவாத மறுவாழ்வு பயணத்தில் நோயாளிகள் மற்றும் குடும்ப பராமரிப்பாளர்களுக்கு தினசரி பயிற்சி மற்றும் கல்வி வழிகாட்டுதலை வழங்க வடிவமைக்கப்பட்டுள்ளது. உடற்பயிற்சிகளை செய்யும்போது உடல் வலி அல்லது சிரமம் ஏற்பட்டால் உடனடியாக நிறுத்தி உங்கள் பிசியோதெரபிஸ்ட் அல்லது மருத்துவரை ஆலோசிக்கவும்.',
      body_en:
        'StrokeCare AI provides structured educational anatomy visualizations, physiotherapy timers, hydration reminders, and speech exercises for home support. Stop any physical activity immediately if discomfort or dizziness occurs and follow guidance from your licensed care team.',
    },
    disclaimer: {
      title_ta: 'மருத்துவ மறுப்பு (Medical Disclaimer)',
      title_en: 'Medical Disclaimer',
      body_ta:
        'StrokeCare AI ஒரு மருத்துவ கல்வி மற்றும் தினசரி மறுவாழ்வு துணைத் தளமாகும். இது மருத்துவரின் நேரடி மருத்துவ ஆலோசனை, நோயறிதல் அல்லது அவசர சிகிச்சைக்கு மாற்றாகாது. பக்கவாத அறிகுறிகள் தென்பட்டால் உடனடியாக 108 அல்லது அருகிலுள்ள மருத்துவமனையை அணுகவும்.',
      body_en:
        'StrokeCare AI is designed strictly for patient education and daily rehabilitation habit tracking. It does not substitute for licensed clinical diagnosis, prescription management, or emergency stroke intervention. If acute neurological symptoms appear, call emergency services (108) immediately.',
    },
  };

  const selected = contentMap[type];
  if (titleEl) titleEl.innerText = isTa ? selected.title_ta : selected.title_en;
  if (bodyEl) bodyEl.innerText = isTa ? selected.body_ta : selected.body_en;

  document.getElementById('legalModal')?.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeLegalModal() {
  document.getElementById('legalModal')?.classList.add('hidden');
}

// =========================================================================
// GLOBAL ATTACHMENTS & DOM INITIALIZATION
// =========================================================================
window.toggleLanguage = toggleLanguage;
window.toggleTheme = toggleTheme;
window.cycleTextSize = cycleTextSize;
window.toggleHighContrast = toggleHighContrast;
window.openSosModal = openSosModal;
window.closeSosModal = closeSosModal;
window.toggleSirenTone = toggleSirenTone;
window.closeCelebrationModal = closeCelebrationModal;
window.scrollToSection = scrollToSection;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.openGetStartedModal = openGetStartedModal;
window.closeGetStartedModal = closeGetStartedModal;
window.saveRecoveryProfile = saveRecoveryProfile;
window.openResourceModal = openResourceModal;
window.closeResourceModal = closeResourceModal;
window.speakResourceGuide = speakResourceGuide;
window.openLegalModal = openLegalModal;
window.closeLegalModal = closeLegalModal;

window.setBrainModeTab = setBrainModeTab;
window.focusBrainStructure = focusBrainStructure;
window.setBrainPresetView = setBrainPresetView;
window.toggleBrainGhostMode = toggleBrainGhostMode;
window.setBrainHemisphereSplit = setBrainHemisphereSplit;
window.speakBrainFactText = speakBrainFactText;
window.toggle3DRotate = toggle3DRotate;
window.zoomIn3D = zoomIn3D;
window.zoomOut3D = zoomOut3D;
window.reset3DView = reset3DView;
window.toggleHudCollapse = toggleHudCollapse;
window.setStrokeType = setStrokeType;
window.updateAnimationStep = updateAnimationStep;
window.nextAnimationStep = nextAnimationStep;
window.prevAnimationStep = prevAnimationStep;
window.goToAnimationStep = goToAnimationStep;
window.toggleAnimationAutoPlay = toggleAnimationAutoPlay;
window.toggleSpeechForStep = toggleSpeechForStep;

window.filterExercises = filterExercises;
window.startFiveSecondHold = startFiveSecondHold;
window.resetFiveSecondHold = resetFiveSecondHold;
window.toggleExerciseDone = toggleExerciseDone;
window.clearExerciseHistory = clearExerciseHistory;

window.filterMedications = filterMedications;
window.handleMedCheckboxToggle = handleMedCheckboxToggle;
window.resetMedsChecklist = resetMedsChecklist;
window.requestMedAlertsPermission = requestMedAlertsPermission;
window.toggleMedRemindersEnabled = toggleMedRemindersEnabled;
window.toggleMedReminderSound = toggleMedReminderSound;
window.updateMedScheduleTime = updateMedScheduleTime;
window.triggerTestMedAlert = triggerTestMedAlert;
window.triggerMedAlertForPeriod = triggerMedAlertForPeriod;
window.confirmMedAlertTaken = confirmMedAlertTaken;
window.snoozeMedAlert = snoozeMedAlert;
window.closeMedAlertModal = closeMedAlertModal;
window.dismissMedAlertBanner = dismissMedAlertBanner;

window.addOneGlassWater = addOneGlassWater;
window.removeOneGlassWater = removeOneGlassWater;
window.setWaterGlasses = setWaterGlasses;
window.clearWaterHistory = clearWaterHistory;

window.setSpeechSubTab = setSpeechSubTab;
window.setSpeechRateMode = setSpeechRateMode;
window.speakSpeechCard = speakSpeechCard;
window.toggleSpeechCardPracticed = toggleSpeechCardPracticed;
window.answerMatchQuiz = answerMatchQuiz;
window.nextMatchQuizQuestion = nextMatchQuizQuestion;
window.resetMatchQuiz = resetMatchQuiz;
window.speakCaregiverPhrase = speakCaregiverPhrase;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSosModal();
    closeCelebrationModal();
    closeGetStartedModal();
    closeResourceModal();
    closeLegalModal();
    closeMedAlertModal();
    closeMobileMenu();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  applyThemeAndAccessibilityToDOM();
  applyLanguageToDOM();

  // Initialize Three.js Interactive 3D Brain Explorer
  const threeContainer = document.getElementById('threeContainer');
  const hoverBadge = document.getElementById('hoverBadge3D');
  const hoverBadgeText = document.getElementById('hoverBadgeText');

  if (threeContainer) {
    stroke3DInstance = initStroke3D(threeContainer, {
      onStructureSelect: (info) => {
        updateBrainFactsPanel(info);
      },
      onStructureHover: (info) => {
        if (hoverBadge && hoverBadgeText) {
          if (info) {
            hoverBadge.classList.remove('hidden');
            hoverBadgeText.innerText = appState.language === 'ta' ? info.name_ta : info.name_en;
          } else {
            hoverBadge.classList.add('hidden');
          }
        }
      },
    });

    const leftHemi = BRAIN_STRUCTURES['Brain-cerebral_hemisphere-left'];
    if (leftHemi) {
      updateBrainFactsPanel(leftHemi);
      stroke3DInstance.focusStructure('Brain-cerebral_hemisphere-left');
    }
  }

  // Update localized today date badge if present
  const dateBadge = document.getElementById('dashTodayDate');
  if (dateBadge) {
    dateBadge.innerText = new Date().toLocaleDateString(appState.language === 'ta' ? 'ta-IN' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  // Start Scheduled Medication Push & Browser Alert Loop
  startMedicationReminderLoop();

  if (window.lucide) window.lucide.createIcons();
});
