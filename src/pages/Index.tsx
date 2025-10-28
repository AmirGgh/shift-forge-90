import { useState, useEffect } from "react";
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
import { getGuardsData, resetGuardsData, resetEveningShift, getShiftSettings, saveShiftSettings, saveGuardsData } from "@/utils/storage";
import { Users, Calendar, Menu, RefreshCw, Settings, ArrowLeftRight, Copy, Upload } from "lucide-react";
import { toast } from "sonner";

type Screen = "setup" | "management";

const Index = () => {
  const [screen, setScreen] = useState<Screen>(() => {
    const data = getGuardsData();
    return data.guards.length > 0 ? "management" : "setup";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => getShiftSettings());
  const [menuOpen, setMenuOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [importData, setImportData] = useState("");

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

  const handleResetSettings = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את ההגדרות לערכי ברירת מחדל?")) {
      const defaultSettings = {
        alertThresholdMinutes: 60,
        breakThresholdMinutes: 15,
        mealThresholdMinutes: 32,
        scores: {
          "פ.ע-21": 2.5,
          "פ.ת-21": 2,
          "פ.ע-7": 1.7,
          "פ.ת-7": 1.5,
          "RL": 0.4,
          "defaultPatrol": 1,
          "לובי עמידה": 0.8,
          "פ. שרונה": 1
        }
      };
      setSettings(defaultSettings);
      saveShiftSettings(defaultSettings);
      toast.success("ההגדרות אופסו לערכי ברירת מחדל");
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const data = getGuardsData();
    const jsonString = JSON.stringify(data);
    navigator.clipboard.writeText(jsonString);
    toast.success("המידע הועתק ללוח");
  };

  const handleImportData = () => {
    try {
      const data = JSON.parse(importData);
      if (!data.guards || !data.assignments || !data.patrols || !data.meals || !data.breaks) {
        toast.error("פורמט המידע לא תקין");
        return;
      }
      saveGuardsData(data);
      toast.success("המידע יובא בהצלחה");
      setTransferOpen(false);
      setImportData("");
      window.location.reload();
    } catch (error) {
      toast.error("שגיאה בפענוח המידע - וודא שהפורמט תקין");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-card)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between" dir="rtl">
          {/* Hamburger Menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
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
                  onClick={() => {
                    setScreen("setup");
                    setMenuOpen(false);
                  }}
                  variant={screen === "setup" ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  <Users className="w-4 h-4 ml-2" />
                  מאבטחים
                </Button>
                <Button
                  onClick={() => {
                    setScreen("management");
                    setMenuOpen(false);
                  }}
                  variant={screen === "management" ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  <Calendar className="w-4 h-4 ml-2" />
                  ניהול משמרת
                </Button>
                <Button
                  onClick={() => {
                    setSettingsOpen(true);
                    setMenuOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 ml-2" />
                  הגדרות משמרת
                </Button>
                <Button
                  onClick={() => {
                    setTransferOpen(true);
                    setMenuOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <ArrowLeftRight className="w-4 h-4 ml-2" />
                  העברת משמרת
                </Button>
                <Button
                  onClick={() => {
                    handleEveningShiftReset();
                    setMenuOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start hover:bg-accent/20 hover:text-accent"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  איפוס למשמרת ערב
                </Button>
                <Button
                  onClick={() => {
                    handleShiftReset();
                    setMenuOpen(false);
                  }}
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {screen === "setup" ? "הגדרת מאבטחים" : "ניהול משמרת"}
            </h1>
          </div>

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

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>העברת משמרת</DialogTitle>
            <DialogDescription>
              העבר את כל המידע הנצבר למשמרת חדשה
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Export Section */}
            <div className="space-y-3 p-4 border border-border/50 rounded-lg bg-card/50">
              <Label className="text-base font-semibold">ייצוא מידע</Label>
              <p className="text-sm text-muted-foreground">
                לחץ על הכפתור להעתקת כל המידע ללוח
              </p>
              <Button onClick={handleExportData} className="w-full">
                <Copy className="w-4 h-4 ml-2" />
                העתק את כל המידע
              </Button>
            </div>

            {/* Import Section */}
            <div className="space-y-3 p-4 border border-border/50 rounded-lg bg-card/50">
              <Label className="text-base font-semibold">ייבוא מידע</Label>
              <p className="text-sm text-muted-foreground">
                הדבק את המידע שהועתק מהמשמרת הקודמת
              </p>
              <div className="space-y-2">
                <Label htmlFor="importData">מידע לייבוא</Label>
                <textarea
                  id="importData"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="הדבק כאן את המידע המיוצא..."
                />
              </div>
              <Button onClick={handleImportData} className="w-full" disabled={!importData.trim()}>
                <Upload className="w-4 h-4 ml-2" />
                הוסף את כל המידע למשמרת החדשה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          <DialogFooter className="flex-row gap-2 justify-between">
            <Button onClick={handleResetSettings} variant="outline">
              איפוס לברירת מחדל
            </Button>
            <Button onClick={handleSaveSettings}>שמור הגדרות</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
