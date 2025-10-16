import { GuardsData } from "@/types/guards";

const STORAGE_KEY = "guardsData";

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
