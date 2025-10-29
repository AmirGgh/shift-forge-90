import { useState, useEffect, useRef, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getGuardsData, saveGuardsData, getShiftSettings } from "@/utils/storage";
import { Assignment, PatrolAssignment, MealAssignment, BreakAssignment, POSTS, PATROLS } from "@/types/guards";
import { Clock, MapPin, ChevronDown, UtensilsCrossed, Coffee, CheckCircle2, AlertTriangle, History, PersonStanding, Moon, Sun, Edit } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ScheduleAssignment {
  id: string;
  guard: string;
  post: string;
  hour: string;
  time: string;
  actualTime?: string;
}

interface ShiftManagementProps {}

const ShiftManagement = ({}: ShiftManagementProps) => {
  const data = getGuardsData();
  
  // Get guard color from stored data
  const getGuardColor = (guardName: string) => {
    const guard = data.guards.find(g => g.name === guardName);
    return guard?.color || "hsl(var(--primary))";
  };

  // Check if guard is Tamach
  const isGuardTamach = (guardName: string) => {
    const guard = data.guards.find(g => g.name === guardName);
    return guard?.shiftType?.includes("תמך") || false;
  };

  // Get score for a task
  const getTaskScore = (taskName: string): number => {
    const settings = getShiftSettings();
    const scores = settings.scores;
    
    // Specific patrols scoring
    if (taskName === "פ.ע-21") return scores["פ.ע-21"];
    if (taskName === "פ.ת-21") return scores["פ.ת-21"];
    if (taskName === "פ.ע-7") return scores["פ.ע-7"];
    if (taskName === "פ.ת-7") return scores["פ.ת-7"];
    if (taskName === "פ. שרונה") return scores["פ. שרונה"];
    if (taskName.includes("RL")) return scores["RL"];
    // Check if it's a patrol (from PATROLS list)
    if (PATROLS.includes(taskName)) return scores["defaultPatrol"];
    
    // Posts scoring
    if (taskName === "לובי עמידה") return scores["לובי עמידה"];
    
    // Default for other tasks
    return 0;
  };

  // Calculate total score for a guard
  const getGuardScore = (guardName: string): number => {
    let score = 0;
    
    // Add scores from completed assignments
    assignments
      .filter(a => a.guard === guardName && a.actualTime)
      .forEach(a => {
        score += getTaskScore(a.post);
      });
    
    // Add scores from completed patrols
    patrols
      .filter(p => p.guard === guardName && p.actualTime)
      .forEach(p => {
        score += getTaskScore(p.patrol);
      });
    
    return score;
  };

  // Get alerts for guards staying too long in posts, breaks, or meals
  const getAlerts = () => {
    const settings = getShiftSettings();
    const now = new Date();
    const alerts: Array<{ guard: string; post: string; duration: number }> = [];
    
    // Get the latest active task for each guard (filtered by time range)
    const guardLatestTasks = new Map<string, { post: string; actualTime: string; thresholdMinutes: number }>();

    // Collect all tasks with actualTime that match the current time filter
    assignments.forEach(assignment => {
      if (!assignment.actualTime || !isInTimeRange(assignment.actualTime)) return;
      const time = new Date(assignment.actualTime).getTime();
      const current = guardLatestTasks.get(assignment.guard);
      if (!current || new Date(current.actualTime).getTime() < time) {
        guardLatestTasks.set(assignment.guard, {
          post: `עמדה: ${assignment.post}`,
          actualTime: assignment.actualTime,
          thresholdMinutes: settings.alertThresholdMinutes
        });
      }
    });

    patrols.forEach(patrol => {
      if (!patrol.actualTime || !isInTimeRange(patrol.actualTime)) return;
      const time = new Date(patrol.actualTime).getTime();
      const current = guardLatestTasks.get(patrol.guard);
      if (!current || new Date(current.actualTime).getTime() < time) {
        guardLatestTasks.set(patrol.guard, {
          post: `פטרול: ${patrol.patrol}`,
          actualTime: patrol.actualTime,
          thresholdMinutes: settings.alertThresholdMinutes
        });
      }
    });
    
    breaks.forEach(breakAssignment => {
      if (!breakAssignment.actualTime || !isInTimeRange(breakAssignment.actualTime)) return;
      const time = new Date(breakAssignment.actualTime).getTime();
      const current = guardLatestTasks.get(breakAssignment.guard);
      if (!current || new Date(current.actualTime).getTime() < time) {
        guardLatestTasks.set(breakAssignment.guard, {
          post: "הפסקה",
          actualTime: breakAssignment.actualTime,
          thresholdMinutes: settings.breakThresholdMinutes
        });
      }
    });
    
    meals.forEach(meal => {
      if (!meal.actualTime || !isInTimeRange(meal.actualTime)) return;
      const time = new Date(meal.actualTime).getTime();
      const current = guardLatestTasks.get(meal.guard);
      if (!current || new Date(current.actualTime).getTime() < time) {
        guardLatestTasks.set(meal.guard, {
          post: "אוכל",
          actualTime: meal.actualTime,
          thresholdMinutes: settings.mealThresholdMinutes
        });
      }
    });

    // Check only the latest task for each guard
    guardLatestTasks.forEach((task, guard) => {
      const taskTime = new Date(task.actualTime);
      const durationMinutes = (now.getTime() - taskTime.getTime()) / (1000 * 60);
      
      if (durationMinutes >= task.thresholdMinutes) {
        alerts.push({
          guard: guard,
          post: task.post,
          duration: Math.floor(durationMinutes)
        });
      }
    });
    
    return alerts;
  };
  const [availableGuards, setAvailableGuards] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [patrols, setPatrols] = useState<PatrolAssignment[]>([]);
  const [meals, setMeals] = useState<MealAssignment[]>([]);
  const [breaks, setBreaks] = useState<BreakAssignment[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<ScheduleAssignment[]>([]);
  const [draggedGuard, setDraggedGuard] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{
    guard: string;
    target: string;
    type: "post" | "patrol" | "meal" | "break" | "schedule";
    hour?: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    guard: string;
    target: string;
    type: "post" | "patrol" | "meal" | "break" | "schedule";
  } | null>(null);
  const [editTimeTarget, setEditTimeTarget] = useState<{
    id: string;
    guard: string;
    type: "post" | "patrol" | "meal" | "break" | "schedule";
    currentTime: string;
  } | null>(null);
  const [editTimeValue, setEditTimeValue] = useState("");
  const [openSections, setOpenSections] = useState({
    guards: true,
    tasks: true,
    schedule: true,
    history: true,
    alerts: true,
  });
  const [mainView, setMainView] = useState<"posts" | "patrols" | "meals-breaks" | "history" | "alerts">("posts");
  const [tasksView, setTasksView] = useState<"posts" | "patrols" | "meals" | "breaks">("posts");
  const [alertsKey, setAlertsKey] = useState(0); // Force re-render for alerts
  const [scheduleView, setScheduleView] = useState<"morning" | "evening">("morning");
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Update alerts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAlertsKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const data = getGuardsData();
    setAvailableGuards(data.guards.map(g => g.name));
    setAssignments(data.assignments);
    setPatrols(data.patrols);
    setMeals(data.meals || []);
    setBreaks(data.breaks || []);
    setScheduleAssignments((data as any).scheduleAssignments || []);
  };

  const handleDragStart = (e: React.DragEvent, guard: string) => {
    try {
      e.dataTransfer.setData("text/plain", guard);
      e.dataTransfer.effectAllowed = "move";
    } catch {}
    setDraggedGuard(guard);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropPost = (post: string) => {
    if (!draggedGuard) return;
    setPendingAssignment({
      guard: draggedGuard,
      target: post,
      type: "post"
    });
    setDraggedGuard(null);
  };

  const handleDropPatrol = (patrol: string) => {
    if (!draggedGuard) return;
    setPendingAssignment({
      guard: draggedGuard,
      target: patrol,
      type: "patrol"
    });
    setDraggedGuard(null);
  };

  const handleDropMeal = () => {
    if (!draggedGuard) return;
    setPendingAssignment({
      guard: draggedGuard,
      target: "אוכל",
      type: "meal"
    });
    setDraggedGuard(null);
  };

  const handleDropBreak = () => {
    if (!draggedGuard) return;
    setPendingAssignment({
      guard: draggedGuard,
      target: "הפסקה",
      type: "break"
    });
    setDraggedGuard(null);
  };

  const handleDropSchedule = (post: string, hour: string) => {
    if (!draggedGuard) return;
    
    // Check if already 4 guards in this cell
    const currentGuards = scheduleAssignments.filter(
      a => a.post === post && a.hour === hour
    );
    
    if (currentGuards.length >= 4) {
      toast.error("לא ניתן להוסיף יותר מ-4 מאבטחים למשבצת");
      setDraggedGuard(null);
      return;
    }
    
    setPendingAssignment({
      guard: draggedGuard,
      target: post,
      type: "schedule",
      hour: hour
    });
    setDraggedGuard(null);
  };

  const handleLongPressStart = (id: string, guard: string, type: "post" | "patrol" | "meal" | "break" | "schedule") => {
    longPressTimer.current = setTimeout(() => {
      setDeleteTarget({ guard, target: id, type });
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDeleteAssignment = () => {
    if (!deleteTarget) return;

    const data = getGuardsData();

    if (deleteTarget.type === "post") {
      const newAssignments = assignments.filter(
        a => a.id !== deleteTarget.target
      );
      setAssignments(newAssignments);
      data.assignments = newAssignments;
      toast.success(`${deleteTarget.guard} הוסר`);
    } else if (deleteTarget.type === "patrol") {
      const newPatrols = patrols.filter(
        p => p.id !== deleteTarget.target
      );
      setPatrols(newPatrols);
      data.patrols = newPatrols;
      toast.success(`${deleteTarget.guard} הוסר`);
    } else if (deleteTarget.type === "meal") {
      const newMeals = meals.filter(m => m.id !== deleteTarget.target);
      setMeals(newMeals);
      data.meals = newMeals;
      toast.success(`${deleteTarget.guard} הוסר מאוכל`);
    } else if (deleteTarget.type === "break") {
      const newBreaks = breaks.filter(b => b.id !== deleteTarget.target);
      setBreaks(newBreaks);
      data.breaks = newBreaks;
      toast.success(`${deleteTarget.guard} הוסר מהפסקה`);
    } else if (deleteTarget.type === "schedule") {
      const newSchedule = scheduleAssignments.filter(s => s.id !== deleteTarget.target);
      setScheduleAssignments(newSchedule);
      (data as any).scheduleAssignments = newSchedule;
      toast.success(`${deleteTarget.guard} הוסר מהלוח זמנים`);
    }

    saveGuardsData(data);
    setDeleteTarget(null);
  };

  const handleEditTime = () => {
    if (!editTimeTarget) return;
    
    // Get current item to extract date
    let currentItem: any = null;
    if (editTimeTarget.type === "post") {
      currentItem = assignments.find(a => a.id === editTimeTarget.id);
    } else if (editTimeTarget.type === "patrol") {
      currentItem = patrols.find(p => p.id === editTimeTarget.id);
    } else if (editTimeTarget.type === "meal") {
      currentItem = meals.find(m => m.id === editTimeTarget.id);
    } else if (editTimeTarget.type === "break") {
      currentItem = breaks.find(b => b.id === editTimeTarget.id);
    } else if (editTimeTarget.type === "schedule") {
      currentItem = scheduleAssignments.find(s => s.id === editTimeTarget.id);
    }

    if (!currentItem || !currentItem.actualTime) {
      toast.error("לא ניתן לערוך שעה - המשימה אינה פעילה");
      setEditTimeTarget(null);
      return;
    }

    // Parse the time input (HH:MM format)
    const timeMatch = editTimeValue.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      toast.error("פורמט שעה לא תקין. השתמש בפורמט HH:MM");
      return;
    }

    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      toast.error("שעה לא תקינה");
      return;
    }

    // Create new date with the same date but updated time
    const currentDate = new Date(currentItem.actualTime);
    const newDate = new Date(currentDate);
    newDate.setHours(hours, minutes, 0, 0);

    const data = getGuardsData();

    if (editTimeTarget.type === "post") {
      const updatedAssignments = assignments.map(a =>
        a.id === editTimeTarget.id
          ? { ...a, actualTime: newDate.toISOString() }
          : a
      );
      setAssignments(updatedAssignments);
      data.assignments = updatedAssignments;
    } else if (editTimeTarget.type === "patrol") {
      const updatedPatrols = patrols.map(p =>
        p.id === editTimeTarget.id
          ? { ...p, actualTime: newDate.toISOString() }
          : p
      );
      setPatrols(updatedPatrols);
      data.patrols = updatedPatrols;
    } else if (editTimeTarget.type === "meal") {
      const updatedMeals = meals.map(m =>
        m.id === editTimeTarget.id
          ? { ...m, actualTime: newDate.toISOString() }
          : m
      );
      setMeals(updatedMeals);
      data.meals = updatedMeals;
    } else if (editTimeTarget.type === "break") {
      const updatedBreaks = breaks.map(b =>
        b.id === editTimeTarget.id
          ? { ...b, actualTime: newDate.toISOString() }
          : b
      );
      setBreaks(updatedBreaks);
      data.breaks = updatedBreaks;
    } else if (editTimeTarget.type === "schedule") {
      const updatedSchedule = scheduleAssignments.map(s =>
        s.id === editTimeTarget.id
          ? { ...s, actualTime: newDate.toISOString() }
          : s
      );
      setScheduleAssignments(updatedSchedule);
      (data as any).scheduleAssignments = updatedSchedule;
    }

    saveGuardsData(data);
    toast.success(`השעה עודכנה ל-${editTimeValue}`);
    setEditTimeTarget(null);
    setEditTimeValue("");
  };

  const handleOpenEditTime = () => {
    if (!deleteTarget) return;
    
    // Get current actualTime
    let currentTime = "";
    if (deleteTarget.type === "post") {
      const item = assignments.find(a => a.id === deleteTarget.target);
      currentTime = item?.actualTime || "";
    } else if (deleteTarget.type === "patrol") {
      const item = patrols.find(p => p.id === deleteTarget.target);
      currentTime = item?.actualTime || "";
    } else if (deleteTarget.type === "meal") {
      const item = meals.find(m => m.id === deleteTarget.target);
      currentTime = item?.actualTime || "";
    } else if (deleteTarget.type === "break") {
      const item = breaks.find(b => b.id === deleteTarget.target);
      currentTime = item?.actualTime || "";
    } else if (deleteTarget.type === "schedule") {
      const item = scheduleAssignments.find(s => s.id === deleteTarget.target);
      currentTime = item?.actualTime || "";
    }

    if (!currentTime) {
      toast.error("לא ניתן לערוך שעה - המשימה אינה פעילה");
      setDeleteTarget(null);
      return;
    }

    // Format current time to HH:MM
    const date = new Date(currentTime);
    const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    setEditTimeTarget({
      id: deleteTarget.target,
      guard: deleteTarget.guard,
      type: deleteTarget.type,
      currentTime: currentTime
    });
    setEditTimeValue(formattedTime);
    setDeleteTarget(null);
  };

  const handleConfirmAssignment = () => {
    if (!pendingAssignment) return;

    const data = getGuardsData();

    if (pendingAssignment.type === "post") {
      const newAssignment: Assignment = {
        id: `${Date.now()}-${Math.random()}`,
        guard: pendingAssignment.guard,
        post: pendingAssignment.target,
        time: new Date().toISOString()
      };
      const newAssignments = [...assignments, newAssignment];
      setAssignments(newAssignments);
      data.assignments = newAssignments;
      toast.success(`${pendingAssignment.guard} הוצב ב${pendingAssignment.target}`);
    } else if (pendingAssignment.type === "patrol") {
      const newPatrol: PatrolAssignment = {
        id: `${Date.now()}-${Math.random()}`,
        guard: pendingAssignment.guard,
        patrol: pendingAssignment.target,
        time: new Date().toISOString()
      };
      const newPatrols = [...patrols, newPatrol];
      setPatrols(newPatrols);
      data.patrols = newPatrols;
      toast.success(`${pendingAssignment.guard} הוצב ב${pendingAssignment.target}`);
    } else if (pendingAssignment.type === "meal") {
      const newMeal: MealAssignment = {
        id: `${Date.now()}-${Math.random()}`,
        guard: pendingAssignment.guard,
        time: new Date().toISOString()
      };
      const newMeals = [...meals, newMeal];
      setMeals(newMeals);
      data.meals = newMeals;
      toast.success(`${pendingAssignment.guard} הוצב באוכל`);
    } else if (pendingAssignment.type === "break") {
      const newBreak: BreakAssignment = {
        id: `${Date.now()}-${Math.random()}`,
        guard: pendingAssignment.guard,
        time: new Date().toISOString()
      };
      const newBreaks = [...breaks, newBreak];
      setBreaks(newBreaks);
      data.breaks = newBreaks;
      toast.success(`${pendingAssignment.guard} הוצב בהפסקה`);
    } else if (pendingAssignment.type === "schedule" && pendingAssignment.hour) {
      const newSchedule: ScheduleAssignment = {
        id: `${Date.now()}-${Math.random()}`,
        guard: pendingAssignment.guard,
        post: pendingAssignment.target,
        hour: pendingAssignment.hour,
        time: new Date().toISOString()
      };
      const newScheduleAssignments = [...scheduleAssignments, newSchedule];
      setScheduleAssignments(newScheduleAssignments);
      (data as any).scheduleAssignments = newScheduleAssignments;
      toast.success(`${pendingAssignment.guard} הוצב ב${pendingAssignment.target} בשעה ${pendingAssignment.hour}`);
    }

    saveGuardsData(data);
    setPendingAssignment(null);
  };


  const getAssignmentsForPost = (post: string) => {
    return assignments.filter(a => a.post === post);
  };

  const getAssignmentsForPatrol = (patrol: string) => {
    return patrols.filter(p => p.patrol === patrol);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Check if this is the latest task for a guard (to mark previous tasks with strikethrough)
  const isLatestTask = (guardName: string, taskId: string, type: "post" | "patrol" | "meal" | "break" | "schedule"): boolean => {
    // Collect all tasks with actualTime for this guard
    const guardTasks: Array<{ id: string; actualTime: string; type: string }> = [];

    assignments
      .filter(a => a.guard === guardName && a.actualTime)
      .forEach(a => guardTasks.push({ id: a.id, actualTime: a.actualTime, type: "post" }));

    patrols
      .filter(p => p.guard === guardName && p.actualTime)
      .forEach(p => guardTasks.push({ id: p.id, actualTime: p.actualTime, type: "patrol" }));

    meals
      .filter(m => m.guard === guardName && m.actualTime)
      .forEach(m => guardTasks.push({ id: m.id, actualTime: m.actualTime, type: "meal" }));

    breaks
      .filter(b => b.guard === guardName && b.actualTime)
      .forEach(b => guardTasks.push({ id: b.id, actualTime: b.actualTime, type: "break" }));

    scheduleAssignments
      .filter(s => s.guard === guardName && s.actualTime)
      .forEach(s => guardTasks.push({ id: s.id, actualTime: s.actualTime, type: "schedule" }));

    // Sort by actualTime to find the latest
    guardTasks.sort((a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime());

    // Check if this task is the latest one
    return guardTasks.length > 0 && guardTasks[0].id === taskId;
  };

  const handleSetActualTime = (id: string, type: "post" | "patrol" | "meal" | "break" | "schedule") => {
    const data = getGuardsData();
    const now = new Date().toISOString();

    if (type === "post") {
      const currentAssignment = assignments.find(a => a.id === id);
      const isRemoving = !!currentAssignment?.actualTime;
      
      const updatedAssignments = assignments.map(a =>
        a.id === id
          ? { ...a, actualTime: isRemoving ? undefined : now }
          : a
      );
      setAssignments(updatedAssignments);
      data.assignments = updatedAssignments;
      toast.success(isRemoving ? `זמן ביצוע בוטל` : `זמן ביצוע נרשם`);
    } else if (type === "patrol") {
      const currentPatrol = patrols.find(p => p.id === id);
      const isRemoving = !!currentPatrol?.actualTime;
      
      const updatedPatrols = patrols.map(p =>
        p.id === id
          ? { ...p, actualTime: isRemoving ? undefined : now }
          : p
      );
      setPatrols(updatedPatrols);
      data.patrols = updatedPatrols;
      toast.success(isRemoving ? `זמן ביצוע בוטל` : `זמן ביצוע נרשם`);
    } else if (type === "meal") {
      const currentMeal = meals.find(m => m.id === id);
      const isRemoving = !!currentMeal?.actualTime;
      
      const updatedMeals = meals.map(m =>
        m.id === id
          ? { ...m, actualTime: isRemoving ? undefined : now }
          : m
      );
      setMeals(updatedMeals);
      data.meals = updatedMeals;
      toast.success(isRemoving ? `זמן ביצוע בוטל` : `זמן ביצוע נרשם`);
    } else if (type === "break") {
      const currentBreak = breaks.find(b => b.id === id);
      const isRemoving = !!currentBreak?.actualTime;
      
      const updatedBreaks = breaks.map(b =>
        b.id === id
          ? { ...b, actualTime: isRemoving ? undefined : now }
          : b
      );
      setBreaks(updatedBreaks);
      data.breaks = updatedBreaks;
      toast.success(isRemoving ? `זמן ביצוע בוטל` : `זמן ביצוע נרשם`);
    } else if (type === "schedule") {
      const currentSchedule = scheduleAssignments.find(s => s.id === id);
      const isRemoving = !!currentSchedule?.actualTime;
      
      const updatedSchedule = scheduleAssignments.map(s =>
        s.id === id
          ? { ...s, actualTime: isRemoving ? undefined : now }
          : s
      );
      setScheduleAssignments(updatedSchedule);
      (data as any).scheduleAssignments = updatedSchedule;
      toast.success(isRemoving ? `זמן ביצוע בוטל` : `זמן ביצוע נרשם`);
    }

    saveGuardsData(data);
  };

  const getScheduleAssignments = (post: string, hour: string) => {
    return scheduleAssignments.filter(s => s.post === post && s.hour === hour);
  };

  // Filter items by time of day
  const isInTimeRange = (actualTime: string | undefined) => {
    if (!actualTime) return false;
    const time = new Date(actualTime);
    const hour = time.getHours();
    
    if (scheduleView === "morning") {
      // Morning: 7:00 - 14:44
      return hour >= 7 && hour < 15;
    } else {
      // Evening: 14:45 - 19:59
      return hour >= 14 && hour < 20;
    }
  };

  // Generate hours array (7:45 to 19:45)
  const ALL_HOURS = Array.from({ length: 13 }, (_, i) => {
    const hour = 7 + i;
    return `${hour}:45`;
  });

  // Filter hours based on view
  const HOURS = scheduleView === "morning" 
    ? ALL_HOURS.slice(0, 8)  // 7:45 to 14:45
    : ALL_HOURS.slice(7, 13); // 14:45 to 19:45

  // Get current hour to highlight
  const getCurrentHourIndex = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Find the last passed hour in ALL_HOURS
    for (let i = ALL_HOURS.length - 1; i >= 0; i--) {
      const [hourStr] = ALL_HOURS[i].split(':');
      const hour = parseInt(hourStr);
      
      if (currentHour > hour || (currentHour === hour && currentMinutes >= 45)) {
        // Return the index relative to the filtered HOURS array
        const indexInFiltered = HOURS.indexOf(ALL_HOURS[i]);
        return indexInFiltered;
      }
    }
    return -1; // No hour has passed yet
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4 md:p-8" dir="rtl">
      <div className="max-w-full mx-auto space-y-6">

        {/* Main Navigation */}
        <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="p-6">
            <div className="flex gap-2 items-center justify-center mb-6">
              <Button
                variant={mainView === "posts" ? "default" : "outline"}
                onClick={() => setMainView("posts")}
                className="h-10 w-10 p-0"
                size="icon"
              >
                <MapPin className="w-5 h-5" />
              </Button>
              <Button
                variant={mainView === "patrols" ? "default" : "outline"}
                onClick={() => setMainView("patrols")}
                className="h-10 w-10 p-0"
                size="icon"
              >
                <PersonStanding className="w-5 h-5" />
              </Button>
              <Button
                variant={mainView === "meals-breaks" ? "default" : "outline"}
                onClick={() => setMainView("meals-breaks")}
                className="h-10 w-10 p-0"
                size="icon"
              >
                <UtensilsCrossed className="w-5 h-5" />
              </Button>
              <Button
                variant={mainView === "history" ? "default" : "outline"}
                onClick={() => setMainView("history")}
                className="h-10 w-10 p-0"
                size="icon"
              >
                <History className="w-5 h-5" />
              </Button>
              <Button
                variant={mainView === "alerts" ? "default" : "outline"}
                onClick={() => setMainView("alerts")}
                className="h-10 w-10 p-0 relative"
                size="icon"
              >
                <AlertTriangle className="w-5 h-5" />
                {getAlerts().length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                    {getAlerts().length}
                  </span>
                )}
              </Button>
              
              {/* Time filter - only show when not in patrols view */}
              {mainView !== "patrols" && (
                <div className="mr-2">
                  <ToggleGroup 
                    type="single" 
                    value={scheduleView} 
                    onValueChange={(value) => value && setScheduleView(value as "morning" | "evening")}
                    className="border border-border rounded"
                  >
                    <ToggleGroupItem value="morning" className="px-3 py-1 h-auto">
                      <Sun className="w-4 h-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="evening" className="px-3 py-1 h-auto">
                      <Moon className="w-4 h-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>

            {/* Guards Bank - Always visible */}
            <div className="mb-6 pb-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground mb-3">מאבטחים במשמרת</h3>
              <div className="flex flex-wrap gap-2">
                {data.guards.map((guard) => {
                  const isTamach = guard.shiftType?.includes("תמך");
                  const SHIFT_TYPES = ["בוקר 6-14", "בוקר 7-15", "תמך 7-19", "תמך 8-20", "ערב 14-22", "ערב 15-23"];
                  const isInShiftList = SHIFT_TYPES.includes(guard.shiftType || "");
                  const isCustomShift = !isInShiftList;
                  
                  return (
                    <div
                      key={guard.name}
                      draggable
                      onDragStart={(e) => handleDragStart(e, guard.name)}
                      onDragEnd={() => setDraggedGuard(null)}
                      data-effect-allowed="move"
                      style={{ 
                        backgroundColor: isTamach ? guard.color : `${guard.color}20`,
                        borderColor: guard.color,
                        borderStyle: isCustomShift ? 'dashed' : 'solid',
                        color: isTamach ? '#FFFFFF' : guard.color
                      }}
                      className="px-4 py-2 border-2 rounded-lg cursor-move hover:opacity-80 transition-opacity font-medium touch-none"
                    >
                      {guard.name}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Posts Table */}
            {mainView === "posts" && (
                        <div className="space-y-4">
                          {/* Schedule Table */}
                          <Card className="p-6 border-border/30 bg-background/30">
                            <div className="overflow-x-auto">
                              <Table className="border-2 border-border">
                                <TableHeader>
                                  <TableRow className="border-b-2 border-border">
                                    <TableHead className="text-right font-semibold min-w-[80px] border-l-2 border-border">שעה</TableHead>
                                    {POSTS.map((post) => (
                                      <TableHead key={post} className="text-right font-semibold min-w-[120px] border-l-2 border-border">
                                        {post}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {HOURS.map((hour, index) => {
                                    const isCurrentHour = index === getCurrentHourIndex();
                                    return (
                                      <TableRow 
                                        key={hour}
                                        className={`border-b-2 border-border ${isCurrentHour ? "bg-primary/20 hover:bg-primary/30" : ""}`}
                                      >
                                        <TableCell className="font-medium border-l-2 border-border">
                                          {hour}
                                        </TableCell>
                                        {POSTS.map((post) => {
                                          const cellAssignments = getScheduleAssignments(post, hour);
                                          return (
                                            <TableCell 
                                              key={post} 
                                              className="p-2 border-l-2 border-border"
                                              onDragOver={handleDragOver}
                                              onDrop={(e) => {
                                                e.preventDefault();
                                                handleDropSchedule(post, hour);
                                              }}
                                            >
                                              <div className="min-h-[60px] h-[60px] flex flex-wrap gap-1 content-start overflow-hidden">
                                                {cellAssignments.map((assignment) => (
                                                  <div
                                                    key={assignment.id}
                                                    onMouseDown={() => handleLongPressStart(assignment.id, assignment.guard, "schedule")}
                                                    onMouseUp={handleLongPressEnd}
                                                    onMouseLeave={handleLongPressEnd}
                                                    onTouchStart={() => handleLongPressStart(assignment.id, assignment.guard, "schedule")}
                                                    onTouchEnd={handleLongPressEnd}
                                                    onClick={() => handleSetActualTime(assignment.id, "schedule")}
                                                    style={{
                                                      backgroundColor: getGuardColor(assignment.guard),
                                                      borderColor: getGuardColor(assignment.guard)
                                                    }}
                                                    className={`px-2 py-0.5 text-xs rounded border cursor-pointer hover:opacity-80 transition-opacity text-white font-medium ${
                                                      assignment.actualTime && !isLatestTask(assignment.guard, assignment.id, "schedule")
                                                        ? "line-through opacity-50"
                                                        : ""
                                                    }`}
                                                  >
                                                    <span className="flex items-center gap-1">
                                                      {assignment.guard}
                                                      {assignment.actualTime && isLatestTask(assignment.guard, assignment.id, "schedule") && (
                                                        <span className="text-[9px] opacity-70">
                                                          {new Date(assignment.actualTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                      )}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </TableCell>
                                          );
                                        })}
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </Card>
              </div>
            )}

            {/* Patrols Table */}
            {mainView === "patrols" && (
                        <Card className="p-6 border-border/30 bg-background/30">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="text-right p-3 font-semibold text-foreground whitespace-nowrap w-auto">שם פטרול</th>
                                  <th className="text-right p-3 font-semibold text-foreground w-full">מאבטחים</th>
                                </tr>
                              </thead>
                              <tbody>
                                {PATROLS.map((patrol) => (
                                  <tr key={patrol} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                                    <td className="p-3 font-medium text-foreground whitespace-nowrap w-auto">{patrol}</td>
                                     <td
                                       className="p-3 w-full"
                                       onDragOver={handleDragOver}
                                       onDrop={(e) => { e.preventDefault(); handleDropPatrol(patrol); }}
                                     >
                                       <div 
                                         className="min-h-[40px] bg-background/30 border-2 border-dashed border-foreground rounded-lg p-2 hover:border-primary transition-colors"
                                       >
                                         {getAssignmentsForPatrol(patrol).map((assignment) => {
                                          const isTamach = isGuardTamach(assignment.guard);
                                          const guardData = data.guards.find(g => g.name === assignment.guard);
                                          const SHIFT_TYPES = ["בוקר 6-14", "בוקר 7-15", "תמך 7-19", "תמך 8-20", "ערב 14-22", "ערב 15-23"];
                                          const isCustomShift = !SHIFT_TYPES.includes(guardData?.shiftType || "");
                                          const isOldTask = assignment.actualTime && !isLatestTask(assignment.guard, assignment.id, "patrol");
                                          return (
                                          <div
                                            key={assignment.id}
                                            onMouseDown={() => handleLongPressStart(assignment.id, assignment.guard, "patrol")}
                                            onMouseUp={handleLongPressEnd}
                                            onMouseLeave={handleLongPressEnd}
                                            onTouchStart={() => handleLongPressStart(assignment.id, assignment.guard, "patrol")}
                                            onTouchEnd={handleLongPressEnd}
                                            style={{ 
                                              backgroundColor: isTamach ? getGuardColor(assignment.guard) : `${getGuardColor(assignment.guard)}30`,
                                              borderColor: getGuardColor(assignment.guard),
                                              borderStyle: isCustomShift ? 'dashed' : 'solid',
                                              color: isTamach ? 'hsl(var(--background))' : getGuardColor(assignment.guard)
                                            }}
                                             className="inline-flex items-center gap-1 px-1 py-0.5 border-2 rounded m-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                          >
                                             <span className={`font-medium ${isOldTask ? 'line-through opacity-60' : ''}`}>{assignment.guard}</span>
                                             {assignment.actualTime ? (
                                               <CheckCircle2 
                                                 className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform fill-current"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleSetActualTime(assignment.id, "patrol");
                                                 }}
                                               />
                                             ) : (
                                               <Clock 
                                                 className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleSetActualTime(assignment.id, "patrol");
                                                 }}
                                               />
                                             )}
                                             {assignment.actualTime && (
                                               <span className="text-xs opacity-70">{formatTime(assignment.actualTime)}</span>
                                             )}
                                           </div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                </div>
              </Card>
            )}

            {/* Meals and Breaks View */}
            {mainView === "meals-breaks" && (
              <div className="space-y-4">
                {/* Meals View */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5" />
                    אוכל
                  </h3>
                        <Card className="p-4 border-border/30 bg-background/30"
                          onDragOver={handleDragOver}
                          onDrop={(e) => { e.preventDefault(); handleDropMeal(); }}
                        >
                          <div
                            className="min-h-[150px] bg-background/30 border-2 border-dashed border-foreground rounded-lg p-4 hover:border-primary transition-colors"
                          >
                            <div 
                              className="space-y-2"
                            >
                              {meals.filter(meal => !meal.actualTime || isInTimeRange(meal.actualTime)).map((meal) => {
                                const isTamach = isGuardTamach(meal.guard);
                                const guardData = data.guards.find(g => g.name === meal.guard);
                                const SHIFT_TYPES = ["בוקר 6-14", "בוקר 7-15", "תמך 7-19", "תמך 8-20", "ערב 14-22", "ערב 15-23"];
                                const isCustomShift = !SHIFT_TYPES.includes(guardData?.shiftType || "");
                                const isOldTask = meal.actualTime && !isLatestTask(meal.guard, meal.id, "meal");
                                return (
                                <div
                                  key={meal.id}
                                  onMouseDown={() => handleLongPressStart(meal.id, meal.guard, "meal")}
                                  onMouseUp={handleLongPressEnd}
                                  onMouseLeave={handleLongPressEnd}
                                  onTouchStart={() => handleLongPressStart(meal.id, meal.guard, "meal")}
                                  onTouchEnd={handleLongPressEnd}
                                  style={{ 
                                    backgroundColor: isTamach ? getGuardColor(meal.guard) : `${getGuardColor(meal.guard)}30`,
                                    borderColor: getGuardColor(meal.guard),
                                    borderStyle: isCustomShift ? 'dashed' : 'solid',
                                    color: isTamach ? 'hsl(var(--background))' : getGuardColor(meal.guard)
                                  }}
                                   className="flex items-center justify-between px-4 py-2 border-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                   <div className="flex items-center gap-2">
                                     <span className={`font-medium ${isOldTask ? 'line-through opacity-60' : ''}`}>{meal.guard}</span>
                                     {meal.actualTime ? (
                                       <CheckCircle2 
                                         className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform fill-current"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleSetActualTime(meal.id, "meal");
                                         }}
                                       />
                                     ) : (
                                       <Clock 
                                         className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleSetActualTime(meal.id, "meal");
                                         }}
                                       />
                                     )}
                                     {meal.actualTime && (
                                       <span className="text-xs opacity-70">{formatTime(meal.actualTime)}</span>
                                     )}
                                   </div>
                                </div>
                                );
                              })}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Breaks View */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Coffee className="w-5 h-5" />
                    הפסקות
                  </h3>
                        <Card className="p-4 border-border/30 bg-background/30"
                          onDragOver={handleDragOver}
                          onDrop={(e) => { e.preventDefault(); handleDropBreak(); }}
                        >
                          <div
                            className="min-h-[150px] bg-background/30 border-2 border-dashed border-foreground rounded-lg p-4 hover:border-accent transition-colors"
                          >
                            <div 
                              className="space-y-2"
                            >
                              {breaks.filter(breakItem => !breakItem.actualTime || isInTimeRange(breakItem.actualTime)).map((breakItem) => {
                                const isTamach = isGuardTamach(breakItem.guard);
                                const guardData = data.guards.find(g => g.name === breakItem.guard);
                                const SHIFT_TYPES = ["בוקר 6-14", "בוקר 7-15", "תמך 7-19", "תמך 8-20", "ערב 14-22", "ערב 15-23"];
                                const isCustomShift = !SHIFT_TYPES.includes(guardData?.shiftType || "");
                                const isOldTask = breakItem.actualTime && !isLatestTask(breakItem.guard, breakItem.id, "break");
                                return (
                                <div
                                  key={breakItem.id}
                                  onMouseDown={() => handleLongPressStart(breakItem.id, breakItem.guard, "break")}
                                  onMouseUp={handleLongPressEnd}
                                  onMouseLeave={handleLongPressEnd}
                                  onTouchStart={() => handleLongPressStart(breakItem.id, breakItem.guard, "break")}
                                  onTouchEnd={handleLongPressEnd}
                                  style={{ 
                                    backgroundColor: isTamach ? getGuardColor(breakItem.guard) : `${getGuardColor(breakItem.guard)}30`,
                                    borderColor: getGuardColor(breakItem.guard),
                                    borderStyle: isCustomShift ? 'dashed' : 'solid',
                                    color: isTamach ? 'hsl(var(--background))' : getGuardColor(breakItem.guard)
                                  }}
                                   className="flex items-center justify-between px-4 py-2 border-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                   <div className="flex items-center gap-2">
                                     <span className={`font-medium ${isOldTask ? 'line-through opacity-60' : ''}`}>{breakItem.guard}</span>
                                     {breakItem.actualTime ? (
                                       <CheckCircle2 
                                         className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform fill-current"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleSetActualTime(breakItem.id, "break");
                                         }}
                                       />
                                     ) : (
                                       <Clock 
                                         className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleSetActualTime(breakItem.id, "break");
                                         }}
                                       />
                                     )}
                                     {breakItem.actualTime && (
                                       <span className="text-xs opacity-70">{formatTime(breakItem.actualTime)}</span>
                                     )}
                                   </div>
                                </div>
                                );
                              })}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* History View */}
            {mainView === "history" && (
              <div className="space-y-4" data-history-section>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {assignments.length === 0 && patrols.length === 0 && meals.length === 0 && breaks.length === 0 && scheduleAssignments.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">אין היסטוריה עדיין</p>
                  )}
                  {(() => {
                      const allItems = [
                        ...assignments.filter(a => !a.actualTime || isInTimeRange(a.actualTime)).map(a => ({ ...a, post: a.post, actualTime: a.actualTime })),
                        ...patrols.filter(p => !p.actualTime || isInTimeRange(p.actualTime)).map(p => ({ ...p, post: p.patrol, actualTime: p.actualTime })),
                        ...meals.filter(m => !m.actualTime || isInTimeRange(m.actualTime)).map(m => ({ ...m, guard: m.guard, post: "אוכל", time: m.time, actualTime: m.actualTime })),
                        ...breaks.filter(b => !b.actualTime || isInTimeRange(b.actualTime)).map(b => ({ ...b, guard: b.guard, post: "הפסקה", time: b.time, actualTime: b.actualTime })),
                        ...scheduleAssignments.filter(s => !s.actualTime || isInTimeRange(s.actualTime)).map(s => ({ ...s, guard: s.guard, post: `${s.post} (${s.hour})`, time: s.time, actualTime: s.actualTime }))
                      ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                      
                      // Group by guard to show their journey
                      const guardJourneys = new Map<string, Array<{post: string, time: string, actualTime?: string}>>();
                      
                      allItems.forEach(item => {
                        if (!guardJourneys.has(item.guard)) {
                          guardJourneys.set(item.guard, []);
                        }
                        guardJourneys.get(item.guard)!.push({ post: item.post, time: item.time, actualTime: item.actualTime });
                      });

                      return Array.from(guardJourneys.entries()).map(([guard, journey]) => {
                        const completedJourney = journey.filter(task => task.actualTime);
                        const plannedJourney = journey.filter(task => !task.actualTime);
                        
                        return (
                          <div 
                            key={guard}
                            className="p-4 bg-background/30 rounded-lg border border-border/30"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getGuardColor(guard) }}
                              />
                              <span className="text-foreground font-bold">{guard}</span>
                              {(() => {
                                const guardData = data.guards.find(g => g.name === guard);
                                const shiftType = guardData?.shiftType;
                                if (shiftType) {
                                  const isTamach = shiftType.includes("תמך");
                                  return (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ 
                                      backgroundColor: isTamach ? getGuardColor(guard) : `${getGuardColor(guard)}40`,
                                      color: isTamach ? 'hsl(var(--background))' : getGuardColor(guard)
                                    }}>{shiftType}</span>
                                  );
                                }
                                return null;
                              })()}
                              <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                {getGuardScore(guard).toFixed(1)} נק׳
                              </span>
                            </div>
                            
                            {/* Completed tasks */}
                            {completedJourney.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap text-sm mb-2">
                                {completedJourney.map((task, idx) => (
                                  <Fragment key={`completed-${idx}`}>
                                    <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded border border-border/30">
                                      {task.post === "אוכל" && <UtensilsCrossed className="w-3 h-3" />}
                                      {task.post === "הפסקה" && <Coffee className="w-3 h-3" />}
                                      <span className="text-foreground font-medium">{task.post}</span>
                                      <span className="text-xs text-muted-foreground">{formatTime(task.actualTime!)}</span>
                                    </div>
                                    {idx < completedJourney.length - 1 && (
                                      <span className="text-muted-foreground">←</span>
                                    )}
                                  </Fragment>
                                ))}
                              </div>
                            )}
                            
                             {/* Planned tasks */}
                             {plannedJourney.length > 0 && (
                               <div className="flex items-center gap-2 flex-wrap text-sm">
                                 <span className="text-xs text-muted-foreground font-semibold">מתוכנן:</span>
                                 {plannedJourney.map((task, idx) => (
                                   <Fragment key={`planned-${idx}`}>
                                     <div className="flex items-center gap-2 bg-background/30 px-3 py-1 rounded border border-dashed border-border/40 opacity-60">
                                       {task.post === "אוכל" && <UtensilsCrossed className="w-3 h-3" />}
                                       {task.post === "הפסקה" && <Coffee className="w-3 h-3" />}
                                       <span className="text-foreground font-medium">{task.post}</span>
                                     </div>
                                     {idx < plannedJourney.length - 1 && (
                                       <span className="text-muted-foreground opacity-60">←</span>
                                     )}
                                   </Fragment>
                                 ))}
                               </div>
                             )}
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            )}

            {/* Alerts View */}
            {mainView === "alerts" && (
              <div className="space-y-4">
                <Card className="p-6 border-border/30 bg-background/30">
                  {getAlerts().length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      אין התראות כרגע
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getAlerts().map((alert, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="font-semibold"
                                  style={{ color: getGuardColor(alert.guard) }}
                                >
                                  {alert.guard}
                                </span>
                                <span className="text-muted-foreground">-</span>
                                <span className="font-medium text-foreground">{alert.post}</span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                נמצא בעמדה {alert.duration} דקות
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingAssignment} onOpenChange={(open) => !open && setPendingAssignment(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-right">אישור הצבה</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-lg">
              {pendingAssignment && (
                <span className="text-foreground font-medium">
                  המאבטח <span className="text-primary font-bold">{pendingAssignment.guard}</span> במשימה{" "}
                  <span className="text-accent font-bold">{pendingAssignment.target}</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleConfirmAssignment} className="flex-1">
              אישור
            </Button>
            <Button
              variant="outline"
              onClick={() => setPendingAssignment(null)}
              className="flex-1"
            >
              ביטול
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-right">פעולות על הצבה</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-lg">
              {deleteTarget && (
                <span className="text-foreground font-medium">
                  בחר פעולה עבור <span className="text-primary font-bold">{deleteTarget.guard}</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <Button 
              onClick={handleOpenEditTime} 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              עריכת שעה
            </Button>
            <Button 
              onClick={handleDeleteAssignment} 
              variant="destructive" 
              className="w-full"
            >
              מחיקה
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="w-full"
            >
              ביטול
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Time Dialog */}
      <AlertDialog open={!!editTimeTarget} onOpenChange={(open) => !open && setEditTimeTarget(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-right">עריכת שעה</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-lg">
              {editTimeTarget && (
                <div className="space-y-4">
                  <span className="text-foreground font-medium">
                    ערוך את השעה עבור <span className="text-primary font-bold">{editTimeTarget.guard}</span>
                  </span>
                  <div className="pt-4">
                    <Input
                      type="time"
                      value={editTimeValue}
                      onChange={(e) => setEditTimeValue(e.target.value)}
                      className="text-right text-lg"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleEditTime} className="flex-1">
              אישור
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditTimeTarget(null);
                setEditTimeValue("");
              }}
              className="flex-1"
            >
              ביטול
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShiftManagement;
