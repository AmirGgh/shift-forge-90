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
  const currentGuardNames = data.guards.map(g => g.name);
  const tamachGuards = data.guards.filter(g => g.shiftType?.includes("תמך")).map(g => g.name);
  
  // Keep only assignments for guards that are in current list AND are "תמך"
  data.assignments = data.assignments.filter(a => 
    currentGuardNames.includes(a.guard) && tamachGuards.includes(a.guard)
  );
  data.patrols = data.patrols.filter(p => 
    currentGuardNames.includes(p.guard) && tamachGuards.includes(p.guard)
  );
  data.meals = data.meals.filter(m => 
    currentGuardNames.includes(m.guard) && tamachGuards.includes(m.guard)
  );
  data.breaks = data.breaks.filter(b => 
    currentGuardNames.includes(b.guard) && tamachGuards.includes(b.guard)
  );
  
  saveGuardsData(data);
};
