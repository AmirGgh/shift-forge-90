import { GuardsData } from "@/types/guards";

const STORAGE_KEY = "guardsData";
const SETTINGS_KEY = "shiftSettings";

export interface ShiftSettings {
  alertThresholdMinutes: number;
  breakThresholdMinutes: number;
  mealThresholdMinutes: number;
  scores: {
    "פ.ע-21": number;
    "פ.ת-21": number;
    "פ.ע-7": number;
    "פ.ת-7": number;
    "RL": number;
    "defaultPatrol": number;
    "לובי עמידה": number;
  };
}

export const getShiftSettings = (): ShiftSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (data) {
    return JSON.parse(data);
  }
  return {
    alertThresholdMinutes: 60,
    breakThresholdMinutes: 15,
    mealThresholdMinutes: 32,
    scores: {
      "פ.ע-21": 2.5,
      "פ.ת-21": 2,
      "פ.ע-7": 1.7,
      "פ.ת-7": 1.5,
      "RL": 0.4,
      "defaultPatrol": 1,
      "לובי עמידה": 0.8
    }
  };
};

export const saveShiftSettings = (settings: ShiftSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getGuardsData = (): GuardsData => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  return {
    guards: [],
    assignments: [],
    patrols: [],
    meals: [],
    breaks: []
  };
};

export const saveGuardsData = (data: GuardsData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const resetGuardsData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const resetEveningShift = (): void => {
  const data = getGuardsData();
  
  // Keep only guards with "תמך" shift type
  data.guards = data.guards.filter(g => g.shiftType?.includes("תמך"));
  const tamachGuards = data.guards.map(g => g.name);
  
  // Keep only assignments for "תמך" guards
  data.assignments = data.assignments.filter(a => tamachGuards.includes(a.guard));
  data.patrols = data.patrols.filter(p => tamachGuards.includes(p.guard));
  data.meals = data.meals.filter(m => tamachGuards.includes(m.guard));
  data.breaks = data.breaks.filter(b => tamachGuards.includes(b.guard));
  
  saveGuardsData(data);
};
