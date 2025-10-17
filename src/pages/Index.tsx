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
  const [alertThreshold, setAlertThreshold] = useState(() => getShiftSettings().alertThresholdMinutes);

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
    if (alertThreshold < 1) {
      toast.error("זמן התראה חייב להיות לפחות דקה אחת");
      return;
    }
    saveShiftSettings({ alertThresholdMinutes: alertThreshold });
    toast.success("ההגדרות נשמרו");
    setSettingsOpen(false);
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
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>הגדרות משמרת</DialogTitle>
            <DialogDescription>
              שנה את זמן ההתראה למאבטחים שנמצאים בעמדה זמן רב
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alertThreshold" className="text-right col-span-4">
                זמן התראה (דקות)
              </Label>
              <Input
                id="alertThreshold"
                type="number"
                min="1"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="col-span-4"
              />
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
