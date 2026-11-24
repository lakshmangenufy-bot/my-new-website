import React, { useEffect, useState } from 'react';
import {
  Check,
  Droplet,
  Heart,
  MessageSquare,
  RotateCcw,
  Square,
  Trash2,
  Undo2,
  Volume2,
} from 'lucide-react';
import {
  CAREGIVER_PHRASES,
  HistoryEntry,
  Language,
  MATCH_QUESTIONS,
  SPEECH_WORDS,
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

const TARGET_WATER = 8;

/* ============================================================================
 * HYDRATION & NUTRITION CHAPTER CONTENT
 * ========================================================================= */
export const HydrationSection: React.FC<{
  lang: Language;
  waterCount: number;
  waterHistory: HistoryEntry[];
  onSetWater: (count: number) => void;
  onClearWaterHistory: () => void;
}> = ({ lang, waterCount, waterHistory, onSetWater, onClearWaterHistory }) => {
  const isTa = lang === 'ta';
  const waterPct = Math.min(100, Math.round((waterCount / TARGET_WATER) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Big Tappable 8-Glass Animated Water Tracker */}
      <div className="lg:col-span-7 clinical-card hc-card p-6 sm:p-8 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <Droplet className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span>{isTa ? 'தண்ணீர் கண்காணிப்பு' : 'Hydration Tracker'}</span>
              </div>
              <h3 className="text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? 'தினசரி 8 டம்ளர் தண்ணீர்' : 'Daily 8-Glass Water Goal'}
              </h3>
              <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
                {isTa
                  ? 'ரத்த ஓட்டம் சீராக இருக்க ஒவ்வொரு டம்ளரையும் தொட்டுப் பதியவும்.'
                  : 'Tap any glass below as you drink throughout the day.'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="tabular-nums text-[2.5rem] sm:text-[3rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] leading-none">
                {waterCount}
                <span className="text-[1.375rem] text-[#3A4753] dark:text-[#D3DFE9] font-normal"> / {TARGET_WATER}</span>
              </div>
              <span className="text-[1rem] font-medium text-[#3A4753] dark:text-[#D3DFE9] tabular-nums">{waterPct}%</span>
            </div>
          </div>

          {/* 8 Visual Water Glasses With Animated Fill */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {Array.from({ length: TARGET_WATER }, (_, idx) => {
              const glassNumber = idx + 1;
              const filled = glassNumber <= waterCount;
              return (
                <button
                  key={glassNumber}
                  type="button"
                  aria-label={isTa ? `டம்ளர் ${glassNumber}` : `Glass ${glassNumber}`}
                  aria-pressed={filled}
                  onClick={() => onSetWater(filled && glassNumber === waterCount ? glassNumber - 1 : glassNumber)}
                  className={`relative overflow-hidden min-h-[84px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    filled
                      ? 'border-[#1F6F63] dark:border-[#2DD4BF] text-[#0F1F2E] dark:text-white'
                      : 'border-[var(--border-subtle)] bg-[#F2F7F6] dark:bg-[#0B1220] text-[#3A4753] dark:text-[#D3DFE9] hover:border-[#1F6F63]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="water-fill-bar absolute inset-x-0 bottom-0 bg-[#BFE3D9] dark:bg-[#112A27]"
                    style={{ height: filled ? '100%' : '0%' }}
                  />
                  <Droplet
                    className={`relative z-10 w-6 h-6 ${
                      filled ? 'fill-[#1F6F63] text-[#1F6F63] dark:fill-[#2DD4BF] dark:text-[#2DD4BF]' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span className="relative z-10 tabular-nums text-[1rem] font-semibold">
                    {glassNumber}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onSetWater(Math.min(TARGET_WATER, waterCount + 1))}
              className="apple-pill-btn min-h-[56px] px-5 py-3 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold flex items-center justify-center gap-2 cursor-pointer hc-primary-btn"
            >
              <Droplet className="w-5 h-5" />
              <span>{isTa ? '+1 டம்ளர் குடித்தேன்' : '+1 Glass Drank'}</span>
            </button>

            <button
              type="button"
              disabled={waterCount === 0}
              onClick={() => onSetWater(Math.max(0, waterCount - 1))}
              className="apple-pill-btn min-h-[56px] px-5 py-3 bg-[#F2F7F6] dark:bg-[#0B1220] disabled:opacity-45 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <Undo2 className="w-5 h-5" />
              <span>{isTa ? 'கடைசி டம்ளரை நீக்கு (Undo -1)' : 'Undo Last Glass'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[1rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9]">
              {isTa ? 'இன்றைய தண்ணீர் பதிவு' : 'Today Hydration Log'}
            </h4>
            {waterHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearWaterHistory}
                aria-label={isTa ? 'தண்ணீர் பதிவை அழி' : 'Clear hydration log'}
                className="min-h-[44px] px-3 py-1.5 rounded-full text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>{isTa ? 'அழி' : 'Clear'}</span>
              </button>
            )}
          </div>
          {waterHistory.length === 0 ? (
            <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
              {isTa ? 'இன்னும் தண்ணீர் அளவு பதிவு செய்யப்படவில்லை.' : 'No water intake logged yet today.'}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {waterHistory.slice(0, 4).map((entry) => (
                <li key={entry.id} className="py-2 flex items-center justify-between text-[1rem]">
                  <span className="text-[#0F1F2E] dark:text-slate-100">
                    {isTa ? entry.label_ta : entry.label_en}
                  </span>
                  <span className="tabular-nums text-[#3A4753] dark:text-[#D3DFE9] shrink-0">
                    {entry.time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Heart & Brain-Healthy Nutrition Tips */}
      <div className="lg:col-span-5 clinical-card hc-card p-6 sm:p-8 space-y-5">
        <div className="border-b border-[var(--border-subtle)] pb-4 space-y-1.5">
          <div className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
            <Heart className="w-6 h-6 shrink-0" aria-hidden="true" />
            <span>{isTa ? 'உணவு வழிகாட்டி' : 'Stroke Prevention Nutrition'}</span>
          </div>
          <h3 className="text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white">
            {isTa ? 'இதயம் & மூளை ஆரோக்கிய உணவு' : 'Heart & Brain-Healthy Foods'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
          <div className="p-5 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] space-y-1">
            <h4 className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
              🥗 {isTa ? 'பச்சை காய்கறிகள் & கீரை' : 'Leafy Greens & Spinach'}
            </h4>
            <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-[1.55]">
              {isTa
                ? 'ரத்த அழுத்தத்தை குறைக்கும் பொட்டாசியம் மற்றும் நார்ச்சத்து நிறைந்தது.'
                : 'Rich in potassium and dietary fiber to balance blood pressure naturally.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] space-y-1">
            <h4 className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
              🍎 {isTa ? 'பழங்கள் & வால்நட்' : 'Fresh Fruits & Walnuts'}
            </h4>
            <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-[1.55]">
              {isTa
                ? 'ஆப்பிள், கொய்யா, வால்நட் மூளை செல்களுக்கு ஊட்டம் அளிக்கும்.'
                : 'Apples, guava, and walnuts nourish recovering neural pathways.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/35 space-y-1">
            <h4 className="text-[1.125rem] font-semibold text-amber-950 dark:text-amber-200">
              🧂 {isTa ? 'உப்பு குறைக்கவும் (Low Salt)' : 'Reduce Added Table Salt'}
            </h4>
            <p className="text-[1.125rem] text-amber-950 dark:text-amber-100 leading-[1.55]">
              {isTa
                ? 'உப்பு குறைவாக சாப்பிட்டால் ரத்த அழுத்தம் (BP) கட்டுக்குள் இருக்கும்.'
                : 'Keeping sodium low directly protects arterial blood pressure.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/35 space-y-1">
            <h4 className="text-[1.125rem] font-semibold text-amber-950 dark:text-amber-200">
              🍲 {isTa ? 'எண்ணெய் வறுவல்களைத் தவிர்க்கவும்' : 'Limit Deep-Fried Foods'}
            </h4>
            <p className="text-[1.125rem] text-amber-950 dark:text-amber-100 leading-[1.55]">
              {isTa
                ? 'வறுத்த உணவுகள் ரத்தக்குழாயில் கொழுப்பு படிவதை அதிகரிக்கும்.'
                : 'Steamed and lightly cooked home meals keep cholesterol steady.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * SPEECH & COMMUNICATION CHAPTER CONTENT
 * ========================================================================= */
export const SpeechSection: React.FC<{
  lang: Language;
  practicedSpeechIds: string[];
  onToggleSpeechPracticed: (cardId: string) => void;
}> = ({ lang, practicedSpeechIds, onToggleSpeechPracticed }) => {
  const isTa = lang === 'ta';
  const [speechTab, setSpeechTab] = useState<'cards' | 'quiz' | 'phrases'>('cards');
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal'>('slow');
  const [speechState, setSpeechState] = useState<SpeechPlaybackState>(() => getSpeechState());
  const [voiceMode, setVoiceMode] = useState<AudioVoiceMode>(() => getAudioVoiceMode());
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, boolean>>({});
  const [quizFeedback, setQuizFeedback] = useState<{
    correct: boolean;
    msg: string;
  } | null>(null);

  useEffect(() => {
    const unsubSpeech = subscribeSpeechState(setSpeechState);
    const unsubVoice = subscribeAudioVoiceMode(setVoiceMode);
    return () => {
      unsubSpeech();
      unsubVoice();
    };
  }, []);

  const currentQuestion = MATCH_QUESTIONS[quizIndex] || MATCH_QUESTIONS[0];

  const handlePlayWord = (wordTa: string, wordEn: string, id?: string) => {
    const rate = speechRate === 'slow' ? 0.76 : 0.96;
    speakBilingual(wordTa, wordEn, lang, rate, { id });
  };

  const handleAnswerQuiz = (idx: number) => {
    const opt = currentQuestion.options[idx];
    if (!opt) return;
    if (opt.isCorrect) {
      playSoftTone(880, 0.22);
      if (!answeredQuestions[quizIndex]) {
        setAnsweredQuestions((prev) => ({ ...prev, [quizIndex]: true }));
        setQuizScore((s) => Math.min(MATCH_QUESTIONS.length, s + 1));
      }
      setQuizFeedback({
        correct: true,
        msg: isTa
          ? `அருமை! “${opt.label_ta}” (${opt.label_en}) என்பது சரியான பதில்.`
          : `Well done! “${opt.label_en}” (${opt.label_ta}) is the right match.`,
      });
    } else {
      playSoftTone(330, 0.2);
      setQuizFeedback({
        correct: false,
        msg: isTa
          ? 'மீண்டும் முயற்சிக்கவும் — மேலே உள்ள படத்தைப் பார்த்து அல்லது குரல் உதவியைக் கேட்டுச் சரியான சொல்லைத் தேர்ந்தெடுக்கவும்.'
          : 'Not quite — look at the picture above or play the audio hint and try another match.',
      });
    }
  };

  return (
    <div className="clinical-card hc-card p-6 sm:p-8 space-y-7">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
            <MessageSquare className="w-6 h-6 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              {practicedSpeechIds.length} / {SPEECH_WORDS.length} {isTa ? 'சொற்கள் பயிற்சி' : 'Words Practiced'}
            </span>
          </div>
          <h3 className="text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white">
            {isTa ? 'இருமொழி சொல் உச்சரிப்பு & படம்-சொல் பயிற்சி' : 'Bilingual Word Cards & Picture Quiz'}
          </h3>
        </div>

        {/* Voice Language + Slow / Normal Speech Speed Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {isTa && (
            <button
              type="button"
              onClick={() => setAudioVoiceMode(voiceMode === 'en' ? 'auto' : 'en')}
              aria-pressed={voiceMode === 'en'}
              className={`apple-pill-btn min-h-[56px] px-4 py-2 text-[1rem] font-semibold cursor-pointer whitespace-nowrap ${
                voiceMode === 'en'
                  ? 'bg-[#1F6F63] text-white hc-primary-btn'
                  : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-200'
              }`}
            >
              {voiceMode === 'en' ? 'Voice: English' : 'Voice: தமிழ்'}
            </button>
          )}
          <div className="inline-flex p-1.5 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] gap-1">
            <button
              type="button"
              onClick={() => setSpeechRate('slow')}
              aria-pressed={speechRate === 'slow'}
              className={`apple-pill-btn min-h-[56px] px-5 py-2 text-[1.125rem] font-semibold cursor-pointer ${
                speechRate === 'slow'
                  ? 'bg-[#1F6F63] text-white hc-primary-btn'
                  : 'text-[#0F1F2E] dark:text-slate-200'
              }`}
            >
              {isTa ? 'மெதுவாக (Slow)' : 'Slow'}
            </button>
            <button
              type="button"
              onClick={() => setSpeechRate('normal')}
              aria-pressed={speechRate === 'normal'}
              className={`apple-pill-btn min-h-[56px] px-5 py-2 text-[1.125rem] font-semibold cursor-pointer ${
                speechRate === 'normal'
                  ? 'bg-[#1F6F63] text-white hc-primary-btn'
                  : 'text-[#0F1F2E] dark:text-slate-200'
              }`}
            >
              {isTa ? 'சாதாரணம் (Normal)' : 'Normal'}
            </button>
          </div>
        </div>
      </div>

      {/* 3 Speech Sub-Tabs */}
      <div className="flex flex-wrap gap-2.5" role="tablist" aria-label={isTa ? 'பேச்சுப் பயிற்சி பிரிவுகள்' : 'Speech Modules'}>
        <button
          type="button"
          role="tab"
          aria-selected={speechTab === 'cards'}
          onClick={() => setSpeechTab('cards')}
          className={`apple-pill-btn min-h-[56px] px-6 py-2.5 text-[1.125rem] font-semibold cursor-pointer ${
            speechTab === 'cards'
              ? 'bg-[#1F6F63] text-white hc-primary-btn'
              : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white'
          }`}
        >
          {isTa ? 'சொல் அட்டைகள்' : 'Word Cards'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={speechTab === 'quiz'}
          onClick={() => setSpeechTab('quiz')}
          className={`apple-pill-btn min-h-[56px] px-6 py-2.5 text-[1.125rem] font-semibold cursor-pointer ${
            speechTab === 'quiz'
              ? 'bg-[#1F6F63] text-white hc-primary-btn'
              : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white'
          }`}
        >
          {isTa ? 'படம்-சொல் வினாடி வினா' : 'Picture Quiz'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={speechTab === 'phrases'}
          onClick={() => setSpeechTab('phrases')}
          className={`apple-pill-btn min-h-[56px] px-6 py-2.5 text-[1.125rem] font-semibold cursor-pointer ${
            speechTab === 'phrases'
              ? 'bg-[#1F6F63] text-white hc-primary-btn'
              : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white'
          }`}
        >
          {isTa ? 'உடனடி வாக்கியங்கள்' : 'Caregiver Phrases'}
        </button>
      </div>

      {/* Sub-Panel A: Compact Pro Bilingual Word Cards */}
      {speechTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SPEECH_WORDS.map((card) => {
            const practiced = practicedSpeechIds.includes(card.id);
            const playId = `word-${card.id}-normal`;
            const slowId = `word-${card.id}-slow`;
            const isPlayActive =
              speechState.activeId === playId &&
              (speechState.isSpeaking || speechState.loading);
            const isSlowActive =
              speechState.activeId === slowId &&
              (speechState.isSpeaking || speechState.loading);

            return (
              <article
                key={card.id}
                className={`group rounded-[20px] p-4 sm:p-5 flex flex-col justify-between gap-3.5 min-w-0 border transition-all duration-200 ${
                  practiced
                    ? 'bg-[#EDF7F4] dark:bg-[#0E2521] border-[#1F6F63]/35 dark:border-[#2DD4BF]/40 shadow-[0_4px_16px_rgba(31,111,99,0.08)]'
                    : 'bg-[#F8FAF9] dark:bg-[#0D1626] border-[#0F1F2E]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(15,31,46,0.04)] hover:shadow-[0_10px_24px_rgba(15,31,46,0.08)] hover:-translate-y-0.5'
                }`}
              >
                {/* Compact Header: Eyebrow Category + Inline Practiced Toggle */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-[#1F6F63] dark:text-[#2DD4BF] truncate">
                    {isTa ? card.category_ta : card.category_en}
                  </span>

                  <button
                    type="button"
                    aria-pressed={practiced}
                    onClick={() => onToggleSpeechPracticed(card.id)}
                    className={`min-h-[44px] px-3 py-1 rounded-full text-[0.875rem] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                      practiced
                        ? 'bg-[#1F6F63] hover:bg-[#17574D] text-white hc-primary-btn'
                        : 'bg-white dark:bg-[#111A2B] border border-[#0F1F2E]/15 dark:border-white/15 text-[#0F1F2E] dark:text-slate-200 hover:border-[#1F6F63] hover:text-[#1F6F63] dark:hover:text-[#2DD4BF]'
                    }`}
                  >
                    {practiced && <Check className="w-4 h-4 shrink-0 stroke-[2.5]" aria-hidden="true" />}
                    <span>
                      {practiced
                        ? isTa
                          ? 'முடிந்தது'
                          : 'Practiced'
                        : isTa
                        ? 'குறிக்க'
                        : 'Mark Done'}
                    </span>
                  </button>
                </div>

                {/* Compact Word + Translation + Phonetics */}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-0.5 min-w-0">
                    <h4 className="text-[1.5rem] sm:text-[1.625rem] leading-[1.35] font-semibold text-[#0F1F2E] dark:text-white [overflow-wrap:anywhere]">
                      {card.word_ta}
                    </h4>
                    <span className="text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] shrink-0">
                      {card.word_en}
                    </span>
                  </div>
                  <p className="text-[0.9375rem] font-medium text-[#3A4753] dark:text-[#D3DFE9] [overflow-wrap:anywhere]">
                    {card.phonetic}
                  </p>
                </div>

                {/* Subtle Left-Accent Articulation Tip */}
                <p className="border-l-2 border-[#1F6F63]/35 dark:border-[#2DD4BF]/40 pl-3 text-[0.9375rem] leading-[1.45] font-normal text-[#3A4753] dark:text-[#D3DFE9] min-w-0 [overflow-wrap:anywhere]">
                  {isTa ? card.tip_ta : card.tip_en}
                </p>

                {/* Unified Single-Row Audio Action Controls */}
                <div className="grid grid-cols-2 gap-2 pt-0.5 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      speakBilingual(card.word_ta, card.word_en, lang, 0.96, {
                        id: playId,
                      })
                    }
                    aria-pressed={isPlayActive}
                    className={`min-h-[48px] px-3.5 py-2 rounded-xl text-[1rem] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      isPlayActive
                        ? 'bg-[#1F6F63] text-white hc-primary-btn'
                        : 'bg-white dark:bg-[#111A2B] border border-[#0F1F2E]/12 dark:border-white/12 text-[#0F1F2E] dark:text-white hover:border-[#1F6F63]'
                    }`}
                  >
                    {isPlayActive ? (
                      <Square className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-4 h-4 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                    )}
                    <span>{isPlayActive ? (isTa ? 'நிறுத்து' : 'Stop') : isTa ? 'கேட்க' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      speakBilingual(card.word_ta, card.word_en, lang, 0.75, {
                        id: slowId,
                      })
                    }
                    aria-pressed={isSlowActive}
                    className={`min-h-[48px] px-3.5 py-2 rounded-xl text-[1rem] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      isSlowActive
                        ? 'bg-[#1F6F63] text-white hc-primary-btn'
                        : 'bg-[#E3F1ED]/70 dark:bg-[#112A27] border border-[#1F6F63]/15 dark:border-[#2DD4BF]/20 text-[#0F1F2E] dark:text-white hover:bg-[#E3F1ED] dark:hover:bg-[#183935]'
                    }`}
                  >
                    {isSlowActive ? (
                      <Square className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-4 h-4 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                    )}
                    <span>{isSlowActive ? (isTa ? 'நிறுத்து' : 'Stop') : isTa ? 'மெதுவாக' : 'Slow'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Sub-Panel B: Picture-Word Match Quiz */}
      {speechTab === 'quiz' && (
        <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-6 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
              {isTa ? currentQuestion.prompt_ta : currentQuestion.prompt_en}
            </span>
            <span className="tabular-nums text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
              {isTa ? 'மதிப்பெண்:' : 'Score:'} {quizScore} / {MATCH_QUESTIONS.length}
            </span>
          </div>

          <div className="text-center py-6 px-4 space-y-4 bg-white dark:bg-[#111A2B] rounded-[24px]">
            <div className="text-7xl select-none" aria-hidden="true">
              {currentQuestion.emoji}
            </div>
            <p className="text-[1.0625rem] text-[#3A4753] dark:text-[#D3DFE9]">
              {isTa
                ? `கேள்வி ${quizIndex + 1} / ${MATCH_QUESTIONS.length} · படத்திற்குப் பொருந்தும் சொல்லைத் தேர்ந்தெடுக்கவும்`
                : `Question ${quizIndex + 1} of ${MATCH_QUESTIONS.length} · Match the picture below`}
            </p>
            <button
              type="button"
              onClick={() =>
                handlePlayWord(currentQuestion.target_ta, currentQuestion.target_en, `quiz-clue-${quizIndex}`)
              }
              className="apple-pill-btn min-h-[48px] px-5 py-2 bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] text-[1rem] font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{isTa ? 'குரல் உதவியைக் கேட்க' : 'Hear Audio Clue'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentQuestion.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAnswerQuiz(idx)}
                className="min-h-[88px] p-5 rounded-[24px] bg-white dark:bg-[#111A2B] hover:ring-2 hover:ring-[#1F6F63] text-left sm:text-center flex sm:flex-col items-center justify-center gap-3 cursor-pointer"
              >
                <span className="text-3xl" aria-hidden="true">
                  {opt.emoji}
                </span>
                <div className="space-y-0.5">
                  <span className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white block">
                    {opt.label_ta}
                  </span>
                  <span className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] block">
                    {opt.label_en}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {quizFeedback && (
            <div
              role="status"
              className={`p-4 rounded-2xl text-[1.125rem] font-semibold text-center ${
                quizFeedback.correct
                  ? 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF]'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
              }`}
            >
              {quizFeedback.msg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setQuizIndex(0);
                setQuizScore(0);
                setAnsweredQuestions({});
                setQuizFeedback(null);
              }}
              className="apple-pill-btn min-h-[56px] px-6 py-2.5 bg-white dark:bg-[#111A2B] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>{isTa ? 'மீண்டும் தொடங்கு' : 'Reset Quiz'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuizIndex((i) => (i + 1) % MATCH_QUESTIONS.length);
                setQuizFeedback(null);
              }}
              className="apple-pill-btn min-h-[56px] px-7 py-2.5 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold cursor-pointer hc-primary-btn"
            >
              {isTa ? 'அடுத்த கேள்வி' : 'Next Question'}
            </button>
          </div>
        </div>
      )}

      {/* Sub-Panel C: Quick Caregiver Communication Board */}
      {speechTab === 'phrases' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAREGIVER_PHRASES.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                playSoftTone(620, 0.12);
                handlePlayWord(phrase.ta, phrase.en, `phrase-${idx}`);
              }}
              className="min-h-[88px] p-5 rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] hover:ring-2 hover:ring-[#1F6F63] text-left flex items-start gap-3.5 cursor-pointer"
            >
              <Volume2 className="w-6 h-6 text-[#1F6F63] dark:text-[#2DD4BF] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <span className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white block leading-snug">
                  {phrase.ta}
                </span>
                <span className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] block">
                  {phrase.en}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
