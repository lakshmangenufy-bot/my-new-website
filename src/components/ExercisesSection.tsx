import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  EXERCISES_LIST,
  ExerciseId,
  HistoryEntry,
  Language,
} from '../data/rehabContent';
import { playSoftTone, speakCountdownNumber } from '../utils/audioSpeech';

interface ExercisesSectionProps {
  lang: Language;
  exercises: Record<ExerciseId, boolean>;
  history: HistoryEntry[];
  onToggleDone: (exId: ExerciseId) => void;
  onClearHistory: () => void;
  onNotify: (msgTa: string, msgEn: string, variant?: 'teal' | 'success' | 'warning' | 'danger') => void;
}

const HOLD_SECONDS = 5;

export const ExercisesSection: React.FC<ExercisesSectionProps> = ({
  lang,
  exercises,
  history,
  onToggleDone,
  onClearHistory,
  onNotify,
}) => {
  const isTa = lang === 'ta';
  const [focusIdx, setFocusIdx] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(HOLD_SECONDS);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [voiceCountdown, setVoiceCountdown] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);

  const currentExercise = EXERCISES_LIST[focusIdx] || EXERCISES_LIST[0];
  const doneCount = Object.values(exercises).filter(Boolean).length;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerStatus !== 'running') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setTimerStatus('done');
          playSoftTone(784, 0.3);
          if (voiceCountdown) {
            speakCountdownNumber(0, lang);
          }
          onNotify('5 நொடி பயிற்சி முடிந்தது!', '5-second hold completed!', 'success');
          return 0;
        }
        playSoftTone(540, 0.12);
        if (voiceCountdown) {
          speakCountdownNumber(next, lang);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerStatus, lang, voiceCountdown]);

  const handleStartPause = () => {
    if (timerStatus === 'running') {
      setTimerStatus('paused');
      return;
    }
    const startingFromFresh = timerStatus === 'idle' || timerStatus === 'done';
    if (startingFromFresh) {
      setSecondsLeft(HOLD_SECONDS);
      playSoftTone(440, 0.12);
      if (voiceCountdown) speakCountdownNumber(HOLD_SECONDS, lang);
    }
    setTimerStatus('running');
  };

  const handleResetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSecondsLeft(HOLD_SECONDS);
    setTimerStatus('idle');
  };

  const handleSelectExercise = (idx: number) => {
    setFocusIdx(idx);
    handleResetTimer();
  };

  const handleNextExercise = () => {
    handleSelectExercise((focusIdx + 1) % EXERCISES_LIST.length);
  };

  const handlePrevExercise = () => {
    handleSelectExercise((focusIdx - 1 + EXERCISES_LIST.length) % EXERCISES_LIST.length);
  };

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const elapsedFraction =
    timerStatus === 'done' ? 1 : (HOLD_SECONDS - secondsLeft) / HOLD_SECONDS;
  const strokeDashoffset = circumference * (1 - elapsedFraction);

  const isCompleted = exercises[currentExercise.id];

  return (
    <div className="clinical-card hc-card p-6 sm:p-8 space-y-8">
      {/* Selector Tabs & Counter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div className="flex items-center gap-2.5 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
          <Dumbbell className="w-6 h-6 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">
            {doneCount} / {EXERCISES_LIST.length} {isTa ? 'பயிற்சிகள் முடிந்தன' : 'Exercises Done'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5" role="tablist" aria-label={isTa ? 'பயிற்சித் தேர்வு' : 'Select Exercise'}>
          {EXERCISES_LIST.map((ex, idx) => {
            const active = idx === focusIdx;
            const exDone = exercises[ex.id];
            return (
              <button
                key={ex.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectExercise(idx)}
                className={`apple-pill-btn min-h-[56px] px-5 py-2.5 text-[1.125rem] font-semibold flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-[#1F6F63] text-white hc-primary-btn'
                    : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-100 hover:bg-[#E3F1ED] dark:hover:bg-[#112A27]'
                }`}
              >
                {exDone && <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />}
                <span>{isTa ? `${idx + 1}. ${ex.category_ta}` : `${idx + 1}. ${ex.category_en}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Single Focus Card Split: Left Verified Video + Steps, Right Big Circular 5-Sec Hold Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-[24px] overflow-hidden bg-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <div className="aspect-video w-full">
              <iframe
                key={currentExercise.youtubeId}
                loading="lazy"
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${currentExercise.youtubeId}?rel=0&playsinline=1`}
                title={currentExercise.youtubeTitle}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="px-5 py-3.5 bg-[#F2F7F6] dark:bg-[#0B1220] flex flex-wrap items-center justify-between gap-2 text-[1rem]">
              <span className="font-medium text-[#3A4753] dark:text-[#D3DFE9]">
                {currentExercise.sourceLabel}
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${currentExercise.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline"
              >
                <span>{isTa ? 'YouTube-இல் திறக்க' : 'Watch on YouTube'}</span>
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                  {isTa ? `பயிற்சி ${focusIdx + 1} / 3` : `Exercise ${focusIdx + 1} of 3`} ·{' '}
                  {isTa ? currentExercise.reps_ta : currentExercise.reps_en}
                </span>
                <h3 className="text-[1.375rem] sm:text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white mt-1">
                  {isTa ? currentExercise.title_ta : currentExercise.title_en}
                </h3>
              </div>
              <span
                className={`text-[1rem] font-semibold px-3.5 py-1.5 rounded-full ${
                  isCompleted
                    ? 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF]'
                    : 'bg-white dark:bg-[#111A2B] text-[#3A4753] dark:text-[#D3DFE9]'
                }`}
              >
                {isCompleted ? (isTa ? '✓ முடிந்தது' : '✓ Completed') : isTa ? 'நிலுவையில்' : 'To Do'}
              </span>
            </div>

            <ol className="space-y-3 text-[1.125rem] text-[#0F1F2E] dark:text-slate-100 leading-[1.6]">
              {(isTa ? currentExercise.steps_ta : currentExercise.steps_en).map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="tabular-nums font-semibold text-[#1F6F63] dark:text-[#2DD4BF] shrink-0">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Big Circular Hold Timer + Actions Column */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="rounded-[24px] bg-[#E3F1ED] dark:bg-[#112A27] p-6 text-center space-y-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? '5 நொடி பிடிப்பு டைமர்' : '5-Second Hold Timer'}
              </span>
              <button
                type="button"
                onClick={() => setVoiceCountdown((v) => !v)}
                aria-pressed={voiceCountdown}
                aria-label={isTa ? 'குரல் எண்ணிக்கை மாற்று' : 'Toggle voice countdown'}
                className="min-h-[48px] px-3.5 py-2 rounded-full bg-white dark:bg-[#0B1220] text-[1rem] font-semibold text-[#0F1F2E] dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                {voiceCountdown ? <Volume2 className="w-4 h-4 text-[#1F6F63] dark:text-[#2DD4BF]" /> : <VolumeX className="w-4 h-4" />}
                <span>{isTa ? (voiceCountdown ? 'குரல் ஆன்' : 'அமைதி') : voiceCountdown ? 'Voice On' : 'Muted'}</span>
              </button>
            </div>

            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  strokeWidth="12"
                  className="stroke-[#C9DDD7] dark:stroke-[#1F3B37]"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="stroke-[#1F6F63] dark:stroke-[#2DD4BF] transition-all duration-500 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
                <div className="tabular-nums flex items-baseline justify-center gap-1.5 leading-none">
                  <span className="text-4xl font-semibold text-[#0F1F2E] dark:text-white">
                    {timerStatus === 'done' ? '✓' : String(secondsLeft).padStart(2, '0')}
                  </span>
                  {timerStatus !== 'done' && (
                    <span className="text-lg font-medium text-[#3A4753] dark:text-[#D3DFE9]">
                      {isTa ? 'நொடி' : 'sec'}
                    </span>
                  )}
                </div>
                <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] mt-1.5">
                  {timerStatus === 'done'
                    ? isTa
                      ? 'அருமை!'
                      : 'Done!'
                    : timerStatus === 'running'
                    ? isTa
                      ? 'பிடித்திருக்கவும்...'
                      : 'Hold steady...'
                    : timerStatus === 'paused'
                    ? isTa
                      ? 'நிறுத்தப்பட்டது'
                      : 'Paused'
                    : isTa
                    ? 'தொடங்கத் தயார்'
                    : 'Ready'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleStartPause}
                className="apple-pill-btn min-h-[56px] px-4 py-3 bg-[#1F6F63] hover:bg-[#17574D] text-white font-semibold text-[1.125rem] flex items-center justify-center gap-2 cursor-pointer hc-primary-btn"
              >
                {timerStatus === 'running' ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>{isTa ? 'நிறுத்து' : 'Pause'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>
                      {timerStatus === 'paused'
                        ? isTa
                          ? 'தொடர்'
                          : 'Resume'
                        : isTa
                        ? 'தொடங்கு'
                        : 'Start'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                className="apple-pill-btn min-h-[56px] px-4 py-3 bg-white dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white font-semibold text-[1.125rem] flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{isTa ? 'மீட்டமை' : 'Reset'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleDone(currentExercise.id)}
            className={`apple-pill-btn w-full min-h-[56px] px-5 py-3.5 font-semibold text-[1.125rem] flex items-center justify-center gap-2.5 cursor-pointer ${
              isCompleted
                ? 'bg-[#15803D] hover:bg-[#166534] text-white'
                : 'bg-[#0F1F2E] hover:bg-[#1E293B] dark:bg-[#1F6F63] dark:hover:bg-[#17574D] text-white hc-primary-btn'
            }`}
          >
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>
              {isCompleted
                ? isTa
                  ? 'முடிந்தது ✓ (மாற்றத் தொடவும்)'
                  : 'Completed ✓ (Tap to Undo)'
                : isTa
                ? 'பயிற்சியை முடித்தேன்'
                : 'Mark Exercise Completed'}
            </span>
          </button>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevExercise}
              className="apple-pill-btn flex-1 min-h-[56px] px-4 py-2.5 bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>{isTa ? 'முந்தைய' : 'Prev'}</span>
            </button>
            <button
              type="button"
              onClick={handleNextExercise}
              className="apple-pill-btn flex-1 min-h-[56px] px-4 py-2.5 bg-[#F2F7F6] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isTa ? 'அடுத்தது' : 'Next'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[1rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9]">
                {isTa ? 'இன்றைய பயிற்சிப் பதிவு' : 'Completed Exercise Log'}
              </h4>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  aria-label={isTa ? 'உடற்பயிற்சிப் பதிவை அழி' : 'Clear completed exercise log'}
                  className="min-h-[44px] px-3 py-1.5 rounded-full text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>{isTa ? 'அழி' : 'Clear'}</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                {isTa ? 'இன்று இன்னும் பயிற்சிகள் பதிவு செய்யப்படவில்லை.' : 'No exercises logged yet today.'}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {history.slice(0, 5).map((item) => (
                  <li key={item.id} className="py-2 flex items-center justify-between gap-2 text-[1rem]">
                    <span className="font-medium text-[#0F1F2E] dark:text-slate-100">
                      ✓ {isTa ? item.label_ta : item.label_en}
                    </span>
                    <span className="tabular-nums text-[#3A4753] dark:text-[#D3DFE9] shrink-0">
                      {item.time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
