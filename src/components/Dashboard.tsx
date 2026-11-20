/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DailyTask,
  Medication,
  ProgressPoint,
  TabType,
} from '../types';
import {
  CheckCircle2,
  Circle,
  Pill,
  TrendingUp,
  Activity,
  MessageSquare,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Volume2,
} from 'lucide-react';
import { playChime, speakText } from '../utils/speech';

interface DashboardProps {
  tasks: DailyTask[];
  onToggleTask: (taskId: string) => void;
  medications: Medication[];
  onToggleMedication: (medId: string) => void;
  progressHistory: ProgressPoint[];
  onNavigateTab: (tab: TabType) => void;
  onOpenSOS: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  onToggleTask,
  medications,
  onToggleMedication,
  progressHistory,
  onNavigateTab,
  onOpenSOS,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'mobility' | 'speech' | 'all'>('mobility');
  const [showFastGuide, setShowFastGuide] = useState(false);

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedTasksCount / (tasks.length || 1)) * 100);

  const takenMedsCount = medications.filter((m) => m.taken).length;

  const handleTaskClick = (id: string, currentCompleted: boolean, title: string) => {
    onToggleTask(id);
    if (!currentCompleted) {
      playChime('success');
      speakText(`Good job. ${title} completed.`);
    }
  };

  const handleMedClick = (id: string, currentTaken: boolean, name: string) => {
    onToggleMedication(id);
    if (!currentTaken) {
      playChime('success');
      speakText(`${name} marked as taken.`);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Welcome & Daily Recovery Overview */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden card-surface">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
                <span className="bg-teal-50 text-teal-800 px-2.5 py-1 rounded-md border border-teal-200">
                  Stroke Recovery Day 76
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-amber-700 font-bold">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                  12-Day Rehab Streak
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
                Good morning, Arthur. Ready for today's gentle steps?
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Consistency is the key to rebuilding neural pathways. Your right-hand dexterity and speech clarity continue to show steady week-over-week gains.
              </p>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                <div className="text-xs font-medium text-slate-500">Tasks Completed</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {completedTasksCount}/{tasks.length}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                <div className="text-xs font-medium text-slate-500">Meds Taken</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {takenMedsCount}/{medications.length}
                </div>
              </div>

              <div className="bg-teal-50 rounded-2xl p-3 border border-teal-100 text-center">
                <div className="text-xs font-semibold text-teal-800">Mobility Score</div>
                <div className="text-xl sm:text-2xl font-bold text-teal-900 tabular-nums mt-0.5">
                  +36%
                </div>
              </div>
            </div>

            {/* Safety FAST banner trigger */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setShowFastGuide(!showFastGuide)}
                className="text-xs sm:text-sm font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{showFastGuide ? 'Hide FAST Safety Guide' : 'Review FAST Stroke Warning Signs'}</span>
              </button>

              <button
                onClick={() => speakText("You have completed " + completedTasksCount + " out of " + tasks.length + " daily tasks today. Keep up the wonderful progress.")}
                className="text-xs text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1"
                title="Speak daily summary"
              >
                <Volume2 className="w-4 h-4" />
                <span>Audio Summary</span>
              </button>
            </div>
          </div>

          {/* Clinical Visual Asset */}
          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-slate-100">
            <img
              src="/src/assets/images/stroke_recovery_hero_1793271457579.jpg"
              alt="Compassionate occupational therapy hand mobility session with a senior stroke recovery patient"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent lg:hidden flex items-end p-4">
              <span className="text-white text-xs font-semibold">Specialized Care & Rehabilitation</span>
            </div>
          </div>
        </div>

        {/* Collapsible FAST Warning Guide */}
        {showFastGuide && (
          <div className="border-t border-rose-200 bg-rose-50/70 p-5 sm:p-6 transition-all">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-700 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-rose-950">
                  F.A.S.T. Stroke Warning Checklist
                </h3>
              </div>
              <button
                onClick={onOpenSOS}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg shrink-0"
              >
                Call Emergency Now
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs sm:text-sm text-slate-800">
              <div className="bg-white p-3 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800 text-base block">F - Face</span>
                <span>Ask the person to smile. Does one side of their face droop?</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800 text-base block">A - Arms</span>
                <span>Ask them to raise both arms. Does one arm drift downward?</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800 text-base block">S - Speech</span>
                <span>Is their speech slurred or strange when repeating a simple phrase?</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800 text-base block">T - Time</span>
                <span>If you observe ANY sign, call 911 immediately without delay.</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main Grid: Tasks & Medication Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Daily Recovery Tasks */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Daily Recovery Tasks
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                <span>{completedTasksCount} of {tasks.length} tasks completed today</span>
                <span aria-hidden="true"> · </span>
                <span>{progressPercent}% Goal</span>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-24 sm:w-36 bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task.id, task.completed, task.title)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTaskClick(task.id, task.completed, task.title);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 card-surface min-h-[64px] ${
                  task.completed
                    ? 'bg-slate-50/80 border-slate-200 opacity-80'
                    : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as completed'}
                    className={`shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-colors ${
                      task.completed ? 'text-teal-700 bg-teal-50' : 'text-slate-400 hover:text-teal-600'
                    }`}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-7 h-7 fill-teal-100 text-teal-700" />
                    ) : (
                      <Circle className="w-7 h-7" />
                    )}
                  </button>

                  <div className="truncate">
                    <p
                      className={`text-base font-semibold truncate ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.time}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.durationMinutes} min</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                      task.completed
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.completed ? 'Done' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick jump to Physio & Speech modules */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigateTab('physio')}
              className="p-4 bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200 rounded-2xl text-left transition-all flex items-center justify-between group min-h-[56px]"
            >
              <div>
                <span className="text-sm font-bold text-teal-900 block">
                  Interactive Physiotherapy
                </span>
                <span className="text-xs text-teal-700">
                  Hand, leg & facial exercise timers
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-teal-700 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateTab('speech')}
              className="p-4 bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200 rounded-2xl text-left transition-all flex items-center justify-between group min-h-[56px]"
            >
              <div>
                <span className="text-sm font-bold text-sky-900 block">
                  Speech & Pronunciation
                </span>
                <span className="text-xs text-sky-700">
                  Audio cards & everyday communicator
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-sky-700 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        {/* Right Column: Medication Reminders */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Medication Reminders
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                <span>Stroke prevention & BP schedule</span>
              </div>
            </div>

            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
              {takenMedsCount} of {medications.length} Taken
            </span>
          </div>

          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                onClick={() => handleMedClick(med.id, med.taken, med.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMedClick(med.id, med.taken, med.name);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer card-surface min-h-[64px] ${
                  med.taken
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        med.taken ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-base font-bold ${
                            med.taken ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {med.name}
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          {med.dosage}
                        </span>
                      </div>

                      <p className="text-xs text-teal-800 font-medium mt-0.5">
                        {med.purpose}
                      </p>

                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        {med.instructions}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {med.scheduledTime}
                    </span>

                    <button
                      aria-label={`Mark ${med.name} as ${med.taken ? 'untaken' : 'taken'}`}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors min-h-[36px] flex items-center justify-center ${
                        med.taken
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                      }`}
                    >
                      {med.taken ? 'Taken' : 'Take Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clinical Prescription Note */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Neurology Caregiver Note:
            </span>
            <p>
              Never skip blood pressure medications or blood thinners without consulting Dr. Evans. Maintain hydration when taking statins in the evening.
            </p>
          </div>
        </section>
      </div>

      {/* Progress Tracker Section (Mobility & Speech Improvement Graphs) */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 card-surface space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-teal-600" />
              Recovery Progress Tracker
            </h2>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">
              <span>Verified 4-Week Clinical Neuro-Rehab Trends</span>
              <span aria-hidden="true"> · </span>
              <span>Updated after every completed session</span>
            </div>
          </div>

          {/* Metric Selector Segmented Controls (functional buttons with click handlers) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedMetric('mobility')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                selectedMetric === 'mobility'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mobility Score
            </button>
            <button
              onClick={() => setSelectedMetric('speech')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                selectedMetric === 'speech'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Speech Clarity
            </button>
            <button
              onClick={() => setSelectedMetric('all')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                selectedMetric === 'all'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comparison
            </button>
          </div>
        </div>

        {/* Visual Graph: Interactive SVG Bar / Trend Chart */}
        <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200">
          <div className="grid grid-cols-4 gap-4 sm:gap-8 items-end h-56 pt-6 pb-2">
            {progressHistory.map((point, index) => {
              const mobilityHeight = `${point.mobilityScore}%`;
              const speechHeight = `${point.speechClarity}%`;

              return (
                <div key={point.day} className="flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-44">
                    {/* Mobility Bar */}
                    {(selectedMetric === 'mobility' || selectedMetric === 'all') && (
                      <div className="flex-1 max-w-[48px] flex flex-col items-center justify-end h-full">
                        <span className="text-[11px] font-bold text-teal-800 mb-1 tabular-nums">
                          {point.mobilityScore}%
                        </span>
                        <div
                          style={{ height: mobilityHeight }}
                          className="w-full bg-teal-600 rounded-t-lg transition-all duration-700 hover:bg-teal-700 shadow-sm relative"
                          title={`Mobility: ${point.mobilityScore}%`}
                        />
                      </div>
                    )}

                    {/* Speech Clarity Bar */}
                    {(selectedMetric === 'speech' || selectedMetric === 'all') && (
                      <div className="flex-1 max-w-[48px] flex flex-col items-center justify-end h-full">
                        <span className="text-[11px] font-bold text-sky-800 mb-1 tabular-nums">
                          {point.speechClarity}%
                        </span>
                        <div
                          style={{ height: speechHeight }}
                          className="w-full bg-sky-500 rounded-t-lg transition-all duration-700 hover:bg-sky-600 shadow-sm relative"
                          title={`Speech Clarity: ${point.speechClarity}%`}
                        />
                      </div>
                    )}
                  </div>

                  <span className="text-xs sm:text-sm font-bold text-slate-700 mt-3 whitespace-nowrap">
                    {point.day}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {point.tasksCompleted} drills
                  </span>
                </div>
              );
            })}
          </div>

          {/* Graph Legend & Explanation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 text-xs sm:text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-teal-600" />
                <span className="font-semibold text-slate-700">Hand & Leg Mobility Index (Motor Recovery)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-sky-500" />
                <span className="font-semibold text-slate-700">Speech Articulation & Fluency</span>
              </div>
            </div>

            <div className="text-slate-600">
              <span className="font-medium text-emerald-800">
                +36% Hand Mobility & +35% Speech Clarity since Week 1
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Milestone Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 flex items-start gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-teal-950">
                Grip Release Unlocked
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Able to fully extend fingers off table surface with under 3s lag.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200 flex items-start gap-3">
            <div className="p-2.5 bg-sky-600 text-white rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-sky-950">
                Multi-syllable Articulation
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Passed "Comfortable" and "Medicine" with 90%+ listener clarity.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex items-start gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Neuroplasticity Active
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Brain motor pathways continuously strengthen with daily repetition.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
