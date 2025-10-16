import { useState } from "react";
import { Button } from "@/components/ui/button";
import GuardsSetup from "@/components/GuardsSetup";
import ShiftManagement from "@/components/ShiftManagement";
import { getGuardsData } from "@/utils/storage";
import { Users, Calendar } from "lucide-react";

type Screen = "setup" | "management";

const Index = () => {
  const [screen, setScreen] = useState<Screen>(() => {
    const data = getGuardsData();
    return data.guards.length > 0 ? "management" : "setup";
  });

  const handleSetupComplete = () => {
    setScreen("management");
  };

  const handleReset = () => {
    setScreen("setup");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-card)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 justify-center" dir="rtl">
          <Button
            onClick={() => setScreen("setup")}
            variant={screen === "setup" ? "default" : "ghost"}
            className={screen === "setup" ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : ""}
          >
            <Users className="w-4 h-4 ml-2" />
            מאבטחים
          </Button>
          <Button
            onClick={() => setScreen("management")}
            variant={screen === "management" ? "default" : "ghost"}
            className={screen === "management" ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : ""}
          >
            <Calendar className="w-4 h-4 ml-2" />
            ניהול משמרת
          </Button>
        </div>
      </nav>

      {/* Content */}
      {screen === "setup" ? (
        <GuardsSetup onComplete={handleSetupComplete} />
      ) : (
        <ShiftManagement onReset={handleReset} />
      )}
    </div>
  );
};

export default Index;
