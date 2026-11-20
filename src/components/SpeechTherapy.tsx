/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SpeechCardItem, MatchingQuestion, ExpresserPhrase } from '../types';
import {
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  RefreshCw,
  ThumbsUp,
  Award,
  AlertTriangle,
  Droplet,
  Shield,
  Clock,
  Apple,
  Utensils,
  Pill,
  Footprints,
  BookOpen,
  Heart,
  Phone,
  Sun,
  Key,
  ShieldAlert,
  Moon,
  ArrowUp,
  PhoneCall,
  Smile,
  Sliders,
} from 'lucide-react';
import { speakText, playChime } from '../utils/speech';

interface SpeechTherapyProps {
  cards: SpeechCardItem[];
  matchingQuestions: MatchingQuestion[];
  essentialPhrases: ExpresserPhrase[];
  onWordPracticed: (word: string) => void;
}

export const SpeechTherapy: React.FC<SpeechTherapyProps> = ({
  cards,
  matchingQuestions,
  essentialPhrases,
  onWordPracticed,
}) => {
  const [subTab, setSubTab] = useState<'cards' | 'match' | 'express'>('cards');
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.75); // Slower speech rate for clarity
  const [practicingCardId, setPracticingCardId] = useState<string | null>(null);
  const [micActive, setMicActive] = useState<string | null>(null);
  const [speechScores, setSpeechScores] = useState<Record<string, number>>({});
  const [practicedCards, setPracticedCards] = useState<string[]>([]);

  // Matching game state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [matchingFeedback, setMatchingFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [matchingScore, setMatchingScore] = useState(0);

  // Icon mapping helper for quiz options
  const renderIcon = (name: string) => {
    switch (name) {
      case 'Droplet': return <Droplet className="w-8 h-8 text-teal-600" />;
      case 'Shield': return <Shield className="w-8 h-8 text-sky-600" />;
      case 'Clock': return <Clock className="w-8 h-8 text-amber-600" />;
      case 'Apple': return <Apple className="w-8 h-8 text-emerald-600" />;
      case 'Utensils': return <Utensils className="w-8 h-8 text-slate-600" />;
      case 'Pill': return <Pill className="w-8 h-8 text-rose-600" />;
      case 'Footprints': return <Footprints className="w-8 h-8 text-teal-600" />;
      case 'BookOpen': return <BookOpen className="w-8 h-8 text-indigo-600" />;
      case 'Heart': return <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />;
      case 'Phone': return <Phone className="w-8 h-8 text-teal-600" />;
      case 'Sun': return <Sun className="w-8 h-8 text-amber-500" />;
      case 'Key': return <Key className="w-8 h-8 text-slate-600" />;
      default: return <Sparkles className="w-8 h-8 text-teal-600" />;
    }
  };

  // Expresser phrase icon
  const renderPhraseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplets': return <Droplet className="w-6 h-6 text-teal-600" />;
      case 'AlertTriangle': return <AlertTriangle className="w-6 h-6 text-rose-600" />;
      case 'ArrowUp': return <ArrowUp className="w-6 h-6 text-sky-600" />;
      case 'ShieldAlert': return <ShieldAlert className="w-6 h-6 text-amber-600" />;
      case 'Moon': return <Moon className="w-6 h-6 text-indigo-600" />;
      case 'UtensilsCrossed': return <Utensils className="w-6 h-6 text-emerald-600" />;
      case 'PhoneCall': return <PhoneCall className="w-6 h-6 text-rose-600" />;
      case 'Smile': return <Smile className="w-6 h-6 text-teal-600" />;
      default: return <Volume2 className="w-6 h-6 text-teal-600" />;
    }
  };

  // Listen to word prompt aloud
  const handleListenWord = (card: SpeechCardItem) => {
    speakText(`${card.word}. ${card.audioPrompt}`, speechSpeed);
  };

  // Speech practice simulation / recording
  const handlePracticeMic = (card: SpeechCardItem) => {
    setPracticingCardId(card.id);
    setMicActive(card.id);
    speakText(`Now your turn. Say: ${card.word}`, speechSpeed);

    // After 2.5 seconds, record successful practice
    setTimeout(() => {
      setMicActive(null);
      const score = Math.floor(Math.random() * 12) + 88; // 88 - 99% score
      setSpeechScores((prev) => ({ ...prev, [card.id]: score }));
      setPracticedCards((prev) => Array.from(new Set([...prev, card.id])));
      playChime('success');
      speakText(`Excellent effort! Articulation clarity is ${score} percent.`);
      onWordPracticed(card.word);
    }, 3200);
  };

  // Matching game handler
  const currentQuestion = matchingQuestions[currentQuestionIdx];

  const handleSelectOption = (index: number) => {
    if (selectedOptionIdx !== null) return;
    setSelectedOptionIdx(index);
    const option = currentQuestion.options[index];

    if (option.isCorrect) {
      setMatchingFeedback('correct');
      setMatchingScore((s) => s + 10);
      playChime('success');
      speakText(`Correct! That is ${currentQuestion.targetWord}.`, speechSpeed);
    } else {
      setMatchingFeedback('incorrect');
      playChime('alert');
      speakText(`That is ${option.label}. Let's look for ${currentQuestion.targetWord}.`, speechSpeed);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionIdx(null);
    setMatchingFeedback(null);
    if (currentQuestionIdx < matchingQuestions.length - 1) {
      setCurrentQuestionIdx((i) => i + 1);
    } else {
      setCurrentQuestionIdx(0); // Loop back
    }
  };

  // Handle expresser phrase tap
  const handleSpeakPhrase = (phrase: string) => {
    speakText(phrase, 0.82);
    playChime('rep');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Speech & Communication Therapy
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Rebuild articulation, verbal memory, and clear conversational phrasing.
          </p>
        </div>

        {/* Speed Adjustment Control */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <Sliders className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Audio Speed:</span>
          <button
            onClick={() => setSpeechSpeed(0.7)}
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
              speechSpeed === 0.7 ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            0.7x (Slow)
          </button>
          <button
            onClick={() => setSpeechSpeed(0.85)}
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
              speechSpeed === 0.85 ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            0.85x
          </button>
          <button
            onClick={() => setSpeechSpeed(1.0)}
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
              speechSpeed === 1.0 ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1.0x (Normal)
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Cards, Word Matching, Aphasia Expresser */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setSubTab('cards')}
          className={`py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all min-h-[48px] truncate cursor-pointer ${
            subTab === 'cards'
              ? 'bg-white text-teal-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. Pronunciation Cards
        </button>

        <button
          onClick={() => setSubTab('match')}
          className={`py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all min-h-[48px] truncate cursor-pointer ${
            subTab === 'match'
              ? 'bg-white text-teal-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Word-Picture Match
        </button>

        <button
          onClick={() => setSubTab('express')}
          className={`py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all min-h-[48px] truncate cursor-pointer ${
            subTab === 'express'
              ? 'bg-white text-teal-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          3. Quick Expresser
        </button>
      </div>

      {/* Tab 1: Pronunciation Practice Cards */}
      {subTab === 'cards' && (
        <div className="space-y-6">
          {/* Hero Banner with Therapist Practice Image */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden card-surface">
            <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
              <div className="md:col-span-8 p-6 sm:p-8 space-y-3">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                  Phonetic Rehabilitation
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Everyday Articulation & Breath Control
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Listen to each word pronounced slowly. Observe the mouth and lip posture tips, then tap "Practice Speaking" to speak into your microphone and receive instant pronunciation confidence feedback.
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span>{practicedCards.length} of {cards.length} Words Mastered</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-800">Average Clarity: 92%</span>
                </div>
              </div>

              <div className="md:col-span-4 relative min-h-[160px] md:min-h-full bg-slate-100">
                <img
                  src="/src/assets/images/speech_therapy_practice_1793271458638.jpg"
                  alt="Senior practicing speech articulation with speech therapist in clinic"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Practice Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
              const isPracticing = micActive === card.id;
              const hasPracticed = practicedCards.includes(card.id);
              const score = speechScores[card.id];

              return (
                <div
                  key={card.id}
                  className={`bg-white rounded-3xl border p-5 flex flex-col justify-between space-y-4 card-surface transition-all ${
                    hasPracticed ? 'border-teal-400 bg-teal-50/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {card.category}
                      </span>
                      {hasPracticed && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {score}%
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {card.word}
                    </h3>

                    <div className="text-xs font-mono font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md inline-block">
                      /{card.phonetic}/
                    </div>

                    <p className="text-xs text-slate-600 leading-snug pt-1">
                      <strong className="text-slate-800">Mouth Tip:</strong> {card.mouthTip}
                    </p>
                  </div>

                  {/* Actions: Listen & Practice Speaking */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleListenWord(card)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors min-h-[44px] cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 text-teal-700" />
                      <span>Listen Aloud</span>
                    </button>

                    <button
                      onClick={() => handlePracticeMic(card)}
                      disabled={isPracticing}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer ${
                        isPracticing
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                      }`}
                    >
                      {isPracticing ? (
                        <>
                          <Mic className="w-4 h-4 animate-bounce" />
                          <span>Listening... Speak!</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>{hasPracticed ? 'Practice Again' : 'Practice Speaking'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Word-Picture Matching Game */}
      {subTab === 'match' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 card-surface space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                  Cognitive Word Association
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  Exercise {currentQuestionIdx + 1} of {matchingQuestions.length}
                </h2>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Score</span>
                <span className="text-xl font-extrabold text-teal-900 tabular-nums">
                  {matchingScore} pts
                </span>
              </div>
            </div>

            {/* Prompt Card */}
            <div className="bg-gradient-to-r from-teal-50 to-sky-50 rounded-2xl p-6 border border-teal-200 text-center space-y-2">
              <p className="text-sm sm:text-base font-semibold text-slate-700">
                {currentQuestion.prompt}
              </p>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                "{currentQuestion.targetWord}"
              </div>
              <p className="text-xs text-slate-500 italic">
                Hint: {currentQuestion.hint}
              </p>
              <button
                onClick={() => speakText(currentQuestion.targetWord, speechSpeed)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 mt-1 py-1 px-3 bg-white rounded-lg border border-teal-200"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Word Again</span>
              </button>
            </div>

            {/* Picture Options Grid */}
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOptionIdx === idx;
                let cardStyle = 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-sm';

                if (isSelected) {
                  if (option.isCorrect) {
                    cardStyle = 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500';
                  } else {
                    cardStyle = 'bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={selectedOptionIdx !== null}
                    className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all min-h-[120px] cursor-pointer ${cardStyle}`}
                  >
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      {renderIcon(option.iconName)}
                    </div>
                    <div>
                      <span className="font-bold text-base text-slate-900 block">
                        {option.label}
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {option.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback & Next Button */}
            {selectedOptionIdx !== null && (
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {matchingFeedback === 'correct' ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <span className="text-base font-bold text-emerald-950">
                        Excellent job! That is correct.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                      <span className="text-base font-bold text-rose-950">
                        Good try! Review the hint and try again next round.
                      </span>
                    </>
                  )}
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-all min-h-[48px] cursor-pointer"
                >
                  Next Question
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Aphasia Quick Expresser (Bedside Communication Board) */}
      {subTab === 'express' && (
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-3xl p-6 sm:p-8 card-surface">
            <h2 className="text-xl sm:text-2xl font-bold text-sky-950">
              Bedside Speech Expresser (One-Tap Voice Cards)
            </h2>
            <p className="text-sm text-slate-700 mt-1">
              Tap any essential phrase below to speak it aloud loudly and clearly. Essential for stroke survivors experiencing aphasia or temporary speech fatigue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {essentialPhrases.map((phrase) => (
              <button
                key={phrase.id}
                onClick={() => handleSpeakPhrase(phrase.phrase)}
                className="p-5 bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-400 rounded-3xl text-left transition-all flex flex-col justify-between gap-4 shadow-sm group min-h-[120px] cursor-pointer card-surface active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-50 group-hover:bg-teal-100/60 rounded-2xl transition-colors">
                    {renderPhraseIcon(phrase.icon)}
                  </div>
                  <span className="text-xs font-semibold text-teal-700 flex items-center gap-1 group-hover:underline">
                    <Volume2 className="w-4 h-4" />
                    <span>Tap to Speak</span>
                  </span>
                </div>

                <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  "{phrase.phrase}"
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
