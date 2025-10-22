export interface Guard {
  name: string;
  certified: boolean;
  color?: string;
  shiftType?: string;
}

export interface Assignment {
  id: string;
  guard: string;
  post: string;
  time: string;
  actualTime?: string;
}

export interface PatrolAssignment {
  id: string;
  guard: string;
  patrol: string;
  time: string;
  actualTime?: string;
}

export interface MealAssignment {
  id: string;
  guard: string;
  time: string;
  actualTime?: string;
}

export interface BreakAssignment {
  id: string;
  guard: string;
  time: string;
  actualTime?: string;
}

export interface GuardsData {
  guards: Guard[];
  assignments: Assignment[];
  patrols: PatrolAssignment[];
  meals: MealAssignment[];
  breaks: BreakAssignment[];
}

export const POSTS = [
  "לובי עמידה",
  "לובי דסק",
  "דסק 15",
  "סייר 4-7",
  "סייר 4-5",
  "סייר 6-7",
  "סייר 15-19",
  "סייר2 15-19",
  "סייר 20-23",
  "סייר 15-23",
  "אירוע 1",
  "אירוע 2",
  "אירוע 3"
];

export const PATROLS = [
  "פ.ע-7",
  "פ.ת-7",
  "RL-9",
  "פ.ע-11",
  "פ.ת-11",
  "RL-13",
  "פ.ע-15",
  "פ.ת-15",
  "RL-16:30",
  "פ.ת-17",
  "פ.ע-17",
  "RL-19:30",
  "פ.ת-21",
  "פ.ע-21",
  "פ. שרונה"
];
