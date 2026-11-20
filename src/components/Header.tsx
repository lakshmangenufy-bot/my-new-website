/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TabType } from '../types';
import { HeartPulse, PhoneCall, Type, Volume2, Contrast } from 'lucide-react';
import { speakText } from '../utils/speech';

interface HeaderProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenSOS: () => void;
  textSize: 'normal' | 'large' | 'xl';
  onChangeTextSize: (size: 'normal' | 'large' | 'xl') => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSOS,
  textSize,
  onChangeTextSize,
  highContrast,
  onToggleHighContrast,
}) => {
  const [showA11yMenu, setShowA11yMenu] = React.useState(false);

  const handleReadPageTitle = () => {
    let message = 'StrokeCare AI. ';
    if (currentTab === 'dashboard') {
      message += 'You are on your recovery dashboard. Review daily exercises, medicines, and mobility progress.';
    } else if (currentTab === 'physio') {
      message += 'You are in the Physiotherapy Guide. Hand, leg, and facial exercises with guided timers.';
    } else if (currentTab === 'speech') {
      message += 'You are in the Speech Therapy Section. Pronunciation practice and quick communication cards.';
    } else if (currentTab === 'nutrition') {
      message += 'You are in the Diet and Nutrition Planner. Low sodium meals and hydration tracking.';
    }
    speakText(message);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-colors">
      {/* Accessibility Quick Ribbon */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-900 hidden sm:inline">Accessibility:</span>
          
          {/* Text Size Controls */}
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
            <span className="text-slate-600 mr-1 flex items-center gap-0.5"><Type className="w-3.5 h-3.5" /> Size:</span>
            <button
              onClick={() => onChangeTextSize('normal')}
              aria-label="Normal text size"
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                textSize === 'normal' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => onChangeTextSize('large')}
              aria-label="Large text size"
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                textSize === 'large' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Large
            </button>
            <button
              onClick={() => onChangeTextSize('xl')}
              aria-label="Extra large text size"
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                textSize === 'xl' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              XL
            </button>
          </div>

          {/* High Contrast Toggle */}
          <button
            onClick={onToggleHighContrast}
            aria-label="Toggle high contrast mode"
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              highContrast
                ? 'bg-slate-900 text-white border-slate-900 font-bold'
                : 'bg-white text-slate-700 border-slate-200 hover:text-slate-900'
            }`}
          >
            <Contrast className="w-3 h-3" />
            <span>High Contrast</span>
          </button>
        </div>

        {/* Read Page Aloud for Vision / Cognitive Assist */}
        <button
          onClick={handleReadPageTitle}
          className="flex items-center gap-1.5 text-teal-800 hover:text-teal-950 font-medium py-0.5 px-2 rounded hover:bg-teal-50 transition-colors"
          title="Listen to page guide"
        >
          <Volume2 className="w-3.5 h-3.5 text-teal-700" />
          <span className="hidden sm:inline">Voice Assistant</span>
        </button>
      </div>

      {/* Main Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav links) - Zone 3 (Primary Action) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title, one line text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </div>
          <button
            onClick={() => onSelectTab('dashboard')}
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap text-left"
          >
            StrokeCare AI
          </button>
        </div>

        {/* Zone 2: 4-5 single-line clean navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-base font-semibold text-slate-600">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`py-2 whitespace-nowrap transition-colors border-b-2 ${
              currentTab === 'dashboard'
                ? 'text-teal-800 border-teal-700'
                : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('physio')}
            className={`py-2 whitespace-nowrap transition-colors border-b-2 ${
              currentTab === 'physio'
                ? 'text-teal-800 border-teal-700'
                : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Physiotherapy Guide
          </button>
          <button
            onClick={() => onSelectTab('speech')}
            className={`py-2 whitespace-nowrap transition-colors border-b-2 ${
              currentTab === 'speech'
                ? 'text-teal-800 border-teal-700'
                : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Speech Therapy
          </button>
          <button
            onClick={() => onSelectTab('nutrition')}
            className={`py-2 whitespace-nowrap transition-colors border-b-2 ${
              currentTab === 'nutrition'
                ? 'text-teal-800 border-teal-700'
                : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Diet & Nutrition
          </button>
        </nav>

        {/* Zone 3: 1 primary action - Emergency SOS Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenSOS}
            aria-label="Open Emergency SOS protocol"
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all min-h-[46px] whitespace-nowrap cursor-pointer"
          >
            <PhoneCall className="w-5 h-5 animate-pulse" />
            <span className="text-sm sm:text-base">Emergency SOS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
