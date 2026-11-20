/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabType = 'dashboard' | 'physio' | 'speech' | 'nutrition';

export interface DailyTask {
  id: string;
  title: string;
  category: 'physio' | 'speech' | 'medication' | 'nutrition' | 'wellness';
  time: string;
  completed: boolean;
  durationMinutes: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  purpose: string;
  scheduledTime: string;
  taken: boolean;
  instructions: string;
}

export interface ProgressPoint {
  day: string;
  mobilityScore: number; // 0 - 100
  speechClarity: number; // 0 - 100
  tasksCompleted: number; // count
}

export type ExerciseCategory = 'hand' | 'leg' | 'facial';

export interface ExerciseModule {
  id: string;
  category: ExerciseCategory;
  title: string;
  subtitle: string;
  difficulty: 'Gentle' | 'Moderate' | 'Progressive';
  targetArea: string;
  repsDefault: number;
  holdSeconds: number;
  clinicalPurpose: string;
  steps: string[];
  tips: string[];
  precaution: string;
}

export interface SpeechCardItem {
  id: string;
  word: string;
  phonetic: string;
  category: 'Everyday' | 'Family & Care' | 'Food & Water' | 'Feelings';
  mouthTip: string;
  audioPrompt: string;
  level: 'Basic' | 'Intermediate';
}

export interface MatchingQuestion {
  id: string;
  prompt: string;
  targetWord: string;
  options: {
    label: string;
    description: string;
    iconName: string;
    isCorrect: boolean;
  }[];
  hint: string;
}

export interface ExpresserPhrase {
  id: string;
  phrase: string;
  category: 'urgent' | 'comfort' | 'basic';
  icon: string;
}

export interface MealRecommendation {
  id: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  title: string;
  description: string;
  sodiumMg: number;
  potassiumMg: number;
  calories: number;
  benefits: string[];
  ingredients: string[];
  textureType: 'Regular' | 'Soft Chewing' | 'Dysphagia Pureed';
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface MedicalProfile {
  fullName: string;
  strokeEventDate: string;
  bloodType: string;
  affectedSide: 'Left Side' | 'Right Side' | 'Bilateral';
  allergies: string;
  primaryHospital: string;
  emergencyNotes: string;
}
