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
    patrols: []
  };
};

export const saveGuardsData = (data: GuardsData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const resetGuardsData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
