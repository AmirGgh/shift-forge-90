import { useState, useEffect, useRef } from "react";
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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getGuardsData, saveGuardsData, getShiftSettings } from "@/utils/storage";
import { Assignment, PatrolAssignment, MealAssignment, BreakAssignment, POSTS, PATROLS } from "@/types/guards";
import { Clock, MapPin, ChevronDown, UtensilsCrossed, Coffee, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
    
    // Get the latest active task for each guard
    const guardLatestTasks = new Map<string, { post: string; actualTime: string; thresholdMinutes: number }>();

    // Collect all tasks with actualTime
    assignments.forEach(assignment => {
      if (!assignment.actualTime) return;
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
      if (!patrol.actualTime) return;
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
      if (!breakAssignment.actualTime) return;
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
      if (!meal.actualTime) return;
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
  const [draggedGuard, setDraggedGuard] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{
    guard: string;
    target: string;
    type: "post" | "patrol" | "meal" | "break";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    guard: string;
    target: string;
    type: "post" | "patrol" | "meal" | "break";
  } | null>(null);
  const [openSections, setOpenSections] = useState({
    guards: true,
    tasks: true,
    history: true,
    mealBreak: true,
    alerts: true,
  });
  const [tasksView, setTasksView] = useState<"posts" | "patrols">("posts");
  const [mealBreakView, setMealBreakView] = useState<"meals" | "breaks">("meals");
  const [alertsKey, setAlertsKey] = useState(0); // Force re-render for alerts
  
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
  };

  const handleDragStart = (guard: string) => {
    setDraggedGuard(guard);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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

  const handleLongPressStart = (id: string, guard: string, type: "post" | "patrol" | "meal" | "break") => {
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
    }

    saveGuardsData(data);
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

  const handleSetActualTime = (id: string, type: "post" | "patrol" | "meal" | "break") => {
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
    }

    saveGuardsData(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4 md:p-8" dir="rtl">
      <div className="max-w-full mx-auto space-y-6">

        {/* Guards Bank - Always visible */}
        <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">מאבטחים במשמרת</h2>
            <div className="flex flex-wrap gap-2">
              {data.guards.map((guard) => {
                const isTamach = guard.shiftType?.includes("תמך");
                const isRegularShift = guard.shiftType === "בוקר" || guard.shiftType === "ערב";
                const isCustomShift = !isTamach && !isRegularShift;
                
                return (
                  <div
                    key={guard.name}
                    draggable
                    onDragStart={() => handleDragStart(guard.name)}
                    style={{ 
                      backgroundColor: isTamach ? guard.color : `${guard.color}20`,
                      borderColor: guard.color,
                      borderStyle: isCustomShift ? 'dashed' : 'solid',
                      color: isTamach ? 'hsl(var(--background))' : guard.color
                    }}
                    className="px-4 py-2 border-2 rounded-lg cursor-move hover:opacity-80 transition-opacity font-medium"
                  >
                    {guard.name}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Carousel for 3 sections */}
        <Carousel className="w-full max-w-full overflow-hidden" opts={{ align: "start", direction: "rtl" }}>
          <CarouselContent className="-ml-2 md:-ml-4">
            {/* Section 1: Tasks - Posts and Patrols */}
            <CarouselItem className="pl-2 md:pl-4">
              <Collapsible
                open={openSections.tasks}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, tasks: open }))}
              >
                <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80 h-full">
                  <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
                    <h2 className="text-xl font-semibold text-foreground">משימות</h2>
                    <ChevronDown className={`w-5 h-5 transition-transform ${openSections.tasks ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-6">
                      {/* Toggle Buttons */}
                      <div className="flex gap-2 mb-4">
                        <Button
                          variant={tasksView === "posts" ? "default" : "outline"}
                          onClick={() => setTasksView("posts")}
                          className="flex-1"
                        >
                          <MapPin className="w-4 h-4 ml-2" />
                          עמדות
                        </Button>
                        <Button
                          variant={tasksView === "patrols" ? "default" : "outline"}
                          onClick={() => setTasksView("patrols")}
                          className="flex-1"
                        >
                          <Clock className="w-4 h-4 ml-2" />
                          פטרולים
                        </Button>
                      </div>

                      {/* Posts Table */}
                      {tasksView === "posts" && (
                        <Card className="p-6 border-border/30 bg-background/30">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="text-right p-3 font-semibold text-foreground whitespace-nowrap w-auto">עמדה</th>
                                  <th className="text-right p-3 font-semibold text-foreground w-full">מאבטחים</th>
                                </tr>
                              </thead>
                              <tbody>
                                {POSTS.map((post) => (
                                  <tr key={post} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                                    <td className="p-3 font-medium text-foreground whitespace-nowrap w-auto">{post}</td>
                                    <td
                                      className="p-3 w-full"
                                      onDragOver={handleDragOver}
                                      onDrop={() => handleDropPost(post)}
                                    >
                                      <div className="min-h-[40px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-2 hover:border-primary/50 transition-colors">
                                        {getAssignmentsForPost(post).map((assignment) => {
                                          const isTamach = isGuardTamach(assignment.guard);
                                          return (
                                          <div
                                            key={assignment.id}
                                            onMouseDown={() => handleLongPressStart(assignment.id, assignment.guard, "post")}
                                            onMouseUp={handleLongPressEnd}
                                            onMouseLeave={handleLongPressEnd}
                                            onTouchStart={() => handleLongPressStart(assignment.id, assignment.guard, "post")}
                                            onTouchEnd={handleLongPressEnd}
                                            style={{ 
                                              backgroundColor: isTamach ? getGuardColor(assignment.guard) : `${getGuardColor(assignment.guard)}30`,
                                              borderColor: getGuardColor(assignment.guard),
                                              color: isTamach ? 'hsl(var(--background))' : getGuardColor(assignment.guard)
                                            }}
                                             className="inline-flex items-center gap-2 px-3 py-1 border rounded m-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                                          >
                                             <span className="font-medium">{assignment.guard}</span>
                                             {assignment.actualTime ? (
                                               <CheckCircle2 
                                                 className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform fill-current"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleSetActualTime(assignment.id, "post");
                                                 }}
                                               />
                                             ) : (
                                               <Clock 
                                                 className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleSetActualTime(assignment.id, "post");
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

                      {/* Patrols Table */}
                      {tasksView === "patrols" && (
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
                                      onDrop={() => handleDropPatrol(patrol)}
                                    >
                                      <div className="min-h-[40px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-2 hover:border-accent/50 transition-colors">
                                        {getAssignmentsForPatrol(patrol).map((assignment) => {
                                          const isTamach = isGuardTamach(assignment.guard);
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
                                              color: isTamach ? 'hsl(var(--background))' : getGuardColor(assignment.guard)
                                            }}
                                             className="inline-flex items-center gap-2 px-3 py-1 border rounded m-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                                          >
                                             <span className="font-medium">{assignment.guard}</span>
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
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </CarouselItem>

            {/* Section 2: History */}
            <CarouselItem className="pl-2 md:pl-4">
              <Collapsible
                open={openSections.history}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, history: open }))}
              >
            <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80 h-full">
              <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
                <h2 className="text-xl font-semibold text-foreground">היסטוריה</h2>
                <ChevronDown className={`w-5 h-5 transition-transform ${openSections.history ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {assignments.length === 0 && patrols.length === 0 && meals.length === 0 && breaks.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">אין היסטוריה עדיין</p>
                    )}
                    {(() => {
                      const allItems = [
                        ...assignments.map(a => ({ ...a, post: a.post, actualTime: a.actualTime })),
                        ...patrols.map(p => ({ ...p, post: p.patrol, actualTime: p.actualTime })),
                        ...meals.map(m => ({ ...m, guard: m.guard, post: "אוכל", time: m.time, actualTime: m.actualTime })),
                        ...breaks.map(b => ({ ...b, guard: b.guard, post: "הפסקה", time: b.time, actualTime: b.actualTime }))
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
                              {isGuardTamach(guard) && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ 
                                  backgroundColor: getGuardColor(guard),
                                  color: 'hsl(var(--background))'
                                }}>תמך</span>
                              )}
                              <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                {getGuardScore(guard).toFixed(1)} נק׳
                              </span>
                            </div>
                            
                            {/* Completed tasks */}
                            {completedJourney.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap text-sm mb-2">
                                {completedJourney.map((task, idx) => (
                                  <>
                                    <div key={`${idx}-task`} className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded border border-border/30">
                                      {task.post === "אוכל" && <UtensilsCrossed className="w-3 h-3" />}
                                      {task.post === "הפסקה" && <Coffee className="w-3 h-3" />}
                                      <span className="text-foreground font-medium">{task.post}</span>
                                      <span className="text-xs text-muted-foreground">{formatTime(task.actualTime!)}</span>
                                    </div>
                                    {idx < completedJourney.length - 1 && (
                                      <span key={`${idx}-arrow`} className="text-muted-foreground">←</span>
                                    )}
                                  </>
                                ))}
                              </div>
                            )}
                            
                             {/* Planned tasks */}
                             {plannedJourney.length > 0 && (
                               <div className="flex items-center gap-2 flex-wrap text-sm">
                                 <span className="text-xs text-muted-foreground font-semibold">מתוכנן:</span>
                                 {plannedJourney.map((task, idx) => (
                                   <>
                                     <div key={`${idx}-planned`} className="flex items-center gap-2 bg-background/30 px-3 py-1 rounded border border-dashed border-border/40 opacity-60">
                                       {task.post === "אוכל" && <UtensilsCrossed className="w-3 h-3" />}
                                       {task.post === "הפסקה" && <Coffee className="w-3 h-3" />}
                                       <span className="text-foreground font-medium">{task.post}</span>
                                     </div>
                                     {idx < plannedJourney.length - 1 && (
                                       <span key={`${idx}-arrow-planned`} className="text-muted-foreground opacity-60">←</span>
                                     )}
                                   </>
                                 ))}
                               </div>
                             )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </CarouselItem>

          {/* Section 3: Meals and Breaks */}
          <CarouselItem className="pl-2 md:pl-4">
            <Collapsible
              open={openSections.mealBreak}
              onOpenChange={(open) => setOpenSections(prev => ({ ...prev, mealBreak: open }))}
            >
            <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80 h-full">
              <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
                <h2 className="text-xl font-semibold text-foreground">אוכל והפסקות</h2>
                <ChevronDown className={`w-5 h-5 transition-transform ${openSections.mealBreak ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-6">
                  {/* Toggle Buttons */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={mealBreakView === "meals" ? "default" : "outline"}
                      onClick={() => setMealBreakView("meals")}
                      className="flex-1"
                    >
                      <UtensilsCrossed className="w-4 h-4 ml-2" />
                      אוכל
                    </Button>
                    <Button
                      variant={mealBreakView === "breaks" ? "default" : "outline"}
                      onClick={() => setMealBreakView("breaks")}
                      className="flex-1"
                    >
                      <Coffee className="w-4 h-4 ml-2" />
                      הפסקות
                    </Button>
                  </div>

                  {/* Meals View */}
                  {mealBreakView === "meals" && (
                    <Card className="p-4 border-border/30 bg-background/30">
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDropMeal}
                        className="min-h-[150px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-4 hover:border-primary/50 transition-colors"
                      >
                        <div className="space-y-2">
                          {meals.map((meal) => {
                            const isTamach = isGuardTamach(meal.guard);
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
                                color: isTamach ? 'hsl(var(--background))' : getGuardColor(meal.guard)
                              }}
                               className="flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            >
                               <div className="flex items-center gap-2">
                                 <span className="font-medium">{meal.guard}</span>
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
                  )}

                  {/* Breaks View */}
                  {mealBreakView === "breaks" && (
                    <Card className="p-4 border-border/30 bg-background/30">
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDropBreak}
                        className="min-h-[150px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-4 hover:border-accent/50 transition-colors"
                      >
                        <div className="space-y-2">
                          {breaks.map((breakItem) => {
                            const isTamach = isGuardTamach(breakItem.guard);
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
                                color: isTamach ? 'hsl(var(--background))' : getGuardColor(breakItem.guard)
                              }}
                               className="flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            >
                               <div className="flex items-center gap-2">
                                 <span className="font-medium">{breakItem.guard}</span>
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
                  )}
                </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </CarouselItem>

          {/* Section 4: Alerts */}
          <CarouselItem className="pl-2 md:pl-4">
            <Collapsible
              open={openSections.alerts}
              onOpenChange={(open) => setOpenSections(prev => ({ ...prev, alerts: open }))}
            >
              <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80 h-full">
                <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">התראות</h2>
                    {getAlerts().length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                        {getAlerts().length}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openSections.alerts ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-6">
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
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
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
            <AlertDialogTitle className="text-foreground text-right">מחיקת הצבה</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-lg">
              {deleteTarget && (
                <span className="text-foreground font-medium">
                  האם למחוק את <span className="text-primary font-bold">{deleteTarget.guard}</span>?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleDeleteAssignment} variant="destructive" className="flex-1">
              אישור
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
