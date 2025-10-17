import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import GuardsSetup from "@/components/GuardsSetup";
import ShiftManagement from "@/components/ShiftManagement";
import { getGuardsData, resetGuardsData, resetEveningShift, getShiftSettings, saveShiftSettings } from "@/utils/storage";
import { Users, Calendar, Menu, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

type Screen = "setup" | "management";

const Index = () => {
  const [screen, setScreen] = useState<Screen>(() => {
    const data = getGuardsData();
    return data.guards.length > 0 ? "management" : "setup";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => getShiftSettings());

  const handleSetupComplete = () => {
    setScreen("management");
  };

  const handleReset = () => {
    setScreen("setup");
  };

  const handleShiftReset = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את כל המשמרת?")) {
      resetGuardsData();
      toast.success("המשמרת אופסה");
      handleReset();
    }
  };

  const handleEveningShiftReset = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס למשמרת ערב? זה ימחק היסטוריה של מאבטחים שאינם במשמרת תמך.")) {
      resetEveningShift();
      toast.success("המשמרת אופסה למשמרת ערב");
      window.location.reload();
    }
  };

  const handleSaveSettings = () => {
    if (settings.alertThresholdMinutes < 1) {
      toast.error("זמן התראה חייב להיות לפחות דקה אחת");
      return;
    }
    // Validate scores
    const scoreValues = Object.values(settings.scores);
    if (scoreValues.some(v => v < 0)) {
      toast.error("ניקוד חייב להיות מספר חיובי");
      return;
    }
    saveShiftSettings(settings);
    toast.success("ההגדרות נשמרו");
    setSettingsOpen(false);
    window.location.reload(); // Reload to apply new scores
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-card)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between" dir="rtl">
          {/* Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-right">תפריט</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                <Button
                  onClick={() => setScreen("setup")}
                  variant={screen === "setup" ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  <Users className="w-4 h-4 ml-2" />
                  מאבטחים
                </Button>
                <Button
                  onClick={() => setScreen("management")}
                  variant={screen === "management" ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  <Calendar className="w-4 h-4 ml-2" />
                  ניהול משמרת
                </Button>
                <Button
                  onClick={() => setSettingsOpen(true)}
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 ml-2" />
                  הגדרות משמרת
                </Button>
                <Button
                  onClick={handleEveningShiftReset}
                  variant="ghost"
                  className="w-full justify-start hover:bg-accent/20 hover:text-accent"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  איפוס למשמרת ערב
                </Button>
                <Button
                  onClick={handleShiftReset}
                  variant="ghost"
                  className="w-full justify-start border-destructive/50 hover:bg-destructive/20 hover:text-destructive"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  איפוס משמרת מלא
                </Button>
                <div className="border-t border-border/50 my-2" />
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>

          {/* Title */}
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {screen === "setup" ? "הגדרת מאבטחים" : "ניהול משמרת"}
          </h1>

          {/* Empty space for balance */}
          <div className="w-10" />
        </div>
      </nav>

      {/* Content */}
      {screen === "setup" ? (
        <GuardsSetup onComplete={handleSetupComplete} />
      ) : (
        <ShiftManagement />
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הגדרות משמרת</DialogTitle>
            <DialogDescription>
              שנה את זמן ההתראה וניקוד המשימות
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Alert Thresholds */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">זמני התראה</Label>
              
              <div className="space-y-2">
                <Label htmlFor="alertThreshold" className="text-sm">זמן התראה עמדה (דקות)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  min="1"
                  value={settings.alertThresholdMinutes}
                  onChange={(e) => setSettings(prev => ({ ...prev, alertThresholdMinutes: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="breakThreshold" className="text-sm">זמן התראה הפסקה (דקות)</Label>
                <Input
                  id="breakThreshold"
                  type="number"
                  min="1"
                  value={settings.breakThresholdMinutes}
                  onChange={(e) => setSettings(prev => ({ ...prev, breakThresholdMinutes: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mealThreshold" className="text-sm">זמן התראה אוכל (דקות)</Label>
                <Input
                  id="mealThreshold"
                  type="number"
                  min="1"
                  value={settings.mealThresholdMinutes}
                  onChange={(e) => setSettings(prev => ({ ...prev, mealThresholdMinutes: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Scores */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">ניקוד משימות</Label>
              
              <div className="space-y-2">
                <Label htmlFor="score-pe21" className="text-sm">פ.ע-21</Label>
                <Input
                  id="score-pe21"
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.scores["פ.ע-21"]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scores: { ...prev.scores, "פ.ע-21": Number(e.target.value) }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="score-pt21" className="text-sm">פ.ת-21</Label>
                <Input
                  id="score-pt21"
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.scores["פ.ת-21"]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scores: { ...prev.scores, "פ.ת-21": Number(e.target.value) }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="score-pe7" className="text-sm">פ.ע-7</Label>
                <Input
                  id="score-pe7"
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.scores["פ.ע-7"]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scores: { ...prev.scores, "פ.ע-7": Number(e.target.value) }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="score-pt7" className="text-sm">פ.ת-7</Label>
                <Input
                  id="score-pt7"
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.scores["פ.ת-7"]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scores: { ...prev.scores, "פ.ת-7": Number(e.target.value) }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="score-rl" className="text-sm">פטרולי RL</Label>
                <Input
                  id="score-rl"
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.scores["RL"]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scores: { ...prev.scores, "RL": Number(e.target.value) }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="score-default" className="text-sm">פטרולים אחרים</Label>
                <Input
                  id="score-default"
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.scores["defaultPatrol"]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scores: { ...prev.scores, "defaultPatrol": Number(e.target.value) }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="score-lobby" className="text-sm">לובי עמידה</Label>
                <Input
                  id="score-lobby"
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.scores["לובי עמידה"]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scores: { ...prev.scores, "לובי עמידה": Number(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSettings}>שמור הגדרות</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
