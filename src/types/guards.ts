export interface Guard {
  name: string;
  certified: boolean;
  color?: string;
}

export interface Assignment {
  guard: string;
  post: string;
  time: string;
}

export interface PatrolAssignment {
  guard: string;
  patrol: string;
  time: string;
}

export interface MealAssignment {
  guard: string;
  time: string;
}

export interface BreakAssignment {
  guard: string;
  time: string;
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
  "סייר 15-23"
];

export const PATROLS = [
  "פ.ת 7:15",
  "פ.ת 11:15",
  "פ.ת 15:15",
  "פ.ת 17:00",
  "פ.ת 21:00",
  "פ.ת 4:00",
  "פ.ע 7:15",
  "פ.ע 11:15",
  "פ.ע 15:15",
  "פ.ע 17:00",
  "פ.ע 21:00",
  "פ.ע 4:00",
  "פ.RL 9:00",
  "פ.RL 13:00",
  "פ.RL 16:30",
  "פ.RL 19:00"
];
