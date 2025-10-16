import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getGuardsData, saveGuardsData, resetGuardsData } from "@/utils/storage";
import { Assignment, PatrolAssignment, POSTS, PATROLS } from "@/types/guards";
import { RefreshCw, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ShiftManagementProps {
  onReset: () => void;
}

const ShiftManagement = ({ onReset }: ShiftManagementProps) => {
  const [availableGuards, setAvailableGuards] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [patrols, setPatrols] = useState<PatrolAssignment[]>([]);
  const [draggedGuard, setDraggedGuard] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getGuardsData();
    setAvailableGuards(data.guards.map(g => g.name));
    setAssignments(data.assignments);
    setPatrols(data.patrols);
  };

  const handleDragStart = (guard: string) => {
    setDraggedGuard(guard);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropPost = (post: string) => {
    if (!draggedGuard) return;

    const newAssignment: Assignment = {
      guard: draggedGuard,
      post,
      time: new Date().toISOString()
    };

    const newAssignments = [...assignments, newAssignment];
    setAssignments(newAssignments);

    const data = getGuardsData();
    data.assignments = newAssignments;
    saveGuardsData(data);

    setDraggedGuard(null);
    toast.success(`${draggedGuard} הוצב ב${post}`);
  };

  const handleDropPatrol = (patrol: string) => {
    if (!draggedGuard) return;

    const newPatrol: PatrolAssignment = {
      guard: draggedGuard,
      patrol,
      time: new Date().toISOString()
    };

    const newPatrols = [...patrols, newPatrol];
    setPatrols(newPatrols);

    const data = getGuardsData();
    data.patrols = newPatrols;
    saveGuardsData(data);

    setDraggedGuard(null);
    toast.success(`${draggedGuard} הוצב ב${patrol}`);
  };

  const handleReset = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את כל המשמרת?")) {
      resetGuardsData();
      toast.success("המשמרת אופסה");
      onReset();
    }
  };

  const getGuardsForPost = (post: string) => {
    return assignments.filter(a => a.post === post).map(a => a.guard);
  };

  const getGuardsForPatrol = (patrol: string) => {
    return patrols.filter(p => p.patrol === patrol).map(p => p.guard);
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

        {/* Available Guards */}
        <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
          <h2 className="text-xl font-semibold mb-4 text-foreground">מאבטחים זמינים</h2>
          <div className="flex flex-wrap gap-2">
            {availableGuards.map((guard) => (
              <div
                key={guard}
                draggable
                onDragStart={() => handleDragStart(guard)}
                className="px-4 py-2 bg-primary/20 border border-primary/50 rounded-lg cursor-move hover:bg-primary/30 transition-colors text-foreground font-medium"
              >
                {guard}
              </div>
            ))}
          </div>
        </Card>

        {/* Posts Table */}
        <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
            <MapPin className="w-5 h-5 text-primary" />
            עמדות
          </h2>
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
                        {getGuardsForPost(post).map((guard, idx) => (
                          <div key={idx} className="inline-block px-3 py-1 bg-accent/20 text-accent rounded m-1 text-sm">
                            {guard}
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

        {/* Patrols Table */}
        <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-accent" />
            פטרולים
          </h2>
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
                        {getGuardsForPatrol(patrol).map((guard, idx) => (
                          <div key={idx} className="inline-block px-3 py-1 bg-primary/20 text-primary rounded m-1 text-sm">
                            {guard}
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

        {/* History */}
        <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
          <h2 className="text-xl font-semibold mb-4 text-foreground">היסטוריה של עמדות</h2>
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
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-foreground font-medium">{item.guard}</span>
                    <span className="text-muted-foreground">←</span>
                    <span className="text-foreground">{item.post}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatTime(item.time)}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShiftManagement;
