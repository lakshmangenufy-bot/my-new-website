/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MealRecommendation } from '../types';
import {
  Droplets,
  Plus,
  Minus,
  Apple,
  Heart,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Flame,
  Volume2,
} from 'lucide-react';
import { speakText, playChime } from '../utils/speech';

interface DietNutritionPlannerProps {
  meals: MealRecommendation[];
  waterGlasses: number;
  onUpdateWater: (glasses: number) => void;
}

export const DietNutritionPlanner: React.FC<DietNutritionPlannerProps> = ({
  meals,
  waterGlasses,
  onUpdateWater,
}) => {
  const [selectedTexture, setSelectedTexture] = useState<'All' | 'Regular' | 'Soft Chewing' | 'Dysphagia Pureed'>('All');
  const [selectedMealType, setSelectedMealType] = useState<string>('All');
  const [activeMealDetail, setActiveMealDetail] = useState<MealRecommendation | null>(null);

  const TARGET_GLASSES = 8; // 2,000 ml
  const TARGET_SODIUM_MG = 1500; // Clinical AHA target for stroke prevention

  const filteredMeals = meals.filter((meal) => {
    if (selectedTexture !== 'All' && meal.textureType !== selectedTexture) return false;
    if (selectedMealType !== 'All' && meal.mealType !== selectedMealType) return false;
    return true;
  });

  const totalSodiumEstimated = meals.reduce((acc, m) => acc + m.sodiumMg, 0);
  const totalPotassiumEstimated = meals.reduce((acc, m) => acc + m.potassiumMg, 0);

  const handleAddWater = () => {
    if (waterGlasses < 12) {
      const next = waterGlasses + 1;
      onUpdateWater(next);
      playChime('success');
      speakText(`${next} glasses of water logged. Great hydration!`);
    }
  };

  const handleSubtractWater = () => {
    if (waterGlasses > 0) {
      onUpdateWater(waterGlasses - 1);
    }
  };

  const handleResetWater = () => {
    onUpdateWater(0);
  };

  const waterPercent = Math.min(100, Math.round((waterGlasses / TARGET_GLASSES) * 100));

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Diet & Nutrition Planner
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Heart-healthy, low-sodium nutrition and safe hydration tracking for stroke prevention.
          </p>
        </div>

        <button
          onClick={() =>
            speakText(
              `You have drank ${waterGlasses} glasses of water today out of ${TARGET_GLASSES} goal. Remember to keep sodium under 1500 milligrams.`
            )
          }
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 self-start md:self-auto"
        >
          <Volume2 className="w-4 h-4" />
          <span>Audio Nutrition Guide</span>
        </button>
      </div>

      {/* Hero Visual & Clinical Guidance Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden card-surface shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800">
              <span className="bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                AHA & Stroke Guidelines
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-600">DASH Diet Principles</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
              Fueling Neuro-Recovery with Vascular Nutrition
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Post-stroke vascular health requires limiting sodium under 1,500mg daily to prevent secondary hypertension, while maximizing potassium and omega-3 fatty acids to protect cerebral blood flow.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100">
                <span className="text-xs text-teal-800 font-semibold block">Sodium Budget</span>
                <span className="text-lg font-bold text-teal-950 tabular-nums">
                  {totalSodiumEstimated} / {TARGET_SODIUM_MG} mg
                </span>
                <span className="text-[11px] text-teal-700 block mt-0.5">Safe clinical target</span>
              </div>

              <div className="p-3 bg-sky-50/70 rounded-2xl border border-sky-100">
                <span className="text-xs text-sky-800 font-semibold block">Potassium Intake</span>
                <span className="text-lg font-bold text-sky-950 tabular-nums">
                  {totalPotassiumEstimated} mg
                </span>
                <span className="text-[11px] text-sky-700 block mt-0.5">Vessel dilation support</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-slate-100">
            <img
              src="/src/assets/images/healthy_stroke_diet_1793271458059.jpg"
              alt="Mediterranean heart-healthy stroke recovery meal with wild salmon, broccoli, and lemon water"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Hydration Tracker Section */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 card-surface space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-100 text-sky-700 rounded-2xl">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Daily Hydration Tracker
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                <span>Target: 8 glasses (2,000 ml)</span>
                <span aria-hidden="true"> · </span>
                <span>Adequate hydration prevents blood thickening & clot risk</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWater}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
              title="Reset today's water"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Visual Water Glasses Row & Interactive Controls */}
        <div className="bg-sky-50/50 rounded-2xl p-6 border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-2xl font-black text-slate-900 tabular-nums">
              <span>{waterGlasses}</span>
              <span className="text-base font-semibold text-slate-500">/ {TARGET_GLASSES} glasses</span>
              <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md ml-2">
                {waterPercent}% of Daily Target
              </span>
            </div>

            {/* Visual Glass Icons */}
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: TARGET_GLASSES }).map((_, idx) => {
                const isFilled = idx < waterGlasses;
                return (
                  <div
                    key={idx}
                    className={`w-9 h-11 rounded-lg border flex items-center justify-center transition-all ${
                      isFilled
                        ? 'bg-sky-500 border-sky-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-300'
                    }`}
                    title={`Glass ${idx + 1}`}
                  >
                    <Droplets className="w-5 h-5 fill-current" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Increment Buttons (Touch friendly >= 48px) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSubtractWater}
              disabled={waterGlasses === 0}
              className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold transition-all disabled:opacity-40 cursor-pointer"
              aria-label="Subtract one glass of water"
            >
              <Minus className="w-6 h-6" />
            </button>

            <button
              onClick={handleAddWater}
              className="h-14 px-6 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white flex items-center justify-center gap-2 font-bold text-base shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              aria-label="Add one glass of water"
            >
              <Plus className="w-6 h-6" />
              <span>Drink 1 Glass (250 ml)</span>
            </button>
          </div>
        </div>

        {/* Safe swallowing reminder for drinks */}
        <div className="flex items-start gap-2.5 text-xs text-sky-950 bg-sky-100/60 p-4 rounded-xl border border-sky-200">
          <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
          <p>
            <strong>Dysphagia Hydration Safe Practice:</strong> Sit upright at a 90-degree angle when drinking. Take small, single sips. If coughing or throat clearing occurs, use nectar-thickened liquids as advised by your speech-language pathologist.
          </p>
        </div>
      </section>

      {/* Meal Recommendations Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Today's Recommended Meals
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              <span>Cardioprotective nutrition low in saturated fats and sodium</span>
            </div>
          </div>

          {/* Texture Switcher (Safe Swallowing Filter) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setSelectedTexture('All')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedTexture === 'All' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All Textures
            </button>
            <button
              onClick={() => setSelectedTexture('Regular')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedTexture === 'Regular' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Regular
            </button>
            <button
              onClick={() => setSelectedTexture('Soft Chewing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedTexture === 'Soft Chewing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Soft Chewing
            </button>
            <button
              onClick={() => setSelectedTexture('Dysphagia Pureed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedTexture === 'Dysphagia Pureed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Pureed
            </button>
          </div>
        </div>

        {/* Meals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMeals.map((meal) => (
            <div
              key={meal.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 card-surface flex flex-col justify-between space-y-4 hover:border-teal-300 transition-all shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                    {meal.mealType}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Texture: {meal.textureType}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {meal.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {meal.description}
                </p>

                {/* Nutrition Counters */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-teal-800">Sodium: {meal.sodiumMg} mg</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-800">Potassium: {meal.potassiumMg} mg</span>
                  <span aria-hidden="true">·</span>
                  <span>{meal.calories} kcal</span>
                </div>

                {/* Brain Health Benefits */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Stroke Care Benefits:
                  </span>
                  <ul className="space-y-1">
                    {meal.benefits.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Ingredients Details Toggle */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  Recommended Ingredients:
                </span>
                <p className="text-xs text-slate-600">
                  {meal.ingredients.join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
