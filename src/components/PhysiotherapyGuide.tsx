/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ExerciseModule, ExerciseCategory } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronRight,
  Hand,
  Footprints,
  Smile,
  Clock,
  ShieldAlert,
  Volume2,
  VolumeX,
  HeartPulse,
  Flame,
  Award,
} from 'lucide-react';
import { speakText, playChime } from '../utils/speech';

interface PhysiotherapyGuideProps {
  exercises: ExerciseModule[];
  onExerciseCompleted: (exerciseTitle: string) => void;
}

export const PhysiotherapyGuide: React.FC<PhysiotherapyGuideProps> = ({
  exercises,
  onExerciseCompleted,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory>('hand');
  const [activeExercise, setActiveExercise] = useState<ExerciseModule | null>(null);

  // Active workout runner state
  const [isRunning, setIsRunning] = useState(false);
  const [currentRep, setCurrentRep] = useState(1);
  const [phase, setPhase] = useState<'hold' | 'rest' | 'ready'>('ready');
  const [timeLeft, setTimeLeft] = useState(5);
  const [voiceGuidance, setVoiceGuidance] = useState(true);
  const [affectedSide, setAffectedSide] = useState<'Right Side' | 'Left Side' | 'Both Sides'>('Right Side');
  const [completedExercisesList, setCompletedExercisesList] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredExercises = exercises.filter((ex) => ex.category === selectedCategory);

  // Select first exercise by default when category changes
  useEffect(() => {
    if (filteredExercises.length > 0 && (!activeExercise || activeExercise.category !== selectedCategory)) {
      selectExercise(filteredExercises[0]);
    }
  }, [selectedCategory]);

  const selectExercise = (exercise: ExerciseModule) => {
    setIsRunning(false);
    setActiveExercise(exercise);
    setCurrentRep(1);
    setPhase('ready');
    setTimeLeft(exercise.holdSeconds);
    setShowCelebration(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Timer loop
  useEffect(() => {
    if (isRunning && activeExercise) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Transition phases
            if (phase === 'ready') {
              setPhase('hold');
              if (voiceGuidance) speakText(`Hold the position.`);
              playChime('tick');
              return activeExercise.holdSeconds;
            } else if (phase === 'hold') {
              playChime('rep');
              if (currentRep >= activeExercise.repsDefault) {
                // Completed exercise
                setIsRunning(false);
                setPhase('ready');
                setShowCelebration(true);
                playChime('success');
                if (voiceGuidance) speakText(`Outstanding! You finished all ${activeExercise.repsDefault} repetitions of ${activeExercise.title}.`);
                onExerciseCompleted(activeExercise.title);
                setCompletedExercisesList((prev) => Array.from(new Set([...prev, activeExercise.id])));
                return 0;
              } else {
                // Next rep after short rest
                setPhase('rest');
                if (voiceGuidance) speakText(`Rest and relax.`);
                return 3; // 3 seconds gentle rest
              }
            } else if (phase === 'rest') {
              setCurrentRep((r) => r + 1);
              setPhase('hold');
              if (voiceGuidance) speakText(`Repetition ${currentRep + 1}. Hold gently.`);
              playChime('tick');
              return activeExercise.holdSeconds;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, phase, currentRep, activeExercise, voiceGuidance]);

  const handleStartPause = () => {
    if (!isRunning) {
      if (phase === 'ready') {
        if (voiceGuidance && activeExercise) {
          speakText(`Starting ${activeExercise.title}. Focus on your ${affectedSide}. Get ready.`);
        }
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentRep(1);
    setPhase('ready');
    if (activeExercise) {
      setTimeLeft(activeExercise.holdSeconds);
    }
    setShowCelebration(false);
  };

  const isCompleted = activeExercise ? completedExercisesList.includes(activeExercise.id) : false;

  return (
    <div className="space-y-8 pb-12">
      {/* Category Selection Tabs & Side Affected Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Physiotherapy Guide
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Clinical step-by-step motor recovery exercises designed for neuroplasticity.
          </p>
        </div>

        {/* Affected Side Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <span className="text-xs font-semibold text-slate-500">Affected Side:</span>
          <button
            onClick={() => setAffectedSide('Right Side')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
              affectedSide === 'Right Side'
                ? 'bg-teal-700 text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Right Side
          </button>
          <button
            onClick={() => setAffectedSide('Left Side')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
              affectedSide === 'Left Side'
                ? 'bg-teal-700 text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Left Side
          </button>
          <button
            onClick={() => setAffectedSide('Both Sides')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
              affectedSide === 'Both Sides'
                ? 'bg-teal-700 text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {/* Movement Category Segmented Tabs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setSelectedCategory('hand')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all min-h-[48px] ${
            selectedCategory === 'hand'
              ? 'bg-white text-teal-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Hand className="w-5 h-5 text-teal-600" />
          <span className="truncate">Hand & Fingers</span>
        </button>

        <button
          onClick={() => setSelectedCategory('leg')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all min-h-[48px] ${
            selectedCategory === 'leg'
              ? 'bg-white text-teal-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Footprints className="w-5 h-5 text-teal-600" />
          <span className="truncate">Leg & Gait</span>
        </button>

        <button
          onClick={() => setSelectedCategory('facial')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all min-h-[48px] ${
            selectedCategory === 'facial'
              ? 'bg-white text-teal-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smile className="w-5 h-5 text-teal-600" />
          <span className="truncate">Facial Movement</span>
        </button>
      </div>

      {/* Active Workout Interactive Stage */}
      {activeExercise && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Exercise Timer & Controller */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 card-surface space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800">
                  <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {activeExercise.targetArea}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-600">{activeExercise.difficulty} Level</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {activeExercise.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {activeExercise.subtitle}
                </p>
              </div>

              {/* Voice Guidance Toggle */}
              <button
                onClick={() => setVoiceGuidance(!voiceGuidance)}
                className={`p-2.5 rounded-xl border transition-colors ${
                  voiceGuidance
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
                title={voiceGuidance ? 'Voice guidance on' : 'Voice guidance muted'}
                aria-label="Toggle voice coach audio prompts"
              >
                {voiceGuidance ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>

            {/* Interactive Timer & Rep Dial Display */}
            <div className="bg-gradient-to-b from-teal-50/60 to-slate-50/70 rounded-3xl p-6 sm:p-8 border border-teal-100 flex flex-col items-center justify-center text-center space-y-4">
              {/* Rep Counter Badge */}
              <div className="text-xs font-bold text-teal-900 bg-white px-4 py-1.5 rounded-full border border-teal-200 shadow-sm flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-teal-600" />
                <span>Repetition {currentRep} of {activeExercise.repsDefault}</span>
              </div>

              {/* Large Timer Countdown */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-white border-8 border-teal-100 flex flex-col items-center justify-center shadow-inner">
                <span className="text-5xl sm:text-6xl font-black text-slate-900 tabular-nums">
                  {timeLeft}
                </span>
                <span className="text-xs uppercase tracking-wider font-bold text-teal-700 mt-1">
                  {phase === 'ready' ? 'Get Ready' : phase === 'hold' ? 'Hold Position' : 'Relax & Rest'}
                </span>

                {/* Status indicator ring */}
                <div
                  className={`absolute inset-0 rounded-full border-8 transition-all duration-500 pointer-events-none ${
                    phase === 'hold'
                      ? 'border-teal-500 animate-pulse'
                      : phase === 'rest'
                      ? 'border-sky-400'
                      : 'border-transparent'
                  }`}
                />
              </div>

              {/* Encouragement message */}
              <p className="text-sm sm:text-base font-semibold text-slate-700 min-h-[24px]">
                {phase === 'ready' && 'Press "Start Exercise" when in comfortable position.'}
                {phase === 'hold' && 'Gently hold this stretch. Breathe in and out through your nose.'}
                {phase === 'rest' && 'Release tension completely. Next repetition begins in a moment.'}
              </p>

              {/* Control Action Buttons (Large, senior-friendly targets) */}
              <div className="flex items-center gap-4 pt-2 w-full max-w-sm">
                <button
                  onClick={handleStartPause}
                  aria-label={isRunning ? 'Pause Exercise' : 'Start Exercise'}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer min-h-[56px] ${
                    isRunning
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-6 h-6" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 fill-current" />
                      <span>Start Exercise</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  aria-label="Reset Exercise Timer"
                  className="p-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl transition-colors min-h-[56px] min-w-[56px] flex items-center justify-center cursor-pointer"
                  title="Reset timer"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>

              {/* Celebration Banner when completed */}
              {showCelebration && (
                <div className="w-full bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-950 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold text-left">
                      Session Completed! Logged to your daily recovery progress.
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCelebration(false)}
                    className="text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Clinical Purpose & Safety Precaution Callout */}
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">
                  Clinical Neuro-Rehabilitation Purpose:
                </span>
                <p>{activeExercise.clinicalPurpose}</p>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-900 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Safety Precaution:</span>
                  <p>{activeExercise.precaution}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Step-by-Step Instructions & Other Exercises */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step-by-step instructions */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 card-surface space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Step-by-Step Instructions
                </h3>
                <button
                  onClick={() => {
                    const text = activeExercise.steps.join('. ');
                    speakText(text);
                  }}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Read Steps</span>
                </button>
              </div>

              <ol className="space-y-3">
                {activeExercise.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>

              {activeExercise.tips.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    Therapist Tip
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 italic">
                    "{activeExercise.tips[0]}"
                  </p>
                </div>
              )}
            </div>

            {/* List of Other Exercises in this category */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 card-surface space-y-3">
              <h3 className="text-base font-bold text-slate-900">
                Exercises in this Module
              </h3>

              <div className="space-y-2">
                {filteredExercises.map((ex) => {
                  const isSelected = activeExercise.id === ex.id;
                  const isDone = completedExercisesList.includes(ex.id);

                  return (
                    <button
                      key={ex.id}
                      onClick={() => selectExercise(ex)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 min-h-[56px] cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 border-teal-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold text-sm sm:text-base text-slate-900 block truncate">
                          {ex.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {ex.repsDefault} reps · {ex.holdSeconds}s hold · {ex.difficulty}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isDone && (
                          <span className="p-1 bg-emerald-100 text-emerald-800 rounded-full" title="Completed">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
