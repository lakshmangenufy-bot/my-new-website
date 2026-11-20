/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TabType } from '../types';
import { LayoutDashboard, Activity, MessageSquareQuote, Apple, AlertCircle } from 'lucide-react';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenSOS: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenSOS,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto">
        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label="Dashboard Tab"
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
            currentTab === 'dashboard' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium leading-none">Home</span>
        </button>

        <button
          onClick={() => onSelectTab('physio')}
          aria-label="Physiotherapy Tab"
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
            currentTab === 'physio' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium leading-none">Physio</span>
        </button>

        <button
          onClick={() => onSelectTab('speech')}
          aria-label="Speech Therapy Tab"
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
            currentTab === 'speech' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquareQuote className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium leading-none">Speech</span>
        </button>

        <button
          onClick={() => onSelectTab('nutrition')}
          aria-label="Diet & Nutrition Tab"
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
            currentTab === 'nutrition' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Apple className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium leading-none">Diet</span>
        </button>

        <button
          onClick={onOpenSOS}
          aria-label="Emergency SOS Alert"
          className="flex flex-col items-center justify-center min-h-[48px] rounded-lg text-rose-600 hover:text-rose-700 transition-colors font-bold"
        >
          <AlertCircle className="w-5 h-5 mb-0.5 animate-pulse" />
          <span className="text-[11px] font-bold leading-none">SOS</span>
        </button>
      </div>
    </nav>
  );
};
