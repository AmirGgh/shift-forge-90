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
import { getGuardsData, saveGuardsData, resetGuardsData } from "@/utils/storage";
import { Assignment, PatrolAssignment, MealAssignment, BreakAssignment, POSTS, PATROLS } from "@/types/guards";
import { RefreshCw, Clock, MapPin, ChevronDown, UtensilsCrossed, Coffee } from "lucide-react";
import { toast } from "sonner";

interface ShiftManagementProps {
  onReset: () => void;
}

// Generate consistent colors for guards
const getGuardColor = (guard: string) => {
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(210, 100%, 60%)", // blue
    "hsl(340, 80%, 60%)", // pink
    "hsl(160, 80%, 50%)", // teal
    "hsl(280, 70%, 60%)", // purple
    "hsl(30, 90%, 60%)", // orange
    "hsl(120, 60%, 50%)", // green
  ];
  
  let hash = 0;
  for (let i = 0; i < guard.length; i++) {
    hash = guard.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const ShiftManagement = ({ onReset }: ShiftManagementProps) => {
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
    history: false,
    mealBreak: false,
  });
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
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

  const handleLongPressStart = (guard: string, target: string, type: "post" | "patrol" | "meal" | "break") => {
    longPressTimer.current = setTimeout(() => {
      setDeleteTarget({ guard, target, type });
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
        a => !(a.guard === deleteTarget.guard && a.post === deleteTarget.target)
      );
      setAssignments(newAssignments);
      data.assignments = newAssignments;
      toast.success(`${deleteTarget.guard} הוסר מ${deleteTarget.target}`);
    } else if (deleteTarget.type === "patrol") {
      const newPatrols = patrols.filter(
        p => !(p.guard === deleteTarget.guard && p.patrol === deleteTarget.target)
      );
      setPatrols(newPatrols);
      data.patrols = newPatrols;
      toast.success(`${deleteTarget.guard} הוסר מ${deleteTarget.target}`);
    } else if (deleteTarget.type === "meal") {
      const newMeals = meals.filter(m => m.guard !== deleteTarget.guard);
      setMeals(newMeals);
      data.meals = newMeals;
      toast.success(`${deleteTarget.guard} הוסר מאוכל`);
    } else if (deleteTarget.type === "break") {
      const newBreaks = breaks.filter(b => b.guard !== deleteTarget.guard);
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
        guard: pendingAssignment.guard,
        time: new Date().toISOString()
      };
      const newMeals = [...meals, newMeal];
      setMeals(newMeals);
      data.meals = newMeals;
      toast.success(`${pendingAssignment.guard} הוצב באוכל`);
    } else if (pendingAssignment.type === "break") {
      const newBreak: BreakAssignment = {
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

  const handleReset = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את כל המשמרת?")) {
      resetGuardsData();
      toast.success("המשמרת אופסה");
      onReset();
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">ניהול משמרת</h1>
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-destructive/50 hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            איפוס משמרת
          </Button>
        </div>

        {/* Section 1: Guards Bank */}
        <Collapsible
          open={openSections.guards}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, guards: open }))}
        >
          <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
            <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
              <h2 className="text-xl font-semibold text-foreground">בנק מאבטחים</h2>
              <ChevronDown className={`w-5 h-5 transition-transform ${openSections.guards ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6">
                <div className="flex flex-wrap gap-2">
                  {availableGuards.map((guard) => (
                    <div
                      key={guard}
                      draggable
                      onDragStart={() => handleDragStart(guard)}
                      style={{ 
                        backgroundColor: `${getGuardColor(guard)}20`,
                        borderColor: getGuardColor(guard),
                        color: getGuardColor(guard)
                      }}
                      className="px-4 py-2 border-2 rounded-lg cursor-move hover:opacity-80 transition-opacity font-medium"
                    >
                      {guard}
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 2: Tasks - Posts and Patrols */}
        <Collapsible
          open={openSections.tasks}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, tasks: open }))}
        >
          <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
            <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
              <h2 className="text-xl font-semibold text-foreground">משימות - עמדות ופטרולים</h2>
              <ChevronDown className={`w-5 h-5 transition-transform ${openSections.tasks ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-6">
                <Carousel className="w-full" opts={{ align: "start", direction: "rtl" }}>
                  <CarouselContent>
                    {/* Posts Slide */}
                    <CarouselItem>
                      <Card className="p-6 border-border/30 bg-background/30">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                          <MapPin className="w-5 h-5 text-primary" />
                          עמדות
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border/50">
                                <th className="text-right p-3 font-semibold text-foreground">עמדה</th>
                                <th className="text-right p-3 font-semibold text-foreground">מאבטחים</th>
                              </tr>
                            </thead>
                            <tbody>
                              {POSTS.map((post) => (
                                <tr key={post} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                                  <td className="p-3 font-medium text-foreground">{post}</td>
                                  <td
                                    className="p-3"
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDropPost(post)}
                                  >
                                    <div className="min-h-[40px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-2 hover:border-primary/50 transition-colors">
                                      {getAssignmentsForPost(post).map((assignment, idx) => (
                                        <div
                                          key={idx}
                                          onMouseDown={() => handleLongPressStart(assignment.guard, post, "post")}
                                          onMouseUp={handleLongPressEnd}
                                          onMouseLeave={handleLongPressEnd}
                                          onTouchStart={() => handleLongPressStart(assignment.guard, post, "post")}
                                          onTouchEnd={handleLongPressEnd}
                                          style={{ 
                                            backgroundColor: `${getGuardColor(assignment.guard)}30`,
                                            borderColor: getGuardColor(assignment.guard),
                                            color: getGuardColor(assignment.guard)
                                          }}
                                          className="inline-flex items-center gap-2 px-3 py-1 border rounded m-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                          <span className="font-medium">{assignment.guard}</span>
                                          <span className="text-xs opacity-70">{formatTime(assignment.time)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </CarouselItem>

                    {/* Patrols Slide */}
                    <CarouselItem>
                      <Card className="p-6 border-border/30 bg-background/30">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                          <Clock className="w-5 h-5 text-accent" />
                          פטרולים
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border/50">
                                <th className="text-right p-3 font-semibold text-foreground">שם פטרול</th>
                                <th className="text-right p-3 font-semibold text-foreground">מאבטחים</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PATROLS.map((patrol) => (
                                <tr key={patrol} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                                  <td className="p-3 font-medium text-foreground">{patrol}</td>
                                  <td
                                    className="p-3"
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDropPatrol(patrol)}
                                  >
                                    <div className="min-h-[40px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-2 hover:border-accent/50 transition-colors">
                                      {getAssignmentsForPatrol(patrol).map((assignment, idx) => (
                                        <div
                                          key={idx}
                                          onMouseDown={() => handleLongPressStart(assignment.guard, patrol, "patrol")}
                                          onMouseUp={handleLongPressEnd}
                                          onMouseLeave={handleLongPressEnd}
                                          onTouchStart={() => handleLongPressStart(assignment.guard, patrol, "patrol")}
                                          onTouchEnd={handleLongPressEnd}
                                          style={{ 
                                            backgroundColor: `${getGuardColor(assignment.guard)}30`,
                                            borderColor: getGuardColor(assignment.guard),
                                            color: getGuardColor(assignment.guard)
                                          }}
                                          className="inline-flex items-center gap-2 px-3 py-1 border rounded m-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                          <span className="font-medium">{assignment.guard}</span>
                                          <span className="text-xs opacity-70">{formatTime(assignment.time)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </CarouselItem>
                  </CarouselContent>
                  <CarouselPrevious className="right-12" />
                  <CarouselNext className="left-12" />
                </Carousel>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3: History */}
        <Collapsible
          open={openSections.history}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, history: open }))}
        >
          <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
            <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
              <h2 className="text-xl font-semibold text-foreground">היסטוריה</h2>
              <ChevronDown className={`w-5 h-5 transition-transform ${openSections.history ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {assignments.length === 0 && patrols.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">אין היסטוריה עדיין</p>
                  )}
                  {[...assignments, ...patrols.map(p => ({ ...p, post: p.patrol }))]
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getGuardColor(item.guard) }}
                          />
                          <span className="text-foreground font-medium">{item.guard}</span>
                          <span className="text-muted-foreground">←</span>
                          <span className="text-foreground">{item.post}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatTime(item.time)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 4: Meals and Breaks */}
        <Collapsible
          open={openSections.mealBreak}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, mealBreak: open }))}
        >
          <Card className="shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
            <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-background/20 transition-colors rounded-t-lg">
              <h2 className="text-xl font-semibold text-foreground">אוכל והפסקות</h2>
              <ChevronDown className={`w-5 h-5 transition-transform ${openSections.mealBreak ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                {/* Meals Table */}
                <Card className="p-4 border-border/30 bg-background/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                    אוכל
                  </h3>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDropMeal}
                    className="min-h-[200px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="space-y-2">
                      {meals.map((meal, idx) => (
                        <div
                          key={idx}
                          onMouseDown={() => handleLongPressStart(meal.guard, "אוכל", "meal")}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onTouchStart={() => handleLongPressStart(meal.guard, "אוכל", "meal")}
                          onTouchEnd={handleLongPressEnd}
                          style={{ 
                            backgroundColor: `${getGuardColor(meal.guard)}30`,
                            borderColor: getGuardColor(meal.guard),
                            color: getGuardColor(meal.guard)
                          }}
                          className="flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <span className="font-medium">{meal.guard}</span>
                          <span className="text-xs opacity-70">{formatTime(meal.time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Breaks Table */}
                <Card className="p-4 border-border/30 bg-background/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <Coffee className="w-5 h-5 text-accent" />
                    הפסקות
                  </h3>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDropBreak}
                    className="min-h-[200px] bg-background/30 border-2 border-dashed border-border/50 rounded-lg p-4 hover:border-accent/50 transition-colors"
                  >
                    <div className="space-y-2">
                      {breaks.map((breakItem, idx) => (
                        <div
                          key={idx}
                          onMouseDown={() => handleLongPressStart(breakItem.guard, "הפסקה", "break")}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onTouchStart={() => handleLongPressStart(breakItem.guard, "הפסקה", "break")}
                          onTouchEnd={handleLongPressEnd}
                          style={{ 
                            backgroundColor: `${getGuardColor(breakItem.guard)}30`,
                            borderColor: getGuardColor(breakItem.guard),
                            color: getGuardColor(breakItem.guard)
                          }}
                          className="flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <span className="font-medium">{breakItem.guard}</span>
                          <span className="text-xs opacity-70">{formatTime(breakItem.time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
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
